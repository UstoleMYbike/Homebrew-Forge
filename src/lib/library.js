/**
 * Local library of generated content, backed by IndexedDB per spec — no
 * backend, no accounts. Written against the raw IDB API to avoid a dependency.
 */

import { normalizeEntry } from './normalize'

const DB_NAME = 'homebrew-forge'
const DB_VERSION = 1
const STORE = 'entries'

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('contentType', 'contentType')
        store.createIndex('updatedAt', 'updatedAt')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return dbPromise
}

/**
 * `fn` must issue its IDB requests synchronously — an await between creating a
 * transaction and using it can let the transaction go inactive.
 */
async function run(mode, fn) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const store = tx.objectStore(STORE)
    let result
    try {
      result = fn(store, () => tx)
    } catch (err) {
      reject(err)
      return
    }
    tx.oncomplete = () => resolve(result instanceof IDBRequest ? result.result : result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

/** Entries are named by their content's own name field, for search. */
function nameOf(data) {
  return (data?.name || '').trim() || 'Untitled'
}

/**
 * Entries saved before a schema change keep their old shape on disk, so they
 * are migrated on the way out. Reads stay non-destructive; the migrated shape
 * is only written back when the DM next edits the entry.
 */
function migrate(entry) {
  if (!entry) return entry
  return { ...entry, data: normalizeEntry(entry.contentType, entry.data) }
}

export async function listEntries() {
  const all = await run('readonly', (store) => store.getAll())
  return all.sort((a, b) => b.updatedAt - a.updatedAt).map(migrate)
}

export async function getEntry(id) {
  return migrate(await run('readonly', (store) => store.get(id)))
}

export async function saveEntry({ contentType, data }) {
  const now = Date.now()
  const entry = {
    id: crypto.randomUUID(),
    contentType,
    name: nameOf(data),
    data,
    createdAt: now,
    updatedAt: now,
  }
  await run('readwrite', (store) => {
    store.add(entry)
    return entry
  })
  return entry
}

/** Read-modify-write inside a single transaction so concurrent edits can't interleave. */
export async function updateEntry(id, data) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    let updated = null

    const getRequest = store.get(id)
    getRequest.onsuccess = () => {
      const existing = getRequest.result
      if (!existing) return
      updated = { ...existing, data, name: nameOf(data), updatedAt: Date.now() }
      store.put(updated)
    }

    tx.oncomplete = () => resolve(updated)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export function deleteEntry(id) {
  return run('readwrite', (store) => store.delete(id))
}

export async function duplicateEntry(id) {
  const existing = await getEntry(id)
  if (!existing) return null
  const data = { ...existing.data, name: `${nameOf(existing.data)} (copy)` }
  return saveEntry({ contentType: existing.contentType, data })
}
