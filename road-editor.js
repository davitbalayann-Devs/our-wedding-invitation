(() => {
  const VIEW_X = -80;
  const VIEW_W = 260;
  const VIEW_H = 1000;
  const params = new URLSearchParams(window.location.search);
  const noVilla = params.has("no-villa");
  const VARIANT = noVilla ? "no-villa" : "full";
  const POINTS_URL = noVilla
    ? "way-road-points-no-villa.json"
    : "way-road-points.json";
  const SAVE_URL = `/api/road-points?variant=${encodeURIComponent(VARIANT)}`;
  const POINTS_FILE = noVilla
    ? "way-road-points-no-villa.json"
    : "way-road-points.json";

  if (noVilla) {
    document.documentElement.classList.add("no-villa");
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

  function toJson(model, strokeWidth) {
    const n = (v) => Math.round(v * 10) / 10;
    return {
      viewBox: [VIEW_X, 0, VIEW_W, VIEW_H],
      strokeWidth: n(strokeWidth),
      variant: VARIANT,
      note: noVilla
        ? "Auto-saved by road-editor.html?no-villa=1. Used by ?no-villa=1 invite."
        : "Auto-saved by road-editor.html. Main site reads this file.",
      start: { x: n(model.start[0]), y: n(model.start[1]) },
      segments: model.cubics.map((c, i) => ({
        id: i + 1,
        control1: { x: n(c.c1[0]), y: n(c.c1[1]) },
        control2: { x: n(c.c2[0]), y: n(c.c2[1]) },
        end: { x: n(c.end[0]), y: n(c.end[1]) },
      })),
    };
  }

  async function loadPoints() {
    const res = await fetch(`${POINTS_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Cannot load ${POINTS_FILE}`);
    return modelFromJson(await res.json());
  }

  async function savePoints(payload) {
    const res = await fetch(SAVE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `Save failed (${res.status})`);
    }
    return data;
  }

  async function boot() {
    const road = document.querySelector(".way__mobile-road--full");
    const bed = road?.querySelector(".way__mobile-road-bed");
    const dash = road?.querySelector(".way__mobile-road-dash");
    const stage = document.querySelector(".way__stage");
    const statusEl = document.querySelector("[data-road-status]");
    const widthInput = document.querySelector('[data-edit="width"]');
    const widthOut = document.querySelector('[data-edit="width-out"]');
    const titleEl = document.querySelector("[data-road-editor-title]");
    const previewLink = document.querySelector("[data-road-preview]");
    if (!road || !bed || !dash || !stage || !widthInput || !widthOut) return;

    if (titleEl) {
      titleEl.textContent = noVilla
        ? "Редактор дороги (no-villa)"
        : "Редактор дороги";
    }
    if (previewLink) {
      previewLink.href = noVilla ? "./?no-villa=1" : "./";
      previewLink.textContent = noVilla ? "Сайт ?no-villa=1" : "Открыть сайт";
    }

    let model;
    let strokeWidth = 7.5;
    let drag = null;
    let saveTimer = 0;
    let saveSeq = 0;

    try {
      const loaded = await loadPoints();
      if (!loaded) throw new Error("Bad JSON");
      model = { start: loaded.start, cubics: loaded.cubics };
      strokeWidth = loaded.strokeWidth;
    } catch (err) {
      statusEl.textContent = String(err.message || err);
      statusEl.dataset.state = "error";
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = "way-edit-overlay way-edit-overlay--road";
    overlay.innerHTML = `<svg class="way-edit-guides" viewBox="${VIEW_X} 0 ${VIEW_W} ${VIEW_H}" preserveAspectRatio="none" overflow="visible"></svg><div class="way-edit-handles"></div>`;
    stage.appendChild(overlay);
    const guides = overlay.querySelector(".way-edit-guides");
    const handlesRoot = overlay.querySelector(".way-edit-handles");

    function setStatus(msg, state = "ok") {
      statusEl.textContent = msg;
      statusEl.dataset.state = state;
    }

    function applyPath() {
      const d = formatPath(model);
      bed.setAttribute("d", d);
      dash.setAttribute("d", d);
      bed.style.strokeWidth = String(strokeWidth);
      dash.style.strokeWidth = String(Math.max(1, strokeWidth * 0.18));
      widthInput.value = String(strokeWidth);
      widthOut.textContent = strokeWidth.toFixed(1);
    }

    function scheduleSave() {
      window.clearTimeout(saveTimer);
      setStatus("Saving…", "busy");
      saveTimer = window.setTimeout(async () => {
        const seq = ++saveSeq;
        const payload = toJson(model, strokeWidth);
        try {
          await savePoints(payload);
          if (seq !== saveSeq) return;
          setStatus(`Saved → ${POINTS_FILE}`, "ok");
        } catch (err) {
          if (seq !== saveSeq) return;
          setStatus(`${err.message}. Run: python3 serve.py`, "error");
        }
      }, 280);
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
      const nodes = [
        {
          type: "start",
          kind: "anchor",
          x: model.start[0],
          y: model.start[1],
          label: "S",
        },
      ];
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

    function refresh(save = false) {
      applyPath();
      renderHandles();
      if (save) scheduleSave();
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

    widthInput.addEventListener("input", () => {
      strokeWidth = Number(widthInput.value);
      applyPath();
      scheduleSave();
    });

    document.querySelector('[data-edit="add"]')?.addEventListener("click", () => {
      const last = model.cubics[model.cubics.length - 1]?.end || model.start;
      const y = Math.min(VIEW_H - 20, last[1] + 80);
      model.cubics.push({
        c1: [last[0], last[1] + 25],
        c2: [50, y - 25],
        end: [50, y],
      });
      refresh(true);
    });

    document.querySelector('[data-edit="reload"]')?.addEventListener("click", async () => {
      try {
        const loaded = await loadPoints();
        if (!loaded) throw new Error("Bad JSON");
        model = { start: loaded.start, cubics: loaded.cubics };
        strokeWidth = loaded.strokeWidth;
        refresh(false);
        setStatus(`Reloaded ${POINTS_FILE}`, "ok");
      } catch (err) {
        setStatus(String(err.message || err), "error");
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
      scheduleSave();
    }

    function onDoubleClick(event) {
      const handle = event.target.closest?.(".way-edit-handle--point");
      if (!handle || handle.dataset.type !== "end") return;
      event.preventDefault();
      const index = Number(handle.dataset.index);
      if (model.cubics.length <= 2) {
        setStatus("Keep at least 2 segments", "error");
        return;
      }
      model.cubics.splice(index, 1);
      refresh(true);
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("pointercancel", onPointerUp, true);
    document.addEventListener("dblclick", onDoubleClick, true);

    window.addEventListener("resize", () => {
      window.requestAnimationFrame(renderHandles);
    });

    if ("ResizeObserver" in window) {
      new ResizeObserver(() => {
        if (!drag) renderHandles();
      }).observe(road);
    }

    window.dispatchEvent(new Event("resize"));
    window.setTimeout(() => {
      refresh(false);
      setStatus(
        noVilla
          ? "no-villa editor — drag points, auto-saves"
          : "Drag points — changes save automatically",
        "ok"
      );
    }, 220);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
