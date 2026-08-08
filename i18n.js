(() => {
  const STORAGE_KEY = "wedding-invite-locale";
  const dictionaries = {
    en: {
      "meta.title": "Davit & Monica — Getting Married",
      "names.couple": "Davit & Monica",
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
      "way.churchTitle": "Saint Anna Church | 14:30",
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
      "gate.hint": "Tap anywhere to open",
      "music.title": "Music",
      "music.play": "Play music",
      "music.mute": "Mute music",
      "lang.eyebrow": "Davit & Monica",
      "lang.title": "Choose your language",
      "lang.hy": "Armenian",
      "lang.ru": "Russian",
      "lang.en": "English",
    },
    ru: {
      "meta.title": "Давит и Моника — Женятся",
      "names.couple": "Давит и Моника",
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
      "way.churchTitle": "Церковь Святой Анны | 14:30",
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
      "gate.hint": "Нажмите на экран",
      "music.title": "Музыка",
      "music.play": "Включить музыку",
      "music.mute": "Выключить музыку",
      "lang.eyebrow": "Давит и Моника",
      "lang.title": "Выберите язык",
      "lang.hy": "Армянский",
      "lang.ru": "Русский",
      "lang.en": "Английский",
    },
    hy: {
      "meta.title": "Դավիթ և Մոնիկա — Ամուսնանում են",
      "names.couple": "Դավիթ և Մոնիկա",
      "hero.section": "Հարսանեկան հայտարարություն",
      "hero.eyebrow": "Այս երեխաները",
      "hero.script": "ամուսնանում են!",
      "hero.photoAlt": "Դավիթը և Մոնիկան մանկության տարիներին",
      "invite.section": "Պահպանեք ամսաթիվը",
      "invite.label": "Պահպանեք ամսաթիվը",
      "invite.dateLabel": "16 օգոստոսի 2026",
      "invite.artAlt": "Հարսանեկան տոնակատարության նկարազարդում",
      "invite.message": "Հրավիրում են ձեզ իրենց <span class=\"invite__message-line2\">ամուսնության տոնակատարությանը</span>",
      "way.section": "Հարսանեկան օրվա ծրագիր",
      "way.title": "Հարսանեկան ծրագիր",
      "way.villaTitle": "Վիլլա Այգեձոր | 11:00",
      "way.villaAlt": "Վիլլա Այգեձորի նկարազարդում",
      "way.locationLabel": "Հասցե՝",
      "way.villaAddress": "Այգեձորի փողոց 23, Երևան",
      "way.churchTitle": "Սուրբ Աննա եկեղեցի | 14:30",
      "way.churchAlt": "Սուրբ Աննա եկեղեցու նկարազարդում",
      "way.churchAddress": "Աբովյանի փողոց 15, Երևան",
      "way.restaurantTitle": "Հրաշք Այգի ռեստորան | 17:30",
      "way.restaurantAlt": "Հրաշք Այգի ռեստորանի նկարազարդում",
      "way.restaurantAddress": "Դիտակ գյուղ, Գևորգյանի փողոց 1",
      "styling.section": "Ռեստորանի ոճ",
      "styling.title": "Մտածո՞ւմ եք՝ ինչ հագնել երեկույթին",
      "styling.body":
        "Խիստ դրես-կոդ չկա՝ հագեք այն, ինչով ձեզ լավ եք զգում։ Թող մեր վայրի այս լուսանկարները ոգեշնչեն ձեր կատարյալ տեսքը։",
      "styling.photo1": "Բացել ռեստորանի լուսանկար 1",
      "styling.photo2": "Բացել ռեստորանի լուսանկար 2",
      "styling.photo3": "Բացել ռեստորանի լուսանկար 3",
      "styling.photo4": "Բացել ռեստորանի լուսանկար 4",
      "styling.alt1": "Հրաշք Այգի ռեստորանի ինտերիեր՝ հյուսած լուսատուներով",
      "styling.alt2": "Սեղաններ և սպիտակ աթոռներ Հրաշք Այգի-ում",
      "styling.alt3": "Արմավենիներ և մեղմ լույս ռեստորանում",
      "styling.alt4": "Երկար ճաշասրահ՝ ֆակտուրային պատերով",
      "countdown.section": "Հետհաշվարկ մինչև հարսանիք",
      "countdown.title": "Հաշվում ենք մինչև մեր մեծ օրը",
      "countdown.subtitle": "Կտեսնվենք...",
      "countdown.days": "Օր",
      "countdown.hours": "Ժամ",
      "countdown.minutes": "Րոպե",
      "countdown.seconds": "Վայրկյան",
      "lightbox.close": "Փակել լուսանկարը",
      "gate.title": "Բացել հրավերը",
      "gate.hint": "Սեղմեք էկրանին",
      "music.title": "Երաժշտություն",
      "music.play": "Միացնել երաժշտությունը",
      "music.mute": "Անջատել երաժշտությունը",
      "lang.eyebrow": "Դավիթ և Մոնիկա",
      "lang.title": "Ընտրեք լեզուն",
      "lang.hy": "Հայերեն",
      "lang.ru": "Ռուսերեն",
      "lang.en": "Անգլերեն",
    },
  };

  let locale = "en";
  let localeChosen = false;

  function normalizeLocale(value) {
    const raw = String(value || "")
      .trim()
      .toLowerCase();
    if (raw === "hy" || raw.startsWith("hy-") || raw === "arm" || raw === "am") {
      return "hy";
    }
    if (raw === "ru" || raw.startsWith("ru-")) return "ru";
    if (raw === "en" || raw.startsWith("en-")) return "en";
    return null;
  }

  function dictFor(nextLocale) {
    return dictionaries[nextLocale] || dictionaries.en;
  }

  function t(key) {
    const dict = dictFor(locale);
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

  function setLocale(nextLocale, { persist = true } = {}) {
    const normalized = normalizeLocale(nextLocale) || "en";
    locale = normalized;
    localeChosen = true;
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, locale);
      } catch (_) {
        /* private mode */
      }
    }
    apply();
    window.dispatchEvent(
      new CustomEvent("i18n:ready", { detail: { locale } })
    );
    return locale;
  }

  function getStoredLocale() {
    try {
      return normalizeLocale(localStorage.getItem(STORAGE_KEY));
    } catch (_) {
      return null;
    }
  }

  window.I18N = {
    get locale() {
      return locale;
    },
    get localeChosen() {
      return localeChosen;
    },
    t,
    apply,
    setLocale,
    getStoredLocale,
    dictionaries,
    STORAGE_KEY,
  };

  // Do not lock copy to a language until the guest chooses one.
  document.documentElement.lang = "en";
  document.documentElement.dataset.locale = "en";
})();
