(() => {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const defaults = {
    delay: 140,
    animateBy: "words",
    direction: "top",
    threshold: 0.28,
    rootMargin: "0px 0px -8% 0px",
    stepDuration: 0.48,
    staggerMs: 420,
  };

  const unitSelector =
    ".hero, .invite, .styling, .countdown, .way__title, .way__card";

  let initialized = false;

  function justifyFromTextAlign(el) {
    const align = getComputedStyle(el).textAlign;
    if (align === "left" || align === "start") return "flex-start";
    if (align === "right" || align === "end") return "flex-end";
    return "center";
  }

  function createSegment(content, isWordMode, isLast) {
    const span = document.createElement("span");
    span.className = "blur-segment";
    span.textContent = content === " " ? "\u00A0" : content;
    if (isWordMode && !isLast) {
      span.textContent += "\u00A0";
    }
    return span;
  }

  function segmentsFromText(text, animateBy) {
    if (animateBy === "chars") {
      return text.split("").map((ch, i, arr) =>
        createSegment(ch, false, i === arr.length - 1)
      );
    }

    const words = text.trim().split(/\s+/).filter(Boolean);
    return words.map((word, i) =>
      createSegment(word, true, i === words.length - 1)
    );
  }

  function buildSegments(el, animateBy) {
    const segments = [];
    const childNodes = Array.from(el.childNodes);

    const hasElementChildren = childNodes.some(
      (node) => node.nodeType === Node.ELEMENT_NODE
    );

    if (!hasElementChildren) {
      return segmentsFromText(el.textContent || "", animateBy);
    }

    childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        if (!text.trim()) return;
        segments.push(...segmentsFromText(text, animateBy));
        return;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const wrap = document.createElement("span");
        wrap.className = "blur-segment";
        wrap.appendChild(node.cloneNode(true));
        segments.push(wrap);
      }
    });

    return segments;
  }

  function keyframesFor(direction) {
    const fromY = direction === "top" ? -28 : 28;
    const midY = direction === "top" ? 4 : -4;

    return [
      {
        filter: "blur(12px)",
        opacity: 0,
        transform: `translateY(${fromY}px)`,
      },
      {
        filter: "blur(5px)",
        opacity: 0.45,
        transform: `translateY(${midY}px)`,
      },
      {
        filter: "blur(0px)",
        opacity: 1,
        transform: "translateY(0px)",
      },
    ];
  }

  function prepare(el) {
    if (el._blurPrepared) return;

    const animateBy = el.dataset.blurBy || defaults.animateBy;
    const direction = el.dataset.blurDirection || defaults.direction;
    const segments = buildSegments(el, animateBy);

    el.textContent = "";
    el.classList.add("blur-text");
    if (el.hasAttribute("data-blur-wrap")) {
      el.classList.add("blur-text--wrap");
    }
    el.style.justifyContent = justifyFromTextAlign(el);
    segments.forEach((segment) => el.appendChild(segment));

    const frames = keyframesFor(direction);
    const from = frames[0];

    segments.forEach((segment) => {
      segment.style.filter = from.filter || "none";
      segment.style.opacity = String(from.opacity);
      segment.style.transform = from.transform;
    });

    el._blurSegments = segments;
    el._blurDirection = direction;
    el._blurPrepared = true;
  }

  function playBlur(el) {
    if (el._blurDone || el._blurPlaying) return;

    prepare(el);

    const segments = el._blurSegments || [];
    if (reducedMotion || !segments.length) {
      segments.forEach((segment) => {
        segment.style.filter = "none";
        segment.style.opacity = "1";
        segment.style.transform = "translate3d(0, 0, 0)";
      });
      el._blurDone = true;
      return;
    }

    const delay = Number(el.dataset.blurDelay ?? defaults.delay);
    const stepDuration = Number(
      el.dataset.blurStepDuration ?? defaults.stepDuration
    );
    const frames = keyframesFor(el._blurDirection || defaults.direction);
    const duration = stepDuration * (frames.length - 1) * 1000;

    el._blurPlaying = true;

    segments.forEach((segment, index) => {
      const animation = segment.animate(frames, {
        duration,
        delay: index * delay,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      });

      if (index === segments.length - 1) {
        animation.onfinish = () => {
          el._blurDone = true;
        };
      }
    });
  }

  function playReveal(el) {
    if (el.classList.contains("is-revealed")) return;
    if (reducedMotion) {
      el.classList.add("is-revealed");
      return;
    }
    // Force reflow so the transition always runs.
    void el.offsetWidth;
    el.classList.add("is-revealed");
  }

  function piecesForUnit(unit) {
    const pieces = Array.from(
      unit.querySelectorAll("[data-blur], [data-reveal]")
    ).filter((el) => el.closest(unitSelector) === unit);

    // Units like .way__title carry data-blur on themselves, not on children.
    if (
      unit.matches?.("[data-blur], [data-reveal]") &&
      !pieces.includes(unit)
    ) {
      pieces.unshift(unit);
    }

    return pieces;
  }

  function playUnit(unit) {
    if (!unit || unit._revealPlayed) return;
    unit._revealPlayed = true;

    const pieces = piecesForUnit(unit);
    if (!pieces.length) return;

    pieces.forEach((el, index) => {
      const wait = reducedMotion ? 0 : index * defaults.staggerMs;
      window.setTimeout(() => {
        if (el.hasAttribute("data-blur")) playBlur(el);
        if (el.hasAttribute("data-reveal")) playReveal(el);
      }, wait);
    });
  }

  function findUnit(node) {
    if (!node || !node.closest) return null;
    return node.closest(unitSelector);
  }

  function init() {
    if (initialized) return;
    initialized = true;

    const blurEls = Array.from(document.querySelectorAll("[data-blur]"));
    blurEls.forEach(prepare);

    const units = Array.from(document.querySelectorAll(unitSelector));
    if (!units.length) return;

    if (reducedMotion) {
      units.forEach(playUnit);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          playUnit(entry.target);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: defaults.threshold,
        rootMargin: defaults.rootMargin,
      }
    );

    units.forEach((unit) => observer.observe(unit));

    // After a smooth snap lands, play that section in sequence.
    document.addEventListener("section:arrive", (event) => {
      const section = event.detail?.section;
      const unit = findUnit(section) || section;
      if (!unit) return;
      // Allow replay only if not yet played; playUnit guards with flag.
      playUnit(unit);
    });
  }

  function whenReady(callback) {
    if (!document.fonts || document.fonts.status === "loaded") {
      callback();
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      callback();
    };

    document.fonts.ready.then(finish).catch(finish);
    setTimeout(finish, 1200);
  }

  whenReady(() => requestAnimationFrame(init));
  window.addEventListener("load", () => {
    whenReady(() => requestAnimationFrame(init));
  });
})();
