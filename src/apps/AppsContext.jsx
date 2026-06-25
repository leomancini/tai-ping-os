import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { APPS as BUILT_IN } from "./index";
import {
  loadUserApps,
  saveUserApp,
  deleteUserApp,
  newAppId,
  makeStorage,
  subscribe,
} from "./store";
import { resolveIcon } from "../icons";
import GeneratedApp from "../GeneratedApp";

const AppsContext = createContext(null);

// Turn a stored user-app record into a registry entry, resolving its icon
// keyword to a real glyph and wrapping its code in the runtime sandbox.
function toEntry(record) {
  const storage = makeStorage(record.id);
  return {
    id: record.id,
    name: record.name,
    color: record.color,
    icon: resolveIcon(record.icon),
    iconKeyword: record.icon,
    code: record.code,
    fonts: record.fonts || [],
    userCreated: true,
    Component: () => (
      <GeneratedApp
        code={record.code}
        storage={storage}
        fonts={record.fonts || []}
      />
    ),
  };
}

export function AppsProvider({ children }) {
  const [userApps, setUserApps] = useState(() => loadUserApps());

  // Keep the app list in sync with the store after out-of-band changes such as
  // a backup restore.
  useEffect(() => subscribe(() => setUserApps(loadUserApps())), []);

  const createApp = useCallback((spec) => {
    const now = Date.now();
    const record = {
      id: newAppId(),
      name: spec.name,
      color: spec.color,
      icon: spec.icon,
      code: spec.code,
      fonts: spec.fonts || [],
      createdAt: now,
      updatedAt: now,
    };
    setUserApps(saveUserApp(record));
    return record.id;
  }, []);

  const updateApp = useCallback((id, spec) => {
    const existing = loadUserApps().find((a) => a.id === id);
    const record = {
      ...existing,
      id, // preserve id so the app's stored data is kept
      name: spec.name,
      color: spec.color,
      icon: spec.icon,
      code: spec.code,
      fonts: spec.fonts || [],
      updatedAt: Date.now(),
    };
    setUserApps(saveUserApp(record));
    return id;
  }, []);

  const removeApp = useCallback((id) => {
    setUserApps(deleteUserApp(id));
  }, []);

  const value = useMemo(() => {
    const userEntries = userApps.map(toEntry);
    const apps = [...BUILT_IN, ...userEntries];
    return {
      apps,
      userApps: userEntries,
      getApp: (id) => apps.find((a) => a.id === id),
      createApp,
      updateApp,
      removeApp,
    };
  }, [userApps, createApp, updateApp, removeApp]);

  return <AppsContext.Provider value={value}>{children}</AppsContext.Provider>;
}

export function useApps() {
  const ctx = useContext(AppsContext);
  if (!ctx) throw new Error("useApps must be used within <AppsProvider>");
  return ctx;
}
