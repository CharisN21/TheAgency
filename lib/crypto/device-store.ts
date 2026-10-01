"use client"

/**
 * Where this browser keeps its device key: IndexedDB, one entry per person
 * signed in here. The private key is a non-exportable CryptoKey, so even
 * code running on this page cannot read it out — it can only be used.
 */

const DB = "agency-e2ee"
const STORE = "devices"

export type StoredDevice = { deviceId: string; keys: CryptoKeyPair }

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve(req.result as T)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

export const getStoredDevice = (userId: string) =>
  run<StoredDevice | undefined>("readonly", (s) => s.get(userId))

export const storeDevice = (userId: string, device: StoredDevice) =>
  run<IDBValidKey>("readwrite", (s) => s.put(device, userId))

/** A name people can recognise in their device list, e.g. "Windows · Chrome". */
export function deviceName(): string {
  const ua = navigator.userAgent
  const os = /iPhone|iPad/.test(ua)
    ? "iPhone"
    : /Android/.test(ua)
      ? "Android"
      : /Mac/.test(ua)
        ? "Mac"
        : /Windows/.test(ua)
          ? "Windows"
          : "This device"
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : ""
  return browser ? `${os} · ${browser}` : os
}
