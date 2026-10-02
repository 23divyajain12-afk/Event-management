"use client";

const DATABASE_NAME = "abhivriddhi-ticket-scanner";
const DATABASE_VERSION = 1;
let databasePromise;

function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("valid")) db.createObjectStore("valid", { keyPath: "id" });
      if (!db.objectStoreNames.contains("used")) db.createObjectStore("used", { keyPath: "id" });
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
}

async function request(storeName, mode, operation) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const result = operation(transaction.objectStore(storeName));
    transaction.oncomplete = () => resolve(result?.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export const scannerStore = {
  get: (store, key) => request(store, "readonly", (objectStore) => objectStore.get(key)),
  put: (store, value) => request(store, "readwrite", (objectStore) => objectStore.put(value)),
  getAll: (store) => request(store, "readonly", (objectStore) => objectStore.getAll()),
  clear: (store) => request(store, "readwrite", (objectStore) => objectStore.clear()),
};
