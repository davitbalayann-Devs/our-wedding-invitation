(() => {
  const lightbox = document.getElementById("lightbox");
  const carousel = document.querySelector(".styling__carousel");
  const image = lightbox?.querySelector(".lightbox__image");
  const closeEls = lightbox
    ? lightbox.querySelectorAll(".lightbox__backdrop, .lightbox__close")
    : [];
  const shots = document.querySelectorAll(".styling__shot[data-lightbox-src]");

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const coarsePointer = window.matchMedia("(hover: none), (pointer: coarse)")
    .matches;

  let lastFocus = null;
  let closingTimer = 0;
  let touchResumeTimer = 0;

  function pauseCarousel() {
    carousel?.classList.add("is-paused");
  }

  function resumeCarousel() {
    if (!carousel || !carousel.classList.contains("is-revealed")) return;
    carousel.classList.remove("is-paused");
    carousel.classList.add("is-resuming");
  }

  function clearResume() {
    carousel?.classList.remove("is-resuming");
  }

  function revealGallery() {
    if (!carousel || carousel.classList.contains("is-revealed")) return;
    carousel.classList.add("is-revealed");
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

    // Desktop: pause while hovered.
    carousel.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      if (!carousel.classList.contains("is-revealed")) return;
      if (lightbox?.classList.contains("is-open")) return;
      clearResume();
      pauseCarousel();
    });

    carousel.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch") return;
      clearResume();
      carousel.classList.remove("is-paused");
    });

    // Phones: brief pause on touch, then keep marquee running (no hover).
    carousel.addEventListener(
      "touchstart",
      () => {
        if (!carousel.classList.contains("is-revealed")) return;
        window.clearTimeout(touchResumeTimer);
        clearResume();
        pauseCarousel();
      },
      { passive: true }
    );

    carousel.addEventListener(
      "touchend",
      () => {
        window.clearTimeout(touchResumeTimer);
        touchResumeTimer = window.setTimeout(() => {
          clearResume();
          carousel.classList.remove("is-paused");
        }, 900);
      },
      { passive: true }
    );
  }

  if (!lightbox || !image) return;

  function openLightbox(src, alt) {
    lastFocus = document.activeElement;
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
    resumeCarousel();

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
    shot.addEventListener("click", () => {
      const src = shot.getAttribute("data-lightbox-src");
      const img = shot.querySelector("img");
      if (!src) return;
      openLightbox(src, img?.alt || "");
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
