(() => {
  const audio = document.getElementById("site-music");
  const toggle = document.getElementById("music-toggle");
  const gate = document.getElementById("invite-gate");
  const gateOpen = document.getElementById("invite-gate-open");
  if (!audio || !toggle) return;

  const storageKey = "wedding-music-muted";
  let unlocked = false;
  let wantPlay = localStorage.getItem(storageKey) !== "1";
  let gateClosed = false;

  // Prime the element early — Safari is pickier about first play().
  try {
    audio.load();
  } catch {
    /* ignore */
  }

  function syncUi(playing) {
    toggle.setAttribute("aria-pressed", playing ? "true" : "false");
    toggle.setAttribute("aria-label", playing ? "Mute music" : "Play music");
    toggle.classList.toggle("is-playing", playing);
    toggle.classList.toggle("is-muted", !playing);
  }

  function markPlaying() {
    unlocked = true;
    wantPlay = true;
    localStorage.setItem(storageKey, "0");
    syncUi(true);
  }

  function pause() {
    audio.pause();
    wantPlay = false;
    localStorage.setItem(storageKey, "1");
    syncUi(false);
  }

  /**
   * Safari only unlocks audio when play() runs in the same turn as the user gesture.
   * Do not await anything before calling audio.play().
   */
  function playFromGesture() {
    audio.muted = false;
    try {
      // iOS ignores volume; desktop Safari accepts it.
      audio.volume = 0.45;
    } catch {
      /* ignore */
    }

    const attempt = audio.play();
    if (attempt && typeof attempt.then === "function") {
      attempt.then(markPlaying).catch(() => {
        // One immediate retry still inside the gesture chain on some WebKit builds.
        audio
          .play()
          .then(markPlaying)
          .catch(() => syncUi(false));
      });
    } else {
      markPlaying();
    }
  }

  function closeGate() {
    if (!gate || gateClosed) return;
    gateClosed = true;
    gate.classList.add("is-leaving");
    document.body.classList.remove("is-gated");
    window.setTimeout(() => {
      gate.hidden = true;
      gate.classList.remove("is-leaving");
    }, 780);
  }

  function openInvite(event) {
    event.preventDefault();
    event.stopPropagation();
    if (gateClosed) return;

    // play() FIRST — before any animation / timeout (Safari requirement).
    if (wantPlay) playFromGesture();
    else syncUi(false);

    closeGate();
  }

  function toggleMusic(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!audio.paused) {
      pause();
      return;
    }
    playFromGesture();
  }

  if (gate && gateOpen) {
    document.body.classList.add("is-gated");
    syncUi(false);

    // pointerdown is the most reliable unlock gesture on iOS Safari.
    gate.addEventListener("pointerdown", openInvite, { passive: false });
    gateOpen.addEventListener("click", openInvite);
    gate.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") openInvite(event);
    });
  } else if (wantPlay) {
    const unlockFromGesture = (event) => {
      if (unlocked || !wantPlay) return;
      playFromGesture();
      if (unlocked || !audio.paused) {
        window.removeEventListener("pointerdown", unlockFromGesture);
        window.removeEventListener("keydown", unlockFromGesture);
      }
      event?.preventDefault?.();
    };
    window.addEventListener("pointerdown", unlockFromGesture, { passive: false });
    window.addEventListener("keydown", unlockFromGesture);
  } else {
    syncUi(false);
  }

  toggle.addEventListener("click", toggleMusic);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (!audio.paused) audio.pause();
      return;
    }
    // Resume only after a real unlock — never call play() without a gesture on Safari.
    if (wantPlay && unlocked) {
      audio.play().then(markPlaying).catch(() => syncUi(false));
    }
  });
})();
