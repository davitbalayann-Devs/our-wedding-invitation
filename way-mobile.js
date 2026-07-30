(() => {
  const stage = document.querySelector(".way__stage");
  const road = document.querySelector(".way__mobile-road--full");
  const bed = road?.querySelector(".way__mobile-road-bed");
  const dash = road?.querySelector(".way__mobile-road-dash");
  const villaArt = document.querySelector(".way__card--villa .way__card-art");
  const restaurantArt = document.querySelector(
    ".way__card--restaurant .way__card-art"
  );
  if (!stage || !road || !villaArt || !restaurantArt) return;

  const mobileQuery = window.matchMedia("(max-width: 860px)");
  let raf = 0;
  let lastWidth = window.innerWidth;

  function formatPath(data) {
    if (!data?.start || !Array.isArray(data.segments)) return null;
    const n = (v) => Math.round(Number(v) * 10) / 10;
    let d = `M ${n(data.start.x)} ${n(data.start.y)}`;
    for (const s of data.segments) {
      d += `\n                   C ${n(s.control1.x)} ${n(s.control1.y)}, ${n(s.control2.x)} ${n(s.control2.y)}, ${n(s.end.x)} ${n(s.end.y)}`;
    }
    return d;
  }

  async function applyRoadPoints() {
    if (!bed || !dash) return;
    try {
      const res = await fetch(`way-road-points.json?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      const d = formatPath(data);
      if (!d) return;
      bed.setAttribute("d", d);
      dash.setAttribute("d", d);
      const width = Number(data.strokeWidth);
      if (Number.isFinite(width) && width > 0) {
        bed.style.strokeWidth = String(width);
        dash.style.strokeWidth = String(Math.max(1, width * 0.18));
      }
      requestLayout();
    } catch (_) {
      /* keep HTML fallback path */
    }
  }

  function layout() {
    const editing =
      document.documentElement.classList.contains("way-edit") ||
      document.documentElement.classList.contains("road-editor");
    if (!mobileQuery.matches && !editing) {
      road.style.removeProperty("top");
      road.style.removeProperty("height");
      return;
    }

    const stageRect = stage.getBoundingClientRect();
    const villaRect = villaArt.getBoundingClientRect();
    const restRect = restaurantArt.getBoundingClientRect();

    // Start mid-villa art, end under restaurant art (not the address text).
    const top = villaRect.top - stageRect.top + villaRect.height * 0.45;
    const bottom = restRect.top - stageRect.top + restRect.height * 0.78;
    const height = Math.max(180, bottom - top);

    road.style.top = `${top}px`;
    road.style.height = `${height}px`;
    road.style.bottom = "auto";
  }

  function requestLayout() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      layout();
    });
  }

  function onResize() {
    const width = window.innerWidth;
    const editing =
      document.documentElement.classList.contains("way-edit") ||
      document.documentElement.classList.contains("road-editor");
    // Ignore Safari chrome height-only resizes (unless editing).
    if (width === lastWidth && mobileQuery.matches && !editing) return;
    lastWidth = width;
    requestLayout();
  }

  applyRoadPoints();
  layout();
  window.addEventListener("load", () => {
    applyRoadPoints();
    layout();
  });
  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("orientationchange", () => {
    lastWidth = -1;
    window.setTimeout(requestLayout, 250);
  });
  window.addEventListener("pageshow", applyRoadPoints);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") applyRoadPoints();
  });

  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", layout);
  } else if (typeof mobileQuery.addListener === "function") {
    mobileQuery.addListener(layout);
  }

  if (document.fonts?.ready) document.fonts.ready.then(requestLayout);

  if ("ResizeObserver" in window) {
    new ResizeObserver(requestLayout).observe(stage);
    new ResizeObserver(requestLayout).observe(villaArt);
    new ResizeObserver(requestLayout).observe(restaurantArt);
  }
})();
