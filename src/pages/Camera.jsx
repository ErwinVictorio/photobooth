<<<<<<< HEAD
import { useEffect, useMemo, useRef, useState } from 'react'
import { canvasBlob, drawCover, photoRects } from '../services/images'
import { getLayout } from '../data/booth'
import { getTemplate } from '../data/templates'
import TemplateSample from '../components/TemplateSample'
import LivePhotoStage from '../components/live/LivePhotoStage'
import LiveOverlayControls from '../components/live/LiveOverlayControls'
import PhotoFilterPicker from '../components/filters/PhotoFilterPicker'
=======
import { useEffect, useRef, useState } from 'react'
import { drawCover, photoRects } from '../services/images'
import { applyPhotoFilter } from '../services/photo-filters'
import { filters, getFilter } from '../data/filters'
import { getLayout } from '../data/booth'
import { getTemplate } from '../data/templates'
>>>>>>> 37eb5e1 (update the UI)
import Icon from '../components/Icon'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const cameraError = (e) => ({ NotAllowedError: 'Camera permission is needed. Allow camera access, then try again.', NotFoundError: 'No camera was found.', NotReadableError: 'The camera is busy.', OverconstrainedError: 'This camera is unavailable.' }[e.name] || e.message || 'The camera could not start.')

<<<<<<< HEAD
export default function Camera({ settings, layout: layoutId, templateId, filter, onFilterChange, overlays, onOverlaysChange, onComplete, onBack }) {
  const video = useRef(null), stream = useRef(null), generation = useRef(0), busyRef = useRef(false), audio = useRef(null)
  const [selectedId, setSelectedId] = useState(null)
  const [editorBusy, setEditorBusy] = useState(false)
  const [facing, setFacing] = useState(settings.facing)
  const [retry, setRetry] = useState(0)
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [countdown, setCountdown] = useState(null), [shot, setShot] = useState(0), [flash, setFlash] = useState(false)
  const [captured, setCaptured] = useState([])
  const capturedOverlays = useMemo(() => captured.map(() => overlays), [captured, overlays])
  const layout = getLayout(layoutId)
  const template = getTemplate(templateId)
  const r = (template?.slots || photoRects(layout.id, layout.width, layout.height))[Math.min(shot, layout.count - 1)]
  const ratio = r.width / r.height

  useEffect(() => {
    let disposed = false
    const token = ++generation.current
    const stop = () => { stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null }
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires HTTPS or localhost and a supported browser.')
        const media = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } } })
        if (disposed) { media.getTracks().forEach((track) => track.stop()); return }
        stream.current = media
        media.getVideoTracks()[0].onended = () => { if (!disposed) { generation.current++; busyRef.current = false; setBusy(false); setReady(false); setCountdown(null); setError('Camera disconnected. Reconnect it, then retry.'); stop() } }
        video.current.srcObject = media
        await video.current.play()
        if (!disposed && generation.current === token) setReady(true)
      } catch (e) { if (!disposed) { stop(); setError(cameraError(e)) } }
    }
    function visibility() {
      if (document.hidden) { generation.current++; busyRef.current = false; setBusy(false); setReady(false); setCountdown(null); setError('Session paused because the app was hidden. Retry the camera to start a fresh capture.'); stop() }
    }
    start()
    document.addEventListener('visibilitychange', visibility)
    const invalidate = () => { generation.current++ }
    return () => { disposed = true; invalidate(); stop(); document.removeEventListener('visibilitychange', visibility) }
  }, [facing, retry])
  useEffect(() => () => { audio.current?.close().catch(() => {}) }, [])

  function beep(frequency) {
    if (!settings.sound || !audio.current) return
    try {
      const ctx = audio.current, osc = ctx.createOscillator(), gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination); osc.frequency.value = frequency
      gain.gain.setValueAtTime(0.035, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
      osc.start(); osc.stop(ctx.currentTime + 0.13)
    } catch { /* Sound is optional; camera capture stays available. */ }
  }
  async function capture() {
    if (!ready || editorBusy || busyRef.current) return
    busyRef.current = true; setBusy(true); setError(''); setCaptured([])
    const token = generation.current, photos = []
    if (settings.sound) {
      try { const Audio = window.AudioContext || window.webkitAudioContext; audio.current ||= new Audio(); await audio.current.resume() } catch { /* Silent fallback. */ }
    }
    try {
      for (let i = 0; i < layout.count; i++) {
        if (token !== generation.current) return
        setShot(i)
        for (let n = settings.countdown; n > 0; n--) {
          if (token !== generation.current) return
          setCountdown(n); beep(660); await delay(1000)
        }
        if (token !== generation.current) return
        const source = video.current
        if (!source?.videoWidth || source.readyState < 2 || !stream.current?.active) throw new Error('Camera is not ready. Please retry.')
        setCountdown(null); setFlash(true); beep(980)
        const canvas = document.createElement('canvas')
        canvas.width = Math.min(source.videoWidth, settings.quality === 'high' ? 1600 : 1000)
        canvas.height = Math.round(canvas.width * source.videoHeight / source.videoWidth)
        const ctx = canvas.getContext('2d')
        if (facing === 'user' && settings.mirror) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1) }
        drawCover(ctx, source, 0, 0, canvas.width, canvas.height)
        const blob = await canvasBlob(canvas)
        if (token !== generation.current) return
        photos.push(blob)
        setCaptured([...photos]); await delay(180)
        if (token !== generation.current) return
        setFlash(false)
        if (i < layout.count - 1) await delay(850)
      }
      if (token === generation.current) onComplete(photos, photos.map(() => overlays.map(item => ({ ...item }))))
    } catch (e) { if (token === generation.current) { setError(cameraError(e)); setBusy(false); setCountdown(null); setFlash(false); busyRef.current = false } }
  }
  const restart = (switchCamera = false) => {
    generation.current++; setReady(false); setError(''); setCaptured([]); setShot(0); setFlash(false)
    if (switchCamera) setFacing((value) => value === 'user' ? 'environment' : 'user')
    else setRetry((n) => n + 1)
  }
  return <section className="camera-page page-enter">
    <div className="screen-heading"><span className="eyebrow">YOUR MOMENT IS HERE</span><h1>{busy ? countdown ? 'Get ready!' : 'Looking lovely!' : 'A little smile goes a long way.'}</h1><p>{busy ? `Photo ${shot + 1} of ${layout.count}` : `${layout.count} ${layout.count === 1 ? 'photo' : 'photos'} · ${settings.countdown} seconds to strike a pose`}</p></div>
    <p className="sample-note">{template?.name || layout.name} · Framing for photo {shot + 1}</p>
    <LivePhotoStage videoRef={video} ready={ready} mirror={facing === 'user' && settings.mirror} filter={filter} overlays={overlays} selectedId={selectedId} onSelect={setSelectedId} onChange={onOverlaysChange} disabled={busy || editorBusy} ratio={ratio} flash={flash} onError={setError}>
      {!ready && <div className="camera-message"><Icon name="camera" size={42}/><p>{error || 'Opening your camera...'}</p>{error && <button className="button" onClick={() => restart()}>Try again</button>}</div>}
      {countdown && <div className="countdown" aria-live="assertive" key={`${shot}-${countdown}`}>{countdown}</div>}
      {ready && <span className="live-badge"><i/> LIVE CAMERA</span>}
    </LivePhotoStage>
    {error && ready && <p className="notice error" role="alert">{error}</p>}
    <div className="camera-controls"><button className="text-button" disabled={busy || editorBusy} onClick={onBack}><Icon name="back"/> Templates</button><button className="shutter" aria-label="Take photos" disabled={!ready || busy || editorBusy} onClick={capture}><Icon name="camera" size={30}/></button><button className="text-button" disabled={busy || editorBusy} onClick={() => restart(true)}><Icon name="refresh"/> Switch</button></div>
    <PhotoFilterPicker value={filter} onChange={onFilterChange} disabled={busy || editorBusy} label="Live camera filters"/>
    <details className="live-decorations"><summary>Stickers, text & images {overlays.length > 0 && `(${overlays.length})`}</summary><LiveOverlayControls overlays={overlays} onChange={onOverlaysChange} selectedId={selectedId} onSelect={setSelectedId} disabled={busy} onBusy={setEditorBusy}/></details>
    {template && <div className="capture-template-progress"><TemplateSample templateId={template.id} settings={settings} photos={captured} filter={filter} overlays={capturedOverlays}/><p className="small-note">Unfilled windows show sample illustrations only.</p></div>}
    <div className="shot-dots" aria-label={`${captured.length} of ${layout.count} photos captured`}>{Array.from({ length: layout.count }, (_, i) => <span className={i < captured.length ? 'done' : i === shot && busy ? 'current' : ''} key={i}>{i < captured.length ? <Icon name="check" size={16}/> : i + 1}</span>)}</div>
    <p className="small-note">{busy ? 'Stay right here. We’ll take care of the next shot.' : 'Tap the camera when everyone is ready.'}</p>
  </section>
