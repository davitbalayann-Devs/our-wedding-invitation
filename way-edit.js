(() => {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("wayedit")) return;

  document.documentElement.classList.add("way-edit");

  const VIEW_X = -80;
  const VIEW_W = 260;
  const VIEW_H = 1000;
  const POINTS_URL = "way-road-points.json";

  function parsePath(d) {
    const nums = String(d)
      .replace(/[MCZLQAST]/,/gi, " ")
      .trim()
      .split(/\s+/)
      .map(Number)
      .filter((n) => Number.isFinite(n));

    if (nums.length < 2 || (nums.length - 2) % 6 !== 0) {
      return null;
    }

    const start = [nums[0], nums[1]];
    const cubics = [];
    for (let i = 2; i < nums.length; i += 6) {
      cubics.push({
        c1: [nums[i], nums[i + 1]],
        c2: [nums[i + 2], nums[i + 3]],
        end: [nums[i + 4], nums[i + 5]],
      });
    }
    return { start, cubics };
  }

  function modelFromJson(data) {
    if (!data?.start || !Array.isArray(data.segments)) return null;
    return {
      start: [Number(data.start.x), Number(data.start.y)],
      cubics: data.segments.map((s) => ({
        c1: [Number(s.control1.x), Number(s.control1.y)],
        c2: [Number(s.control2.x), Number(s.control2.y)],
        end: [Number(s.end.x), Number(s.end.y)],
      })),
      strokeWidth: Number(data.strokeWidth) || 7.5,
    };
  }

  function formatPath(model) {
    const n = (v) => Math.round(v * 10) / 10;
    let d = `M ${n(model.start[0])} ${n(model.start[1])}`;
    for (const c of model.cubics) {
      d += `\n                   C ${n(c.c1[0])} ${n(c.c1[1])}, ${n(c.c2[0])} ${n(c.c2[1])}, ${n(c.end[0])} ${n(c.end[1])}`;
    }
    return d;
  }

  function formatJson(model, strokeWidth) {
    const n = (v) => Math.round(v * 10) / 10;
    return JSON.stringify(
      {
        viewBox: [VIEW_X, 0, VIEW_W, VIEW_H],
        strokeWidth: n(strokeWidth),
        note: "Edit visually at road-editor.html. Main site reads this file.",
        start: { x: n(model.start[0]), y: n(model.start[1]) },
        segments: model.cubics.map((c, i) => ({
          id: i + 1,
          control1: { x: n(c.c1[0]), y: n(c.c1[1]) },
          control2: { x: n(c.c2[0]), y: n(c.c2[1]) },
          end: { x: n(c.end[0]), y: n(c.end[1]) },
        })),
      },
      null,
      2
    );
  }

  async function loadPointsFile() {
    try {
      const res = await fetch(`${POINTS_URL}?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return null;
      return modelFromJson(await res.json());
    } catch (_) {
      return null;
    }
  }

  async function boot() {
    const road = document.querySelector(".way__mobile-road--full");
    const bed = road?.querySelector(".way__mobile-road-bed");
    const dash = road?.querySelector(".way__mobile-road-dash");
    const stage = document.querySelector(".way__stage");
    if (!road || !bed || !dash || !stage) {
      window.setTimeout(boot, 50);
      return;
    }

    const forceMobile = () => {
      document.documentElement.classList.add("way-edit");
      if (window.innerWidth > 860) {
        stage.style.display = "flex";
        stage.style.flexDirection = "column";
      }
      window.dispatchEvent(new Event("resize"));
    };
    forceMobile();

    const fromFile = await loadPointsFile();
    const fallback = parsePath(bed.getAttribute("d"));
    let model = fromFile
      ? { start: fromFile.start, cubics: fromFile.cubics }
      : fallback;
    let strokeWidth = fromFile?.strokeWidth || parseFloat(getComputedStyle(bed).strokeWidth) || 7.5;
    let drag = null;

    const panel = document.createElement("aside");
    panel.className = "way-edit-panel";
    panel.innerHTML = `
      <header class="way-edit-panel__head">
        <strong>Road points</strong>
        <button type="button" class="way-edit-panel__close" aria-label="Close">×</button>
      </header>
      <p class="way-edit-panel__hint">
        Drag blue anchors / orange handles.
        Then <strong>Copy JSON</strong> → paste into <code>way-road-points.json</code> and send me the file.
      </p>
      <label class="way-edit-field">
        <span>Width</span>
        <input data-edit="width" type="range" min="3" max="16" step="0.5" />
        <output data-edit="width-out"></output>
      </label>
      <div class="way-edit-actions">
        <button type="button" data-edit="add">+ Segment</button>
        <button type="button" data-edit="reload">Reload file</button>
        <button type="button" data-edit="copy" class="way-edit-actions__primary">Copy JSON</button>
      </div>
      <textarea class="way-edit-code" data-edit="code" readonly rows="14"></textarea>
      <p class="way-edit-status" data-edit="status" hidden></p>
    `;
    document.body.appendChild(panel);

    const widthInput = panel.querySelector('[data-edit="width"]');
    const widthOut = panel.querySelector('[data-edit="width-out"]');
    const codeBox = panel.querySelector('[data-edit="code"]');
    const status = panel.querySelector('[data-edit="status"]');

    const overlay = document.createElement("div");
    overlay.className = "way-edit-overlay way-edit-overlay--road";
    overlay.innerHTML = `<svg class="way-edit-guides" viewBox="${VIEW_X} 0 ${VIEW_W} ${VIEW_H}" preserveAspectRatio="none" overflow="visible"></svg><div class="way-edit-handles"></div>`;
    stage.appendChild(overlay);
    const guides = overlay.querySelector(".way-edit-guides");
    const handlesRoot = overlay.querySelector(".way-edit-handles");

    function showStatus(msg) {
      status.hidden = false;
      status.textContent = msg;
      window.clearTimeout(showStatus._t);
      showStatus._t = window.setTimeout(() => {
        status.hidden = true;
      }, 2600);
    }

    function applyPath() {
      const d = formatPath(model);
      bed.setAttribute("d", d);
      dash.setAttribute("d", d);
      bed.style.strokeWidth = String(strokeWidth);
      dash.style.strokeWidth = String(Math.max(1, strokeWidth * 0.18));
      codeBox.value = formatJson(model, strokeWidth);
      widthInput.value = String(strokeWidth);
      widthOut.textContent = strokeWidth.toFixed(1);
    }

    function syncOverlayBox() {
      const stageRect = stage.getBoundingClientRect();
      const roadRect = road.getBoundingClientRect();
      overlay.style.left = `${roadRect.left - stageRect.left}px`;
      overlay.style.top = `${roadRect.top - stageRect.top}px`;
      overlay.style.width = `${roadRect.width}px`;
      overlay.style.height = `${roadRect.height}px`;
    }

    function renderGuides() {
      const parts = [];
      let prev = model.start;
      model.cubics.forEach((c) => {
        parts.push(
          `<line x1="${prev[0]}" y1="${prev[1]}" x2="${c.c1[0]}" y2="${c.c1[1]}" />`
        );
        parts.push(
          `<line x1="${c.end[0]}" y1="${c.end[1]}" x2="${c.c2[0]}" y2="${c.c2[1]}" />`
        );
        prev = c.end;
      });
      guides.innerHTML = parts.join("");
    }

    function renderHandles() {
      syncOverlayBox();
      renderGuides();

      const nodes = [];
      nodes.push({
        type: "start",
        kind: "anchor",
        x: model.start[0],
        y: model.start[1],
        label: "S",
      });

      model.cubics.forEach((c, i) => {
        nodes.push({
          type: "c1",
          kind: "control",
          index: i,
          x: c.c1[0],
          y: c.c1[1],
          label: "",
        });
        nodes.push({
          type: "c2",
          kind: "control",
          index: i,
          x: c.c2[0],
          y: c.c2[1],
          label: "",
        });
        nodes.push({
          type: "end",
          kind: "anchor",
          index: i,
          x: c.end[0],
          y: c.end[1],
          label: String(i + 1),
        });
      });

      handlesRoot.innerHTML = nodes
        .map((node) => {
          const left = ((node.x - VIEW_X) / VIEW_W) * 100;
          const top = (node.y / VIEW_H) * 100;
          const cls =
            node.kind === "control"
              ? "way-edit-handle way-edit-handle--line"
              : "way-edit-handle way-edit-handle--point";
          const label = node.label ? `<span>${node.label}</span>` : "";
          return `<button type="button" class="${cls}" data-type="${node.type}" data-index="${node.index ?? ""}" style="left:${left}%;top:${top}%" aria-label="Point">${label}</button>`;
        })
        .join("");
    }

    function refresh() {
      applyPath();
      renderHandles();
    }

    function setPoint(type, index, x, y) {
      // No hard bounds — drag freely past the road strip edges.
      if (type === "start") {
        model.start = [x, y];
        return;
      }
      const cubic = model.cubics[index];
      if (!cubic) return;
      if (type === "c1") cubic.c1 = [x, y];
      if (type === "c2") cubic.c2 = [x, y];
      if (type === "end") cubic.end = [x, y];
    }

    panel.querySelector(".way-edit-panel__close").addEventListener("click", () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("wayedit");
      window.location.href = url.toString();
    });

    widthInput.addEventListener("input", () => {
      strokeWidth = Number(widthInput.value);
      refresh();
    });

    panel.querySelector('[data-edit="add"]').addEventListener("click", () => {
      const last = model.cubics[model.cubics.length - 1]?.end || model.start;
      const y = Math.min(VIEW_H - 20, last[1] + 80);
      model.cubics.push({
        c1: [last[0], last[1] + 25],
        c2: [50, y - 25],
        end: [50, y],
      });
      refresh();
    });

    panel.querySelector('[data-edit="reload"]').addEventListener("click", async () => {
      const loaded = await loadPointsFile();
      if (!loaded) {
        showStatus("Could not load way-road-points.json");
        return;
      }
      model = { start: loaded.start, cubics: loaded.cubics };
      strokeWidth = loaded.strokeWidth;
      refresh();
      showStatus("Loaded from way-road-points.json");
    });

    panel.querySelector('[data-edit="copy"]').addEventListener("click", async () => {
      const json = formatJson(model, strokeWidth);
      codeBox.value = json;
      try {
        await navigator.clipboard.writeText(json);
        showStatus("Copied — paste into way-road-points.json and send me the file");
      } catch (_) {
        codeBox.select();
        showStatus("Select & copy manually → paste into way-road-points.json");
      }
    });

    function clientToView(clientX, clientY) {
      const rect = overlay.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return null;
      return [
        VIEW_X + ((clientX - rect.left) / rect.width) * VIEW_W,
        ((clientY - rect.top) / rect.height) * VIEW_H,
      ];
    }

    function onPointerDown(event) {
      const handle = event.target.closest?.(".way-edit-handle");
      if (!handle || !overlay.contains(handle)) return;
      event.preventDefault();
      event.stopPropagation();
      drag = {
        type: handle.dataset.type,
        index: handle.dataset.index === "" ? null : Number(handle.dataset.index),
        pointerId: event.pointerId,
      };
      handle.classList.add("is-dragging");
      try {
        handle.setPointerCapture(event.pointerId);
      } catch (_) {
        /* noop */
      }
    }

    function onPointerMove(event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const pt = clientToView(event.clientX, event.clientY);
      if (!pt) return;
      setPoint(drag.type, drag.index, pt[0], pt[1]);
      applyPath();
      renderGuides();
      const handle = handlesRoot.querySelector(
        `.way-edit-handle[data-type="${drag.type}"][data-index="${drag.index ?? ""}"]`
      );
      if (handle) {
        handle.style.left = `${((pt[0] - VIEW_X) / VIEW_W) * 100}%`;
        handle.style.top = `${(pt[1] / VIEW_H) * 100}%`;
      }
    }

    function onPointerUp(event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      drag = null;
      handlesRoot
        .querySelectorAll(".way-edit-handle.is-dragging")
        .forEach((el) => el.classList.remove("is-dragging"));
      renderHandles();
    }

    function onDoubleClick(event) {
      const handle = event.target.closest?.(".way-edit-handle--point");
      if (!handle || handle.dataset.type === "start") return;
      if (handle.dataset.type !== "end") return;
      event.preventDefault();
      const index = Number(handle.dataset.index);
      if (model.cubics.length <= 2) {
        showStatus("Keep at least 2 segments");
        return;
      }
      model.cubics.splice(index, 1);
      refresh();
      showStatus(`Deleted segment ${index + 1}`);
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("pointercancel", onPointerUp, true);
    document.addEventListener("dblclick", onDoubleClick, true);

    window.addEventListener("resize", () => {
      window.requestAnimationFrame(renderHandles);
    });

    if (gate) {
      gate.hidden = true;
      gate.style.display = "none";
      document.documentElement.classList.remove("is-gated");
      document.body.classList.remove("is-gated");
    }
    const langGate = document.getElementById("lang-gate");
    if (langGate) {
      langGate.hidden = true;
      langGate.style.display = "none";
    }
    if (!window.I18N?.localeChosen) {
      window.I18N?.setLocale?.(window.I18N.getStoredLocale?.() || "en");
    }

    window.setTimeout(() => {
      document.querySelector(".way")?.scrollIntoView({ block: "start" });
      refresh();
      showStatus(
        fromFile
          ? "Loaded way-road-points.json"
          : "Using path from HTML (file not found)"
      );
    }, 200);

    if ("ResizeObserver" in window) {
      new ResizeObserver(() => {
        if (!drag) renderHandles();
      }).observe(road);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
