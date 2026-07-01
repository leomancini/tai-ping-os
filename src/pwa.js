// Service worker registration with startup-only updates.
//
// The SW is built in "prompt" mode (see vite.config.js): a new version is
// precached in the background and never takes over a running page by itself.
// Here we decide WHEN to apply a waiting update — only during a short window
// right after boot, before the user is interacting. So:
//
//   - An update lands in a SINGLE relaunch: if a new version was downloaded on
//     the previous launch (left waiting), it's applied at the start of the next
//     one; the reload happens at boot, not randomly mid-session.
//   - A session already in progress is NEVER reloaded out from under the user:
//     an update that finishes downloading later in the session just waits for
//     the next launch.
import { registerSW } from "virtual:pwa-register";

// How long after boot an incoming update still counts as a "startup" update and
// is applied immediately. Long enough to cover the SW download on a slow link,
// short enough that the user won't have settled into a task first.
const STARTUP_WINDOW_MS = 10000;

let withinStartupWindow = true;
setTimeout(() => {
  withinStartupWindow = false;
}, STARTUP_WINDOW_MS);

const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    // Force an update check at boot so a freshly deployed version is detected
    // now rather than on the browser's own (up to ~24h) schedule.
    if (registration) registration.update();
  },
  onNeedRefresh() {
    // A new SW is waiting — either downloaded just now during startup, or left
    // waiting by a previous session. Apply it and reload only if we're still in
    // the startup window; otherwise leave it waiting for the next launch.
    if (withinStartupWindow) updateSW(true);
  },
});
