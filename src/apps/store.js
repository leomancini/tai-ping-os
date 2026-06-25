// On-device persistence for user-created apps and their runtime data, plus the
// built-in apps' saved state. Everything is stored in IndexedDB (via ../idb)
// and never sent to a server — the OS keeps all user data local to the phone.
//
// IndexedDB is asynchronous, but generated apps (and our built-in apps) consume
// a SYNCHRONOUS storage API. To bridge that, the whole store is mirrored into
// an in-memory `cache` that is hydrated once by initStore() before the UI
// mounts. Reads are served synchronously from the cache; writes update the
// cache immediately and persist to IndexedDB in the background.

import { idbEntries, idbSet, idbDelete } from "../idb";

const APPS_KEY = "taiping.apps";
const DATA_PREFIX = "taiping.appdata.";
const NOTES_KEY = "taiping.notes"; // built-in Notes app state
const MIGRATED_KEY = "taiping.__migrated";
const AUTH_KEY = "taiping.key"; // access key — stays in localStorage, never backed up

const EXPORT_FORMAT = "tai-ping-backup";
const EXPORT_VERSION = 1;

// In-memory mirror of the IndexedDB store. Single source of truth at runtime.
const cache = new Map();
let ready = false;

// --- Change notification (so the app list refreshes after an import) --------

const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  for (const fn of listeners) fn();
}

// Fire-and-forget persist. A failed write is logged rather than silently
// swallowed — the previous localStorage code could lose data on quota errors
// without any trace.
function persist(key, value) {
  idbSet(key, value).catch((err) => {
    console.error(`[taiping] failed to persist "${key}":`, err);
  });
}

function drop(key) {
  idbDelete(key).catch((err) => {
    console.error(`[taiping] failed to delete "${key}":`, err);
  });
}

// --- Generic synchronous key/value over the in-memory cache -----------------

export function kvGet(key) {
  return cache.get(key);
}

export function kvSet(key, value) {
  cache.set(key, value);
  persist(key, value);
}

export function kvRemove(key) {
  cache.delete(key);
  drop(key);
}

// --- One-time migration from the old localStorage layout --------------------

function safeParse(raw) {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false, value: null };
  }
}

// Copy any legacy `taiping.*` localStorage values into IndexedDB. Runs once.
// The original localStorage entries are left intact as a rollback safety net.
// Corrupt values are never treated as "empty" in a way that could clobber good
// data: the unparseable raw string is preserved under a "<key>.corrupt" entry.
async function migrateFromLocalStorage() {
  let ls;
  try {
    ls = window.localStorage;
  } catch {
    return; // localStorage unavailable — nothing to migrate
  }
  if (!ls) return;

  const keys = [];
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (k && k.startsWith("taiping.") && k !== AUTH_KEY && k !== MIGRATED_KEY) {
      keys.push(k);
    }
  }

  for (const k of keys) {
    if (cache.has(k)) continue; // IndexedDB already has this — don't overwrite
    const raw = ls.getItem(k);
    if (raw == null) continue;

    let value;
    if (k === APPS_KEY) {
      const parsed = safeParse(raw);
      if (parsed.ok && Array.isArray(parsed.value)) {
        value = parsed.value;
      } else {
        value = [];
        await idbSet(k + ".corrupt", raw).catch(() => {});
      }
    } else if (k.startsWith(DATA_PREFIX)) {
      const parsed = safeParse(raw);
      if (parsed.ok && parsed.value && typeof parsed.value === "object") {
        value = parsed.value;
      } else {
        value = {};
        await idbSet(k + ".corrupt", raw).catch(() => {});
      }
    } else {
      // Plain-string values (e.g. notes) carry over untouched.
      value = raw;
    }

    cache.set(k, value);
    await idbSet(k, value).catch((err) =>
      console.error(`[taiping] migrate "${k}" failed:`, err)
    );
  }
}

