import { normalizePhotoFilter, validatePhotoFilter } from '../photo-filters'
import Peer from 'peerjs'
import { clearRoom, writeRoom } from './storage'
import { VERSION, LIMITS, THEMES, ICE_CONFIG, randomId, digest, proof, validEnvelope, validFile, captureOffset } from './protocol'
import { captureStill, composeFriends, validatePhoto } from './photos'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const activeCapture = state => ['syncing', 'countdown', 'transferring', 'composing', 'finalizing'].includes(state.stage)
const emptyCapture = { ready: false, remoteReady: false, approved: false, remoteApproved: false, preview: null, result: null, shot: 0, countdown: null, received: false }

// The controller owns transport and timers. React only subscribes to snapshots.
export class FriendsSession {
  constructor(invitation, { peerFactory = (id, options) => new Peer(id, options), recovery = null } = {}) {
    this.invitation = invitation; this.host = !invitation; this.factory = peerFactory
    if (recovery) { this.invitation = recovery.invitation; this.host = recovery.host; this.id = recovery.id; this.secret = recovery.secret; this.resume = recovery.resume; this.expiresAt = recovery.expiresAt }
    this.recovery = recovery
    this.state = { ...emptyCapture, stage: 'setup', theme: 'sage', mirror: true, local: null, remote: null, cameraReady: false, connected: false, confirmed: false, remoteConfirmed: false, error: '', status: '', invite: '', code: '', pending: false, expiresAt: null }
    this.listeners = new Set(); this.timers = new Set(); this.connections = new Set()
    if (recovery) this.state.theme = recovery.theme
    this.generation = 0; this.own = []; this.other = []; this.acks = new Set(); this.waiters = new Map(); this.incoming = null
    if (recovery) this.generation = recovery.generation
    this.filterRevision = 0; this.renderRequest = 0;
    this.state.photoFilter = normalizePhotoFilter(recovery?.photoFilter); this.state.filterBusy = false; this.state.remoteFilterReady = false;
    this.sequence = 0; this.disposed = false; this.closed = false; this.video = null; this.captureTimes = []; this.remoteTimes = []; this.timingDifferences = []
    this.subscribe = listener => { this.listeners.add(listener); return () => this.listeners.delete(listener) }
    this.getSnapshot = () => this.state
  }
  update(patch) { if (!this.disposed) { this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener()) } }
  later(fn, ms) { const timer = setTimeout(() => { this.timers.delete(timer); if (!this.closed) fn() }, ms); this.timers.add(timer); return timer }
  clear(timer) { clearTimeout(timer); this.timers.delete(timer) }
  fail(message) { this.update({ error: message }) }
  async camera(facing = 'user') {
    if (this.closed || this.cameraBusy) return
    this.cameraBusy = true
    this.pauseCamera()
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires HTTPS or localhost and a supported browser.')
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      if (this.closed) { stream.getTracks().forEach(track => track.stop()); return }
      this.update({ local: stream, mirror: facing === 'user', error: '' })
      stream.getVideoTracks()[0].onended = () => this.pauseCamera()
    } catch (error) { this.fail(error.name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access in browser settings, then retry.' : error.message) }
    finally { this.cameraBusy = false }
  }
  cameraLoaded(video) {
    this.video = video
    if (!this.state.local || this.closed) return
    this.update({ cameraReady: true, ...(this.state.stage === 'setup' ? { status: 'Camera ready. Create a room or join your friend when you are ready.' } : {}) })
    this.send('camera', { value: true, mirror: this.state.mirror }); this.maybeCall()
  }
  pauseCamera(notify = true) {
    if (notify && this.conn?.open) this.send('camera', { value: false })
    this.clear(this.mediaTimer); this.call?.close(); this.call = null
    this.state.local?.getTracks().forEach(track => { track.onended = null; track.stop() })
    this.update({ local: null, remote: null, cameraReady: false, ready: false, remoteReady: false })
    if (activeCapture(this.state) || this.state.stage === 'review') this.requestReset('Camera paused. Enable both cameras and get ready again.')
  }
  async start() {
    if (this.peer || this.closed || (!this.host && !this.state.cameraReady && !this.recovery)) return
    if (!navigator.onLine) { this.fail('You are offline. Friends mode needs internet.'); return }
    this.secret ||= this.invitation?.secret || randomId()
    this.id ||= `gm-${randomId()}`
    this.update({ stage: 'connecting', status: 'Connecting to the free room service…', error: '' })
    const save = () => { this.persist(); this.storageTimer = this.later(save, 10000) }
    this.storageTimer = this.later(save, 10000)
    try {
      this.peer = this.factory(this.id, { secure: true, debug: 0, config: ICE_CONFIG })
      this.startTimer = this.later(() => this.end('The free connection service is unavailable. Try again later.'), 25000)
      this.peer.on('open', () => {
        this.clear(this.startTimer)
        if (this.closed) return
        if (this.registered) { this.update({ status: this.state.connected ? 'Room service reconnected. Your session can continue.' : 'Room service reconnected. Waiting for your friend.' }); return }
        this.registered = true
        if (this.host) {
          const url = new URL(location.href); url.hash = new URLSearchParams({ friend: this.id, key: this.secret }).toString()
          this.expiresAt ||= Date.now() + LIMITS.waiting
          this.update({ stage: 'waiting', invite: url.href, status: 'Waiting for your friend. Return within 5 minutes if you switch apps.', expiresAt: this.expiresAt })
          this.expiry = this.later(() => this.end('This invitation has expired. Create a new room.'), this.expiresAt - Date.now())
          this.persist()
          if (this.resume) this.disconnected()
        } else this.connectGuest()
      })
      this.peer.on('connection', connection => this.attach(connection))
      this.peer.on('call', call => {
        if (this.host || !this.conn?.open || call.peer !== this.conn.peer || !this.state.confirmed || !this.state.remoteConfirmed || !this.state.cameraReady || this.call) { call.close(); return }
        this.bindCall(call); call.answer(this.state.local)
      })
      this.peer.on('error', error => {
        if (!this.closed && !this.host && ['peer-unavailable', 'network', 'server-error', 'socket-error', 'socket-closed'].includes(error.type)) {
          this.disconnected(); this.connections.forEach(connection => connection.close()); this.scheduleRetry(); return
        }
        if (!this.state.connected) this.end('Room unavailable, host offline, or this network cannot connect directly. Try a fresh invitation or another network.')
      })
      this.peer.on('disconnected', () => {
        if (!this.closed) this.update({ status: 'Room service disconnected. An existing direct session may continue; reconnecting…' })
        if (!this.closed && !this.peer.destroyed) { try { this.peer.reconnect() } catch { /* Data connection may still be usable. */ } }
      })
    } catch { this.end('Unable to start the free connection service. Please retry.') }
  }
  connectGuest() {
    if (this.closed) return
    this.update({ status: 'Connecting to your friend…' })
    this.attach(this.peer.connect(this.invitation.peer, { reliable: true, serialization: 'json' }))
  }
  attach(connection) {
    if (this.closed || (!this.host && connection.peer !== this.invitation.peer) || this.connections.size >= 3) { connection.close(); return }
    this.connections.add(connection)
    let last = 0, queue = Promise.resolve(), queued = 0, count = 0, windowAt = Date.now()
    const challenge = randomId()
    const timeout = this.later(() => { if (connection !== this.conn || !this.state.connected) connection.close() }, 60000)
    connection.on('open', () => {
      if (this.closed) { connection.close(); return }
      if (this.host) {
        if (this.conn?.open || (this.pending && this.pending !== connection)) { this.raw(connection, 'denied', { reason: 'This room already has a friend.' }); this.later(() => connection.close(), 200); return }
        this.raw(connection, 'challenge', { challenge })
      }
    })
    connection.on('data', message => {
      if (Date.now() - windowAt > 1000) { windowAt = Date.now(); count = 0 }
      if (message?.v !== undefined && message.v !== VERSION) {
        if (!this.host || connection === this.conn) this.end('Refresh both devices to use the updated booth.')
        else { this.raw(connection, 'denied', { reason: 'Refresh both devices to use the updated booth.' }); this.later(() => connection.close(), 200) }
        return
      }
      if (++count > 300 || ++queued > 256 || !validEnvelope(message, last) || JSON.stringify(message).length > 20000) { connection.close(); return }
      last = message.seq
      queue = queue.then(async () => {
        if (this.closed) return
        if (message.type === 'denied' && !this.host) { this.end(typeof message.reason === 'string' ? message.reason.slice(0, 180) : 'Admission declined.'); return }
        if (message.type === 'challenge' && !this.host && /^[a-f0-9]{48}$/.test(message.challenge)) {
          this.raw(connection, 'join', { proof: await proof(this.secret, message.challenge), resume: this.resume || null }); return
        }
        if (message.type === 'join' && this.host && connection !== this.conn) {
          if (message.proof !== await proof(this.secret, challenge) || this.conn?.open || (this.resume && message.resume !== this.resume) || (this.pending && this.pending !== connection)) { connection.close(); return }
          if (this.resume) { this.acceptConnection(connection, true); return }
          this.pending = connection; this.update({ pending: true, status: 'Your friend wants to join. Admit only the person you invited.' }); return
        }
        if (message.type === 'admitted' && !this.host && !this.state.connected && /^[a-f0-9]{48}$/.test(message.resume)) {
          this.resume = message.resume; this.conn = connection; this.clear(timeout); this.clear(this.reconnectTimer)
          if (!validatePhotoFilter(message.filter)) throw new Error('Invalid shared filter'); this.update({ photoFilter: normalizePhotoFilter(message.filter) }); this.admitted(message.expiresAt); this.send('camera', { value: this.state.cameraReady, mirror: this.state.mirror }); return
        }
        if (connection !== this.conn || !this.state.connected) return
        await this.receive(message)
      }).catch(() => { this.end('The session received invalid or incomplete data. Create a new room to retry.') }).finally(() => { queued-- })
    })
    connection.on('close', () => {
      this.clear(timeout); this.connections.delete(connection)
      if (this.pending === connection) { this.pending = null; this.update({ pending: false }) }
      if (this.conn === connection && !this.closed) this.disconnected()
      else if (!this.host && !this.closed && !this.state.connected && this.state.stage !== 'reconnecting') this.end('Admission failed or the connection timed out. Ask your friend to retry the invitation.')
    })
    connection.on('error', () => connection.close())
  }
  raw(connection, type, payload = {}) { if (connection?.open) connection.send({ ...payload, v: VERSION, seq: ++this.sequence, type }) }
  send(type, payload = {}) { this.raw(this.conn, type, payload) }
  accept() { if (this.pending) this.acceptConnection(this.pending) }
  reject() {
    const connection = this.pending; this.pending = null; this.update({ pending: false, status: 'Invitation declined. Waiting for your friend.' })
    this.raw(connection, 'denied', { reason: 'The host declined admission.' }); this.later(() => connection?.close(), 200)
  }
  acceptConnection(connection, resuming = false) {
    this.pending = null; this.conn = connection; this.resume ||= randomId()
    if (!resuming) { this.clear(this.expiry); this.expiresAt = Date.now() + LIMITS.room; this.expiry = this.later(() => this.end('This room has expired.'), LIMITS.room) }
    this.clear(this.reconnectTimer)
    this.raw(connection, 'admitted', { resume: this.resume, expiresAt: this.expiresAt, filter: this.state.photoFilter })
    this.admitted(this.expiresAt)
    this.send('camera', { value: this.state.cameraReady, mirror: this.state.mirror }); this.resetCapture()
  }
  admitted(expiresAt) {
    if (!Number.isFinite(expiresAt) || expiresAt < Date.now() || expiresAt > Date.now() + LIMITS.room + 10000) throw new Error('Invalid room lifetime')
    this.update({ connected: true, pending: false, stage: 'booth', confirmed: false, remoteConfirmed: false, expiresAt, status: 'Compare the code with your friend, then confirm before sharing video.', error: '' })
    this.clear(this.retryTimer); this.persist()
    digest(new TextEncoder().encode([this.host ? this.id : this.invitation.peer, this.secret, this.resume].join(':'))).then(value => { if (!this.closed) this.update({ code: value.slice(0, 8).toUpperCase() }) })
    this.lastHeartbeat = Date.now(); this.heartbeat()
    if (!this.host) { this.clear(this.expiry); this.expiry = this.later(() => this.end('This room has expired.'), expiresAt - Date.now()) }
  }
  heartbeat() {
    this.clear(this.heartbeatTimer)
    this.heartbeatTimer = this.later(() => {
      if (!this.state.connected) return
      if (!document.hidden && Date.now() - this.lastHeartbeat > LIMITS.reconnect) { this.conn?.close(); return }
      this.send('heartbeat'); this.persist(); this.heartbeat()
    }, 5000)
  }
  disconnected() {
    if (this.closed || this.state.stage === 'reconnecting') return
    this.call?.close(); this.call = null; this.remoteCamera = false; this.conn = null
    this.abortWork(); this.own = []; this.other = []
    this.update({ ...emptyCapture, result: this.state.result, connected: false, remote: null, confirmed: false, remoteConfirmed: false, stage: 'reconnecting', status: 'Waiting to reconnect. Return within 5 minutes to continue.' })
    this.reconnectTimer = this.later(() => this.end('Reconnect time expired. Create a new room.'), LIMITS.reconnect)
    this.persist(); this.scheduleRetry()
  }
  persist() {
    if (this.closed || !this.id || !this.secret || !this.state.expiresAt) return
    if (!writeRoom({ host: this.host, id: this.id, secret: this.secret, resume: this.resume || null, invitation: this.invitation || null, theme: this.state.theme, generation: this.generation, photoFilter: this.state.photoFilter, expiresAt: this.state.expiresAt })) this.update({ error: 'Browser storage is unavailable. Keep this page open to retain your room.' })
  }
  scheduleRetry() {
    this.clear(this.retryTimer)
    if (!this.host && !this.closed) this.retryTimer = this.later(() => { this.retryConnection(); if (!this.state.connected) this.scheduleRetry() }, 3000)
  }
  retryConnection() {
    if (this.closed || document.hidden || !navigator.onLine) return
    if (this.peer?.disconnected && !this.peer.destroyed) { try { this.peer.reconnect() } catch { /* Retry later. */ } }
    if (!this.host && this.state.stage === 'reconnecting' && this.peer && !this.peer.disconnected && this.connections.size === 0) this.connectGuest()
  }
  suspend() { this.persist(); this.pauseCamera() }
  resumePage() {
    if (this.closed) return
    if (this.state.expiresAt && Date.now() >= this.state.expiresAt) { this.end('This room has expired.'); return }
    if (!this.peer && this.recovery) this.start()
    this.lastHeartbeat = Date.now(); this.retryConnection()
    if (this.state.connected) this.send('heartbeat')
  }
  confirm() { this.update({ confirmed: true }); this.send('confirmed'); this.maybeCall() }
  maybeCall() {
    if (!this.host || !this.state.connected || !this.state.confirmed || !this.state.remoteConfirmed || !this.state.cameraReady || !this.remoteCamera || this.call) return
    this.bindCall(this.peer.call(this.conn.peer, this.state.local))
  }
  bindCall(call) {
    if (!call) return
    this.call = call
    this.clear(this.mediaTimer)
    this.mediaTimer = this.later(() => { if (this.call === call && !this.state.remote) { call.close(); this.fail('Video connection timed out. Pause and enable your camera, or try another network.') } }, 25000)
    call.on('stream', stream => { if (this.call === call && !this.closed) { this.clear(this.mediaTimer); this.update({ remote: stream, status: 'Both cameras are connected. Choose your frame and get ready.' }) } })
    call.on('close', () => { if (this.call === call) { this.call = null; this.update({ remote: null, ready: false, remoteReady: false }); if (activeCapture(this.state)) this.requestReset('Camera connection interrupted.') } })
    call.on('error', () => { call.close(); this.fail('Video could not connect. Pause and enable your camera, or try another network.') })
  }
  setTheme(theme) { if (this.host && THEMES[theme] && this.state.stage === 'booth') { this.update({ theme }); this.resetCapture() } }
  setReady() {
    if (this.state.stage !== 'booth' || !this.state.remote || !this.state.cameraReady || !this.state.confirmed || !this.state.remoteConfirmed) return
    this.update({ ready: !this.state.ready }); this.send('ready', { value: this.state.ready, generation: this.generation })
  }
  abortWork() {
    this.renderRequest++; this.clear(this.filterTimer)
    this.clear(this.captureTimer); this.clear(this.watchdog); this.clear(this.countTimer); this.clear(this.fileTimer)
    for (const waiter of this.waiters.values()) { this.clear(waiter.timer); waiter.reject(new Error('Session interrupted.')) }
    this.waiters.clear(); this.incoming = null; this.samples = []; this.prepared = false
  }
  resetCapture(reason = '') {
    if (!this.host) return
    this.renderRequest++; this.clear(this.filterTimer); this.filterRevision = 0;
    this.abortWork(); this.generation++; this.own = []; this.other = []; this.acks.clear(); this.captureTimes = []; this.remoteTimes = []; this.timingDifferences = []
    this.update({ ...emptyCapture, filterBusy: false, remoteFilterReady: false, stage: 'booth', error: reason })
    this.persist()
    this.send('reset', { generation: this.generation, theme: this.state.theme, filter: this.state.photoFilter, reason })
  }
  requestReset(reason = '') {
    if (this.host) this.resetCapture(reason)
    else { this.abortWork(); this.update({ ready: false, remoteReady: false }); this.send('reset-request', { generation: this.generation }); this.fail(reason) }
  }
  waitFor(id, timeout = 20000) {
    return new Promise((resolve, reject) => {
      const timer = this.later(() => { this.waiters.delete(id); reject(new Error('Your friend did not respond in time. Retry the session.')) }, timeout)
      this.waiters.set(id, { resolve, reject, timer })
    })
  }
  resolve(id, value) { const waiter = this.waiters.get(id); if (waiter) { this.clear(waiter.timer); this.waiters.delete(id); waiter.resolve(value) } }
  async begin() {
    if (!this.host || !this.state.ready || !this.state.remoteReady || this.state.stage !== 'booth') return
    const generation = this.generation
    this.update({ stage: 'syncing', error: '', status: 'Synchronizing cameras…' })
    try {
      const samples = []
      for (let i = 0; i < 5; i++) {
        const id = randomId(), sent = performance.now(), waiting = this.waitFor(id, 5000)
        this.send('ping', { id }); const remote = await waiting, now = performance.now()
        samples.push({ rtt: now - sent, offset: remote - (sent + now) / 2 })
      }
      if (generation !== this.generation) return
      this.offset = captureOffset(samples); this.scheduleShot(0)
    } catch (error) { if (generation === this.generation && !this.closed) this.resetCapture(error.message) }
  }
  async scheduleShot(shot) {
    const generation = this.generation
    try {
      const waiting = this.waitFor(`prepare-${generation}-${shot}`, 10000)
      this.send('prepare', { generation, shot })
      await waiting
      if (generation !== this.generation || this.closed) return
      const target = performance.now() + 3500
      this.send('schedule', { generation, shot, target: target + this.offset })
      this.scheduleLocal(shot, target)
    } catch (error) { if (generation === this.generation && !this.closed) this.resetCapture(error.message) }
  }
  scheduleLocal(shot, target) {
    if (!this.state.cameraReady || !this.state.ready || document.hidden || target - performance.now() < 300 || target - performance.now() > 6000) { this.requestReset('Capture arrived too late or the camera paused. Please get ready again.'); return }
    const generation = this.generation
    this.update({ stage: 'countdown', shot, status: `Pose ${shot + 1} of 3` })
    const tick = () => { if (generation !== this.generation) return; this.update({ countdown: Math.max(1, Math.ceil((target - performance.now()) / 1000)) }); this.countTimer = this.later(tick, 100) }; tick()
    this.watchdog = this.later(() => this.requestReset('Photo transfer timed out. Please retake.'), 45000)
    this.captureTimer = this.later(async () => {
      this.clear(this.countTimer)
      try {
        if (performance.now() - target > 500 || document.hidden) throw new Error('Capture was delayed. Please retake.')
        const capturedAt = performance.now()
        const blob = await captureStill(this.video, this.state.mirror)
        if (generation !== this.generation || this.closed) return
        this.own[shot] = blob; this.captureTimes[shot] = capturedAt; this.update({ stage: 'transferring', countdown: null, status: `Sharing pose ${shot + 1}…` })
        await this.sendFile(blob, { kind: 'still', shot, generation, capturedAt })
        if (generation !== this.generation || this.closed) return
        this.acks.add(shot); this.advance()
      } catch (error) { if (generation === this.generation && !this.closed) this.requestReset(error.message) }
    }, target - performance.now())
  }
  advance() {
    const shot = this.state.shot
    if (!this.host || !this.own[shot] || !this.other[shot] || !this.acks.has(shot) || this.advancing === `${this.generation}-${shot}`) return
    this.advancing = `${this.generation}-${shot}`; this.clear(this.watchdog)
    this.timingDifferences[shot] = Math.abs(this.captureTimes[shot] - (this.remoteTimes[shot] - this.offset))
    if (shot < 2) this.scheduleShot(shot + 1)
    else { this.send('review', { generation: this.generation }); this.review().catch(error => this.requestReset(error.message)) }
  }
  setFilter(value) {
    if (!this.host || !this.state.connected || !['review', 'composing'].includes(this.state.stage) || !validatePhotoFilter(value) || this.own.filter(Boolean).length !== 3 || this.other.filter(Boolean).length !== 3) return
    this.filterRevision++; this.renderRequest++
    this.update({ photoFilter: normalizePhotoFilter(value), approved: false, remoteApproved: false, remoteFilterReady: false, filterBusy: true, stage: 'review', error: '' })
    this.persist(); this.send('filter-update', { generation: this.generation, revision: this.filterRevision, filter: this.state.photoFilter })
    this.clear(this.filterTimer)
    this.filterTimer = this.later(() => this.review().catch(error => this.fail(error.message)), 150)
  }
  async review() {
    this.clear(this.watchdog)
    if (this.own.filter(Boolean).length !== 3 || this.other.filter(Boolean).length !== 3) throw new Error('Missing photos')
    const generation = this.generation, revision = this.filterRevision, request = ++this.renderRequest
    this.update({ stage: this.state.preview ? 'review' : 'composing', filterBusy: true, status: 'Putting your photos together…' })
    let preview
    try { preview = await composeFriends(this.host ? this.own : this.other, this.host ? this.other : this.own, this.state.theme, this.state.photoFilter) }
    catch (error) {
      if (generation === this.generation && revision === this.filterRevision && request === this.renderRequest && !this.closed) throw error
      return
    }
    if (generation === this.generation && revision === this.filterRevision && request === this.renderRequest && !this.closed) {
      this.update({ preview, filterBusy: false, stage: 'review', status: 'Both friends must approve these photos.' })
      this.send('filter-rendered', { generation, revision }); this.finalize()
    }
  }
  approve() { if (this.state.stage === 'review' && !this.state.filterBusy && this.state.remoteFilterReady) { this.update({ approved: true }); this.send('approve', { generation: this.generation, revision: this.filterRevision }); this.finalize() } }
  async finalize() {
    if (!this.host || this.state.filterBusy || !this.state.remoteFilterReady || !this.state.approved || !this.state.remoteApproved || this.state.stage !== 'review') return
    const generation = this.generation, result = this.state.preview
    this.update({ stage: 'finalizing', result, status: 'Sending the finished photo to your friend…' })
    try {
      await this.sendFile(result, { kind: 'result', generation })
      if (generation === this.generation && !this.closed) { this.update({ stage: 'result', received: true, status: 'Both friends received the same photo. Save your memory!' }); this.send('result-confirmed'); this.pauseCamera() }
    } catch (error) { if (generation === this.generation && !this.closed) this.update({ stage: 'result', error: error.message, status: 'Your copy is ready. Your friend has not confirmed receipt.' }) }
  }
  async sendFile(blob, info) {
    if (blob.size > LIMITS[info.kind]) throw new Error('Image is too large to share.')
    const bytes = new Uint8Array(await blob.arrayBuffer()), id = randomId(), hash = await digest(bytes)
    if (info.generation !== this.generation || this.closed) throw new Error('Transfer cancelled.')
    this.send('file-start', { ...info, id, size: bytes.length, hash })
    const started = Date.now()
    for (let offset = 0; offset < bytes.length; offset += LIMITS.chunk) {
      while ((this.conn?.dataChannel?.bufferedAmount || 0) > 128000 || this.conn?.bufferSize > 4) {
        if (Date.now() - started > 30000 || this.closed || info.generation !== this.generation || !this.conn?.open) throw new Error('Photo transfer interrupted.')
        await sleep(20)
      }
      if (this.closed || info.generation !== this.generation || !this.conn?.open) throw new Error('Photo transfer interrupted.')
      const chunk = bytes.subarray(offset, offset + LIMITS.chunk)
      this.send('file-chunk', { id, data: btoa(String.fromCharCode(...chunk)) })
      this.update({ status: `Sharing ${info.kind === 'result' ? 'finished photo' : `pose ${info.shot + 1}`}… ${Math.min(100, Math.round((offset + chunk.length) / bytes.length * 100))}%` })
      await sleep(10)
    }
    const waiting = this.waitFor(id, 20000)
    this.send('file-end', { id }); await waiting
  }
  async receive(message) {
    if (this.state.expiresAt && Date.now() >= this.state.expiresAt) { this.end('This room has expired.'); return }
    const { type } = message
    if (type === 'result-confirmed' && !this.host && this.state.stage === 'result') { this.pauseCamera(); return }
    if (type === 'heartbeat') { this.lastHeartbeat = Date.now(); return }
    if (type === 'end') { this.end('Your friend ended the room.', false); return }
    if (type === 'confirmed') { this.update({ remoteConfirmed: true }); this.maybeCall(); return }
    if (type === 'camera') { this.remoteCamera = message.value === true; this.update({ remoteMirror: message.mirror === true }); if (!this.remoteCamera) { this.call?.close(); this.update({ remote: null, ready: false, remoteReady: false }); if (activeCapture(this.state) || this.state.stage === 'review') this.requestReset('Your friend paused their camera.') } this.maybeCall(); return }
    if (type === 'ping') { if (typeof message.id === 'string' && message.id.length === 48) this.send('pong', { id: message.id, time: performance.now() }); return }
    if (type === 'pong') { if (Number.isFinite(message.time)) this.resolve(message.id, message.time); return }
    if (type === 'reset' && !this.host) {
      if (!Number.isSafeInteger(message.generation) || message.generation <= this.generation || !THEMES[message.theme]) return
      if (!validatePhotoFilter(message.filter)) throw new Error('Invalid shared filter')
      this.renderRequest++; this.filterRevision = 0; this.clear(this.filterTimer)
      this.abortWork(); this.generation = message.generation; this.own = []; this.other = []; this.acks.clear()
      this.update({ ...emptyCapture, theme: message.theme, photoFilter: normalizePhotoFilter(message.filter), filterBusy: false, remoteFilterReady: false, stage: 'booth', error: typeof message.reason === 'string' ? message.reason.slice(0, 180) : '' }); return
    }
    if (type === 'file-ack') { this.resolve(message.id); return }
    if (type === 'file-chunk' || type === 'file-end') { await this.receiveFile(message); return }
    if (message.generation !== this.generation) return
    if (type === 'filter-update' && !this.host) {
      if (!validatePhotoFilter(message.filter) || !Number.isSafeInteger(message.revision) || message.revision <= this.filterRevision || !['review', 'composing'].includes(this.state.stage)) return
      this.filterRevision = message.revision; this.renderRequest++
      this.update({ photoFilter: normalizePhotoFilter(message.filter), approved: false, remoteApproved: false, remoteFilterReady: false, filterBusy: true, stage: 'review', error: '' }); this.persist()
      this.clear(this.filterTimer); this.filterTimer = this.later(() => this.review().catch(error => this.fail(error.message)), 150); return
    }
    if (type === 'filter-rendered' && message.revision === this.filterRevision) { this.update({ remoteFilterReady: true }); this.finalize(); return }
    if (type === 'reset-request' && this.host) { this.resetCapture(); return }
    if (type === 'ready' && this.state.stage === 'booth') { this.update({ remoteReady: message.value === true }); return }
    if (type === 'prepare' && !this.host && this.state.ready && this.state.remoteReady && this.state.cameraReady && this.state.remote && !document.hidden && Number.isInteger(message.shot) && message.shot === this.own.filter(Boolean).length && message.shot < 3) {
      this.clear(this.watchdog); this.prepared = message.shot; this.send('prepared', { generation: this.generation, shot: message.shot }); return
    }
    if (type === 'prepared' && this.host) { this.resolve(`prepare-${this.generation}-${message.shot}`); return }
    if (type === 'schedule' && !this.host && this.prepared === message.shot && Number.isFinite(message.target)) { this.prepared = false; this.scheduleLocal(message.shot, message.target); return }
    if (type === 'review' && !this.host && this.state.stage === 'transferring') { await this.review(); return }
    if (type === 'approve' && message.revision === this.filterRevision && ['composing', 'review'].includes(this.state.stage)) { this.update({ remoteApproved: true }); this.finalize(); return }
    if (type === 'file-start') {
      if (!validFile(message) || this.incoming) throw new Error('Invalid transfer')
      const isStill = message.kind === 'still' && Number.isFinite(message.capturedAt) && ['countdown', 'transferring'].includes(this.state.stage) && message.shot === this.state.shot && !this.other[message.shot]
      const isResult = message.kind === 'result' && !this.host && this.state.stage === 'review' && this.state.approved && this.state.remoteApproved && !this.state.filterBusy && this.state.remoteFilterReady
      if (!isStill && !isResult) throw new Error('Unexpected image')
      this.incoming = { ...message, chunks: [], received: 0 }
      this.fileTimer = this.later(() => this.requestReset('Incoming photo transfer timed out. Please retake.'), 45000)
      return
    }
  }
  async receiveFile(message) {
    const file = this.incoming
    if (!file || message.id !== file.id || file.generation !== this.generation) return
    if (message.type === 'file-chunk') {
      if (typeof message.data !== 'string' || message.data.length > 16000) throw new Error('Invalid chunk')
      const bytes = Uint8Array.from(atob(message.data), char => char.charCodeAt(0))
      if (!bytes.length || file.received + bytes.length > file.size) throw new Error('Invalid file size')
      file.chunks.push(bytes); file.received += bytes.length; return
    }
    this.incoming = null; this.clear(this.fileTimer)
    if (file.received !== file.size) throw new Error('Incomplete file')
    const blob = new Blob(file.chunks, { type: 'image/jpeg' })
    if (await digest(await blob.arrayBuffer()) !== file.hash) throw new Error('Image checksum mismatch')
    await validatePhoto(blob, file.kind)
    if (file.generation !== this.generation || this.closed) return
    if (file.kind === 'still') { this.other[file.shot] = blob; this.remoteTimes[file.shot] = file.capturedAt }
    else this.update({ result: blob, stage: 'result', received: true, status: 'Your shared photo is ready. Save your memory!' })
    this.send('file-ack', { id: file.id }); this.advance()

  }
  end(reason = 'Room ended.', notify = true) {
    if (this.closed) return
    if (notify) this.send('end')
    clearRoom(); this.closed = true; this.abortWork(); this.timers.forEach(clearTimeout); this.timers.clear()
    this.call?.close(); this.connections.forEach(connection => connection.close()); this.connections.clear(); this.peer?.destroy()
    this.state.local?.getTracks().forEach(track => { track.onended = null; track.stop() })
    this.own = []; this.other = []; this.secret = null; this.resume = null
    this.update({ stage: 'ended', connected: false, local: null, remote: null, preview: null, invite: '', pending: false, status: reason, cameraReady: false })
  }
  dispose() { this.end(); this.disposed = true; this.listeners.clear() }
}
