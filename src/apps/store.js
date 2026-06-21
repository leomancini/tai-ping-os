// Browser-local persistence for user-created apps and their runtime data.
// Everything lives in localStorage so it survives reloads and works offline.

const APPS_KEY = "taiping.apps";
const DATA_PREFIX = "taiping.appdata.";

// --- App records (code + metadata) -----------------------------------------

export function loadUserApps() {
  try {
    const raw = localStorage.getItem(APPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeUserApps(apps) {
  localStorage.setItem(APPS_KEY, JSON.stringify(apps));
}

// Upsert by id — editing an existing app replaces it in place.
export function saveUserApp(record) {
  const apps = loadUserApps();
  const idx = apps.findIndex((a) => a.id === record.id);
  if (idx === -1) {
    apps.push(record);
  } else {
    apps[idx] = record;
  }
  writeUserApps(apps);
  return apps;
}

export function deleteUserApp(id) {
  const apps = loadUserApps().filter((a) => a.id !== id);
  writeUserApps(apps);
  localStorage.removeItem(DATA_PREFIX + id);
  return apps;
}

export function newAppId() {
  return "app-" + Math.random().toString(36).slice(2, 10);
}

// --- Per-app data API (injected into generated apps as `storage`) ----------

// Each app gets an isolated key/value store backed by a single JSON blob.
export function makeStorage(id) {
  const key = DATA_PREFIX + id;
  const read = () => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };
  const write = (obj) => localStorage.setItem(key, JSON.stringify(obj));

  return {
    get(k) {
      return read()[k];
    },
    set(k, value) {
      const obj = read();
      obj[k] = value;
      write(obj);
    },
    remove(k) {
      const obj = read();
      delete obj[k];
      write(obj);
    },
    keys() {
      return Object.keys(read());
    },
  };
}
