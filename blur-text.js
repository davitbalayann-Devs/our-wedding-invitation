(() => {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const defaults = {
    delay: 100,
    animateBy: "sentences",
    direction: "top",
    threshold: 0.1,
    rootMargin: "0px",
    stepDuration: 0.20,
  };

  const isCoarse =
    window.matchMedia("(hover: none), (pointer: coarse)").matches ||
    window.matchMedia("(max-width: 900px)").matches;

  // Blur filters are expensive on phones — keep a light fade/slide only.
  if (isCoarse) {
    defaults.delay = 55;
    defaults.stepDuration = 0.16;
  }

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

  /** Build animated segments while preserving nested links. */
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
    const fromY = direction === "top" ? -50 : 50;
    const midY = direction === "top" ? 5 : -5;

    if (isCoarse) {
      return [
        {
          opacity: 0,
          transform: `translate3d(0, ${direction === "top" ? -18 : 18}px, 0)`,
        },
        {
          opacity: 1,
          transform: "translate3d(0, 0, 0)",
        },
      ];
    }

    return [
      {
        filter: "blur(10px)",
        opacity: 0,
        transform: `translateY(${fromY}px)`,
      },
      {
        filter: "blur(5px)",
        opacity: 0.5,
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
      if (from.filter) segment.style.filter = from.filter;
      else segment.style.filter = "none";
      segment.style.opacity = String(from.opacity);
      segment.style.transform = from.transform;
    });

    el._blurSegments = segments;
    el._blurDirection = direction;
    el._blurPrepared = true;
  }

  function play(el) {
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
        delay: (index * delay),
        easing: "linear",
        fill: "forwards",
      });

      if (index === segments.length - 1) {
        animation.onfinish = () => {
          el._blurDone = true;
        };
      }
    });
  }

  function init() {
    if (initialized) return;
    initialized = true;

    const elements = Array.from(document.querySelectorAll("[data-blur]"));
    if (!elements.length) return;

    elements.forEach(prepare);

    if (reducedMotion) {
      elements.forEach(play);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          play(entry.target);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: Number(
          elements[0]?.dataset.blurThreshold ?? defaults.threshold
        ),
        rootMargin:
          elements[0]?.dataset.blurMargin || defaults.rootMargin,
      }
    );

    elements.forEach((el) => observer.observe(el));
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
