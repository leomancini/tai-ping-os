// Network helper injected into generated apps as `net`. All requests go
// through the OS server's /api/fetch proxy (authenticated with the user's
// access key), so apps get live data from public APIs without CORS issues
// and without direct network access from the sandbox.

const KEY_STORAGE = "taiping.key"; // same slot auth.jsx persists the key to

function readKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) || "";
  } catch {
    return "";
  }
}

export const net = {
  // Resolves to { ok, status, contentType, text, json } — `json` is the
  // parsed body or null. Throws on proxy/network failure.
  async fetch(url) {
    const res = await fetch("/api/fetch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-taiping-key": readKey(),
      },
      body: JSON.stringify({ url }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status}).`);
    }
    return data;
  },
};