=======
export default function Camera({ settings, layout: layoutId, templateId, onComplete, onBack }) {
  const video = useRef(null), stream = useRef(null), generation = useRef(0), busyRef = useRef(false), filterRef = useRef('original')
  const [facing, setFacing] = useState(settings.facing), [retry, setRetry] = useState(0), [ready, setReady] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false), [countdown, setCountdown] = useState(null), [shot, setShot] = useState(0), [flash, setFlash] = useState(false), [selectedFilter, setSelectedFilter] = useState('original'), [captured, setCaptured] = useState([])
  const layout = getLayout(layoutId), template = getTemplate(templateId), current = getFilter(selectedFilter), rect = (template?.slots || photoRects(layout.id, layout.width, layout.height))[Math.min(shot, layout.count - 1)], ratio = rect.width / rect.height
  useEffect(() => { filterRef.current = selectedFilter }, [selectedFilter])
  useEffect(() => { let disposed = false; const token = ++generation.current; const stop = () => { stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null }; async function start() { try { if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires HTTPS or localhost.'); const media = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } } }); if (disposed) return media.getTracks().forEach((track) => track.stop()); stream.current = media; media.getVideoTracks()[0].onended = () => { if (!disposed) { generation.current++; setReady(false); setBusy(false); setError('Camera disconnected. Reconnect it, then retry.'); stop() } }; video.current.srcObject = media; await video.current.play(); if (!disposed && generation.current === token) setReady(true) } catch (e) { if (!disposed) { stop(); setError(cameraError(e)) } } }; start(); return () => { disposed = true; generation.current++; stop() } }, [facing, retry])
  function chooseFilter(id) { if (!busyRef.current) setSelectedFilter(id) }
  async function capture() { if (!ready || busyRef.current || shot >= layout.count) return; busyRef.current = true; setBusy(true); setError(''); const token = generation.current; const filterAtExposure = filterRef.current; try { for (let n = settings.countdown; n > 0; n--) { if (token !== generation.current) return; setCountdown(n); await delay(1000) }; if (token !== generation.current) return; const source = video.current; if (!source?.videoWidth || source.readyState < 2 || !stream.current?.active) throw new Error('Camera is not ready. Please retry.'); setCountdown(null); setFlash(true); const canvas = document.createElement('canvas'); canvas.width = Math.min(source.videoWidth, settings.quality === 'high' ? 1600 : 1000); canvas.height = Math.round(canvas.width * source.videoHeight / source.videoWidth); const ctx = canvas.getContext('2d'); if (facing === 'user' && settings.mirror) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1) }; drawCover(ctx, source, 0, 0, canvas.width, canvas.height); const blob = await applyPhotoFilter(canvas, filterAtExposure); if (token !== generation.current) return; const next = [...captured, { blob, filterId: filterAtExposure }]; setCaptured(next); setShot((value) => value + 1); setFlash(false); busyRef.current = false; setBusy(false); if (next.length === layout.count) onComplete(next.map((item) => item.blob)) } catch (e) { if (token === generation.current) { setError(cameraError(e)); setBusy(false); setCountdown(null); setFlash(false); busyRef.current = false } } }
  const restart = (switchCamera = false) => { generation.current++; setReady(false); setError(''); setCaptured([]); setShot(0); setFlash(false); setBusy(false); busyRef.current = false; if (switchCamera) setFacing((value) => value === 'user' ? 'environment' : 'user'); else setRetry((value) => value + 1) }
  return <section className="camera-page page-enter"><div className="camera-topbar"><button className="icon-button" disabled={busy} aria-label="Back to templates" onClick={onBack}><Icon name="back"/></button><div><span className="eyebrow">TAKE A PHOTO</span><strong>Photo {Math.min(shot + 1, layout.count)} of {layout.count}</strong></div><button className="icon-button" disabled={busy} aria-label="Switch camera" onClick={() => restart(true)}><Icon name="refresh"/></button></div><p className="sample-note">{template?.name || layout.name} · Choose a filter for this shot</p><div className={`camera-stage ${flash ? 'flash' : ''}`} style={{ aspectRatio: ratio, width: `min(100%, ${48 * ratio}svh)`, maxHeight: '48svh' }}><video ref={video} autoPlay playsInline muted style={{ transform: facing === 'user' && settings.mirror ? 'scaleX(-1)' : undefined, filter: current.css }} aria-label="Live camera preview"/>{!ready && <div className="camera-message"><Icon name="camera" size={42}/><p>{error || 'Opening your camera…'}</p>{error && <button className="button" onClick={() => restart()}>Try again</button>}</div>}{countdown && <div className="countdown" aria-live="assertive">{countdown}</div>}{ready && <span className="live-badge"><i/> LIVE</span>}</div><div className="filter-rail" aria-label="Choose a filter">{filters.map((filter) => <button key={filter.id} className={`filter-choice ${selectedFilter === filter.id ? 'selected' : ''}`} aria-pressed={selectedFilter === filter.id} disabled={busy} onClick={() => chooseFilter(filter.id)}><span className={`filter-swatch filter-${filter.id}`}><span>Sample</span></span><small>{filter.name}</small></button>)}</div><div className="capture-progress" aria-label="Captured photos">{Array.from({ length: layout.count }, (_, index) => { const item = captured[index]; return <button key={index} className={item ? 'captured' : index === shot ? 'next' : ''} aria-label={item ? `Photo ${index + 1}, ${getFilter(item.filterId).name}` : `Photo ${index + 1}, empty`} onClick={() => item && setSelectedFilter(item.filterId)}>{item ? <><Icon name="check" size={14}/><small>{getFilter(item.filterId).name}</small></> : index + 1}</button> })}</div>{error && ready && <p className="notice error" role="alert">{error}</p>}<div className="camera-controls"><button className="text-button" disabled={busy} onClick={onBack}><Icon name="back"/> Templates</button><button className="shutter" aria-label={`Take photo ${shot + 1}`} disabled={!ready || busy || shot >= layout.count} onClick={capture}><Icon name="camera" size={30}/></button><button className="text-button" disabled={busy} onClick={() => restart(true)}><Icon name="refresh"/> Switch</button></div><p className="small-note">{busy ? 'Hold that pose…' : shot >= layout.count ? 'All photos captured. Preparing your preview…' : `${current.name} · Tap the shutter when everyone is ready.`}</p></section>
>>>>>>> 37eb5e1 (update the UI)
}
