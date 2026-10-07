import { useEffect, useRef, useState } from 'react'
import { canvasBlob, drawCover, photoRects } from '../services/images'
import { getLayout } from '../data/booth'
import { getTemplate } from '../data/templates'
import TemplateSample from '../components/TemplateSample'
import Icon from '../components/Icon'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const cameraError = (error) => ({ NotAllowedError: 'Camera permission is needed. Allow camera access in your browser settings, then try again.', NotFoundError: 'No camera was found. Connect a camera and try again.', NotReadableError: 'The camera is busy. Close other apps using it and try again.', OverconstrainedError: 'This camera is unavailable. Try switching cameras.' }[error.name] || error.message || 'The camera could not start. Please try again.')

export default function Camera({ settings, layout: layoutId, templateId, onComplete, onBack }) {
  const video = useRef(null), stream = useRef(null), generation = useRef(0), busyRef = useRef(false), audio = useRef(null)
  const [facing, setFacing] = useState(settings.facing)
  const [retry, setRetry] = useState(0)
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [countdown, setCountdown] = useState(null), [shot, setShot] = useState(0), [flash, setFlash] = useState(false)
  const [captured, setCaptured] = useState([])
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
    if (!ready || busyRef.current) return
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
      if (token === generation.current) onComplete(photos)
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
    <div className={`camera-stage ${flash ? 'flash' : ''}`} style={{ aspectRatio: ratio, width: `min(100%, ${48 * ratio}svh)`, maxHeight: '48svh' }}>
      <video ref={video} autoPlay playsInline muted style={{ transform: facing === 'user' && settings.mirror ? 'scaleX(-1)' : undefined }} aria-label="Live camera preview"/>
      {!ready && <div className="camera-message"><Icon name="camera" size={42}/><p>{error || 'Opening your camera…'}</p>{error && <button className="button" onClick={() => restart()}>Try again</button>}</div>}
      {countdown && <div className="countdown" aria-live="assertive" key={`${shot}-${countdown}`}>{countdown}</div>}
      {ready && <span className="live-badge"><i/> LIVE CAMERA</span>}
    </div>
    {error && ready && <p className="notice error" role="alert">{error}</p>}
    {template && <div className="capture-template-progress"><TemplateSample templateId={template.id} settings={settings} photos={captured}/><p className="small-note">Unfilled windows show sample illustrations only.</p></div>}
    <div className="shot-dots" aria-label={`${captured.length} of ${layout.count} photos captured`}>{Array.from({ length: layout.count }, (_, i) => <span className={i < captured.length ? 'done' : i === shot && busy ? 'current' : ''} key={i}>{i < captured.length ? <Icon name="check" size={16}/> : i + 1}</span>)}</div>
    <div className="camera-controls"><button className="text-button" disabled={busy} onClick={onBack}><Icon name="back"/> Templates</button><button className="shutter" aria-label="Take photos" disabled={!ready || busy} onClick={capture}><Icon name="camera" size={30}/></button><button className="text-button" disabled={busy} onClick={() => restart(true)}><Icon name="refresh"/> Switch</button></div>
    <p className="small-note">{busy ? 'Stay right here. We’ll take care of the next shot.' : 'Tap the camera when everyone is ready.'}</p>
  </section>
}
