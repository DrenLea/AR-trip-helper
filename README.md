# AR Trip Helper

Android-first PWA demo for explainable, transit-aware, accessibility-conscious day trips in Rome and Guiyang.

## Quickstart

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The local sync API listens on `http://127.0.0.1:8787`.

```bash
npm run test
npm run lint
npm run build
npm run test:e2e
```

Use Chrome on Android or a 390×844 viewport. Camera, location, motion and notification permissions are requested only after selecting the corresponding feature. Exact location sharing is off by default.
