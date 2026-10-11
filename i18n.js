// Tiny i18n layer: manual choice > IP-based country > English.
(() => {
  const SUPPORTED = ['en', 'id'];
  const FALLBACK = 'en';
  const COUNTRY_LANG = { ID: 'id' };
  const CHOICE_KEY = 'lang';
  const GEO_KEY = 'lang-geo';
  const GEO_TTL = 24 * 60 * 60 * 1000;
  const GEO_TIMEOUT = 2500;

  const messages = {
    en: {
      title: 'Web Push Demo',
      description: 'Static demo that triggers a web push notification on Android and iOS.',
      appTitle: 'Push Demo',
      lead: 'Tap the button to send yourself a notification.',
      button: 'Send notification',
      checking: 'Checking support…',
      ready: 'Ready.',
      sent: 'Notification sent.',
      sentHidden: 'Sent, but nothing is showing. Check Windows Focus assist / Do Not Disturb and Chrome notification settings.',
      iosTitle: 'Install on iPhone / iPad',
      iosIntro: 'iOS only allows notifications for web apps added to the Home Screen (iOS 16.4+).',
      iosStep1: 'Open this page in <strong>Safari</strong>.',
      iosStep2: 'Tap the <strong>Share</strong> button.',
      iosStep3: 'Choose <strong>Add to Home Screen</strong>.',
      iosStep4: 'Open the new app icon and tap the button again.',
      errIosInstall: 'Add this page to your Home Screen to enable notifications.',
      errUnsupported: 'This browser does not support web notifications.',
      errInsecure: 'Notifications require HTTPS.',
      errBlockedBrowser: 'Notifications are blocked. Enable them in your browser/site settings.',
      errBlocked: 'Notifications are blocked. Enable them in settings.',
      errDismissed: 'Permission was dismissed. Tap again to retry.',
      errSw: 'Service worker failed: {msg}',
      errSend: 'Could not send: {msg}',
      notifyBody: 'It works! Sent at {time}',
      langLabel: 'Language',
    },
    id: {
      title: 'Demo Web Push',
      description: 'Demo statis yang memicu notifikasi web push di Android dan iOS.',
      appTitle: 'Demo Push',
      lead: 'Ketuk tombol untuk mengirim notifikasi ke diri sendiri.',
      button: 'Kirim notifikasi',
      checking: 'Memeriksa dukungan…',
      ready: 'Siap.',
      sent: 'Notifikasi terkirim.',
      sentHidden: 'Terkirim, tetapi tidak ada yang tampil. Periksa Focus assist / Jangan Ganggu di Windows dan pengaturan notifikasi Chrome.',
      iosTitle: 'Pasang di iPhone / iPad',
      iosIntro: 'iOS hanya mengizinkan notifikasi untuk aplikasi web yang ditambahkan ke Layar Utama (iOS 16.4+).',
      iosStep1: 'Buka halaman ini di <strong>Safari</strong>.',
      iosStep2: 'Ketuk tombol <strong>Bagikan</strong>.',
      iosStep3: 'Pilih <strong>Tambah ke Layar Utama</strong>.',
      iosStep4: 'Buka ikon aplikasi baru lalu ketuk tombol lagi.',
      errIosInstall: 'Tambahkan halaman ini ke Layar Utama untuk mengaktifkan notifikasi.',
      errUnsupported: 'Browser ini tidak mendukung notifikasi web.',
      errInsecure: 'Notifikasi memerlukan HTTPS.',
      errBlockedBrowser: 'Notifikasi diblokir. Aktifkan di pengaturan browser/situs.',
      errBlocked: 'Notifikasi diblokir. Aktifkan di pengaturan.',
      errDismissed: 'Izin ditutup. Ketuk lagi untuk mencoba kembali.',
      errSw: 'Service worker gagal: {msg}',
      errSend: 'Tidak dapat mengirim: {msg}',
      notifyBody: 'Berhasil! Dikirim pukul {time}',
      langLabel: 'Bahasa',
    },
  };

  const listeners = [];
  let lang = FALLBACK;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* storage unavailable */ } },
  };

  function t(key, params, forLang) {
    const dict = messages[forLang || lang] || messages[FALLBACK];
    const str = dict[key] !== undefined ? dict[key] : (messages[FALLBACK][key] || key);
    return params ? str.replace(/\{(\w+)\}/g, (_, k) => (k in params ? params[k] : '')) : str;
  }

  function apply() {
    document.documentElement.lang = lang;
    document.title = t('title');
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', t('description'));
    const appTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appTitle) appTitle.setAttribute('content', t('appTitle'));
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    // Dictionary values only; never user input.
    document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel));
    });
    document.querySelectorAll('[data-lang]').forEach((el) => {
      el.setAttribute('aria-pressed', String(el.dataset.lang === lang));
    });
    listeners.forEach((fn) => fn(lang));
  }

  function setLang(next, { persist = false } = {}) {
    if (!SUPPORTED.includes(next)) next = FALLBACK;
    if (persist) store.set(CHOICE_KEY, next);
    lang = next;
    apply();
  }

  function fromCountry(code) {
    return COUNTRY_LANG[String(code || '').toUpperCase()] || FALLBACK;
  }

  // Each provider resolves to an ISO country code or rejects. First success wins.
  const providers = [
    (signal) => fetch('https://www.cloudflare.com/cdn-cgi/trace', { signal, cache: 'no-store' })
      .then((r) => r.text())
      .then((txt) => { const m = txt.match(/^loc=([A-Z]{2})$/m); if (!m) throw new Error('no loc'); return m[1]; }),
    (signal) => fetch('https://ipwho.is/', { signal })
      .then((r) => r.json())
      .then((j) => { if (!j.country_code) throw new Error('no country'); return j.country_code; }),
    (signal) => fetch('https://ipapi.co/json/', { signal })
      .then((r) => r.json())
      .then((j) => { if (!j.country_code) throw new Error('no country'); return j.country_code; }),
  ];

  function detectCountry() {
    const cached = store.get(GEO_KEY);
    if (cached) {
      try {
        const { country, at } = JSON.parse(cached);
        if (country && Date.now() - at < GEO_TTL) return Promise.resolve(country);
      } catch (_) { /* ignore bad cache */ }
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), GEO_TIMEOUT);
    return Promise.any(providers.map((p) => p(ctrl.signal)))
      .then((country) => {
        store.set(GEO_KEY, JSON.stringify({ country, at: Date.now() }));
        return country;
      })
      .finally(() => { clearTimeout(timer); ctrl.abort(); });
  }

  // Hide the card until the language is known (bounded by GEO_TIMEOUT) to avoid a flash of English.
  document.documentElement.classList.add('i18n-pending');

  // Resolves once the initial language is applied; never rejects.
  const ready = (async () => {
    const saved = store.get(CHOICE_KEY);
    if (SUPPORTED.includes(saved)) return setLang(saved);
    try {
      setLang(fromCountry(await detectCountry()));
    } catch (_) {
      setLang(FALLBACK);
    }
  })().then(() => document.documentElement.classList.remove('i18n-pending'));

  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('[data-lang]');
    if (btn) setLang(btn.dataset.lang, { persist: true });
  });

  window.I18n = {
    t,
    ready,
    getLang: () => lang,
    onChange: (fn) => listeners.push(fn),
  };
})();
