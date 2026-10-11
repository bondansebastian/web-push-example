(() => {
  const btn = document.getElementById('notify');
  const statusEl = document.getElementById('status');
  const iosHint = document.getElementById('ios-hint');

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;

  const { t } = window.I18n;

  // Keep the status as a message key so it can be re-rendered when the language changes.
  let current = { key: 'checking', params: null, kind: '' };
  function renderStatus() {
    statusEl.textContent = t(current.key, current.params);
    statusEl.className = 'status' + (current.kind ? ' ' + current.kind : '');
  }
  function setStatus(key, kind, params) {
    current = { key, params: params || null, kind };
    renderStatus();
  }
  window.I18n.onChange(renderStatus);
  renderStatus(); // a saved language may already be applied

  function disable(key, params) {
    btn.disabled = true;
    setStatus(key, 'err', params);
  }

  if (isIOS && !isStandalone) {
    iosHint.hidden = false;
    disable('errIosInstall');
    return;
  }
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    disable('errUnsupported');
    return;
  }
  if (!window.isSecureContext) {
    disable('errInsecure');
    return;
  }

  const ready = navigator.serviceWorker.register('sw.js')
    .then(() => navigator.serviceWorker.ready);

  ready.then(() => {
    if (Notification.permission === 'denied') {
      disable('errBlockedBrowser');
    } else {
      setStatus('ready');
    }
  }).catch((e) => disable('errSw', { msg: e.message }));

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      // Must be called directly from the tap for iOS.
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'errBlocked' : 'errDismissed', 'err');
        btn.disabled = permission === 'denied';
        return;
      }
      const reg = await ready;
      await reg.showNotification(t('title'), {
        body: t('notifyBody', { time: new Date().toLocaleTimeString(window.I18n.getLang()) }),
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        // Unique tag per click: a repeated tag is replaced silently (no popup) unless renotify is set.
        tag: 'demo-' + Date.now(),
        renotify: true,
        lang: window.I18n.getLang(),
        data: { url: './' },
      });
      const notes = await reg.getNotifications();
      setStatus(notes.length ? 'sent' : 'sentHidden', notes.length ? 'ok' : 'err');
      btn.disabled = false;
    } catch (e) {
      setStatus('errSend', 'err', { msg: e.message });
      btn.disabled = false;
    }
  });
})();
