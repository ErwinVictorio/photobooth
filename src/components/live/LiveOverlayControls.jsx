import { useEffect, useRef, useState } from 'react'
import { readLogo } from '../../services/images'
import { normalizeOverlay } from '../../services/photo-overlays'

export default function LiveOverlayControls({ overlays, onChange, selectedId, onSelect, disabled, onBusy }) {
  const [text, setText] = useState('Good moments'), [error, setError] = useState(''), [loading, setLoading] = useState(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const selected = overlays.find(item => item.id === selectedId)
  const add = item => {
    if (overlays.length >= 12) { setError('Use up to 12 decorations per photo.'); return }
    const value = normalizeOverlay({ id: crypto.randomUUID(), x: .5, y: .5, size: item.type === 'text' ? .08 : .18, ...item })
    onChange([...overlays, value]); onSelect(value.id); setError('')
  }
  const update = patch => onChange(overlays.map(item => item.id === selectedId ? { ...item, ...patch } : item))
  return <fieldset className="live-overlay-controls" disabled={disabled || loading}><legend>Decorate your photo</legend>
    <p className="small-note">Add an element, then drag it on the camera. Arrow keys also move selected elements.</p>
    <div className="live-text-entry"><label>Your text<input maxLength={40} value={text} onChange={event => setText(event.target.value)}/></label><button type="button" className="button secondary" disabled={!text.trim()} onClick={() => add({ type: 'text', text: text.trim() })}>Add text</button></div>
    <div className="live-sticker-actions">{['♥', '★', '✿', '☺'].map(sticker => <button type="button" className="button secondary" key={sticker} aria-label={`Add ${sticker} sticker`} onClick={() => add({ type: 'sticker', text: sticker, color: '#ffcf78' })}>{sticker}</button>)}<label className="live-image-upload">Add image<input type="file" accept="image/*" aria-label="Add local image decoration" onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
      setLoading(true); onBusy?.(true)
      try { const src = await readLogo(file); if (mounted.current) add({ type: 'image', src }) } catch (failure) { if (mounted.current) setError(failure.message) } finally { if (mounted.current) { setLoading(false); onBusy?.(false) } }
    }}/></label></div>
    {overlays.length > 0 && <label>Edit element<select value={selectedId || ''} onChange={event => onSelect(event.target.value)}><option value="">Choose an element</option>{overlays.map((item, i) => <option key={item.id} value={item.id}>{i + 1}. {item.type === 'image' ? 'Image' : item.text}</option>)}</select></label>}
    {selected && <div className="live-element-settings">{selected.type === 'text' && <label>Text<input maxLength={40} value={selected.text} onChange={event => update({ text: event.target.value })}/></label>}<label>Size<input type="range" min="6" max="45" value={Math.round(selected.size * 100)} onChange={event => update({ size: Number(event.target.value) / 100 })}/></label><label>Rotation<input type="range" min="-180" max="180" value={selected.rotation} onChange={event => update({ rotation: Number(event.target.value) })}/></label>{selected.type !== 'image' && <label>Color<input type="color" value={selected.color} onChange={event => update({ color: event.target.value })}/></label>}<button type="button" className="button secondary" onClick={() => { onChange(overlays.filter(item => item.id !== selectedId)); onSelect(null) }}>Remove element</button></div>}
    {error && <p className="notice error" role="alert">{error}</p>}
    {loading && <p role="status">Preparing your image…</p>}
  </fieldset>
}
