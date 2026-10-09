import Peer from 'peerjs'
import { readRoom } from '../src/services/friends/storage'
import { FriendsSession } from '../src/services/friends/session'
import { readInvitation, digest, proof, validEnvelope, validFile, captureOffset, ICE_CONFIG } from '../src/services/friends/protocol'

// This entry is bundled only into ignored test artifacts, never the production app.
window.startFixture = async (link, port, recover = false) => {
  const session = new FriendsSession(link ? readInvitation(new URL(link).hash) : null, port ? {
    peerFactory: (id, options) => new Peer(id, { ...options, host: '127.0.0.1', port, path: '/', secure: false, config: { iceServers: [] } }),
    recovery: recover ? readRoom() : null,
  } : { recovery: recover ? readRoom() : null })
  window.session = session
  const video = document.createElement('video'); video.muted = true; video.autoplay = true; video.playsInline = true; document.body.append(video)
  let local = null
  session.subscribe(() => {
    if (session.state.local !== local) { local = session.state.local; video.srcObject = local; if (local) video.play().catch(() => {}) }
    document.querySelector('#status').textContent = JSON.stringify({ ...session.state, local: !!session.state.local, remote: !!session.state.remote, preview: !!session.state.preview, result: !!session.state.result })
  })
  video.onloadeddata = () => session.cameraLoaded(video)
  if (!link) {
    await session.start()
    await new Promise((resolve, reject) => { const until = Date.now() + 25000; const poll = () => session.state.invite ? resolve() : Date.now() > until ? reject(new Error('Invitation before camera timeout')) : setTimeout(poll, 20); poll() })
    if (session.state.local) throw new Error('Room creation must not request a camera')
  }
  await session.camera()
  await new Promise((resolve, reject) => { const until = Date.now() + 10000; const poll = () => session.state.cameraReady ? resolve() : Date.now() > until ? reject(new Error('Camera timeout')) : setTimeout(poll, 20); poll() })
  await session.start()
}
window.resultHash = async () => digest(await window.session.state.result.arrayBuffer())
window.protocolChecks = async () => {
  const assert = (value, label) => { if (!value) throw new Error(label) }
  assert(ICE_CONFIG.iceServers.every(server => server.urls.startsWith('stun:')), 'No TURN defaults')
  assert(!validEnvelope({ v: 1, seq: 4, type: 'ready' }, 4), 'Replay rejected')
  assert(!validEnvelope({ v: 2, seq: 5, type: 'ready' }, 4), 'Incompatible version rejected')
  const meta = { id: 'a'.repeat(48), hash: 'b'.repeat(64), kind: 'still', size: 100, generation: 1, shot: 0 }
  assert(validFile(meta), 'Valid metadata')
  assert(!validFile({ ...meta, size: 2 * 1024 * 1024 + 1 }), 'Oversized still rejected')
  assert(!validFile({ ...meta, shot: 3 }), 'Fourth shot rejected')
  assert(!validFile({ ...meta, hash: 'bad' }), 'Malformed checksum rejected')
  assert(await proof('secret', 'challenge1') !== await proof('secret', 'challenge2'), 'Proof bound to challenge')
  assert(captureOffset([{ rtt: 200, offset: 50 }, { rtt: 10, offset: 3 }]) === 3, 'Lowest latency clock sample')
  let rejected = false; try { readInvitation('#friend=bad&key=bad') } catch { rejected = true }
  assert(rejected, 'Invalid invitation rejected')
  return true
}
