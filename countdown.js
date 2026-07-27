(() => {
  const section = document.querySelector("[data-countdown-to]");
  if (!section) return;

  const target = new Date(section.getAttribute("data-countdown-to"));
  if (Number.isNaN(target.getTime())) return;

  const daysEl = section.querySelector('[data-unit="days"]');
  const hoursEl = section.querySelector('[data-unit="hours"]');
  const minutesEl = section.querySelector('[data-unit="minutes"]');
  const secondsEl = section.querySelector('[data-unit="seconds"]');
  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  const pad = (n) => String(Math.max(0, n)).padStart(2, "0");

  function render() {
    const diff = Math.max(0, target.getTime() - Date.now());
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    daysEl.textContent = pad(days);
    hoursEl.textContent = pad(hours);
    minutesEl.textContent = pad(minutes);
    secondsEl.textContent = pad(seconds);

    if (diff === 0) {
      section.classList.add("is-complete");
    }
  }

  render();
  window.setInterval(render, 1000);
})();
