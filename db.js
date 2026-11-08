// Capture storage in IndexedDB (shared by the service worker and the editor).
const DB_NAME = 'fxfullpage';
const STORE = 'captures';
const KEEP_LAST = 10;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function newCaptureId() {
  // Timestamp prefix: lexicographic key order = chronological order.
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveCapture(record) {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.put(record);
    const keys = await reqToPromise(store.getAllKeys());
    keys.sort();
    for (const key of keys.slice(0, Math.max(0, keys.length - KEEP_LAST))) store.delete(key);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function getCapture(id) {
  const db = await openDb();
  try {
    return await reqToPromise(db.transaction(STORE).objectStore(STORE).get(id));
  } finally {
    db.close();
  }
}
