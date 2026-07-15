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

async function post(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-taiping-key": readKey(),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status}).`);
  }
  return data;
}

export const net = {
  // Resolves to { ok, status, contentType, text, json } — `json` is the
  // parsed body or null. Throws on proxy/network failure.
  fetch(url) {
    return post("/api/fetch", { url });
  },
  // Live web search. Resolves to { results: [{ title, url, snippet }] }.
  // Throws on failure.
  search(query) {
    return post("/api/search", { query });
  },
};
