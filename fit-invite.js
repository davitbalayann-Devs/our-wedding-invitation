(() => {
  const el = () => document.querySelector(".invite__message");
  const mobileQuery = window.matchMedia("(max-width: 900px)");

  function fitInviteMessage() {
    const message = el();
    if (!message) return;

    if (document.documentElement.lang !== "hy") {
      message.style.removeProperty("font-size");
      message.style.removeProperty("white-space");
      return;
    }

    const parent = message.closest(".invite") || message.parentElement;
    const available = Math.max(
      120,
      (parent?.clientWidth || document.documentElement.clientWidth) - 12
    );
    const isMobile = mobileQuery.matches;

    // Mobile: two lines (second line forced in CSS). Desktop: one line.
    message.style.whiteSpace = isMobile ? "normal" : "nowrap";

    const maxSize = isMobile ? 24 : 28;
    const minSize = isMobile ? 22 : 10;
    message.style.fontSize = `${maxSize}px`;

    let low = minSize;
    let high = maxSize;
    for (let i = 0; i < 18; i += 1) {
      const mid = (low + high) / 2;
      message.style.fontSize = `${mid}px`;
      const fits =
        message.scrollWidth <= available + 1 &&
        (!isMobile || message.scrollHeight <= mid * 2.8 + 8);
      if (fits) low = mid;
      else high = mid;
    }
    message.style.fontSize = `${Math.floor(low * 10) / 10}px`;
  }

  function scheduleFit() {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(fitInviteMessage);
    });
  }

  window.addEventListener("i18n:ready", scheduleFit);
  window.addEventListener("resize", scheduleFit, { passive: true });
  window.addEventListener("orientationchange", () => {
    window.setTimeout(scheduleFit, 250);
  });
  window.addEventListener("load", scheduleFit);
  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", scheduleFit);
  } else if (typeof mobileQuery.addListener === "function") {
    mobileQuery.addListener(scheduleFit);
  }

  if (document.fonts?.ready) {
    document.fonts.ready.then(scheduleFit).catch(() => {});
  }

  if (document.readyState !== "loading") scheduleFit();
  else document.addEventListener("DOMContentLoaded", scheduleFit, { once: true });

  window.fitInviteMessage = fitInviteMessage;
})();
