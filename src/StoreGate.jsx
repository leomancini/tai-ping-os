import React, { useEffect, useState } from "react";
import { initStore } from "./apps/store";

// Holds back the app until the on-device store is hydrated and the one-time
// localStorage -> IndexedDB migration has run, so everything below can read the
// store synchronously. Initialization is local and fast, so the blank gap is
// momentary (auth has already shown its own checking state by this point).
export default function StoreGate({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    initStore().finally(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!ready) return null;
  return children;
}
