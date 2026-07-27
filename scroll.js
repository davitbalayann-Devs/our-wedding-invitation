(() => {
  const content = document.querySelector("[data-scroll-content]");
  const scrollRoot = document.querySelector(".scroll-root");
  const items = Array.from(document.querySelectorAll("[data-scroll-item]")).map(
    (el) => ({
      el,
      speed: Number(el.dataset.speed || 1),
    })
  );

  const hero = document.querySelector(".hero");
  const invite = document.querySelector(".invite");
  const styling = document.querySelector(".styling");
  const countdown = document.querySelector(".countdown");
  const lightbox = document.getElementById("lightbox");

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const nativeScrollQuery = window.matchMedia(
    "(max-width: 900px), (hover: none) and (pointer: coarse)"
  );

  let useNativeScroll = nativeScrollQuery.matches;
  let target = window.scrollY || 0;
  let current = target;
  let ticking = false;
  let ease = 0.085;

  let snapLocked = false;
  let snapRaf = 0;
  let touchStartY = 0;
  let touchStartX = 0;
  let touchActive = false;

  function applyParallax(y) {
    if (reducedMotion) return;

    for (const item of items) {
      const offset = -y * (item.speed - 1);
      item.el.style.setProperty("--parallax-y", `${offset}px`);
    }
  }

  function clearParallax() {
    for (const item of items) {
      item.el.style.removeProperty("--parallax-y");
    }
  }

  function applyTransforms(y) {
    if (!content) return;

    if (useNativeScroll) {
      applyParallax(y);
      return;
    }

    content.style.setProperty("--scroll-y", `${-y}px`);
    applyParallax(y);
  }

  function syncMode() {
    useNativeScroll = nativeScrollQuery.matches;
    document.documentElement.classList.toggle(
      "is-native-scroll",
      useNativeScroll
    );

    ease = reducedMotion || useNativeScroll ? 1 : 0.085;

    if (useNativeScroll) {
      ticking = false;
      if (content) content.style.removeProperty("--scroll-y");
      if (scrollRoot) scrollRoot.style.height = "0px";

      if (reducedMotion) {
        clearParallax();
        return;
      }

      applyTransforms(window.scrollY || 0);
      return;
    }

    setScrollHeight();
    target = window.scrollY || 0;
    current = target;
    applyTransforms(current);
  }

  function setScrollHeight() {
    if (useNativeScroll || !content || !scrollRoot) return;
    const height = content.scrollHeight;
    scrollRoot.style.height = `${Math.ceil(height)}px`;
  }

  function tick() {
    if (useNativeScroll || snapLocked) {
      ticking = false;
      return;
    }

    current += (target - current) * ease;

    if (Math.abs(target - current) < 0.05) {
      current = target;
    }

    applyTransforms(current);

    if (Math.abs(target - current) >= 0.05) {
      requestAnimationFrame(tick);
    } else {
      ticking = false;
    }
  }

  function onScroll() {
    if (snapLocked) return;

    const y = window.scrollY || 0;

    if (useNativeScroll) {
      if (reducedMotion) return;
      target = y;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          applyTransforms(window.scrollY || 0);
          ticking = false;
        });
      }
      return;
    }

    target = y;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(tick);
    }
  }

  function onResize() {
    syncMode();
    if (reducedMotion || snapLocked) return;
    target = window.scrollY || 0;
    if (useNativeScroll) {
      applyTransforms(target);
      return;
    }
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(tick);
    }
  }

  function sectionScrollTop(el) {
    if (!el) return 0;
    if (useNativeScroll) {
      return el.getBoundingClientRect().top + (window.scrollY || 0);
    }
    return el.offsetTop;
  }

  function isLightboxOpen() {
    return Boolean(lightbox && !lightbox.hasAttribute("hidden"));
  }

  function isAnchored(el) {
    if (!el) return false;
    const top = el.getBoundingClientRect().top;
    const vh = window.innerHeight || 1;
    return top > -vh * 0.4 && top < vh * 0.4;
  }

  function snapDestination(direction) {
    if (isAnchored(hero) && direction > 0) return invite;
    if (isAnchored(invite) && direction < 0) return hero;
    if (isAnchored(styling) && direction > 0) return countdown;
    if (isAnchored(countdown) && direction < 0) return styling;
    return null;
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function notifyArrive(el) {
    document.dispatchEvent(
      new CustomEvent("section:arrive", { detail: { section: el } })
    );
  }

  function animateScrollTo(el) {
    if (!el) return;

    const end = Math.max(0, Math.round(sectionScrollTop(el)));
    const start = window.scrollY || 0;
    const distance = end - start;

    if (Math.abs(distance) < 2) {
      notifyArrive(el);
      return;
    }

    if (snapRaf) cancelAnimationFrame(snapRaf);
    snapLocked = true;
    ticking = false;

    const duration = reducedMotion
      ? 0
      : Math.min(1400, Math.max(900, Math.abs(distance) * 0.75));
    const t0 = performance.now();

    if (reducedMotion || duration === 0) {
      window.scrollTo(0, end);
      target = end;
      current = end;
      applyTransforms(end);
      snapLocked = false;
      notifyArrive(el);
      return;
    }

    function frame(now) {
      const t = Math.min(1, (now - t0) / duration);
      const y = start + distance * easeInOutCubic(t);

      window.scrollTo(0, y);
      target = y;
      current = y;
      applyTransforms(y);

      if (t < 1) {
        snapRaf = requestAnimationFrame(frame);
        return;
      }

      snapRaf = 0;
      window.scrollTo(0, end);
      target = end;
      current = end;
      applyTransforms(end);
      snapLocked = false;
      notifyArrive(el);
    }

    snapRaf = requestAnimationFrame(frame);
  }

  function trySnap(direction, event) {
    if (reducedMotion || snapLocked || isLightboxOpen()) return false;
    if (!direction) return false;

    const dest = snapDestination(direction);
    if (!dest) return false;

    if (event) event.preventDefault();
    animateScrollTo(dest);
    return true;
  }

  function onWheel(event) {
    if (event.ctrlKey) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

    if (snapLocked) {
      event.preventDefault();
      return;
    }

    const direction = event.deltaY > 6 ? 1 : event.deltaY < -6 ? -1 : 0;
    trySnap(direction, event);
  }

  function onTouchStart(event) {
    if (event.touches.length !== 1) return;
    touchActive = true;
    touchStartY = event.touches[0].clientY;
    touchStartX = event.touches[0].clientX;
  }

  function onTouchEnd(event) {
    if (!touchActive || snapLocked) {
      touchActive = false;
      return;
    }
    touchActive = false;

    const touch = event.changedTouches[0];
    if (!touch) return;

    const dy = touchStartY - touch.clientY;
    const dx = touchStartX - touch.clientX;
    if (Math.abs(dx) > Math.abs(dy)) return;
    if (Math.abs(dy) < 56) return;

    trySnap(dy > 0 ? 1 : -1, null);
  }

  function onKeyDown(event) {
    if (isLightboxOpen() || snapLocked) return;
    if (["PageDown", "ArrowDown", " "].includes(event.key)) {
      if (trySnap(1, event)) return;
    }
    if (["PageUp", "ArrowUp"].includes(event.key)) {
      if (trySnap(-1, event)) return;
    }
  }

  syncMode();

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("orientationchange", onResize, { passive: true });
  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("load", () => {
    syncMode();
    setScrollHeight();
  });

  if (typeof nativeScrollQuery.addEventListener === "function") {
    nativeScrollQuery.addEventListener("change", syncMode);
  } else if (typeof nativeScrollQuery.addListener === "function") {
    nativeScrollQuery.addListener(syncMode);
  }

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      setScrollHeight();
      if (useNativeScroll) syncMode();
    });
  }

  if ("ResizeObserver" in window && content) {
    new ResizeObserver(() => {
      if (!useNativeScroll) setScrollHeight();
    }).observe(content);
  }
})();
