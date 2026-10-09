import { createServer } from 'node:http'
import { readFile, mkdir, writeFile, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, extname, join } from 'node:path'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import assert from 'node:assert/strict'
import { build } from 'vite'
import { PeerServer } from 'peer'

const publicBroker = process.env.FRIENDS_PUBLIC_BROKER === '1'
const out = resolve(publicBroker ? 'artifacts/friends-public-check' : 'artifacts/friends-check'); await mkdir(out, { recursive: true })
await build({ configFile: false, logLevel: 'warn', build: { outDir: join(out, 'fixture'), emptyOutDir: true, lib: { entry: resolve('scripts/friends-fixture.js'), formats: ['es'], fileName: () => 'fixture.js' } } })
// PeerServer's Express application emits its HTTP server through the callback.
let brokerServer
const localBroker = PeerServer({ port: 0, host: '127.0.0.1', path: '/' }, server => { brokerServer = server })
void localBroker
const browser = process.env.BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
assert(existsSync(browser), 'Set BROWSER_PATH to Chromium.')
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' }
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname
    if (path === '/fixture') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><div id="status"></div><script type="module" src="/fixture.js"></script>'); return }
    const base = path === '/fixture.js' ? join(out, 'fixture') : resolve('dist')
    const file = resolve(base, `.${path === '/' ? '/index.html' : path}`)
    if (!file.startsWith(base + '\\') && !file.startsWith(base + '/')) throw new Error('Invalid path')
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream'); res.end(await readFile(file))
  } catch { res.writeHead(404); res.end('Not found') }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const children = [], clients = [], errors = [], checks = []
