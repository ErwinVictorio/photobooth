export const VERSION = 1
export const LIMITS = { still: 2 * 1024 * 1024, result: 10 * 1024 * 1024, chunk: 12000, room: 60 * 60 * 1000, waiting: 10 * 60 * 1000, reconnect: 5 * 60 * 1000 }
export const THEMES = { sage: { name: 'Botanical', paper: '#f8f5ef', ink: '#3f5140' }, rose: { name: 'Rose', paper: '#fff0f3', ink: '#923f5b' }, film: { name: 'Film', paper: '#262724', ink: '#fff8e9' } }
export const ICE_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }], iceTransportPolicy: 'all' }
export function randomId() { return Array.from(crypto.getRandomValues(new Uint8Array(24)), n => n.toString(16).padStart(2, '0')).join('') }
export async function digest(bytes) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('') }
export async function proof(secret, challenge) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(challenge))), n => n.toString(16).padStart(2, '0')).join('')
}
export function readInvitation(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  if (!params.has('friend')) return null
  const peer = params.get('friend'), secret = params.get('key')
  if (!/^gm-[a-f0-9]{48}$/.test(peer || '') || !/^[a-f0-9]{48}$/.test(secret || '')) throw new Error('This invitation is incomplete. Ask your friend for a new link.')
  return { peer, secret }
}
export function validEnvelope(message, lastSequence) {
  return Boolean(message && typeof message === 'object' && message.v === VERSION && Number.isSafeInteger(message.seq) && message.seq > lastSequence && typeof message.type === 'string' && message.type.length < 40)
}
export function validFile(meta) {
  return meta && /^[a-f0-9]{48}$/.test(meta.id) && ['still', 'result'].includes(meta.kind) && Number.isSafeInteger(meta.size) && meta.size > 0 && meta.size <= LIMITS[meta.kind] && /^[a-f0-9]{64}$/.test(meta.hash) && Number.isSafeInteger(meta.generation) && (meta.kind === 'result' || (Number.isInteger(meta.shot) && meta.shot >= 0 && meta.shot < 3))
}
export function captureOffset(samples) {
  if (!samples.length) throw new Error('Unable to synchronize. Please retry.')
  const best = [...samples].sort((a, b) => a.rtt - b.rtt)[0]
  if (best.rtt > 1500) throw new Error('Connection is too slow for capture. Try another network.')
  return best.offset
}
