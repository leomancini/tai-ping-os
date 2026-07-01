import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import styled from "styled-components";

const STORAGE_KEY = "taiping.key";
// Cache of the last successful validation, so the app can start offline. Only a
// key that the server has previously accepted is ever cached here.
const IDENTITY_KEY = "taiping.identity";
const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

const Center = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  /* Match the OS's black background so a reload (which re-runs this gate while
     it re-validates the key over the network) transitions black -> black ->
     home, with no light flash. */
  background: #000;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
`;

const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 320px;
  max-width: 80vw;
  text-align: center;
`;

const Field = styled.input`
  border: 1px solid #3a3a3c;
  background: #1c1c1e;
  color: #fff;
  border-radius: 10px;
  padding: 12px 14px;
  font: inherit;
  font-size: 15px;
  outline: none;

  &::placeholder {
    color: #8e8e93;
  }
`;

function readInitialKey() {
  const fromUrl = new URLSearchParams(window.location.search).get("key");
  if (fromUrl) return fromUrl;
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function readCachedIdentity() {
  try {
    return JSON.parse(localStorage.getItem(IDENTITY_KEY) || "null");
  } catch {
    return null;
  }
}

export function AuthGate({ children }) {
  const [status, setStatus] = useState("checking"); // checking | ok | denied
  const [identity, setIdentity] = useState(null); // { key, label, fullName }
  const [entry, setEntry] = useState("");

  // The key is validated exactly once, here on mount. There is no re-validation
  // during a session — the app never polls the server for auth. So this only
  // runs again if the whole app remounts, i.e. a full page reload.
  useEffect(() => {
    const key = readInitialKey();
    if (!key) {
      setStatus("denied");
      return;
    }

    // Optimistic start: if this exact key was validated before, show the app
    // IMMEDIATELY from the cached identity and re-validate silently in the
    // background. This means a reload (e.g. the OS killing the WebView renderer
    // under memory pressure) restores straight to the app with no visible gate
    // screen — the black "checking" screen only ever shows on a genuine first
    // run with no cached identity.
    const cached = readCachedIdentity();
    const startedOptimistically = cached && cached.key === key;
    if (startedOptimistically) {
      setIdentity(cached);
      setStatus("ok");
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/validate-key", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-taiping-key": key },
          body: "{}",
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data.valid) {
          const id = {
            key,
            label: data.label,
            fullName: data.fullName,
            demo: !!data.demo,
          };
          try {
            localStorage.setItem(STORAGE_KEY, key);
            localStorage.setItem(IDENTITY_KEY, JSON.stringify(id));
          } catch {}
          setIdentity(id);
          setStatus("ok");
        } else {
          // The server reachably rejected the key: it's genuinely invalid or
          // revoked, so lock out even if we started optimistically, and clear
          // the cache so it can't grant access again.
          try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(IDENTITY_KEY);
          } catch {}
          setIdentity(null);
          setStatus("denied");
        }
      } catch {
        // Network error (offline). If we already started from the cache, stay
        // in; otherwise fall back to the cached identity for this key, or deny.
        if (cancelled) return;
        if (startedOptimistically) return;
        if (cached && cached.key === key) {
          setIdentity({ ...cached, offline: true });
          setStatus("ok");
        } else {
          setStatus("denied");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") {
    // Just the black background — no spinner/ellipsis — so a reload is a silent
    // black gap that blends into the OS instead of a visible loading screen.
    return <Center />;
  }

  if (status === "denied") {
    const go = () => {
      const k = entry.trim();
      if (!k) return;
      const url = new URL(window.location.href);
      url.searchParams.set("key", k);
      window.location.href = url.toString();
    };
    return (
      <Center>
        <Card>
          <Field
            type="password"
            placeholder="Access key"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go()}
            autoFocus
          />
        </Card>
      </Center>
    );
  }

  return (
    <AuthContext.Provider value={identity}>{children}</AuthContext.Provider>
  );
}
