// Minimal promise-based IndexedDB key/value store. One database with a single
// object store ("kv") of arbitrary structured values keyed by string.
//
// This is on-device storage only — IndexedDB has no network component, so it
// upholds the OS's core principle that user data never leaves the phone. We use
// it instead of localStorage for a much larger quota and atomic, corruption-
// resistant writes.

const DB_NAME = "taiping";
const STORE = "kv";
const VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function wrap(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function store(mode) {
  const db = await openDB();
  return db.transaction(STORE, mode).objectStore(STORE);
}

// Read every key/value pair as an array of [key, value]. Both requests are
// issued on the same transaction before awaiting, so it can't auto-close
// between them.
export async function idbEntries() {
  const s = await store("readonly");
  const keysReq = s.getAllKeys();
  const valsReq = s.getAll();
  const keys = await wrap(keysReq);
  const vals = await wrap(valsReq);
  return keys.map((k, i) => [k, vals[i]]);
}

export async function idbSet(key, value) {
  const s = await store("readwrite");
  return wrap(s.put(value, key));
}

export async function idbDelete(key) {
  const s = await store("readwrite");
  return wrap(s.delete(key));
}
