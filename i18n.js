(() => {
  const dictionaries = {
    en: {
      "meta.title": "Davit & Monica — Getting Married",
      "hero.section": "Wedding announcement",
      "hero.eyebrow": "These kids Are",
      "hero.script": "getting married!",
      "hero.photoAlt": "Davit and Monica as children",
      "invite.section": "Save the date",
      "invite.label": "Save the Date",
      "invite.dateLabel": "16 August 2026",
      "invite.artAlt": "Illustrated wedding party celebrating",
      "invite.message": "Invite you to the celebration of their marriage",
      "way.section": "Wedding day itinerary",
      "way.title": "Wedding Timeline",
      "way.villaTitle": "Villa Ayghedzor | 11:00",
      "way.villaAlt": "Villa Ayghedzor illustration",
      "way.locationLabel": "Location:",
      "way.villaAddress": "Aygedzor Street, 23, Yerevan",
      "way.churchTitle": "Saint Anna Church | 15:00",
      "way.churchAlt": "Saint Anna Church illustration",
      "way.churchAddress": "Abovyan Street, 15, Yerevan",
      "way.restaurantTitle": "Hrashq Aygi Restaurant | 17:30",
      "way.restaurantAlt": "Hrashq Aygi Restaurant illustration",
      "way.restaurantAddress": "Ditak village, Gevorgyan Street, 1",
      "styling.section": "Restaurant styling",
      "styling.title": "Wondering what to wear to the party?",
      "styling.body":
        "There is no strict dress code- wear whatever makes you feel great! Let these photos of our venue inspire your perfect party look.",
      "styling.photo1": "Open restaurant photo 1",
      "styling.photo2": "Open restaurant photo 2",
      "styling.photo3": "Open restaurant photo 3",
      "styling.photo4": "Open restaurant photo 4",
      "styling.alt1": "Hrashq Aygi restaurant interior with woven pendant lights",
      "styling.alt2": "Dining tables and white chairs at Hrashq Aygi",
      "styling.alt3": "Palm trees and soft lighting in the restaurant",
      "styling.alt4": "Long dining hall with textured walls",
      "countdown.section": "Countdown to the wedding",
      "countdown.title": "Counting down to our big day!",
      "countdown.subtitle": "See you in...",
      "countdown.days": "Days",
      "countdown.hours": "Hours",
      "countdown.minutes": "Minutes",
      "countdown.seconds": "Seconds",
      "lightbox.close": "Close photo",
      "gate.title": "Open invitation",
      "gate.hint": "Tap to enter",
      "music.title": "Music",
      "music.play": "Play music",
      "music.mute": "Mute music",
    },
    ru: {
      "meta.title": "Давит и Моника — Женятся",
      "hero.section": "Объявление о свадьбе",
      "hero.eyebrow": "Эти детки",
      "hero.script": "женятся!",
      "hero.photoAlt": "Давит и Моника в детстве",
      "invite.section": "Сохраните дату",
      "invite.label": "Сохраните дату",
      "invite.dateLabel": "16 августа 2026",
      "invite.artAlt": "Иллюстрация свадебного торжества",
      "invite.message": "Приглашают вас на торжество своего бракосочетания",
      "way.section": "Расписание свадебного дня",
      "way.title": "Расписание свадьбы",
      "way.villaTitle": "Вилла Айгедзор | 11:00",
      "way.villaAlt": "Иллюстрация виллы Айгедзор",
      "way.locationLabel": "Место:",
      "way.villaAddress": "ул. Айгедзор, 23, Ереван",
      "way.churchTitle": "Церковь Святой Анны | 15:00",
      "way.churchAlt": "Иллюстрация церкви Святой Анны",
      "way.churchAddress": "ул. Абовяна, 15, Ереван",
      "way.restaurantTitle": "Ресторан Hrashq Aygi | 17:30",
      "way.restaurantAlt": "Иллюстрация ресторана Hrashq Aygi",
      "way.restaurantAddress": "с. Дитак, ул. Геворгяна, 1",
      "styling.section": "Стиль ресторана",
      "styling.title": "Думаете, что надеть на праздник?",
      "styling.body":
        "Строгого дресс-кода нет — надевайте то, в чём вам комфортно! Пусть эти фотографии нашего места вдохновят вас на идеальный образ.",
      "styling.photo1": "Открыть фото ресторана 1",
      "styling.photo2": "Открыть фото ресторана 2",
      "styling.photo3": "Открыть фото ресторана 3",
      "styling.photo4": "Открыть фото ресторана 4",
      "styling.alt1": "Интерьер ресторана Hrashq Aygi с плетёными светильниками",
      "styling.alt2": "Столы и белые стулья в Hrashq Aygi",
      "styling.alt3": "Пальмы и мягкий свет в ресторане",
      "styling.alt4": "Длинный обеденный зал с фактурными стенами",
      "countdown.section": "Обратный отсчёт до свадьбы",
      "countdown.title": "Считаем дни до нашего большого дня!",
      "countdown.subtitle": "Увидимся через...",
      "countdown.days": "Дни",
      "countdown.hours": "Часы",
      "countdown.minutes": "Минуты",
      "countdown.seconds": "Секунды",
      "lightbox.close": "Закрыть фото",
      "gate.title": "Открыть приглашение",
      "gate.hint": "Нажмите, чтобы войти",
      "music.title": "Музыка",
      "music.play": "Включить музыку",
      "music.mute": "Выключить музыку",
    },
  };

  function detectLocale() {
    const primary = String(
      (navigator.languages && navigator.languages[0]) ||
        navigator.language ||
        navigator.userLanguage ||
        "en"
    )
      .trim()
      .toLowerCase();

    // Russian only when the device primary language is Russian.
    if (primary === "ru" || primary.startsWith("ru-")) return "ru";
    return "en";
  }

  const locale = detectLocale();
  const dict = dictionaries[locale] || dictionaries.en;

  function t(key) {
    return dict[key] ?? dictionaries.en[key] ?? key;
  }

  function apply() {
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;

    const title = t("meta.title");
    if (title) document.title = title;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      el.textContent = t(key);
    });

    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const key = el.getAttribute("data-i18n-html");
      if (!key) return;
      el.innerHTML = t(key);
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
      const key = el.getAttribute("data-i18n-aria-label");
      if (!key) return;
      el.setAttribute("aria-label", t(key));
    });

    document.querySelectorAll("[data-i18n-alt]").forEach((el) => {
      const key = el.getAttribute("data-i18n-alt");
      if (!key) return;
      el.setAttribute("alt", t(key));
    });

    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.getAttribute("data-i18n-title");
      if (!key) return;
      el.setAttribute("title", t(key));
    });
  }

  window.I18N = { locale, t, apply, dictionaries };

  // Set language immediately; apply copy once the DOM exists.
  document.documentElement.lang = locale;
  document.documentElement.dataset.locale = locale;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply, { once: true });
  } else {
    apply();
  }
})();
