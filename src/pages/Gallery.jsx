import { useEffect, useState } from 'react'
import { listSessions, getSession, deleteSession } from '../services/db'
import { localDate, formatDate } from '../data/booth'
import Icon from '../components/Icon'
import Dialog from '../components/Dialog'

export default function Gallery({ eventKey, onOpen }) {
  const [rows, setRows] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [filter, setFilter] = useState('event'), [deleting, setDeleting] = useState(null), [working, setWorking] = useState(false)
  useEffect(() => { let live = true; listSessions().then((data) => { if (live) setRows(data) }).catch(() => { if (live) setError('Local gallery could not be opened. Check browser storage access and reload.') }).finally(() => { if (live) setLoading(false) }); return () => { live = false } }, [])
  const visible = rows.filter((row) => filter === 'all' || (filter === 'event' ? row.eventKey === eventKey : localDate(new Date(row.createdAt)) === localDate()))
  async function remove() {
    setWorking(true)
    try { await deleteSession(deleting.id); setRows((old) => old.filter((row) => row.id !== deleting.id)); setDeleting(null) } catch { setError('Photo could not be deleted. Try again.'); setDeleting(null) } finally { setWorking(false) }
  }
  async function open(id) {
    setWorking(true)
    try { const session = await getSession(id); if (!session) throw new Error(); onOpen(session) } catch { setError('This photo is no longer available. Reload the gallery.') } finally { setWorking(false) }
  }
  return <section className="gallery-page page-enter"><div className="screen-heading"><span className="eyebrow">LITTLE MOMENTS, SAFELY KEPT</span><h1>Your memory collection.</h1><p>Photos saved on this device.</p></div><div className="gallery-toolbar"><div className="segmented" aria-label="Gallery filters">{[['event','This event'],['today','Today'],['all','All photos']].map(([value,label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div><span className="small-note">{visible.length} memories</span></div>{error && <p className="notice error" role="alert">{error}</p>}{loading ? <div className="empty-state">Opening your collection…</div> : !visible.length ? <div className="empty-state"><Icon name="gallery" size={48}/><h2>Good moments are on their way.</h2><p>Your finished photos will appear here after a session.</p></div> : <div className="gallery-grid">{visible.map((row) => <article className="gallery-card" key={row.id}><button disabled={working} className="gallery-image" onClick={() => open(row.id)}><img src={row.thumbnail} alt={`${row.eventName}, ${new Date(row.createdAt).toLocaleString()}`} loading="lazy"/></button><div className="gallery-caption"><div><strong>{row.eventName}</strong><small>{formatDate(row.eventDate)}</small><small>{new Date(row.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></div><button disabled={working} className="icon-button danger" aria-label={`Delete photo from ${new Date(row.createdAt).toLocaleString()}`} onClick={() => setDeleting(row)}><Icon name="trash" size={19}/></button></div></article>)}</div>}{deleting && <Dialog title="Delete this memory?" onClose={() => !working && setDeleting(null)}><p>This removes the finished photo and its originals from this browser. Download a copy first if you want to keep it.</p><div className="actions"><button disabled={working} className="button secondary" onClick={() => setDeleting(null)}>Keep photo</button><button disabled={working} className="button danger-fill" onClick={remove}>{working ? 'Deleting…' : 'Delete photo'}</button></div></Dialog>}</section>
}
