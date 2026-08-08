(() => {
  const audio = document.getElementById("site-music");
  const toggle = document.getElementById("music-toggle");
  const langGate = document.getElementById("lang-gate");
  const gate = document.getElementById("invite-gate");
  const gateOpen = document.getElementById("invite-gate-open");
  if (!audio || !toggle) return;

  const storageKey = "wedding-music-muted";
  let unlocked = false;
  let wantPlay = localStorage.getItem(storageKey) !== "1";
  let gateClosed = false;
  let langChosen = false;

  function syncUi(playing) {
    toggle.classList.toggle("is-playing", playing);
    toggle.classList.toggle("is-muted", !playing);
    toggle.setAttribute("aria-pressed", playing ? "true" : "false");
    const playLabel = window.I18N?.t("music.play") || "Play music";
    const muteLabel = window.I18N?.t("music.mute") || "Mute music";
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

  function isIntroBlocking() {
    const langOpen = Boolean(langGate && !langGate.hidden && !langChosen);
    const inviteOpen = Boolean(gate && !gateClosed && !gate.hidden);
    return langOpen || inviteOpen;
  }

  function lockScroll() {
    document.documentElement.classList.add("is-gated");
    document.body.classList.add("is-gated");
    window.scrollTo(0, 0);
  }

  function unlockScroll() {
    document.documentElement.classList.remove("is-gated");
    document.body.classList.remove("is-gated");
  }

  function blockScrollGesture(event) {
    if (!isIntroBlocking()) return;
    event.preventDefault();
  }

  function showInviteGate() {
    if (!gate) return;
    gate.hidden = false;
    gate.classList.remove("is-leaving");
    gateOpen?.focus?.({ preventScroll: true });
  }

  function closeLangGate() {
    if (!langGate) return;
    langGate.classList.add("is-leaving");
    window.setTimeout(() => {
      langGate.hidden = true;
      langGate.classList.remove("is-leaving");
    }, 520);
  }

  function closeGate() {
    if (!gate || gateClosed) return;
    gateClosed = true;
    gate.classList.add("is-leaving");
    unlockScroll();
    window.setTimeout(() => {
      gate.hidden = true;
      gate.classList.remove("is-leaving");
    }, 780);
  }

  function openInvite() {
    if (!langChosen || gateClosed) return;
    playFromGesture();
    closeGate();
  }

  function chooseLanguage(locale) {
    if (langChosen) return;
    langChosen = true;
    window.I18N?.setLocale?.(locale);
    syncUi(false);
    closeLangGate();
    showInviteGate();
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
  lockScroll();
  document.addEventListener("touchmove", blockScrollGesture, { passive: false });
  document.addEventListener("wheel", blockScrollGesture, { passive: false });

  if (langGate) {
    // Language first; invite gate waits behind it.
    if (gate) gate.hidden = true;
    langGate.hidden = false;

    const stored = window.I18N?.getStoredLocale?.();
    if (stored) {
      langGate.querySelectorAll("[data-lang]").forEach((btn) => {
        btn.classList.toggle("is-active", btn.getAttribute("data-lang") === stored);
      });
    }

    langGate.querySelectorAll("[data-lang]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const locale = btn.getAttribute("data-lang");
        if (!locale) return;
        chooseLanguage(locale);
      });
    });
  } else if (gate && gateOpen) {
    // Fallback if language screen is missing.
    langChosen = true;
    window.I18N?.setLocale?.(window.I18N.getStoredLocale?.() || "en");
    showInviteGate();
  }

  if (gate && gateOpen) {
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
