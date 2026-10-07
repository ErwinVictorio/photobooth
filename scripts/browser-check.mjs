import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, extname, join } from 'node:path'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import assert from 'node:assert/strict'

// Dependency-free Chromium integration test. Uses a synthetic camera, never a real webcam.
const root = resolve('dist')
const browserPath = process.env.BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
assert(existsSync(browserPath), 'Set BROWSER_PATH to a Chromium browser executable.')
const output = resolve('artifacts/browser-check')
await mkdir(output, { recursive: true })
const profile = join(tmpdir(), `photobooth-check-${Date.now()}`)
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }
let offline = false
const server = createServer(async (req, res) => {
  if (offline) { res.writeHead(503); res.end('Offline test'); return }
  try {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    const path = resolve(root, `.${name === '/' ? '/index.html' : name}`)
    if (!path.startsWith(root)) throw new Error('Invalid path')
    res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.end(await readFile(path))
  } catch { res.writeHead(404); res.end('Not found') }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const child = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', 'about:blank'], { windowsHide: true, stdio: 'ignore' })
let ws, seq = 0
const pending = new Map(), errors = [], checks = []
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function eventually(fn, label, timeout = 18000) {
  const started = Date.now()
  while (Date.now() - started < timeout) { try { const value = await fn(); if (value) return value } catch { /* Browser may still be starting. */ } await sleep(100) }
  throw new Error(`Timed out: ${label}`)
}
function send(method, params = {}) {
  return new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
}
async function evaluate(expression) {
  const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true })
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text)
  return response.result.value
}
const text = (value) => JSON.stringify(value)
const has = (value) => evaluate(`document.body.innerText.includes(${text(value)})`)
const waitText = (value) => eventually(() => has(value), value)
async function click(label) {
  await eventually(() => evaluate(`!!Array.from(document.querySelectorAll('button')).find(b => (b.textContent.trim() === ${text(label)} || b.getAttribute('aria-label') === ${text(label)}) && !b.disabled)`), `button ${label}`)
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b => (b.textContent.trim() === ${text(label)} || b.getAttribute('aria-label') === ${text(label)}) && !b.disabled).click()`)
}
async function operator() {
  await evaluate(`document.querySelector('.brand').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`)
  await waitText('Operator studio')
  await evaluate(`document.querySelector('.brand').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))`)
}
async function screenshot(name) { await sleep(400); const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await writeFile(join(output, `${name}.png`), Buffer.from(image.data, 'base64')) }
async function check(label, fn) { await fn(); checks.push(label); console.log(`PASS ${label}`) }
async function enterCamera() { if (await has('Choose a template') && await evaluate('!!document.querySelector(".template-page")')) await click('Continue →'); else await click('Let’s take photos') }
async function chooseAndCapture(layoutName) {
  await click('Start photo')
  if (layoutName) await evaluate(`Array.from(document.querySelectorAll('.choice-card')).find(b => b.querySelector('h2').textContent === ${text(layoutName)}).click()`)
  await click('Choose a template'); await enterCamera()
  await click('Take photos'); await waitText('That’s a keeper.')
  await eventually(() => evaluate(`document.querySelector('.photo-display img')?.naturalWidth > 0`), 'composed image')
}
const dbRows = () => evaluate(`new Promise((resolve,reject) => { const r=indexedDB.open('good-moments-photobooth',1); r.onsuccess=()=>{ const db=r.result; const tx=db.transaction('sessions'); const q=tx.objectStore('sessions').getAll(); q.onsuccess=()=>resolve(q.result.map(s=>({id:s.id, count:s.originals.length, size:s.finalPhoto.size, type:s.finalPhoto.type, eventName:s.eventName,layout:s.layout}))); tx.oncomplete=()=>db.close() }; r.onerror=()=>reject(r.error) })`)
try {
  const target = await eventually(async () => { const port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0].trim(); const targets = await (await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(1500) })).json(); return targets.find((t) => t.type === 'page') }, 'browser startup')
  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  ws.onmessage = (event) => { const message = JSON.parse(event.data); if (message.id) { const request = pending.get(message.id); pending.delete(message.id); if (message.error) request?.reject(new Error(message.error.message)); else request?.resolve(message.result) } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text) }
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 820, height: 1180, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: origin }); await waitText('Start photo')
  await check('Welcome layout at iPad portrait and mobile widths', async () => {
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true)
    await screenshot('01-welcome-ipad')
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false })
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true)
    await screenshot('02-welcome-mobile')
    await send('Emulation.setDeviceMetricsOverride', { width: 820, height: 1180, deviceScaleFactor: 1, mobile: false })
  })
  await check('Three-shot camera, preview, JPEG and committed local originals', async () => {
    await click('Start photo'); await screenshot('03-layouts'); await click('Choose a template'); await screenshot('04-frames')
    await enterCamera(); await eventually(() => evaluate('!!document.querySelector("video")?.videoWidth'), 'live camera')
    await screenshot('05-camera'); await click('Take photos'); await waitText('That’s a keeper.')
    await eventually(() => evaluate('document.querySelector(".photo-display img")?.naturalWidth === 900'), '900px strip preview')
    assert.equal(await evaluate('document.querySelector(".photo-display img").naturalHeight'), 2100)
    await screenshot('06-preview'); await click('Use these photos'); await waitText('Also saved in your local gallery.')
    const rows = await dbRows(); assert.equal(rows.length,1); assert.equal(rows[0].count,3); assert.equal(rows[0].type,'image/jpeg'); assert(rows[0].size>10000)
    await screenshot('07-result')
    assert.equal(await evaluate('document.querySelector("video") === null'), true)
  })
  await check('Download offers a JPEG file', async () => {
    await evaluate(`window.__download = null; HTMLAnchorElement.prototype.click = function(){ window.__download={name:this.download, href:this.href} }`)
    await click('Save to device')
    const download = await evaluate('window.__download'); assert(download.name.endsWith('.jpg')); assert(download.href.startsWith('blob:'))
  })
  await check('Gallery survives reload; delete cancellation preserves originals', async () => {
    await send('Page.reload'); await waitText('Start photo'); await operator(); await click('Local gallery'); await waitText('1 memories'); await screenshot('08-gallery')
    await evaluate(`document.querySelector('.gallery-caption button').click()`); await waitText('Delete this memory?'); await click('Keep photo')
    assert.equal((await dbRows()).length,1)
    await evaluate(`document.querySelector('.gallery-image').click()`); await waitText('A moment to keep.')
    await click('Back to gallery'); await waitText('1 memories')
  })
  await check('Settings and setup screens; settings persist', async () => {
    await click('Operator'); await click('Booth settings'); await waitText('saved sessions'); await screenshot('09-settings')
    await click('Clear all local photos'); await click('Keep photos'); assert.equal((await dbRows()).length,1)
    await click('Operator'); await click('Event setup'); await screenshot('10-event-setup')
    await evaluate(`const input=document.querySelector('input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Browser Test Event'); input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true}));`)
    await click('Save & start booth'); await waitText('Browser Test Event'); await send('Page.reload'); await waitText('Browser Test Event')
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("photobooth.settings")).eventName'), 'Browser Test Event')
  })
  await check('Retake discards unfinished session without touching saved gallery', async () => {
    await chooseAndCapture('Single'); await click('Retake photos'); await click('Take photos'); await waitText('That’s a keeper.')
    await eventually(() => evaluate('document.querySelector(".photo-display img")?.naturalWidth === 1200'), 'single image')
    assert.equal((await dbRows()).length,1)
    await click('Use these photos'); await waitText('Also saved in your local gallery.'); assert.equal((await dbRows()).length,2)
    await click('Take another photo')
  })
  await check('Storage failure retains final image and offers download/retry', async () => {
    await chooseAndCapture('Single')
    await evaluate(`window.__put=IDBObjectStore.prototype.put; IDBObjectStore.prototype.put=function(){throw new DOMException('Full','QuotaExceededError')}`)
    await click('Use these photos'); await waitText('local gallery could not save it')
    assert.equal(await evaluate('document.querySelector(".print-photo").naturalWidth'),1200)
    await evaluate('IDBObjectStore.prototype.put=window.__put')
    await click('Retry saving to gallery'); await waitText('Also saved in your local gallery.'); assert.equal((await dbRows()).length,3)
    await click('Take another photo')
  })
  await check('Two-photo and four-grid composition dimensions and camera switching', async () => {
    for (const [name, width, height] of [['Two photos',1800,1200], ['Four photos',1500,1800]]) {
      await click('Start photo')
      await evaluate(`Array.from(document.querySelectorAll('.choice-card')).find(b => b.querySelector('h2').textContent === ${text(name)}).click()`)
      await click('Choose a template'); await enterCamera()
      await eventually(() => evaluate('!!document.querySelector("video")?.srcObject?.active'), 'camera ready')
      await evaluate('window.__oldStream=document.querySelector("video").srcObject')
      await click('Switch')
      await eventually(() => evaluate('document.querySelector("video")?.srcObject !== window.__oldStream && !document.querySelector(".shutter").disabled'), 'camera switched')
      assert.equal(await evaluate('window.__oldStream.getTracks().every(t=>t.readyState==="ended")'),true)
      await click('Take photos'); await waitText('That’s a keeper.')
      await eventually(() => evaluate(`document.querySelector('.photo-display img')?.naturalWidth === ${width}`), `${name} output`)
      assert.equal(await evaluate('document.querySelector(".photo-display img").naturalHeight'),height)
      await click('Return to welcome')
    }
    assert.equal((await dbRows()).length,3)
    await send('Emulation.setDeviceMetricsOverride', { width: 1180, height: 820, deviceScaleFactor: 1, mobile: false })
    await screenshot('13-landscape')
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true)
    await send('Emulation.setDeviceMetricsOverride', { width: 820, height: 1180, deviceScaleFactor: 1, mobile: false })
  })
  await check('Camera permission denial is recoverable without fake capture', async () => {
    await evaluate(`navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError')}`)
    await click('Start photo'); await click('Choose a template'); await enterCamera(); await waitText('Camera permission is needed.')
    assert.equal(await evaluate('document.querySelector(".shutter").disabled'),true)
    await screenshot('11-camera-permission')
    await click('Templates'); await click('Return to welcome')
  })
  await check('Confirmed gallery deletion removes only selected session', async () => {
    await operator(); await click('Local gallery'); await click('All photos'); await waitText('3 memories')
    await evaluate('document.querySelector(".gallery-caption button").click()'); await click('Delete photo'); await waitText('2 memories')
    assert.equal((await dbRows()).length,2)
  })
  await check('Production app and gallery reload with network disabled', async () => {
    await eventually(() => evaluate('Boolean(navigator.serviceWorker.controller)'), 'service worker controller')
    offline = true
    await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
    await send('Page.reload'); await waitText('Start photo')
    await operator(); await click('Local gallery'); await click('All photos'); await waitText('2 memories')
    await screenshot('12-offline-gallery')
  })
  assert.deepEqual(errors, [], 'No uncaught browser errors')
  await writeFile(join(output,'results.json'), JSON.stringify({ checkedAt: new Date().toISOString(), checks, errors, browser: 'Headless Microsoft Edge; synthetic camera', hardwareLimitations: ['Actual iPad Safari', 'Real camera switching', 'iOS share sheet', 'Physical printing'] }, null, 2))
  console.log(`All ${checks.length} browser checks passed. Screenshots: ${output}`)
} catch (error) {
  if (ws?.readyState === WebSocket.OPEN) { try { await screenshot('failure'); console.error(await evaluate('document.body.innerText')) } catch { /* Preserve original failure. */ } }
  console.error(error); process.exitCode = 1
} finally { ws?.close(); child.kill(); server.close() }
