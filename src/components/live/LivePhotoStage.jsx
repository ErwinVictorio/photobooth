import { useEffect, useRef } from 'react'
import { drawFilteredCover } from '../../services/photo-filters'
import { clamp, drawPhotoOverlays, loadOverlayImages } from '../../services/photo-overlays'
import './LivePhotoStage.css'

export default function LivePhotoStage({ videoRef, ready, mirror, filter, overlays = [], selectedId, onSelect, onChange, disabled = false, ratio = 1, flash, children, onError }) {
  const stage = useRef(null), canvas = useRef(null), drag = useRef(null)
  const loadedImages = useRef(new Map())
  const imageSources = JSON.stringify([...new Set(overlays.filter(item => item.type === 'image').map(item => item.src))])
  useEffect(() => {
    let disposed = false
    loadOverlayImages(JSON.parse(imageSources).map(src => ({ type: 'image', src }))).then(images => {
      if (disposed) images.forEach(image => { image.src = '' })
      else { loadedImages.current.forEach(image => { image.src = '' }); loadedImages.current = images }
    }).catch(error => { if (!disposed) onError?.(error.message) })
    return () => { disposed = true; loadedImages.current.forEach(image => { image.src = '' }); loadedImages.current = new Map() }
  }, [imageSources, onError])
  useEffect(() => {
    let disposed = false, frame, last = 0
    const render = now => {
      if (disposed) return
      const video = videoRef.current, output = canvas.current
      if (ready && video?.readyState >= 2 && now - last >= 66) {
        last = now
        try {
          const width = Math.max(1, Math.min(640, Math.round(640 * ratio), Math.max(160, Math.round(stage.current.clientWidth * Math.min(devicePixelRatio || 1, 1.5)))))
          const height = Math.round(width / ratio)
          if (output.width !== width || output.height !== height) { output.width = width; output.height = height }
          const ctx = output.getContext('2d')
          ctx.save()
          try { if (mirror) { ctx.translate(width, 0); ctx.scale(-1, 1) } drawFilteredCover(ctx, video, 0, 0, width, height, filter) }
          finally { ctx.restore() }
          drawPhotoOverlays(ctx, overlays, 0, 0, width, height, loadedImages.current)
        } catch (error) { onError?.(error.message || 'Live preview could not render.'); return }
      }
      frame = requestAnimationFrame(render)
    }
    frame = requestAnimationFrame(render)
    return () => { disposed = true; cancelAnimationFrame(frame) }
  }, [videoRef, ready, mirror, filter, overlays, ratio, onError])
  const move = event => {
    const active = drag.current
    if (!active || active.pointerId !== event.pointerId || disabled) return
    const bounds = stage.current.getBoundingClientRect()
    onChange?.(overlays.map(item => item.id === active.id ? { ...item, x: clamp(active.x + (event.clientX - active.clientX) / bounds.width), y: clamp(active.y + (event.clientY - active.clientY) / bounds.height) } : item))
  }
  const release = () => { drag.current = null }
  return <div ref={stage} className={`camera-stage live-photo-stage ${flash ? 'flash' : ''}`} style={{ aspectRatio: ratio, '--stage-width-vh': `${42 * ratio}vh`, '--stage-width-svh': `${42 * ratio}svh` }}>
    <video ref={videoRef} autoPlay playsInline muted aria-hidden="true"/>
    <canvas ref={canvas} className="live-photo-canvas" aria-label="Live camera preview with your filters and decorations"/>
    {ready && overlays.map(item => <button key={item.id} className={`live-overlay-target ${selectedId === item.id && !disabled ? 'selected' : ''}`} aria-label={`Move ${item.type === 'image' ? 'image' : item.text}`} aria-pressed={selectedId === item.id} disabled={disabled} style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%`, width: `${Math.min(.95, Math.max(.12, item.size * (item.type === 'image' ? 1 : Math.max(1, Array.from(item.text).length * .6)))) * 100}%`, height: `${item.size * ratio * 100}%`, transform: `translate(-50%, -50%) rotate(${item.rotation}deg)` }} onPointerDown={event => { event.preventDefault(); onSelect?.(item.id); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { id: item.id, pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: item.x, y: item.y } }} onPointerMove={move} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onClick={() => onSelect?.(item.id)} onKeyDown={event => {
      const delta = event.shiftKey ? .05 : .01, directions = { ArrowLeft: [-delta, 0], ArrowRight: [delta, 0], ArrowUp: [0, -delta], ArrowDown: [0, delta] }, direction = directions[event.key]
      if (direction) { event.preventDefault(); onSelect?.(item.id); onChange?.(overlays.map(value => value.id === item.id ? { ...value, x: clamp(value.x + direction[0]), y: clamp(value.y + direction[1]) } : value)) }
    }}/>) }
    {children}
  </div>
}
