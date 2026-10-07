import { useEffect, useState } from 'react'
import { formatDate, frames, layouts } from '../data/booth'
import { readLogo } from '../services/images'
import { clearSessions, listSessions } from '../services/db'
import { FrameSample } from '../components/BoothArt'
import Icon from '../components/Icon'
import Dialog from '../components/Dialog'

export function EventSetup({ settings, onSave }) {
  const [form, setForm] = useState(settings), [error, setError] = useState(''), [loadingLogo, setLoadingLogo] = useState(false)
  const change = (key, value) => setForm((old) => ({ ...old, [key]: value }))
  async function upload(event) {
    const file = event.target.files[0]
    if (!file) return
    setLoadingLogo(true)
    try { change('logo', await readLogo(file)); setError('') } catch (e) { setError(e.message) } finally { setLoadingLogo(false) }
  }
  return <section className="operator-page page-enter"><div className="screen-heading"><span className="eyebrow">MAKE IT YOURS</span><h1>Set the occasion.</h1><p>A few little details for a day to remember.</p></div><div className="setup-grid"><form className="form-card" onSubmit={(event) => { event.preventDefault(); onSave(form) }}>
    <label>Event name<input required maxLength={80} value={form.eventName} onChange={(e) => change('eventName', e.target.value)} placeholder="Erwin & Maria’s Wedding"/></label>
    <label>Event date<input required type="date" value={form.eventDate} onChange={(e) => change('eventDate', e.target.value)}/></label>
    <div className="form-row"><label>Default layout<select value={form.layout} onChange={(e) => change('layout', e.target.value)}>{layouts.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label><label>Default frame<select value={form.frame} onChange={(e) => change('frame', e.target.value)}>{frames.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label></div>
    <div className="form-row"><label>Countdown<select value={form.countdown} onChange={(e) => change('countdown', Number(e.target.value))}>{[3,5,10].map((n) => <option value={n} key={n}>{n} seconds</option>)}</select></label><label>Photo quality<select value={form.quality} onChange={(e) => change('quality', e.target.value)}><option value="high">High</option><option value="standard">Standard</option></select></label></div>
    <label>Event logo <span className="muted">(optional)</span><input type="file" accept="image/*" disabled={loadingLogo} onChange={upload}/></label>
    {form.logo && <div className="logo-upload"><img src={form.logo} alt="Event logo"/><button type="button" className="text-button" onClick={() => change('logo', '')}>Remove logo</button></div>}
    {error && <p role="alert" className="notice error">{error}</p>}<button disabled={loadingLogo} className="button" type="submit">Save & start booth <Icon name="arrow"/></button>
  </form><aside className="setup-preview"><FrameSample layout={form.layout} frame={form.frame} large/><h2>{form.eventName}</h2><p>{formatDate(form.eventDate)}</p><span className="small-note">Your details appear on every finished photo.</span></aside></div></section>
}

export function Settings({ settings, onSave, eventKey, onCameraTest, onFullscreen }) {
  const [form, setForm] = useState(settings), [rows, setRows] = useState(null), [error, setError] = useState(''), [confirm, setConfirm] = useState(null), [working, setWorking] = useState(false), [online, setOnline] = useState(navigator.onLine)
  const [offlineStatus, setOfflineStatus] = useState(import.meta.env.DEV ? 'Offline caching is available in the production build.' : 'Preparing offline access. Keep this app connected.')
  useEffect(() => {
    let live = true
    async function inspect() {
      try {
        if (!('serviceWorker' in navigator) || !('caches' in window)) throw new Error()
        if (import.meta.env.DEV) return
        await navigator.serviceWorker.ready
        const cached = await caches.match('/index.html')
        if (live) setOfflineStatus(cached ? 'Ready for offline use on this browser.' : 'Offline cache is incomplete. Reopen while connected.')
      } catch { if (live) setOfflineStatus('Offline access is unavailable. Keep this browser connected.') }
    }
    inspect()
    return () => { live = false }
  }, [])
  useEffect(() => { let live = true; listSessions().then((data) => { if (live) setRows(data) }).catch(() => { if (live) setError('Unable to read local photo storage.') }); const update = () => setOnline(navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { live = false; window.removeEventListener('online', update); window.removeEventListener('offline', update) } }, [])
  const toggle = (key) => setForm((value) => ({ ...value, [key]: !value[key] }))
  async function clear() {
    setWorking(true)
    try { await clearSessions(confirm === 'event' ? eventKey : undefined); setRows(await listSessions()); setConfirm(null); setError('') } catch { setError('Photos could not be deleted. Try again.'); setConfirm(null) } finally { setWorking(false) }
  }
  return <section className="operator-page page-enter"><div className="screen-heading"><span className="eyebrow">BEHIND THE MOMENTS</span><h1>Booth settings.</h1><p>Make yourself at home.</p></div><div className="settings-grid"><div className="form-card"><h2>Camera & experience</h2><label>Default camera<select value={form.facing} onChange={(e) => setForm({ ...form, facing: e.target.value })}><option value="user">Front camera</option><option value="environment">Rear camera</option></select></label>{[['mirror','Mirror front camera','Keep your preview and saved photo consistent.'],['showTitle','Show event title','Add your occasion to the welcome screen and photo.'],['sound','Countdown sounds','A gentle cue before each photograph.']].map(([key,title,description]) => <label className="toggle-row" key={key}><span><strong>{title}</strong><small>{description}</small></span><input type="checkbox" role="switch" checked={form[key]} onChange={() => toggle(key)}/></label>)}<button className="button" onClick={() => onSave(form)}>Save settings <Icon name="check"/></button><div className="form-row"><button className="button secondary" onClick={onFullscreen}><Icon name="expand"/> Fullscreen</button><button className="button secondary" onClick={onCameraTest}><Icon name="camera"/> Test camera</button></div></div>
    <div className="form-card"><h2>Photos on this device</h2><div className="storage-stats"><strong>{rows ? rows.length : '—'}<small>saved sessions</small></strong><strong>{rows ? (rows.reduce((n, row) => n + row.bytes, 0) / 1024 / 1024).toFixed(1) : '—'}<small>MB of photo data</small></strong></div><p className="small-note">Photos stay in this browser. Save important photos to your device before clearing browser data.</p><button className="button secondary danger" disabled={!rows?.some((r) => r.eventKey === eventKey)} onClick={() => setConfirm('event')}>Clear this event</button><button className="button secondary danger" disabled={!rows?.length} onClick={() => setConfirm('all')}>Clear all local photos</button><hr/><span className="connection"><i className={online ? 'online' : ''}/>{online ? 'Connected' : 'Offline mode'}</span><p className="small-note">On iPad: open in Safari, then Share → Add to Home Screen. Open once online before your event to prepare offline use.</p><p className="small-note">Good Moments · Local-first photobooth · v1.0</p></div></div>{error && <p className="notice error" role="alert">{error}</p>}
    <p className="small-note offline-status" role="status">{offlineStatus}</p>
    {confirm && <Dialog title={confirm === 'event' ? 'Clear this event’s photos?' : 'Clear all local photos?'} onClose={() => !working && setConfirm(null)}><p>This permanently removes {confirm === 'event' ? rows.filter((r) => r.eventKey === eventKey).length : rows.length} saved sessions, including originals, from this browser. Save any photos you want to keep first.</p><div className="actions"><button disabled={working} className="button secondary" onClick={() => setConfirm(null)}>Keep photos</button><button disabled={working} className="button danger-fill" onClick={clear}>{working ? 'Deleting…' : 'Delete photos'}</button></div></Dialog>}
  </section>
}
