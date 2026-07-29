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

  function syncUi(playing) {
    toggle.classList.toggle("is-playing", playing);
    toggle.classList.toggle("is-muted", !playing);
    toggle.setAttribute("aria-pressed", playing ? "true" : "false");
    const playLabel =
      window.I18N?.t("music.play") || "Play music";
    const muteLabel =
      window.I18N?.t("music.mute") || "Mute music";
    toggle.setAttribute("aria-label", playing ? muteLabel : playLabel);
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
   * Must run in the same turn as a real click/tap.
   * Do not call preventDefault() before this on Safari — it kills the gesture.
   */
  function playFromGesture() {
    audio.muted = false;
    try {
      audio.volume = 0.45;
    } catch {
      /* iOS may ignore volume */
    }

    const attempt = audio.play();
    if (attempt && typeof attempt.then === "function") {
      attempt.then(markPlaying).catch((err) => {
        console.warn("Music play failed:", err);
        syncUi(false);
      });
      return;
    }
    markPlaying();
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

  function openInvite() {
    if (gateClosed) return;

    // Always try to start music on the opening tap (Safari-friendly).
    playFromGesture();
    closeGate();
  }

  function toggleMusic(event) {
    event.stopPropagation();
    if (!audio.paused) {
      pause();
      return;
    }
    playFromGesture();
  }

  syncUi(false);

  if (gate && gateOpen) {
    document.body.classList.add("is-gated");
    // click only — pointerdown + preventDefault breaks Safari audio unlock
    gateOpen.addEventListener("click", openInvite);
    gate.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openInvite();
      }
    });
  }

  toggle.addEventListener("click", toggleMusic);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (!audio.paused) audio.pause();
      return;
    }
    if (wantPlay && unlocked) {
      audio.play().then(markPlaying).catch(() => syncUi(false));
    }
  });
})();
