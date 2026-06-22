import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import styled from "styled-components";

const STORAGE_KEY = "taiping.key";
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

const Button = styled.button`
  border: none;
  border-radius: 10px;
  padding: 12px 16px;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: #0a84ff;
  cursor: pointer;
  opacity: ${(p) => (p.disabled ? 0.5 : 1)};
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
          try {
            localStorage.setItem(STORAGE_KEY, key);
          } catch {}
          setIdentity({ key, label: data.label, fullName: data.fullName });
          setStatus("ok");
        } else {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {}
          setStatus("denied");
        }
      } catch {
        if (!cancelled) setStatus("denied");
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
          <div style={{ fontSize: 20, fontWeight: 700 }}>Tai Ping OS</div>
          <div style={{ fontSize: 14, color: "#6b6b6b" }}>
            Enter your access key (or add <code>?key=…</code> to the URL).
          </div>
          <Field
            type="password"
            placeholder="Access key"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go()}
            autoFocus
          />
          <Button onClick={go} disabled={!entry.trim()}>
            Enter
          </Button>
        </Card>
      </Center>
    );
  }

  return (
    <AuthContext.Provider value={identity}>{children}</AuthContext.Provider>
  );
}
