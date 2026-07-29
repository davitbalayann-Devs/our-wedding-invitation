(() => {
  const stage = document.querySelector(".way__stage");
  if (!stage) return;

  /*
   * Stroke contact (anchorX/Y) and car position (carX/Y) are independent so the
   * car can sit slightly off the brush. heightScale stretches the line box.
   */
  function clonePoints(points) {
    return points.map(([x, y]) => [x, y]);
  }

  function withDefaults(pair) {
    const defaults =
      window.WayBrush?.defaultWaypoints?.(pair.leftward) || {
        points: [],
        carSplice: 0,
      };
    if (!pair.waypoints || pair.waypoints.length < 2) {
      pair.waypoints = clonePoints(defaults.points);
    }
    if (!Number.isFinite(pair.carSplice)) {
      pair.carSplice = defaults.carSplice;
    }
    if (!Number.isFinite(pair.heightScale)) {
      pair.heightScale = 1;
    }
    if (!Number.isFinite(pair.carX)) {
      pair.carX = pair.anchorX;
    }
    if (!Number.isFinite(pair.carY)) {
      pair.carY = pair.anchorY;
    }
    return pair;
  }

  const pairs = [
    withDefaults({
      id: "villa-church",
      label: "Villa → Church",
      from: ".way__card--villa .way__card-art",
      leg: ".way__mobile-leg--church",
      to: ".way__card--church .way__card-art",
      aspect: 0.51,
      anchorX: 0.4055,
      anchorY: 0.6231,
      carX: 0.3702,
      carY: 0.45,
      heightScale: 1.01,
      tilt: -19,
      leftward: false,
      seed: 629770121,
      carSplice: 8,
      waypoints: [
        [1.1725, -0.35],
        [0.8057, -0.295],
        [1.2947, -0.2872],
        [0.6237, -0.1189],
        [1.35, -0.0159],
        [1.35, 0.1914],
        [1.273, 0.3622],
        [-0.35, 0.3094],
        [1.2754, 0.6913],
        [1.35, 0.7247],
        [0.814, 0.8674],
        [0.5775, 1.0324],
        [0.6916, 1.095],
        [0.6753, 1.1602],
        [0.5531, 1.3258],
      ],
    }),
    withDefaults({
      id: "church-restaurant",
      label: "Church → Restaurant",
      from: ".way__card--church .way__card-art",
      leg: ".way__mobile-leg--restaurant",
      to: ".way__card--restaurant .way__card-art",
      aspect: 0.6,
      anchorX: 0.2081,
      anchorY: 0.7348,
      carX: 0.5194,
      carY: 0.45,
      heightScale: 1,
      tilt: -2.5,
      leftward: true,
      seed: 118,
      carSplice: 7,
      waypoints: [
        [0.33, -0.02],
        [0.5, 0.07],
        [0.7, 0.16],
        [0.87, 0.26],
        [1.2669, 0.2986],
        [1.3146, 0.4281],
        [1.1578, 0.6026],
        [-0.2759, 0.8725],
        [0.0968, 1.0851],
        [-0.1077, 1.0661],
        [0.1854, 1.0865],
        [0.1036, 1.2678],
        [0.4058, 1.2692],
        [0.5716, 1.3196],
      ],
    }),
  ];

  const SVG_NS = "http://www.w3.org/2000/svg";
  const mobileQuery = window.matchMedia("(max-width: 860px)");
  let raf = 0;
  let paintEpoch = 0;

  function editing() {
    return document.documentElement.classList.contains("way-edit");
  }

  function useMobilePaths() {
    return mobileQuery.matches || editing();
  }

  function pairSignature(pair, width, height) {
    return [
      paintEpoch,
      Math.round(width),
      Math.round(height),
      pair.anchorX,
      pair.anchorY,
      pair.carX,
      pair.carY,
      pair.heightScale,
      pair.tilt,
      pair.leftward ? 1 : 0,
      pair.seed,
      pair.aspect,
      pair.carSplice,
      JSON.stringify(pair.waypoints),
    ].join("|");
  }

  function paint(lineWrap, pair, width, height) {
    if (!window.WayBrush) return;
    let svg = lineWrap.querySelector("svg.way__mobile-line");
    if (!svg) {
      lineWrap.innerHTML = "";
      svg = document.createElementNS(SVG_NS, "svg");
      svg.setAttribute("class", "way__mobile-line");
      svg.setAttribute("aria-hidden", "true");
      svg.appendChild(document.createElementNS(SVG_NS, "path"));
      lineWrap.appendChild(svg);
    }
    const w = Math.round(width);
    const h = Math.round(height);
    const sig = pairSignature(pair, w, h);
    if (svg.dataset.sig === sig) return;
    svg.dataset.sig = sig;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const path = svg.firstChild;
    path.setAttribute("fill", "#DDD1B5");
    path.setAttribute(
      "d",
      window.WayBrush.stroke({
        w,
        h,
        ax: pair.anchorX,
        ay: pair.anchorY,
        deg: pair.tilt,
        leftward: pair.leftward,
        seed: pair.seed,
        waypoints: pair.waypoints,
        carSplice: pair.carSplice,
      })
    );
  }

  function buildMask() {
    if (editing()) {
      // Full stroke visible while editing control points.
      return "none";
    }
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
      leg.style.removeProperty("height");
      leg.style.removeProperty("--path-car-t");
      clearCar(leg.querySelector(".way__mobile-car"));
    }
  }

  function layout() {
    const mobile = useMobilePaths();
    stage.classList.toggle("way__stage--mobile-paths", mobile);

    for (const pair of pairs) {
      const from = document.querySelector(pair.from);
      const to = document.querySelector(pair.to);
      const leg = document.querySelector(pair.leg);
      if (!from || !to || !leg) continue;

      const lineWrap = leg.querySelector(".way__mobile-line-wrap");

      if (!mobile) {
        clearLine(lineWrap, leg);
        continue;
      }

      const legRect = leg.getBoundingClientRect();
      const fromRect = from.getBoundingClientRect();
      const toRect = to.getBoundingClientRect();
      const car = leg.querySelector(".way__mobile-car");

      const overlap = Math.min(48, fromRect.height * 0.1, toRect.height * 0.12);
      const topBase = fromRect.bottom - legRect.top - overlap;
      const end = toRect.top - legRect.top + overlap;
      const baseHeight = Math.max(end - topBase, 140);
      const heightScale = Number.isFinite(pair.heightScale) ? pair.heightScale : 1;
      const height = Math.max(120, baseHeight * heightScale);
      const top = topBase - (height - baseHeight) / 2;

      const maxW = legRect.width * 0.86;
      const width = Math.min(maxW, height * pair.aspect);
      const left = (legRect.width - width) / 2;

      leg.style.height = `${Math.max(120, 140 * heightScale)}px`;

      // Mobile lines are off — keep any leftover wrap cleared/hidden.
      if (lineWrap) {
        lineWrap.innerHTML = "";
        lineWrap.style.display = "none";
      }

      if (car) {
        const cx = Number.isFinite(pair.carX) ? pair.carX : pair.anchorX;
        const cy = Number.isFinite(pair.carY) ? pair.carY : pair.anchorY;
        car.style.left = `${left + width * cx}px`;
        car.style.top = `${top + height * cy}px`;
        leg.style.setProperty("--path-car-t", String(cy));
        car.style.removeProperty("transform");
        car.style.removeProperty("animation");
      }

      pair._box = { left, top, width, height, leg };
    }
  }

  function requestLayout() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      layout();
      window.dispatchEvent(new CustomEvent("waymobile:layout"));
    });
  }

  function invalidate() {
    paintEpoch += 1;
    requestLayout();
  }

  function exportPair(pair) {
    return {
      id: pair.id,
      label: pair.label,
      aspect: pair.aspect,
      anchorX: Number(pair.anchorX.toFixed(4)),
      anchorY: Number(pair.anchorY.toFixed(4)),
      carX: Number(pair.carX.toFixed(4)),
      carY: Number(pair.carY.toFixed(4)),
      heightScale: Number(pair.heightScale.toFixed(3)),
      tilt: Number(pair.tilt.toFixed(2)),
      leftward: pair.leftward,
      seed: pair.seed,
      carSplice: pair.carSplice,
      waypoints: pair.waypoints.map(([x, y]) => [
        Number(x.toFixed(4)),
        Number(y.toFixed(4)),
      ]),
    };
  }

  window.WayMobile = {
    pairs,
    layout: requestLayout,
    invalidate,
    exportPair,
    exportAll: () => pairs.map(exportPair),
    editing,
  };

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
