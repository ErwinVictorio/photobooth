let database
function openDB() {
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open('good-moments-photobooth', 1)
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('sessions', { keyPath: 'id' })
      store.createIndex('createdAt', 'createdAt')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => { database = undefined; reject(request.error) }
    request.onblocked = () => { database = undefined; reject(new Error('Close other photobooth tabs and try again.')) }
  })
  return database
}
async function transaction(mode, action) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', mode)
    const request = action(tx.objectStore('sessions'))
    tx.oncomplete = () => resolve(request?.result)
    tx.onerror = () => reject(tx.error || new Error('Local storage is unavailable.'))
    tx.onabort = () => reject(tx.error || new Error('Local storage operation was interrupted.'))
  })
}
export const saveSession = (session) => transaction('readwrite', (store) => store.put(session))
export const getSession = (id) => transaction('readonly', (store) => store.get(id))
export async function listSessions() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', 'readonly')
    const request = tx.objectStore('sessions').index('createdAt').openCursor(null, 'prev')
    const rows = []
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) return
      const { originals, finalPhoto, ...metadata } = cursor.value
      rows.push({ ...metadata, bytes: finalPhoto.size + originals.reduce((sum, blob) => sum + blob.size, 0) })
      cursor.continue()
    }
    tx.oncomplete = () => resolve(rows)
    tx.onerror = () => reject(tx.error)
  })
}
export const deleteSession = (id) => transaction('readwrite', (store) => store.delete(id))
export async function clearSessions(eventKey) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', 'readwrite')
    const store = tx.objectStore('sessions')
    if (!eventKey) store.clear()
    else {
      const request = store.openCursor()
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) { if (cursor.value.eventKey === eventKey) cursor.delete(); cursor.continue() }
      }
    }
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}
