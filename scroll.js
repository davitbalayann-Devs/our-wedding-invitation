(() => {
  const content = document.querySelector("[data-scroll-content]");
  const scrollRoot = document.querySelector(".scroll-root");
  const items = Array.from(document.querySelectorAll("[data-scroll-item]")).map(
    (el) => ({
      el,
      speed: Number(el.dataset.speed || 1),
    })
  );

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // Fake scroll + parallax fights iOS/Android momentum scrolling and causes jank.
  const nativeScrollQuery = window.matchMedia(
    "(max-width: 900px), (hover: none) and (pointer: coarse)"
  );

  let useNativeScroll = nativeScrollQuery.matches;
  let target = window.scrollY || 0;
  let current = target;
  let ticking = false;
  let ease = 0.07;

  function syncMode() {
    useNativeScroll = nativeScrollQuery.matches;
    document.documentElement.classList.toggle(
      "is-native-scroll",
      useNativeScroll
    );

    // Instant sync on phones; soft inertia only on desktop.
    ease = reducedMotion || useNativeScroll ? 1 : 0.07;

    if (useNativeScroll) {
      ticking = false;
      if (content) content.style.removeProperty("--scroll-y");
      for (const item of items) {
        item.el.style.removeProperty("--parallax-y");
      }
      if (scrollRoot) scrollRoot.style.height = "0px";
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

  function applyTransforms(y) {
    if (useNativeScroll || !content) return;

    content.style.setProperty("--scroll-y", `${-y}px`);

    for (const item of items) {
      const offset = -y * (item.speed - 1);
      item.el.style.setProperty("--parallax-y", `${offset}px`);
    }
  }

  function tick() {
    if (useNativeScroll) {
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
    if (useNativeScroll) return;
    target = window.scrollY || 0;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(tick);
    }
  }

  function onResize() {
    syncMode();
    if (useNativeScroll || reducedMotion) return;
    target = window.scrollY || 0;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(tick);
    }
  }

  syncMode();

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("orientationchange", onResize, { passive: true });
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
