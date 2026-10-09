import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'

await build({ configFile: false, publicDir: false, logLevel: 'silent', build: {
  outDir: 'artifacts/photo-filter-check', emptyOutDir: true,
  lib: { entry: { filters: resolve('src/services/photo-filters.js'), session: resolve('src/services/friends/session.js'), storage: resolve('src/services/friends/storage.js'), overlays: resolve('src/services/photo-overlays.js') }, formats: ['es'], fileName: (_, name) => `${name}.mjs` },
} })
const moduleAt = name => import(pathToFileURL(resolve(`artifacts/photo-filter-check/${name}.mjs`)))
const { transformPhotoPixels, normalizePhotoFilter, validatePhotoFilter, drawFilteredCover } = await moduleAt('filters')
const { FriendsSession } = await moduleAt('session')
const { readRoom, writeRoom, clearRoom } = await moduleAt('storage')
const filter = (presetId, intensity = 1) => ({ presetId, intensity, version: 1 })
const source = new Uint8ClampedArray([220, 40, 90, 123, 10, 180, 70, 255])
for (const value of [undefined, filter('original'), filter('sepia', 0), filter('unknown'), filter('sepia', NaN)]) {
  assert.deepEqual(transformPhotoPixels(source.slice(), value), source)
}
const bw = transformPhotoPixels(source.slice(), filter('classic-bw'))
assert.equal(bw[0], bw[1]); assert.equal(bw[1], bw[2]); assert.notEqual(bw[0], source[0])
assert.equal(bw[3], source[3]); assert.equal(bw[7], source[7])
for (const preset of ['classic-bw', 'warm-vintage', 'soft-color', 'sepia', 'cool-film']) {
  const full = transformPhotoPixels(source.slice(), filter(preset))
  const half = transformPhotoPixels(source.slice(), filter(preset, .5))
  assert.notDeepEqual(full, source)
  for (let i = 0; i < source.length; i++) {
    if (i % 4 === 3) assert.equal(half[i], source[i])
    else assert(Math.abs(half[i] - (source[i] + full[i]) / 2) <= 1)
  }
}
for (const value of [null, filter('bad'), filter('sepia', -1), filter('sepia', Infinity), { ...filter('sepia'), version: 2 }]) assert.equal(validatePhotoFilter(value), false)
assert.deepEqual(normalizePhotoFilter(null), filter('original'))
assert.deepEqual(source, new Uint8ClampedArray([220, 40, 90, 123, 10, 180, 70, 255]))
let drawing
drawFilteredCover({ drawImage: (...args) => { drawing = args } }, { width: 1600, height: 900 }, 10, 20, 300, 300, filter('original'))
assert.deepEqual(drawing.slice(1), [350, 0, 900, 900, 10, 20, 300, 300])
console.log('PASS preset validation, Original identity, grayscale, alpha, intensity blending, unchanged originals and cover crop')

const { normalizeOverlay, drawPhotoOverlays } = await moduleAt('overlays')
const decoration = normalizeOverlay({ id: 'text', type: 'text', text: 'Hello', x: .25, y: .75, size: .1, rotation: 90, color: '#ffffff' })
assert.equal(normalizeOverlay({ type: 'image', src: 'https://external.example/image.png' }), null)
const bounded = normalizeOverlay({ ...decoration, x: -4, y: 5, size: 9, rotation: 900, color: 'invalid', text: 'a'.repeat(60) })
assert.equal(bounded.x, 0); assert.equal(bounded.y, 1); assert.equal(bounded.size, .45); assert.equal(bounded.rotation, 180); assert.equal(bounded.text.length, 40); assert.equal(bounded.color, '#ffffff')
function drawingContext() {
  const calls = []
  const ctx = Object.fromEntries(['save', 'restore', 'beginPath', 'rect', 'clip', 'translate', 'rotate', 'strokeText', 'fillText', 'drawImage'].map(name => [name, (...args) => calls.push([name, ...args])]))
  return { ctx, calls }
}
const first = drawingContext(), second = drawingContext()
drawPhotoOverlays(first.ctx, [decoration], 10, 20, 400, 200)
drawPhotoOverlays(second.ctx, [decoration], 10, 20, 800, 400)
assert.deepEqual(first.calls.find(call => call[0] === 'translate'), ['translate', 110, 170])
assert.deepEqual(second.calls.find(call => call[0] === 'translate'), ['translate', 210, 320])
assert.deepEqual(first.calls.find(call => call[0] === 'rotate'), ['rotate', Math.PI / 2])
assert.equal(first.ctx.font, 'bold 40px Arial, sans-serif'); assert.equal(second.ctx.font, 'bold 80px Arial, sans-serif')
assert.equal(first.calls.filter(call => call[0] === 'save').length, first.calls.filter(call => call[0] === 'restore').length)
assert.deepEqual(first.calls.find(call => call[0] === 'rect'), ['rect', 10, 20, 400, 200])
const image = { naturalWidth: 200, naturalHeight: 100 }, imageDraw = drawingContext()
drawPhotoOverlays(imageDraw.ctx, [{ type: 'image', id: 'image', src: 'data:image/png;base64,test', size: .2 }], 0, 0, 400, 200, new Map([['data:image/png;base64,test', image]]))
assert.deepEqual(imageDraw.calls.find(call => call[0] === 'drawImage').slice(2), [-40, -20, 80, 40])
assert.equal(decoration.x, .25); assert.equal(decoration.rotation, 90)
console.log('PASS overlay validation, normalized positioning, proportional text/image sizing, clipping, rotation and immutable settings')

