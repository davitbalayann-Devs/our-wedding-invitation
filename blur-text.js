(() => {
  const gsapLib = window.gsap;
  const SplitTextLib = window.SplitText;
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const defaults = {
    delay: 30,
    duration: 0.4,
    ease: "power3.out",
    splitType: "words",
    from: { opacity: 0, y: 40 },
    to: { opacity: 1, y: 0 },
    threshold: 0.1,
    rootMargin: "-100px",
    staggerMs: 420,
    showCallback: false,
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

  function getSplitTargets(splitInstance, splitType) {
    if (splitType.includes("chars") && splitInstance.chars.length) {
      return splitInstance.chars;
    }
    if (splitType.includes("words") && splitInstance.words.length) {
      return splitInstance.words;
    }
    if (splitType.includes("lines") && splitInstance.lines.length) {
      return splitInstance.lines;
    }
    return splitInstance.words.length
      ? splitInstance.words
      : splitInstance.chars.length
        ? splitInstance.chars
        : splitInstance.lines;
  }

  function prepare(el) {
    if (el._splitPrepared) return;

    el.classList.add("blur-text");
    if (el.hasAttribute("data-blur-wrap")) {
      el.classList.add("blur-text--wrap");
    }
    // Flex parents collapse spaces between SplitText word spans.
    if (!el.classList.contains("invite__message")) {
      el.style.justifyContent = justifyFromTextAlign(el);
    } else {
      el.style.textAlign = "center";
      el.style.removeProperty("justify-content");
    }

    if (reducedMotion || !gsapLib || !SplitTextLib) {
      el._splitPrepared = true;
      return;
    }

    const splitType = el.dataset.blurBy || defaults.splitType;
    const split = new SplitTextLib(el, {
      type: splitType,
      linesClass: "split-line",
      wordsClass: "blur-segment",
      charsClass: "blur-segment",
      reduceWhiteSpace: false,
      smartWrap: false,
    });

    const targets = getSplitTargets(split, splitType);
    gsapLib.set(targets, defaults.from);

    el._splitInstance = split;
    el._splitTargets = targets;
    el._splitPrepared = true;
  }

  function playSplit(el) {
    if (el._splitDone || el._splitPlaying) return;

    prepare(el);

    if (reducedMotion || !gsapLib || !SplitTextLib) {
      el._splitDone = true;
      el.style.opacity = "1";
      return;
    }

    const targets = el._splitTargets || [];
    if (!targets.length) {
      el._splitDone = true;
      return;
    }

    const delay = Number(el.dataset.blurDelay ?? defaults.delay);
    const duration = Number(el.dataset.blurDuration ?? defaults.duration);
    const ease = el.dataset.blurEase || defaults.ease;
    const showCallback =
      el.dataset.showCallback === "true" ? true : defaults.showCallback;

    el._splitPlaying = true;

    gsapLib.fromTo(
      targets,
      defaults.from,
      {
        ...defaults.to,
        duration,
        ease,
        stagger: delay / 1000,
        onComplete: () => {
          el._splitDone = true;
          el._splitPlaying = false;
          if (showCallback) {
            console.log("All letters have animated!");
          }
          hintWayLocationLink(el);
        },
      }
    );
  }

  function hintWayLocationLink(el) {
    if (reducedMotion) return;
    if (!el?.closest?.(".way__card-copy")) return;

    const link = el.matches("a")
      ? el
      : el.querySelector("a[href]");
    if (!link || link.classList.contains("is-link-hint")) return;

    // Restart cleanly if class somehow lingered.
    link.classList.remove("is-link-hint");
    void link.offsetWidth;
    link.classList.add("is-link-hint");

    const clear = () => link.classList.remove("is-link-hint");
    link.addEventListener("animationend", clear, { once: true });
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
        if (el.hasAttribute("data-blur")) playSplit(el);
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

    // Ensure translations are applied before SplitText reads the DOM.
    window.I18N?.apply?.();

    const splitEls = Array.from(document.querySelectorAll("[data-blur]"));
    splitEls.forEach(prepare);

    window.fitInviteMessage?.();

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

  function boot() {
    // Wait until the guest picks a language so SplitText reads final copy.
    if (!window.I18N?.localeChosen) {
      window.addEventListener(
        "i18n:ready",
        () => whenReady(() => requestAnimationFrame(init)),
        { once: true }
      );
      return;
    }
    whenReady(() => requestAnimationFrame(init));
  }

  boot();
  window.addEventListener("load", () => {
    if (window.I18N?.localeChosen) {
      whenReady(() => requestAnimationFrame(init));
    }
  });
})();
