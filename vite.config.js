import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    // Service worker so the app cold-starts offline. The Android wrapper loads
    // this app from a remote URL with no native caching; without a SW, launching
    // without a network shows a "webpage not available" error. Workbox precaches
    // the built shell (hashed JS/CSS + index.html) and serves it cache-first, so
    // after one successful online launch the app boots fully offline. User data
    // is already local (IndexedDB), so offline sessions are fully functional
    // except for the two things that inherently need the server: key validation
    // (handled with an offline grace path in auth.jsx) and AI app generation.
    VitePWA({
      // A new SW is precached in the background but must NOT take over the
      // running page on its own. We deliberately avoid registerType "autoUpdate":
      // it calls skipWaiting + clientsClaim, which reloads the page the instant a
      // new SW activates (and on the very first install) — that showed up as the
      // app "randomly" reloading mid-session, remounting the whole tree and
      // flashing the auth gate. "prompt" installs updates quietly and leaves the
      // new SW waiting.
      //
      // injectRegister is null because we register the SW ourselves in
      // src/pwa.js, where we apply a waiting update ONLY in a short window right
      // after boot (see there). That gives single-relaunch updates with the
      // reload happening at startup, never mid-session.
      registerType: "prompt",
      injectRegister: null,
      workbox: {
        // Precache the whole built shell.
        globPatterns: ["**/*.{js,css,html,ico,svg,png,woff,woff2}"],
        // The main bundle is ~3.3 MB (it includes @babel/standalone for in-app
        // transpiling). Raise the 2 MiB default so it's actually precached —
        // caching it is the entire point of offline support here.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // Serve the cached shell for any navigation (the launch URL carries
        // ?onDevice=true&key=... — navigation matching ignores the query, so
        // this still works). Never hijack API calls with the HTML fallback.
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
        // Google Fonts used by generated apps: cache-first so fonts seen once
        // keep rendering offline (falls back to system fonts if never fetched).
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: { maxEntries: 30 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 60 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    // Forward API calls to the Express backend (server.js) during dev.
    proxy: {
      "/api": "http://localhost:3137",
    },
  },
});
