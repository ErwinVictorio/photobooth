import { LIMITS, THEMES } from './protocol'

const KEY = 'photobooth.friends.room'
const token = value => /^[a-f0-9]{48}$/.test(value || '')
const peer = value => /^gm-[a-f0-9]{48}$/.test(value || '')
export function clearRoom() {
  try { localStorage.removeItem(KEY) } catch { /* Storage may be disabled. */ }
}
export function readRoom() {
  try {
    const room = JSON.parse(localStorage.getItem(KEY))
    if (!room) return null
    if (room.version !== 1 || !Number.isSafeInteger(room.generation) || room.generation < 0 || typeof room.host !== 'boolean' || !peer(room.id) || !token(room.secret) || (room.resume !== null && !token(room.resume)) || !THEMES[room.theme] || !Number.isFinite(room.expiresAt) || room.expiresAt <= Date.now() || room.expiresAt > Date.now() + LIMITS.room + 10000 || !Number.isFinite(room.savedAt) || room.savedAt > Date.now() + 10000 || Date.now() - room.savedAt > LIMITS.reconnect || (!room.host && (!peer(room.invitation?.peer) || room.invitation.secret !== room.secret))) {
      clearRoom(); return null
    }
    return room
  } catch { clearRoom(); return null }
}
export function writeRoom(room) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...room, version: 1, savedAt: Date.now() })); return true }
  catch { return false }
}
