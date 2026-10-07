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
const output = resolve('artifacts/template-check')
await mkdir(output, { recursive: true })
const profile = join(tmpdir(), `photobooth-check-${Date.now()}`)
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }
let offline = false
const server = createServer(async (req, res) => {
  if (offline) { res.writeHead(503); res.end('Offline test'); return }
  try {
    if (req.url === '/__test.html') { res.setHeader('Content-Type', 'text/html'); res.end('<script src="/__fixture.js"></script>'); return }
    if (req.url === '/__fixture.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(await readFile(resolve('artifacts/renderer-fixture/fixture.js'))); return }
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
  const target = await eventually(async () => { const port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0].trim(); const targets = await (await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(1500) })).json(); return targets.find(t => t.type === 'page') }, 'browser startup')
  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  ws.onmessage = event => { const message = JSON.parse(event.data); if (message.id) { const request = pending.get(message.id); pending.delete(message.id); if (message.error) request?.reject(new Error(message.error.message)); else request?.resolve(message.result) } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text) }
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 820, height: 1180, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: `${origin}/__test.html` })
  await eventually(() => evaluate('typeof rendererChecks === "function"'), 'renderer fixture')
  await check('All five renderer specifications: pixel, text, dimensions and compatibility checks', async () => {
    const results = await evaluate('rendererChecks()'); checks.push(...results); await screenshot('renderer-colored-slots')
  })
  await send('Page.navigate', { url: origin }); await waitText('Start photo')
  await check('Picker filters retain selection; enlarged cancel restores focus; explicit Use changes selection', async () => {
    await click('Start photo'); await click('Choose a template')
    await eventually(() => evaluate('document.querySelectorAll(".template-art img").length === 5'), 'five thumbnails')
    assert(await has('Minimal Clean selected'))
    await click('Retro'); assert.equal(await evaluate('document.querySelectorAll(".template-card").length'), 2); assert(await has('Minimal Clean selected'))
    await evaluate(`document.querySelector('[aria-label="View larger: Vintage Polaroid"]').focus()`)
    await click('View larger: Vintage Polaroid'); await waitText('Use this template'); assert(await has('Minimal Clean selected'))
    assert(await evaluate('document.querySelector("dialog").contains(document.activeElement)'))
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
    await eventually(() => evaluate('!document.querySelector("dialog")'), 'dialog closed')
    assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'View larger: Vintage Polaroid')
    assert(await has('Minimal Clean selected'))
    await click('View larger: Vintage Polaroid'); await click('Use this template'); assert(await has('Vintage Polaroid selected'))
    await click('All'); await screenshot('picker-portrait')
    for (const [width, height] of [[390,844], [1180,820], [1440,900]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
      assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), `Overflow at ${width}`)
      await screenshot(`picker-${width}`)
    }
    await click('View larger: Minimal Clean'); await screenshot('enlarged-template'); await click('Back to templates')
    await click('Return to welcome')
  })
  await check('Operator rejects oversized text, empty availability and disabled default; draft cancellation preserves settings', async () => {
    await operator(); await click('Event setup'); await waitText('Available guest strip templates')
    const updateName = value => evaluate(`(()=>{const input=document.querySelector('input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${text(value)}); input.dispatchEvent(new Event('input',{bubbles:true}));})()`)
    await updateName('W'.repeat(160)); await waitText('too long'); assert(await evaluate('document.querySelector("button[type=submit]").disabled'))
    await updateName('Template Test Event'); await eventually(() => evaluate('!document.querySelector("button[type=submit]").disabled'), 'valid text')
    await evaluate('document.querySelectorAll(".template-toggle input")[1].click()'); await waitText('default template must be enabled')
    await evaluate('document.querySelectorAll(".template-toggle input")[1].click()')
    for (let i = 0; i < 5; i++) await evaluate(`document.querySelectorAll('.template-toggle input')[${i}].click()`)
    await waitText('Keep at least one'); assert(await evaluate('document.querySelector("button[type=submit]").disabled'))
    await click('Return to welcome')
    assert.equal(await evaluate('localStorage.getItem("photobooth.settings")'), null)
    await click('Operator'); await click('Event setup'); await eventually(() => evaluate('!document.querySelector("button[type=submit]").disabled'), 'setup validated')
    await screenshot('operator-landscape')
    await send('Emulation.setDeviceMetricsOverride', { width: 820, height: 1180, deviceScaleFactor: 1, mobile: false }); await screenshot('operator-portrait')
    await updateName('Template Test Event'); await click('Save & start booth'); await waitText('Template Test Event')
  })
  await check('Offline reload composes and saves all five designs with uncropped originals and version metadata', async () => {
    await eventually(() => evaluate('Boolean(navigator.serviceWorker.controller)'), 'service worker')
    assert(await evaluate('caches.match("/fonts/CormorantGaramond.ttf").then(Boolean)'), 'font not precached')
    offline = true; await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
    await send('Page.reload'); await waitText('Start photo')
    for (const name of ['Minimal Clean','Classic Wedding','Film Retro','Colorful Fun','Vintage Polaroid']) {
      await click('Start photo'); await click('Choose a template')
      await evaluate(`Array.from(document.querySelectorAll('.template-select')).find(b=>b.textContent.includes(${text(name)})).click()`)
      await click('Continue →'); await eventually(() => evaluate('!!document.querySelector("video")?.videoWidth'), 'camera ready')
      const ratio = await evaluate('document.querySelector("video").videoWidth/document.querySelector("video").videoHeight')
      assert(await evaluate('(()=>{const el=document.querySelector(".camera-stage"),r=el.getBoundingClientRect();return Math.abs(r.width/r.height-parseFloat(el.style.aspectRatio))<.01})()'), 'Camera framing ratio differs from selected slot')
      await click('Take photos'); await waitText('That’s a keeper.'); await eventually(() => evaluate('document.querySelector(".photo-display img")?.naturalWidth === 900'), 'template composition')
      const previewData = await evaluate('fetch(document.querySelector(".photo-display img").src).then(r=>r.blob()).then(b=>b.size)')
      await screenshot(`export-${name.toLowerCase().replaceAll(' ','-')}`)
      await click('Use these photos'); await waitText('Also saved in your local gallery.')
      const row = await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('good-moments-photobooth',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('sessions'),q=tx.objectStore('sessions').getAll();q.onsuccess=async()=>{try{const row=q.result.sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).at(-1);const bitmap=await createImageBitmap(row.originals[0]);const result={templateId:row.templateId,version:row.templateVersion,originalFormat:row.originalFormat,ratio:bitmap.width/bitmap.height,size:row.finalPhoto.size,count:row.originals.length};bitmap.close();resolve(result)}catch(e){reject(e)}};tx.oncomplete=()=>db.close()}})`)
      assert.equal(row.templateId, name.toLowerCase().replaceAll(' ', '-')); assert.equal(row.version,1); assert.equal(row.originalFormat,'uncropped-v1'); assert.equal(row.count,3); assert(Math.abs(row.ratio-ratio)<.003); assert.equal(row.size,previewData)
      await click('Take another photo')
    }
    assert.equal((await dbRows()).length,5)
  })
  await check('Legacy gallery record without template fields reopens with identical JPEG bytes and metadata', async () => {
    const before = await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('good-moments-photobooth',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('sessions','readwrite'),store=tx.objectStore('sessions'),q=store.getAll();let record;q.onsuccess=()=>{record={...q.result[0],id:'legacy-fixture',eventName:'Legacy Event',eventKey:'legacy-event',frame:'blush'};delete record.templateId;delete record.templateVersion;delete record.originalFormat;store.put(record)};tx.oncomplete=async()=>{db.close();resolve({size:record.finalPhoto.size,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await record.finalPhoto.arrayBuffer()))).join(',')})};tx.onerror=()=>reject(tx.error)}})`)
    await operator(); await click('Local gallery'); await click('All photos'); await waitText('6 memories')
    await evaluate(`Array.from(document.querySelectorAll('.gallery-card')).find(el=>el.textContent.includes('Legacy Event')).querySelector('.gallery-image').click()`)
    await waitText('A moment to keep.'); await eventually(() => evaluate('document.querySelector(".print-photo")?.naturalWidth === 900'), 'legacy image')
    const after = await evaluate(`fetch(document.querySelector('.print-photo').src).then(r=>r.blob()).then(async b=>({size:b.size,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await b.arrayBuffer()))).join(',')}))`)
    assert.deepEqual(after,before)
    const metadata = await evaluate(`new Promise(resolve=>{const r=indexedDB.open('good-moments-photobooth',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('sessions'),q=tx.objectStore('sessions').get('legacy-fixture');q.onsuccess=()=>resolve({frame:q.result.frame,hasTemplate:Object.hasOwn(q.result,'templateId'),name:q.result.eventName});tx.oncomplete=()=>db.close()}})`)
    assert.deepEqual(metadata,{frame:'blush',hasTemplate:false,name:'Legacy Event'})
    await click('Return to welcome')
  })
  await check('Font failure is visible, blocks setup save and recovers on retry', async () => {
    const injection = await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__fontLoad=FontFace.prototype.load;FontFace.prototype.load=function(){return Promise.reject(new Error("Test font unavailable"))}' })
    await send('Page.reload'); await waitText('Start photo'); await operator(); await click('Event setup'); await waitText('Template font could not load')
    assert(await evaluate('document.querySelector("button[type=submit]").disabled'))
    await evaluate('FontFace.prototype.load=window.__fontLoad'); await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: injection.identifier })
    await click('Retry validation'); await eventually(() => evaluate('!document.querySelector("button[type=submit]").disabled'), 'font recovery')
    await screenshot('font-recovery')
  })
  assert.deepEqual(errors, [], 'No uncaught browser exceptions')
  await writeFile(join(output, 'results.json'), JSON.stringify({ checkedAt: new Date().toISOString(), checks, errors, limitations: ['Real iPad Safari and camera hardware', 'Physical printer sizing', 'Long event memory soak'] }, null, 2))
  console.log(`All ${checks.length} template checks passed.`)
} catch (error) {
  if (ws?.readyState === WebSocket.OPEN) { try { await screenshot('failure'); console.error(await evaluate('document.body.innerText')) } catch { /* Preserve the original failure. */ } }
  console.error(error); process.exitCode = 1
} finally { ws?.close(); child.kill(); server.close() }
