// Shared, framework-free screen metrics. Imported by both the simulator
// (src/Simulator.jsx) and the app-generation server (server.js) so the
// inset-adjusted radii stay in sync.

export const SCREEN_WIDTH = 1600;
export const SCREEN_HEIGHT = 720;

// The app is authored at a logical resolution and rendered at this scale, so a
// 24px element occupies 48px on the physical 1600x720 screen.
export const UI_SCALE = 2;

// Outer rounded-corner radius of the physical screen (physical px).
export const SCREEN_RADIUS = 72;

// Inset (physical px) applied around ALL screen contents. Increasing it pushes
// every edge inward and, to keep corners concentric, reduces every border
// radius by the same amount (see `concentric` below).
export const SCREEN_INSET = 8;

// Reduce a radius by the inset so nested corners stay concentric with the
// screen's outer corner. Clamped so a large inset can't go negative.
export const concentric = (radius) => Math.max(0, radius - SCREEN_INSET);

// Base corner radius of the OS home-screen app icons / sidebar tiles (physical px).
export const ICON_RADIUS = 32;

// Content area after the inset.
export const CONTENT_WIDTH = SCREEN_WIDTH - 2 * SCREEN_INSET;
export const CONTENT_HEIGHT = SCREEN_HEIGHT - 2 * SCREEN_INSET;

// The app's content corner, concentric inside the screen's outer corner.
export const APP_RADIUS = concentric(SCREEN_RADIUS);

// The logical (in-app) corner radius generated apps should default to: the OS
// app-icon radius, made concentric for the current inset and converted to the
// apps' logical coordinate space.
export const APP_ICON_RADIUS = concentric(ICON_RADIUS) / UI_SCALE;
