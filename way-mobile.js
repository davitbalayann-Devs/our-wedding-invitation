(() => {
  const stage = document.querySelector(".way__stage");
  if (!stage) return;

  const pairs = [
    {
      from: ".way__card--villa .way__card-art",
      leg: ".way__mobile-leg--church",
      to: ".way__card--church .way__card-art",
      mirror: false,
    },
    {
      from: ".way__card--church .way__card-art",
      leg: ".way__mobile-leg--restaurant",
      to: ".way__card--restaurant .way__card-art",
      mirror: true,
    },
  ];

  const mobileQuery = window.matchMedia("(max-width: 860px)");
  let raf = 0;

  /**
   * Open stroke: under art → aside past text → through path midpoint (car) → next art.
   * viewBox 0 0 200 100. carY is the path midpoint (~50).
   */
  function ribbonPath(carY, mirror, textEndY) {
    const cy = Math.min(72, Math.max(38, carY));
    const ty = Math.min(cy - 12, Math.max(16, textEndY || cy * 0.4));
    const x = (v) => (mirror ? 200 - v : v);
    const y = (t) => Math.round(t * 10) / 10;

    return [
      `M100 0`,
      `C ${x(78)} ${y(ty * 0.25)}, ${x(28)} ${y(ty * 0.55)}, ${x(18)} ${y(ty)}`,
      `C ${x(22)} ${y((ty + cy) * 0.5)}, ${x(70)} ${y(cy - 5)}, 100 ${y(cy)}`,
      `C ${x(122)} ${y(cy + 8)}, ${x(118)} ${y((cy + 100) / 2)}, 100 100`,
    ].join(" ");
  }

  function buildMask() {
    return `linear-gradient(
      to bottom,
      transparent 0%,
      #000 8%,
      #000 92%,
      transparent 100%
    )`;
  }

  function clearCar(car) {
    if (!car) return;
    car.style.removeProperty("top");
    car.style.removeProperty("left");
  }

  function clearLine(lineWrap, leg) {
    if (!lineWrap) return;
    lineWrap.style.removeProperty("top");
    lineWrap.style.removeProperty("height");
    lineWrap.style.removeProperty("left");
    lineWrap.style.removeProperty("right");
    lineWrap.style.removeProperty("width");
    lineWrap.style.removeProperty("bottom");
    lineWrap.style.removeProperty("-webkit-mask-image");
    lineWrap.style.removeProperty("mask-image");
    if (leg) {
      leg.style.removeProperty("--path-car-t");
      clearCar(leg.querySelector(".way__mobile-car"));
    }
  }

  function layout() {
    const mobile = mobileQuery.matches;
    stage.classList.toggle("way__stage--mobile-paths", mobile);

    for (const pair of pairs) {
      const from = document.querySelector(pair.from);
      const to = document.querySelector(pair.to);
      const leg = document.querySelector(pair.leg);
      const lineWrap = leg?.querySelector(".way__mobile-line-wrap");
      const line = leg?.querySelector(".way__mobile-line");
      const brush = line?.querySelector(".way__mobile-brush");
      if (!from || !to || !leg || !lineWrap || !line) continue;

      if (!mobile) {
        clearLine(lineWrap, leg);
        continue;
      }

      const legRect = leg.getBoundingClientRect();
      const fromRect = from.getBoundingClientRect();
      const toRect = to.getBoundingClientRect();
      const car = leg.querySelector(".way__mobile-car");
      const fromCopy = from.closest(".way__card")?.querySelector(".way__card-copy");

      const overlap = Math.min(40, fromRect.height * 0.09, toRect.height * 0.12);
      const top = fromRect.bottom - legRect.top - overlap;
      const end = toRect.top - legRect.top + overlap;
      const height = Math.max(end - top, 96);
      const lineAbsTop = legRect.top + top;

      lineWrap.style.left = "4%";
      lineWrap.style.right = "4%";
      lineWrap.style.width = "auto";
      lineWrap.style.bottom = "auto";
      lineWrap.style.top = `${top}px`;
      lineWrap.style.height = `${height}px`;

      const mask = buildMask();
      lineWrap.style.webkitMaskImage = mask;
      lineWrap.style.maskImage = mask;

      // Sit the car on the path midpoint, then nudge slightly upward.
      const carT = 0.46;
      const carTop = top + height * carT;

      let textEndT = 0.32;
      if (fromCopy) {
        const r = fromCopy.getBoundingClientRect();
        textEndT = Math.min(carT - 0.08, Math.max(0.16, (r.bottom + 8 - lineAbsTop) / height));
      }

      if (car) {
        car.style.left = "50%";
        car.style.top = `${carTop}px`;
        leg.style.setProperty("--path-car-t", String(carT));
      }

      if (brush) {
        brush.setAttribute("d", ribbonPath(carT * 100, pair.mirror, textEndT * 100));
        brush.setAttribute("fill", "none");
        brush.setAttribute("stroke", "#DDD1B5");
        brush.setAttribute("stroke-width", "8");
        brush.setAttribute("stroke-linecap", "round");
        brush.setAttribute("stroke-linejoin", "round");
        brush.setAttribute("vector-effect", "non-scaling-stroke");
      }
    }
  }

  function requestLayout() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      layout();
    });
  }

  layout();
  window.addEventListener("resize", requestLayout, { passive: true });
  window.addEventListener("orientationchange", requestLayout, { passive: true });
  window.addEventListener("scroll", requestLayout, { passive: true });
  window.addEventListener("load", layout);

  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", layout);
  } else if (typeof mobileQuery.addListener === "function") {
    mobileQuery.addListener(layout);
  }

  if (document.fonts?.ready) {
    document.fonts.ready.then(requestLayout);
  }

  if ("ResizeObserver" in window) {
    new ResizeObserver(requestLayout).observe(stage);
    pairs.forEach((pair) => {
      const from = document.querySelector(pair.from);
      const to = document.querySelector(pair.to);
      if (from) new ResizeObserver(requestLayout).observe(from);
      if (to) new ResizeObserver(requestLayout).observe(to);
    });
  }
})();
