# Web Push Demo

A static, mobile-responsive page with one button that shows a web notification on Android and iOS. No build step, no backend.

## Run

Notifications need a secure context. `localhost` works for desktop testing:

```sh
python3 -m http.server 8080   # http://localhost:8080
```

For a phone, host it over HTTPS (GitHub Pages, Netlify, Cloudflare Pages) or tunnel it (`cloudflared tunnel --url http://localhost:8080`).

## Platforms

- **Android** (Chrome, Firefox, Edge): works in the browser or as an installed app.
- **iOS / iPadOS 16.4+**: only works after **Share → Add to Home Screen**; open the app from the Home Screen icon, then tap the button. In a regular Safari tab the page shows install instructions instead.

## How it works

The button asks for permission (directly in the tap handler, as iOS requires) and calls `registration.showNotification()` through the service worker (`sw.js`). `sw.js` also handles `push` events, so real server push (VAPID keys + `pushManager.subscribe()` + a sender such as the `web-push` library) can reuse the same worker. Server push is not included because it needs a backend.
