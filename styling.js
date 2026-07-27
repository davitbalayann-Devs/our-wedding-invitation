(() => {
  const lightbox = document.getElementById("lightbox");
  const carousel = document.querySelector(".styling__carousel");
  const track = carousel?.querySelector(".styling__track");
  const image = lightbox?.querySelector(".lightbox__image");
  const closeEls = lightbox
    ? lightbox.querySelectorAll(".lightbox__backdrop, .lightbox__close")
    : [];
  const shots = document.querySelectorAll(
    ".styling__shot[data-lightbox-src]:not([aria-hidden='true'])"
  );

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const coarsePointer = window.matchMedia("(hover: none), (pointer: coarse)")
    .matches;

  let lastFocus = null;
  let closingTimer = 0;
  let resumeTimer = 0;

  // —— Marquee + drag state ——
  let offset = 0;
  let dragging = false;
  let dragPointerId = null;
  let startX = 0;
  let startY = 0;
  let startOffset = 0;
  let lastX = 0;
  let lastTs = 0;
  let velocity = 0;
  let axisLocked = null; // "x" | "y" | null
  let movedFar = false;
  let suppressClick = false;
  let autoplay = true;
  let hovering = false;
  let rafId = 0;
  let lastFrameTs = 0;
  let coasting = false;

  const AUTO_SPEED = coarsePointer ? 28 : 36; // px / second
  const DRAG_THRESHOLD = 8;
  const RESUME_DELAY = 1400;

  function pauseCarousel() {
    carousel?.classList.add("is-paused");
    autoplay = false;
    window.clearTimeout(resumeTimer);
  }

  function resumeCarousel(delay = 0) {
    if (!carousel || !carousel.classList.contains("is-revealed")) return;
    if (lightbox?.classList.contains("is-open")) return;
    window.clearTimeout(resumeTimer);

    const go = () => {
      carousel.classList.remove("is-paused");
      autoplay = true;
      coasting = false;
      lastFrameTs = 0;
    };

    if (delay > 0) {
      resumeTimer = window.setTimeout(go, delay);
    } else {
      go();
    }
  }

  function revealGallery() {
    if (!carousel || carousel.classList.contains("is-revealed")) return;
    carousel.classList.add("is-revealed");
    lastFrameTs = 0;
  }

  function getLoopWidth() {
    if (!track) return 0;
    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap) || 12;
    return track.scrollWidth / 2 + gap / 2;
  }

  function normalizeOffset() {
    const loop = getLoopWidth();
    if (loop <= 0) return;
    // Keep offset in (-loop, 0]
    offset = ((offset % loop) + loop) % loop;
    if (offset > 0) offset -= loop;
  }

  function applyTrackTransform() {
    if (!track) return;
    track.style.transform = `translate3d(${offset}px, 0, 0)`;
  }

  function tick(ts) {
    rafId = requestAnimationFrame(tick);
    if (!carousel || !track) return;
    if (reducedMotion) return;
    if (!carousel.classList.contains("is-revealed")) return;
    if (lightbox?.classList.contains("is-open")) return;

    if (!lastFrameTs) lastFrameTs = ts;
    const dt = Math.min(48, ts - lastFrameTs) / 1000;
    lastFrameTs = ts;

    if (dragging) return;

    if (coasting) {
      offset += velocity * dt * 60;
      velocity *= Math.pow(0.92, dt * 60);
      if (Math.abs(velocity) < 0.15) {
        velocity = 0;
        coasting = false;
        resumeCarousel(RESUME_DELAY);
      }
      normalizeOffset();
      applyTrackTransform();
      return;
    }

    if (!autoplay || hovering) return;

    offset -= AUTO_SPEED * dt;
    normalizeOffset();
    applyTrackTransform();
  }

  function onPointerDown(event) {
    if (!carousel.classList.contains("is-revealed")) return;
    if (lightbox?.classList.contains("is-open")) return;
    if (event.button != null && event.button !== 0) return;

    dragging = true;
    dragPointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    lastX = event.clientX;
    lastTs = event.timeStamp || performance.now();
    startOffset = offset;
    velocity = 0;
    axisLocked = null;
    movedFar = false;
    coasting = false;
    autoplay = false;
    window.clearTimeout(resumeTimer);
    carousel.classList.add("is-paused", "is-dragging");

    try {
      carousel.setPointerCapture(event.pointerId);
    } catch (_) {
      /* noop */
    }
  }

  function onPointerMove(event) {
    if (!dragging || event.pointerId !== dragPointerId) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (!axisLocked) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
        return;
      }
      axisLocked = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
      if (axisLocked === "y") {
        // Let the page scroll; abort horizontal drag.
        endDrag(event, false);
        return;
      }
    }

    if (axisLocked !== "x") return;

    event.preventDefault();
    movedFar = true;
    suppressClick = true;

    const now = event.timeStamp || performance.now();
    const frameDx = event.clientX - lastX;
    const frameDt = Math.max(1, now - lastTs);
    velocity = frameDx / frameDt; // px per ms
    lastX = event.clientX;
    lastTs = now;

    offset = startOffset + dx;
    normalizeOffset();
    applyTrackTransform();
  }

  function endDrag(event, withCoast = true) {
    if (!dragging) return;
    if (event && dragPointerId != null && event.pointerId !== dragPointerId) {
      return;
    }

    dragging = false;
    carousel.classList.remove("is-dragging");

    try {
      if (dragPointerId != null) {
        carousel.releasePointerCapture(dragPointerId);
      }
    } catch (_) {
      /* noop */
    }

    dragPointerId = null;
    axisLocked = null;

    if (withCoast && movedFar && Math.abs(velocity) > 0.05) {
      // Convert px/ms → px/frame-ish scale used in tick
      velocity = velocity * 16;
      coasting = true;
      lastFrameTs = 0;
    } else {
      velocity = 0;
      coasting = false;
      if (!hovering) {
        resumeCarousel(RESUME_DELAY);
      }
    }

    // Allow next click after a short beat if this was a drag.
    if (movedFar) {
      window.setTimeout(() => {
        suppressClick = false;
      }, 80);
    }
  }

  function onPointerUp(event) {
    endDrag(event, true);
  }

  function onPointerCancel(event) {
    endDrag(event, false);
  }

  if (carousel && track && !reducedMotion) {
    carousel.classList.add("is-draggable");
    applyTrackTransform();

    carousel.addEventListener("pointerdown", onPointerDown);
    carousel.addEventListener("pointermove", onPointerMove, {
      passive: false,
    });
    carousel.addEventListener("pointerup", onPointerUp);
    carousel.addEventListener("pointercancel", onPointerCancel);
    carousel.addEventListener("lostpointercapture", onPointerCancel);

    // Desktop: pause autoplay while hovered (unless dragging).
    carousel.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      if (!carousel.classList.contains("is-revealed")) return;
      if (lightbox?.classList.contains("is-open")) return;
      hovering = true;
      if (!dragging && !coasting) {
        pauseCarousel();
      }
    });

    carousel.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch") return;
      hovering = false;
      if (!dragging && !lightbox?.classList.contains("is-open")) {
        resumeCarousel(400);
      }
    });

    // Wheel: horizontal browse (trackpad / shift+wheel).
    carousel.addEventListener(
      "wheel",
      (event) => {
        if (!carousel.classList.contains("is-revealed")) return;
        const dx =
          Math.abs(event.deltaX) > Math.abs(event.deltaY)
            ? event.deltaX
            : event.shiftKey
              ? event.deltaY
              : 0;
        if (!dx) return;
        event.preventDefault();
        pauseCarousel();
        coasting = false;
        offset -= dx;
        normalizeOffset();
        applyTrackTransform();
        resumeCarousel(RESUME_DELAY);
      },
      { passive: false }
    );

    window.addEventListener("resize", () => {
      normalizeOffset();
      applyTrackTransform();
    });

    rafId = requestAnimationFrame(tick);
  }

  if (carousel) {
    if (reducedMotion) {
      revealGallery();
    } else if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              revealGallery();
              observer.disconnect();
            }
          });
        },
        {
          threshold: coarsePointer ? 0.12 : 0.2,
          rootMargin: coarsePointer ? "0px 0px -4% 0px" : "0px 0px -8% 0px",
        }
      );
      observer.observe(carousel);
    } else {
      revealGallery();
    }
  }

  if (!lightbox || !image) return;

  function openLightbox(src, alt) {
    lastFocus = document.activeElement;
    pauseCarousel();
    coasting = false;
    image.src = src;
    image.alt = alt || "Restaurant photo";
    lightbox.hidden = false;
    requestAnimationFrame(() => {
      lightbox.classList.add("is-open");
    });
    document.body.classList.add("lightbox-open");
    lightbox.querySelector(".lightbox__close")?.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    document.body.classList.remove("lightbox-open");
    resumeCarousel(hovering ? 0 : 400);

    const finish = () => {
      lightbox.hidden = true;
      image.removeAttribute("src");
      image.alt = "";
      if (lastFocus && typeof lastFocus.blur === "function") {
        lastFocus.blur();
      }
      lastFocus = null;
    };

    lightbox.addEventListener("transitionend", finish, { once: true });
    window.clearTimeout(closingTimer);
    closingTimer = window.setTimeout(finish, 420);
  }

  shots.forEach((shot) => {
    shot.addEventListener("click", (event) => {
      if (suppressClick || movedFar) {
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
        movedFar = false;
        return;
      }
      const src = shot.getAttribute("data-lightbox-src");
      const img = shot.querySelector("img");
      if (!src) return;
      openLightbox(src, img?.alt || "");
    });
  });

  // Duplicate aria-hidden shots should also open the same lightbox when tapped
  // after a non-drag interaction — they mirror the first set visually.
  document
    .querySelectorAll(".styling__shot[data-lightbox-src][aria-hidden='true']")
    .forEach((shot) => {
      shot.addEventListener("click", (event) => {
        if (suppressClick || movedFar) {
          event.preventDefault();
          suppressClick = false;
          movedFar = false;
          return;
        }
        const src = shot.getAttribute("data-lightbox-src");
        if (!src) return;
        openLightbox(src, "");
      });
    });

  closeEls.forEach((el) => {
    el.addEventListener("click", closeLightbox);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !lightbox.hidden) {
      closeLightbox();
    }
  });
})();