const values = new Map()
globalThis.localStorage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
const saved = { host: true, id: `gm-${'a'.repeat(48)}`, secret: 'b'.repeat(48), resume: null, invitation: null, theme: 'sage', generation: 3, expiresAt: Date.now() + 600000 }
writeRoom(saved); assert.deepEqual(readRoom().photoFilter, filter('original'))
writeRoom({ ...saved, photoFilter: filter('sepia', .4) }); assert.deepEqual(readRoom().photoFilter, filter('sepia', .4))
writeRoom({ ...saved, photoFilter: filter('bad') }); assert.equal(readRoom(), null)
clearRoom()
console.log('PASS saved-room compatibility, filter restoration and invalid stored filter rejection')

const host = new FriendsSession(null), guest = new FriendsSession({ peer: saved.id, secret: saved.secret })
const sent = []
host.send = (type, payload) => sent.push({ type, ...payload })
host.state = { ...host.state, stage: 'review', connected: true, approved: true, remoteApproved: true, remoteFilterReady: true, preview: new Blob(['previous']) }
host.own = [1, 2, 3]; host.other = [4, 5, 6]
host.setFilter(filter('classic-bw'))
assert.equal(host.filterRevision, 1); assert.equal(host.state.approved, false); assert.equal(host.state.remoteApproved, false)
assert.equal(host.state.filterBusy, true); assert.equal(host.state.remoteFilterReady, false)
assert.equal(host.own.length + host.other.length, 6)
host.approve(); assert.equal(host.state.approved, false)
await host.receive({ type: 'approve', generation: host.generation, revision: 0 }); assert.equal(host.state.remoteApproved, false)
await host.receive({ type: 'filter-rendered', generation: host.generation, revision: 0 }); assert.equal(host.state.remoteFilterReady, false)
host.state.filterBusy = false
host.approve(); assert.equal(host.state.approved, false)
await host.receive({ type: 'filter-rendered', generation: host.generation, revision: 1 })
host.approve(); assert.equal(host.state.approved, true)
assert.equal(sent.find(message => message.type === 'approve').revision, 1)
guest.state = { ...guest.state, stage: 'review', connected: true, approved: true, remoteApproved: true }
guest.setFilter(filter('sepia')); assert.equal(guest.filterRevision, 0)
await guest.receive({ type: 'filter-update', generation: 0, revision: 1, filter: filter('bad') }); assert.equal(guest.filterRevision, 0)
await guest.receive({ type: 'filter-update', generation: 0, revision: 2, filter: filter('warm-vintage') })
assert.equal(guest.filterRevision, 2); assert.equal(guest.state.approved, false)
await guest.receive({ type: 'filter-update', generation: 0, revision: 1, filter: filter('sepia') }); assert.equal(guest.state.photoFilter.presetId, 'warm-vintage')
await host.receive({ type: 'filter-update', generation: 0, revision: 9, filter: filter('sepia') }); assert.equal(host.filterRevision, 1)
host.abortWork(); guest.abortWork(); host.end(undefined, false); guest.end(undefined, false)
console.log('PASS host authority, preserved captures, approval invalidation, render gating and stale revision rejection')
