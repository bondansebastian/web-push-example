(() => {
  const btn = document.getElementById('notify');
  const statusEl = document.getElementById('status');
  const iosHint = document.getElementById('ios-hint');

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;

  function setStatus(msg, kind) {
    statusEl.textContent = msg;
    statusEl.className = 'status' + (kind ? ' ' + kind : '');
  }

  function disable(msg) {
    btn.disabled = true;
    setStatus(msg, 'err');
  }

  if (isIOS && !isStandalone) {
    iosHint.hidden = false;
    disable('Add this page to your Home Screen to enable notifications.');
    return;
  }
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    disable('This browser does not support web notifications.');
    return;
  }
  if (!window.isSecureContext) {
    disable('Notifications require HTTPS.');
    return;
  }

  const ready = navigator.serviceWorker.register('sw.js')
    .then(() => navigator.serviceWorker.ready);

  ready.then(() => {
    if (Notification.permission === 'denied') {
      disable('Notifications are blocked. Enable them in your browser/site settings.');
    } else {
      setStatus('Ready.');
    }
  }).catch((e) => disable('Service worker failed: ' + e.message));

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      // Must be called directly from the tap for iOS.
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied'
          ? 'Notifications are blocked. Enable them in settings.'
          : 'Permission was dismissed. Tap again to retry.', 'err');
        btn.disabled = permission === 'denied';
        return;
      }
      const reg = await ready;
      await reg.showNotification('Web Push Demo', {
        body: 'It works! Sent at ' + new Date().toLocaleTimeString(),
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        tag: 'demo',
        data: { url: './' },
      });
      setStatus('Notification sent.', 'ok');
      btn.disabled = false;
    } catch (e) {
      setStatus('Could not send: ' + e.message, 'err');
      btn.disabled = false;
    }
  });
})();