let captureTimingDifferencesMs = []
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
async function eventually(fn, label, timeout = 25000) { const until = Date.now() + timeout; while (Date.now() < until) { try { const value = await fn(); if (value) return value } catch { /* startup */ } await sleep(100) } throw new Error(`Timed out: ${label}`) }
async function client(name, path = '/fixture') {
  const profile = join(tmpdir(), `friends-${name}-${Date.now()}`)
  const child = spawn(browser, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--disable-background-timer-throttling', 'about:blank'], { windowsHide: true, stdio: 'ignore' }); children.push(child)
  const target = await eventually(async () => { const port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0].trim(); return (await (await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(1500) })).json()).find(item => item.type === 'page') }, 'browser startup')
  const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let seq = 0; const pending = new Map()
  ws.onmessage = event => { const message = JSON.parse(event.data); if (message.id) { const request = pending.get(message.id); pending.delete(message.id); if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result) } else if (message.method === 'Runtime.exceptionThrown') errors.push({ name, error: message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text }) }
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
  const evaluate = async expression => { const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true }); if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text); return response.result.value }
  const result = { ws, send, evaluate, name }; clients.push(result)
  await send('Runtime.enable'); await send('Page.enable'); await send('Page.navigate', { url: origin + path })
  return result
}
async function check(name, run) { await run(); checks.push(name); console.log(`PASS ${name}`) }
const state = c => c.evaluate('({stage:session.state.stage,error:session.state.error,status:session.state.status,ready:session.state.ready,remoteReady:session.state.remoteReady,shot:session.state.shot})')
try {
  await eventually(() => brokerServer?.listening, 'local broker')
  const port = publicBroker ? null : brokerServer.address().port
  const host = await client('host'), guest = await client('guest')
  for (const c of [host, guest]) await eventually(() => c.evaluate('typeof startFixture === "function"'), 'fixture module')
  await check('Protocol rejects replay, malformed invitations and oversized transfers', async () => assert.equal(await host.evaluate('protocolChecks()'), true))
  await host.evaluate(`startFixture(null, ${port})`)
  const invite = await eventually(() => host.evaluate('session.state.invite'), 'invitation')
  await guest.evaluate(`startFixture(${JSON.stringify(invite)}, ${port})`)
  await check('Admission gates media and admits only one friend', async () => {
    await eventually(() => host.evaluate('session.state.pending'), 'pending guest')
    assert.equal(await guest.evaluate('!!session.state.remote'), false)
    await host.evaluate('session.accept()')
    await eventually(() => guest.evaluate('session.state.connected'), 'guest admitted')
    assert.equal(await host.evaluate('session.state.code'), await guest.evaluate('session.state.code'))
    const third = await client('third'); await eventually(() => third.evaluate('typeof startFixture === "function"'), 'third fixture')
    await third.evaluate(`startFixture(${JSON.stringify(invite)}, ${port})`)
    await eventually(() => third.evaluate('session.state.stage === "ended"'), 'third rejected')
    assert.equal(await host.evaluate('session.state.connected'), true)
    await host.evaluate('session.confirm()'); await guest.evaluate('session.confirm()')
    await eventually(() => host.evaluate('!!session.state.remote'), 'host video')
    await eventually(() => guest.evaluate('!!session.state.remote'), 'guest video')
    assert.equal(await host.evaluate('session.state.local.getAudioTracks().length'), 0)
  })
  await check('Ready reset, synchronized capture, cancel and stale messages', async () => {
    const expiry = await host.evaluate('session.state.expiresAt')
    await host.evaluate('session.peer.disconnect()')
    await eventually(() => host.evaluate('!session.peer.disconnected'), 'signaling reconnect')
    assert.equal(await host.evaluate('session.state.stage'), 'booth')
    assert.equal(await host.evaluate('session.state.expiresAt'), expiry)
    await host.evaluate('session.setReady()'); await guest.evaluate('session.setReady()')
    await eventually(() => host.evaluate('session.state.remoteReady'), 'ready')
    await host.evaluate("session.setTheme('rose')")
    await eventually(() => guest.evaluate('!session.state.ready && session.state.theme === "rose"'), 'config reset')
    await host.evaluate('session.setReady()'); await guest.evaluate('session.setReady()')
    await eventually(() => host.evaluate('session.state.remoteReady'), 'ready again')
    await host.evaluate('session.begin()')
    await eventually(() => guest.evaluate('session.state.stage === "countdown"'), 'countdown')
    const previous = await host.evaluate('session.generation')
    await guest.evaluate('session.requestReset()')
    await eventually(() => host.evaluate('session.state.stage === "booth"'), 'cancel')
    await guest.evaluate(`session.receive({type:'schedule',generation:${previous},shot:0,target:performance.now()+1000})`)
    assert.equal(await guest.evaluate('session.state.stage'), 'booth')
  })
  await check('Three paired captures, two approvals, identical final JPEGs', async () => {
    await host.evaluate('session.setReady()'); await guest.evaluate('session.setReady()')
    await eventually(() => host.evaluate('session.state.remoteReady'), 'ready for capture')
    await host.evaluate('session.begin()')
    await eventually(() => host.evaluate('session.state.stage === "review"'), 'host review', 65000)
    await eventually(() => guest.evaluate('session.state.stage === "review"'), 'guest review')
    assert.equal(await host.evaluate('session.own.length + session.other.length'), 6)
    await host.evaluate('session.approve()'); await sleep(250)
    assert.equal(await host.evaluate('!!session.state.result'), false)
    await guest.evaluate('session.approve()')
    await eventually(() => host.evaluate('session.state.received'), 'host result receipt')
    await eventually(() => guest.evaluate('session.state.received'), 'guest result receipt')
    assert.equal(await host.evaluate('resultHash()'), await guest.evaluate('resultHash()'))
    captureTimingDifferencesMs = await host.evaluate('session.timingDifferences')
    const bytes = await host.evaluate('session.state.result.size'); assert(bytes > 10000)
    await eventually(() => host.evaluate('!session.state.local'), 'host camera stopped after result')
    await eventually(() => guest.evaluate('!session.state.local'), 'guest camera stopped after result')
  })
  await check('Disconnect grace and authenticated reconnect', async () => {
    await guest.evaluate('session.conn.close()')
    await eventually(() => host.evaluate('session.state.stage === "reconnecting"'), 'host reconnect state')
    await eventually(() => guest.evaluate('session.state.stage === "reconnecting"'), 'guest reconnect state')
    await guest.evaluate('session.retryConnection()')
    await eventually(() => guest.evaluate('session.state.connected && session.state.stage === "booth"'), 'rejoined')
    assert.equal(await host.evaluate('session.state.confirmed'), false)
  })
  await check('Host reload restores the same invitation and authenticated guest automatically', async () => {
    const id = await host.evaluate('session.id');
    const expiry = await host.evaluate('session.state.expiresAt');
    await host.evaluate('session.suspend()');
    assert.equal(await host.evaluate('session.closed'), false);
    await host.send('Page.reload');
    await eventually(() => host.evaluate('typeof startFixture === "function"'), 'reloaded fixture');
    await host.evaluate(`startFixture(null, ${port}, true)`);
    await eventually(() => guest.evaluate('session.state.connected'), 'automatic guest reconnect');
    await eventually(() => host.evaluate('session.state.connected'), 'restored host connected');
    assert.equal(await host.evaluate('session.id'), id);
    assert.equal(await host.evaluate('session.state.invite'), invite);
    assert.equal(await host.evaluate('session.state.expiresAt'), expiry);
    assert.equal(await host.evaluate('session.state.confirmed'), false);
  });
  await check('Ending room stops cameras and connections', async () => {
    await host.evaluate('window.oldTracks = session.state.local?.getTracks() || []; session.end()')
    await eventually(() => guest.evaluate('session.state.stage === "ended"'), 'guest ended')
    assert.equal(await host.evaluate('oldTracks.every(t => t.readyState === "ended")'), true)
  })
  await check('Declined admission and corrupt transfers fail closed', async () => {
    await host.evaluate(`startFixture(null, ${port})`)
    const nextInvite = await eventually(() => host.evaluate('session.state.invite'), 'new invitation')
    const intruder = clients.find(c => c.name === 'third')
    const wrongInvite = nextInvite.replace(/key=[a-f0-9]+/, `key=${'0'.repeat(48)}`)
    await intruder.evaluate(`startFixture(${JSON.stringify(wrongInvite)}, ${port})`)
    await eventually(() => intruder.evaluate('session.state.stage === "ended"'), 'wrong invitation secret rejected')
    assert.equal(await host.evaluate('session.state.pending'), false)
    await guest.evaluate(`startFixture(${JSON.stringify(nextInvite)}, ${port})`)
    await eventually(() => host.evaluate('session.state.pending'), 'decline request')
    await host.evaluate('session.reject()')
    await eventually(() => guest.evaluate('session.state.stage === "ended"'), 'declined guest')
    assert.equal(await host.evaluate('!!session.state.remote'), false)
    await guest.evaluate(`startFixture(${JSON.stringify(nextInvite)}, ${port})`)
    await eventually(() => host.evaluate('session.state.pending'), 'second request')
    await host.evaluate('session.accept()')
    await eventually(() => guest.evaluate('session.state.connected && session.generation > 0'), 'second admission')
    await guest.evaluate("session.send('file-start', {generation:session.generation, id:'a'.repeat(48),hash:'b'.repeat(64),size:99999999,kind:'still',shot:0})")
    await eventually(() => host.evaluate('session.state.stage === "ended"'), 'invalid file rejected')
    assert.equal(await host.evaluate('session.state.local'), null)
  })
  const ui = await client('ui', '/')
  await check('Production Friends UI, mobile fit, camera and cancel-safe leave', async () => {
    await eventually(() => ui.evaluate('document.body.innerText.includes("Photo with a friend")'), 'entry button')
    await ui.evaluate('Array.from(document.querySelectorAll("button")).find(b=>b.textContent==="Photo with a friend").click()')
    await eventually(() => ui.evaluate('document.body.innerText.includes("Together, anywhere.")'), 'friends UI')
    await ui.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false })
    assert.equal(await ui.evaluate('document.documentElement.scrollWidth <= innerWidth'), true)
    await ui.evaluate('Array.from(document.querySelectorAll("button")).find(b=>b.textContent==="Enable camera").click()')
    await eventually(() => ui.evaluate('!!document.querySelector("video").videoWidth'), 'UI camera')
    const shot = await ui.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await writeFile(join(out, 'friends-mobile.png'), Buffer.from(shot.data, 'base64'))
    await ui.evaluate('Array.from(document.querySelectorAll("button")).find(b=>b.textContent==="Leave room").click()')
    await ui.evaluate('Array.from(document.querySelectorAll("button")).find(b=>b.textContent==="Stay here").click()')
    assert.equal(await ui.evaluate('document.querySelector("video").srcObject.active'), true)
    await ui.evaluate('window.uiTracks=document.querySelector("video").srcObject.getTracks(); Array.from(document.querySelectorAll("button")).find(b=>b.textContent==="Leave room").click()')
    await ui.evaluate('Array.from(document.querySelectorAll("dialog button")).find(b=>b.textContent==="Leave room").click()')
    await eventually(() => ui.evaluate('document.body.innerText.includes("Start photo")'), 'local mode return')
    await eventually(() => ui.evaluate('uiTracks.every(t=>t.readyState==="ended")'), 'UI cleanup')
  })
  await check('Offline Friends entry and invalid invitations show recovery', async () => {
    await ui.send('Network.enable')
    await ui.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
    await ui.evaluate('Array.from(document.querySelectorAll("button")).find(b=>b.textContent==="Photo with a friend").click()')
    await eventually(() => ui.evaluate('document.body.innerText.includes("Enable camera")'), 'offline entry')
    await ui.evaluate('Array.from(document.querySelectorAll("button")).find(b=>b.textContent==="Create room").click()')
    await eventually(() => ui.evaluate('document.body.innerText.includes("You are offline")'), 'offline error')
    await ui.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
    // Avoid the intentional beforeunload warning when navigating the fixture browser.
    await ui.evaluate('Array.from(document.querySelectorAll("button")).find(b=>b.textContent==="Leave room").click()')
    await eventually(() => ui.evaluate('!!document.querySelector("dialog[open]")'), 'leave dialog')
    await ui.evaluate('Array.from(document.querySelectorAll("dialog button")).find(b=>b.textContent==="Leave room").click()')
    await eventually(() => ui.evaluate('document.body.innerText.includes("Start photo")'), 'return before invalid link')
    const invalid = await client('invalid', '/#friend=bad&key=bad')
    await eventually(() => invalid.evaluate('document.body.innerText.includes("Invitation unavailable")'), 'invalid invitation error')
  })
  assert.deepEqual(errors, [])
  await writeFile(join(out, 'results.json'), JSON.stringify({ checks, errors, transport: 'real WebRTC, independent headless browsers, synthetic cameras', publicBrokerTested: publicBroker, actualDevicesTested: false, captureTimingDifferencesMs }, null, 2))
  await unlink(join(out, 'failure.json')).catch(error => { if (error.code !== 'ENOENT') throw error })
} catch (error) {
  const states = await Promise.all(clients.map(async c => ({ name: c.name, state: await state(c).catch(() => null), page: await c.evaluate('({url:location.href,text:document.body.innerText})').catch(() => null) })))
  await writeFile(join(out, 'failure.json'), JSON.stringify({ error: error.stack, states, errors }, null, 2)); throw error
} finally {
  for (const c of clients) c.ws.close()
  for (const child of children) child.kill()
  server.close(); brokerServer?.close()
  // PeerServer owns keepalive timers; terminate after closing our browser processes.
  setTimeout(() => process.exit(process.exitCode || (checks.length < 6 ? 1 : 0)), 200).unref()
}
