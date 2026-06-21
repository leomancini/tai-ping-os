// Injects Google Fonts stylesheets on demand so generated apps can use any
// Google Font. Families are loaded once and deduped across the whole session.
const loaded = new Set();

export function ensureGoogleFonts(families = []) {
  if (!Array.isArray(families)) return;
  for (const family of families) {
    const name = String(family || "").trim();
    if (!name || loaded.has(name)) continue;
    loaded.add(name);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    // Family-only request loads reliably for ANY font (variable fonts bring
    // their full weight range; static fonts fall back to faux weights).
    link.href =
      "https://fonts.googleapis.com/css2?family=" +
      encodeURIComponent(name).replace(/%20/g, "+") +
      "&display=swap";
    document.head.appendChild(link);
  }
}