// Hydrate the cache and run the one-time migration. Must resolve before the app
// renders (see <StoreGate>). Safe to call more than once.
export async function initStore() {
  if (ready) return;
  try {
    const entries = await idbEntries();
    for (const [k, v] of entries) cache.set(k, v);
  } catch (err) {
    // IndexedDB blocked/unavailable (e.g. private mode): fall back to an
    // in-memory-only session rather than crashing. Data won't persist, but the
    // OS stays usable.
    console.error("[taiping] IndexedDB unavailable; using memory only:", err);
    ready = true;
    return;
  }

  if (!cache.get(MIGRATED_KEY)) {
    try {
      await migrateFromLocalStorage();
    } catch (err) {
      console.error("[taiping] migration failed:", err);
    }
    cache.set(MIGRATED_KEY, true);
    persist(MIGRATED_KEY, true);
  }

  ready = true;
}

// --- App records (code + metadata) ------------------------------------------

export function loadUserApps() {
  const apps = cache.get(APPS_KEY);
  return Array.isArray(apps) ? apps : [];
}

function writeUserApps(apps) {
  cache.set(APPS_KEY, apps);
  persist(APPS_KEY, apps);
}

// Upsert by id — editing an existing app replaces it in place.
export function saveUserApp(record) {
  const apps = loadUserApps().slice();
  const idx = apps.findIndex((a) => a.id === record.id);
  if (idx === -1) apps.push(record);
  else apps[idx] = record;
  writeUserApps(apps);
  notify();
  return apps;
}

export function deleteUserApp(id) {
  const apps = loadUserApps().filter((a) => a.id !== id);
  writeUserApps(apps);
  kvRemove(DATA_PREFIX + id);
  notify();
  return apps;
}

export function newAppId() {
  return "app-" + Math.random().toString(36).slice(2, 10);
}

// --- Per-app data API (injected into generated apps as `storage`) -----------

// Each app gets an isolated key/value store backed by a single cached object.
// Reads/writes are synchronous against the cache (so generated apps keep their
// synchronous storage contract); persistence to IndexedDB happens in the
// background. Because the cache is the single source of truth, the old
// read-modify-write race against storage is gone.
export function makeStorage(id) {
  const key = DATA_PREFIX + id;
  const read = () => {
    const v = cache.get(key);
    return v && typeof v === "object" ? v : {};
  };
  const write = (obj) => {
    cache.set(key, obj);
    persist(key, obj);
  };

  return {
    get(k) {
      return read()[k];
    },
    set(k, value) {
      write({ ...read(), [k]: value });
    },
    remove(k) {
      const obj = { ...read() };
      delete obj[k];
      write(obj);
    },
    keys() {
      return Object.keys(read());
    },
  };
}

// --- Backup / restore -------------------------------------------------------

// Produce a fully self-contained, JSON-serializable snapshot of all apps and
// their data (plus built-in Notes). The access key is intentionally excluded —
// a backup file holds creations, not credentials.
export function exportData() {
  const apps = loadUserApps();
  const appData = {};
  for (const app of apps) {
    const d = cache.get(DATA_PREFIX + app.id);
    if (d !== undefined) appData[app.id] = d;
  }
  const out = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    apps,
    appData,
  };
  const notes = cache.get(NOTES_KEY);
  if (notes !== undefined) out.notes = notes;
  return out;
}

// Restore from a backup object. Default mode "merge" is non-destructive:
// incoming apps overwrite matching ids and new ones are added, but apps absent
// from the backup are kept. Mode "replace" makes the device match the backup
// exactly, removing apps (and their data) that aren't in it.
export function importData(data, { mode = "merge" } = {}) {
  if (!data || data.format !== EXPORT_FORMAT || !Array.isArray(data.apps)) {
    throw new Error("Not a valid Tai Ping backup file.");
  }
  const incomingApps = data.apps;
  const incomingData = data.appData || {};

  let apps;
  if (mode === "replace") {
    const keepIds = new Set(incomingApps.map((a) => a.id));
    for (const a of loadUserApps()) {
      if (!keepIds.has(a.id)) kvRemove(DATA_PREFIX + a.id);
    }
    apps = incomingApps.slice();
  } else {
    const byId = new Map(loadUserApps().map((a) => [a.id, a]));
    for (const a of incomingApps) byId.set(a.id, a);
    apps = [...byId.values()];
  }
  writeUserApps(apps);

  for (const [id, d] of Object.entries(incomingData)) {
    cache.set(DATA_PREFIX + id, d);
    persist(DATA_PREFIX + id, d);
  }
  if (typeof data.notes === "string") kvSet(NOTES_KEY, data.notes);

  notify();
  return { appsImported: incomingApps.length };
}
