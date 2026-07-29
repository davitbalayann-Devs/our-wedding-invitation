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
  // Mobile layout / touch — keep the original drag + click behaviour.
  const mobileQuery = window.matchMedia(
    "(max-width: 900px), (hover: none) and (pointer: coarse)"
  );

  let lastFocus = null;
  let closingTimer = 0;
  let resumeTimer = 0;

  // —— Marquee + drag state ——
  let offset = 0;
  let pointerActive = false;
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
  const RESUME_DELAY = 1400;

  function isMobile() {
    return mobileQuery.matches;
  }

  function dragThreshold() {
    return isMobile() ? 8 : 10;
  }

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

    // Desktop: pause while pressed even before drag starts.
    if (dragging || (!isMobile() && pointerActive)) return;

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

  function shotFromEvent(event) {
    const node =
      typeof event.target?.closest === "function"
        ? event.target.closest(".styling__shot[data-lightbox-src]")
        : null;
    return node || null;
  }

  function openShot(shot) {
    if (!shot || !lightbox || !image) return;
    const src = shot.getAttribute("data-lightbox-src");
    if (!src) return;
    const img = shot.querySelector("img");
    openLightbox(src, img?.alt || "");
  }

  function onPointerDown(event) {
    if (!carousel.classList.contains("is-revealed")) return;
    if (lightbox?.classList.contains("is-open")) return;
    if (event.button != null && event.button !== 0) return;

    dragPointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    lastX = event.clientX;
    lastTs = event.timeStamp || performance.now();
    startOffset = offset;
    velocity = 0;
    axisLocked = null;
    movedFar = false;
    suppressClick = false;
    coasting = false;
    autoplay = false;
    window.clearTimeout(resumeTimer);

    if (isMobile()) {
      // Previous mobile behaviour: capture immediately.
      pointerActive = true;
      dragging = true;
      carousel.classList.add("is-paused", "is-dragging");
      try {
        carousel.setPointerCapture(event.pointerId);
      } catch (_) {
        /* noop */
      }
      return;
    }

    // Desktop: defer capture so a plain click still opens the lightbox.
    pointerActive = true;
    dragging = false;
    carousel.classList.add("is-paused");
  }

  function beginDesktopDrag(event) {
    if (dragging) return;
    dragging = true;
    movedFar = true;
    suppressClick = true;
    carousel.classList.add("is-dragging");
    try {
      carousel.setPointerCapture(event.pointerId);
    } catch (_) {
      /* noop */
    }
  }

  function onPointerMove(event) {
    if (event.pointerId !== dragPointerId) return;
    if (isMobile()) {
      if (!dragging) return;
    } else if (!pointerActive) {
      return;
    }

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const threshold = dragThreshold();

    if (!axisLocked) {
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
        return;
      }
      axisLocked = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
      if (axisLocked === "y") {
        if (isMobile()) {
          // Let the page scroll; abort horizontal drag.
          endDrag(event, false);
        } else {
          pointerActive = false;
          dragPointerId = null;
          axisLocked = null;
          carousel.classList.remove("is-dragging");
          if (!hovering) resumeCarousel(RESUME_DELAY);
        }
        return;
      }
      if (!isMobile()) {
        beginDesktopDrag(event);
      }
    }

    if (axisLocked !== "x") return;
    if (!isMobile() && !dragging) return;

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
    const mobile = isMobile();
    const wasDragging = dragging;
    const wasMoved = movedFar;

    if (mobile) {
      if (!dragging) return;
    } else if (!pointerActive && !dragging) {
      return;
    }

    if (event && dragPointerId != null && event.pointerId !== dragPointerId) {
      return;
    }

    pointerActive = false;
    dragging = false;
    carousel.classList.remove("is-dragging");

    try {
      if (dragPointerId != null && (mobile || wasDragging)) {
        carousel.releasePointerCapture(dragPointerId);
      }
    } catch (_) {
      /* noop */
    }

    dragPointerId = null;
    axisLocked = null;

    if (withCoast && wasMoved && Math.abs(velocity) > 0.05) {
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

    if (mobile) {
      // Previous mobile: clear suppress shortly; movedFar cleared on click.
      if (wasMoved) {
        window.setTimeout(() => {
          suppressClick = false;
        }, 80);
      }
      return;
    }

    if (wasMoved) {
      suppressClick = true;
      window.setTimeout(() => {
        suppressClick = false;
        movedFar = false;
      }, 120);
    } else {
      suppressClick = false;
      movedFar = false;
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
      if (
        !dragging &&
        !pointerActive &&
        !lightbox?.classList.contains("is-open")
      ) {
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

  function onShotClick(event) {
    if (suppressClick || movedFar) {
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
      movedFar = false;
      return;
    }
    const shot = shotFromEvent(event) || event.currentTarget;
    if (!shot?.getAttribute?.("data-lightbox-src")) return;
    event.preventDefault();
    openShot(shot);
  }

  shots.forEach((shot) => {
    shot.addEventListener("click", onShotClick);
  });

  document
    .querySelectorAll(".styling__shot[data-lightbox-src][aria-hidden='true']")
    .forEach((shot) => {
      shot.addEventListener("click", onShotClick);
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
