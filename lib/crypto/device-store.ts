"use client"

/**
 * Where this browser keeps its device key: IndexedDB, one entry per person
 * signed in here. The private key is a non-exportable CryptoKey, so even
 * code running on this page cannot read it out — it can only be used.
 *
 * Losing this entry means losing every message this device could read, so a
 * write only counts once the transaction has completed and reads back.
 */

const DB = "agency-e2ee"
const STORE = "devices"

export type StoredDevice = { deviceId: string; keys: CryptoKeyPair }

export class StorageUnavailableError extends Error {
  constructor() {
    super(
      "This browser cannot keep your chat key (private browsing, or site storage is turned off), so chat cannot be used here.",
    )
    this.name = "StorageUnavailableError"
  }
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new StorageUnavailableError())
    let req: IDBOpenDBRequest
    try {
      req = indexedDB.open(DB, 1)
    } catch {
      return reject(new StorageUnavailableError())
    }
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(new StorageUnavailableError())
    req.onblocked = () => reject(new StorageUnavailableError())
  })
}

export async function getStoredDevice(userId: string): Promise<StoredDevice | undefined> {
  const db = await open()
  try {
    return await new Promise<StoredDevice | undefined>((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(userId)
      req.onsuccess = () => resolve(req.result as StoredDevice | undefined)
      req.onerror = () => reject(new StorageUnavailableError())
    })
  } finally {
    db.close()
  }
}

/** Saves the device and confirms it: resolves only after the write completed and reads back. */
export async function storeDevice(userId: string, device: StoredDevice): Promise<void> {
  const db = await open()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).put(device, userId)
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(new StorageUnavailableError())
      tx.onerror = () => reject(new StorageUnavailableError())
    })
  } finally {
    db.close()
  }
  const back = await getStoredDevice(userId)
  if (!back || back.deviceId !== device.deviceId) throw new StorageUnavailableError()
}

/**
 * Asks the browser not to clear this site's storage on its own (Safari clears
 * it after a week unvisited otherwise). Best effort: browsers may say no, and
 * chat still works, so a refusal is not an error.
 */
export async function requestPersistentStorage(): Promise<void> {
  try {
    await navigator.storage?.persist?.()
  } catch {
    // Not supported here; nothing else to do.
  }
}

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
