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
  background: #d4d4d4;
  color: #1c1c1e;
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
  border: 1px solid #b8b8b8;
  border-radius: 10px;
  padding: 12px 14px;
  font: inherit;
  font-size: 15px;
  outline: none;
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

  useEffect(() => {
    const key = readInitialKey();
    if (!key) {
      setStatus("denied");
      return;
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
          // The server reachably rejected the key: it's genuinely invalid, so
          // clear the cached identity too (don't let it grant offline access).
          try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(IDENTITY_KEY);
          } catch {}
          setStatus("denied");
        }
      } catch {
        // Network error (offline). Fall back to the identity cached from a
        // previous successful validation for this same key, so the app still
        // starts. If there's no matching cached identity, deny.
        if (cancelled) return;
        const cached = readCachedIdentity();
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
    return <Center>…</Center>;
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
