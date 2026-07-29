(() => {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("wayedit")) return;

  document.documentElement.classList.add("way-edit");

  const PAD = 56; // keep out-of-box points hittable

  function boot() {
    const api = window.WayMobile;
    if (!api?.pairs?.length) {
      window.setTimeout(boot, 50);
      return;
    }

    let activeId = api.pairs[0].id;
    let drag = null; // { type, pairId, index, pointerId }

    const panel = document.createElement("aside");
    panel.className = "way-edit-panel";
    panel.innerHTML = `
      <header class="way-edit-panel__head">
        <strong>Way line editor</strong>
        <button type="button" class="way-edit-panel__close" aria-label="Close editor">×</button>
      </header>
      <p class="way-edit-panel__hint">
        Drag any
        <span class="way-edit-swatch way-edit-swatch--point"></span> point ·
        <span class="way-edit-swatch way-edit-swatch--line"></span> line ·
        <span class="way-edit-swatch way-edit-swatch--car"></span> car.
        Double-click a blue point to delete it.
      </p>
      <label class="way-edit-field">
        <span>Route</span>
        <select data-edit="leg"></select>
      </label>
      <label class="way-edit-field">
        <span>Height</span>
        <input data-edit="height" type="range" min="0.55" max="1.8" step="0.01" />
        <output data-edit="height-out"></output>
      </label>
      <label class="way-edit-field">
        <span>Tilt (°)</span>
        <input data-edit="tilt" type="range" min="-60" max="60" step="0.5" />
        <output data-edit="tilt-out"></output>
      </label>
      <label class="way-edit-field">
        <span>Aspect</span>
        <input data-edit="aspect" type="range" min="0.3" max="1.1" step="0.01" />
        <output data-edit="aspect-out"></output>
      </label>
      <label class="way-edit-field">
        <span>Seed</span>
        <input data-edit="seed" type="number" step="1" />
        <button type="button" data-edit="seed-rand" title="Randomize seed">🎲</button>
      </label>
      <label class="way-edit-field way-edit-field--check">
        <input data-edit="leftward" type="checkbox" />
        <span>Leftward curve</span>
      </label>
      <div class="way-edit-actions">
        <button type="button" data-edit="snap-car">Snap car to line</button>
        <button type="button" data-edit="add">+ Point</button>
        <button type="button" data-edit="reset">Reset route</button>
        <button type="button" data-edit="copy" class="way-edit-actions__primary">Copy config</button>
      </div>
      <textarea class="way-edit-code" data-edit="code" readonly rows="8"></textarea>
      <p class="way-edit-status" data-edit="status" hidden></p>
    `;
    document.body.appendChild(panel);

    const legSelect = panel.querySelector('[data-edit="leg"]');
    const heightInput = panel.querySelector('[data-edit="height"]');
    const heightOut = panel.querySelector('[data-edit="height-out"]');
    const tiltInput = panel.querySelector('[data-edit="tilt"]');
    const tiltOut = panel.querySelector('[data-edit="tilt-out"]');
    const aspectInput = panel.querySelector('[data-edit="aspect"]');
    const aspectOut = panel.querySelector('[data-edit="aspect-out"]');
    const seedInput = panel.querySelector('[data-edit="seed"]');
    const leftwardInput = panel.querySelector('[data-edit="leftward"]');
    const codeBox = panel.querySelector('[data-edit="code"]');
    const status = panel.querySelector('[data-edit="status"]');

    api.pairs.forEach((pair) => {
      const opt = document.createElement("option");
      opt.value = pair.id;
      opt.textContent = pair.label || pair.id;
      legSelect.appendChild(opt);
    });

    const overlays = new Map();

    function activePair() {
      return api.pairs.find((p) => p.id === activeId) || api.pairs[0];
    }

    function formatConfig(pair) {
      const data = api.exportPair(pair);
      return `{
  aspect: ${data.aspect},
  anchorX: ${data.anchorX},
  anchorY: ${data.anchorY},
  carX: ${data.carX},
  carY: ${data.carY},
  heightScale: ${data.heightScale},
  tilt: ${data.tilt},
  leftward: ${data.leftward},
  seed: ${data.seed},
  carSplice: ${data.carSplice},
  waypoints: ${JSON.stringify(data.waypoints)},
}`;
    }

    function syncPanel() {
      const pair = activePair();
      legSelect.value = pair.id;
      heightInput.value = String(pair.heightScale ?? 1);
      heightOut.textContent = `${Number(pair.heightScale ?? 1).toFixed(2)}×`;
      tiltInput.value = String(pair.tilt);
      tiltOut.textContent = `${pair.tilt.toFixed(1)}°`;
      aspectInput.value = String(pair.aspect);
      aspectOut.textContent = pair.aspect.toFixed(2);
      seedInput.value = String(pair.seed);
      leftwardInput.checked = pair.leftward;
      codeBox.value = formatConfig(pair);
    }

    function ensureOverlay(pair) {
      const leg = document.querySelector(pair.leg);
      if (!leg) return null;
      let layer = overlays.get(pair.id);
      if (!layer) {
        layer = document.createElement("div");
        layer.className = "way-edit-overlay";
        layer.dataset.pair = pair.id;
        leg.appendChild(layer);
        overlays.set(pair.id, layer);
      }
      return layer;
    }

    function placeOverlay(layer, box) {
      layer.style.left = `${box.left - PAD}px`;
      layer.style.top = `${box.top - PAD}px`;
      layer.style.width = `${box.width + PAD * 2}px`;
      layer.style.height = `${box.height + PAD * 2}px`;
    }

    function pointPx(pt, box) {
      return {
        x: pt[0] * box.width + PAD,
        y: pt[1] * box.height + PAD,
      };
    }

    function rebuildHandles(pair) {
      const layer = ensureOverlay(pair);
      const box = pair._box;
      if (!layer || !box) {
        if (layer) layer.innerHTML = "";
        return;
      }

      placeOverlay(layer, box);

      const parts = [];
      pair.waypoints.forEach((pt, index) => {
        const { x, y } = pointPx(pt, box);
        parts.push(
          `<button type="button" class="way-edit-handle way-edit-handle--point" data-type="point" data-index="${index}" style="left:${x}px;top:${y}px" aria-label="Point ${index + 1}"><span>${index + 1}</span></button>`
        );
      });
      const line = pointPx([pair.anchorX, pair.anchorY], box);
      parts.push(
        `<button type="button" class="way-edit-handle way-edit-handle--line" data-type="line" style="left:${line.x}px;top:${line.y}px" aria-label="Line contact"></button>`
      );
      const car = pointPx(
        [
          Number.isFinite(pair.carX) ? pair.carX : pair.anchorX,
          Number.isFinite(pair.carY) ? pair.carY : pair.anchorY,
        ],
        box
      );
      parts.push(
        `<button type="button" class="way-edit-handle way-edit-handle--car" data-type="car" style="left:${car.x}px;top:${car.y}px" aria-label="Car position"></button>`
      );
      layer.innerHTML = parts.join("");
    }

    /** Move existing handles without destroying the captured drag target. */
    function updateHandlePositions(pair) {
      const layer = overlays.get(pair.id);
      const box = pair._box;
      if (!layer || !box) return;

      placeOverlay(layer, box);

      layer.querySelectorAll('.way-edit-handle[data-type="point"]').forEach((el) => {
        const index = Number(el.dataset.index);
        const pt = pair.waypoints[index];
        if (!pt) return;
        const { x, y } = pointPx(pt, box);
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
      });

      const lineEl = layer.querySelector('.way-edit-handle[data-type="line"]');
      if (lineEl) {
        const { x, y } = pointPx([pair.anchorX, pair.anchorY], box);
        lineEl.style.left = `${x}px`;
        lineEl.style.top = `${y}px`;
      }

      const carEl = layer.querySelector('.way-edit-handle[data-type="car"]');
      if (carEl) {
        const { x, y } = pointPx(
          [
            Number.isFinite(pair.carX) ? pair.carX : pair.anchorX,
            Number.isFinite(pair.carY) ? pair.carY : pair.anchorY,
          ],
          box
        );
        carEl.style.left = `${x}px`;
        carEl.style.top = `${y}px`;
      }
    }

    function renderHandles({ force = false } = {}) {
      for (const pair of api.pairs) {
        const layer = overlays.get(pair.id);
        const needsBuild =
          force ||
          !layer ||
          layer.childElementCount === 0 ||
          layer.querySelectorAll('.way-edit-handle[data-type="point"]').length !==
            pair.waypoints.length;

        if (drag && drag.pairId === pair.id && !needsBuild) {
          updateHandlePositions(pair);
        } else if (drag && !needsBuild) {
          updateHandlePositions(pair);
        } else {
          rebuildHandles(pair);
        }
      }
    }

    function refresh() {
      api.invalidate();
      window.requestAnimationFrame(() => {
        renderHandles({ force: !drag });
        syncPanel();
      });
    }

    function showStatus(message) {
      status.hidden = false;
      status.textContent = message;
      window.clearTimeout(showStatus._t);
      showStatus._t = window.setTimeout(() => {
        status.hidden = true;
      }, 2200);
    }

    function clientToFrac(pair, clientX, clientY) {
      const box = pair._box;
      const layer = overlays.get(pair.id);
      if (!box || !layer) return null;
      const rect = layer.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return null;
      // Overlay is box + PAD on each side (may be subpixel-scaled by the browser).
      const fullW = box.width + PAD * 2;
      const fullH = box.height + PAD * 2;
      let x = ((clientX - rect.left) / rect.width) * fullW - PAD;
      let y = ((clientY - rect.top) / rect.height) * fullH - PAD;
      x /= box.width;
      y /= box.height;
      x = Math.min(1.35, Math.max(-0.35, x));
      y = Math.min(1.35, Math.max(-0.35, y));
      return [x, y];
    }

    panel.querySelector(".way-edit-panel__close").addEventListener("click", () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("wayedit");
      window.location.href = url.toString();
    });

    legSelect.addEventListener("change", () => {
      activeId = legSelect.value;
      const leg = document.querySelector(activePair().leg);
      leg?.scrollIntoView({ block: "center", behavior: "smooth" });
      syncPanel();
    });

    tiltInput.addEventListener("input", () => {
      activePair().tilt = Number(tiltInput.value);
      refresh();
    });

    heightInput.addEventListener("input", () => {
      activePair().heightScale = Number(heightInput.value);
      refresh();
    });

    aspectInput.addEventListener("input", () => {
      activePair().aspect = Number(aspectInput.value);
      refresh();
    });

    seedInput.addEventListener("change", () => {
      activePair().seed = Number(seedInput.value) || 0;
      refresh();
    });

    panel.querySelector('[data-edit="seed-rand"]').addEventListener("click", () => {
      activePair().seed = Math.floor(Math.random() * 1e9);
      refresh();
    });

    leftwardInput.addEventListener("change", () => {
      const pair = activePair();
      pair.leftward = leftwardInput.checked;
      const defaults = window.WayBrush.defaultWaypoints(pair.leftward);
      pair.waypoints = defaults.points.map(([x, y]) => [x, y]);
      pair.carSplice = defaults.carSplice;
      refresh();
    });

    panel.querySelector('[data-edit="snap-car"]').addEventListener("click", () => {
      const pair = activePair();
      pair.carX = pair.anchorX;
      pair.carY = pair.anchorY;
      refresh();
      showStatus("Car snapped to line contact");
    });

    panel.querySelector('[data-edit="add"]').addEventListener("click", () => {
      const pair = activePair();
      const last = pair.waypoints[pair.waypoints.length - 1] || [0.5, 0.5];
      const prev = pair.waypoints[pair.waypoints.length - 2] || [0.5, 0.4];
      pair.waypoints.push([
        Math.min(1.05, last[0] * 2 - prev[0]),
        Math.min(1.08, last[1] * 2 - prev[1]),
      ]);
      refresh();
    });

    panel.querySelector('[data-edit="reset"]').addEventListener("click", () => {
      const pair = activePair();
      const defaults = window.WayBrush.defaultWaypoints(pair.leftward);
      pair.waypoints = defaults.points.map(([x, y]) => [x, y]);
      pair.carSplice = defaults.carSplice;
      pair.heightScale = 1;
      pair.carX = pair.anchorX;
      pair.carY = pair.anchorY;
      refresh();
      showStatus("Route reset to defaults");
    });

    panel.querySelector('[data-edit="copy"]').addEventListener("click", async () => {
      const text = formatConfig(activePair());
      codeBox.value = text;
      try {
        await navigator.clipboard.writeText(text);
        showStatus("Copied — paste into way-mobile.js pairs");
      } catch (_) {
        codeBox.select();
        showStatus("Select & copy the config manually");
      }
    });

    function onPointerDown(event) {
      const handle = event.target.closest?.(".way-edit-handle");
      if (!handle) return;
      const layer = handle.closest(".way-edit-overlay");
      if (!layer) return;
      event.preventDefault();
      event.stopPropagation();

      const pairId = layer.dataset.pair;
      drag = {
        type: handle.dataset.type,
        pairId,
        index: Number(handle.dataset.index),
        pointerId: event.pointerId,
      };
      activeId = pairId;
      syncPanel();
      handle.classList.add("is-dragging");
      try {
        handle.setPointerCapture(event.pointerId);
      } catch (_) {
        /* noop */
      }
    }

    function onPointerMove(event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const pair = api.pairs.find((p) => p.id === drag.pairId);
      if (!pair) return;
      const frac = clientToFrac(pair, event.clientX, event.clientY);
      if (!frac) return;

      if (drag.type === "car") {
        pair.carX = frac[0];
        pair.carY = frac[1];
      } else if (drag.type === "line") {
        pair.anchorX = frac[0];
        pair.anchorY = frac[1];
      } else if (drag.type === "point") {
        pair.waypoints[drag.index] = frac;
      }

      // Repaint stroke; keep the same handle DOM so capture stays alive.
      api.invalidate();
      updateHandlePositions(pair);
      syncPanel();
    }

    function onPointerUp(event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      drag = null;
      document
        .querySelectorAll(".way-edit-handle.is-dragging")
        .forEach((el) => el.classList.remove("is-dragging"));
      renderHandles({ force: true });
      syncPanel();
    }

    function onDoubleClick(event) {
      const handle = event.target.closest?.(".way-edit-handle--point");
      if (!handle) return;
      const layer = handle.closest(".way-edit-overlay");
      if (!layer) return;
      event.preventDefault();
      const pair = api.pairs.find((p) => p.id === layer.dataset.pair);
      if (!pair || pair.waypoints.length <= 3) {
        showStatus("Keep at least 3 points");
        return;
      }
      const index = Number(handle.dataset.index);
      pair.waypoints.splice(index, 1);
      if (pair.carSplice > pair.waypoints.length) {
        pair.carSplice = pair.waypoints.length;
      }
      activeId = pair.id;
      refresh();
      showStatus(`Deleted point ${index + 1}`);
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("pointercancel", onPointerUp, true);
    document.addEventListener("dblclick", onDoubleClick, true);

    window.addEventListener("waymobile:layout", () => {
      if (drag) {
        const pair = api.pairs.find((p) => p.id === drag.pairId);
        if (pair) updateHandlePositions(pair);
        for (const p of api.pairs) {
          if (p.id !== drag.pairId) updateHandlePositions(p);
        }
      } else {
        renderHandles();
      }
    });

    const gate = document.getElementById("invite-gate");
    if (gate) {
      gate.hidden = true;
      gate.style.display = "none";
    }
    document.body.classList.add("invite-unlocked");

    const firstLeg = document.querySelector(api.pairs[0].leg);
    window.setTimeout(() => {
      firstLeg?.scrollIntoView({ block: "center" });
      refresh();
    }, 120);

    syncPanel();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
