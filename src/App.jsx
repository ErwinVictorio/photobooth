import { useEffect, useRef, useState } from 'react'
import Icon from './components/Icon'
import { Botanical, FrameSample } from './components/BoothArt'
import Dialog from './components/Dialog'
import Camera from './pages/Camera'
import Gallery from './pages/Gallery'
import { EventSetup, Settings } from './pages/Operator'
import { frames, layouts, readSettings, formatDate, getLayout } from './data/booth'
import { composePhoto, thumbnail } from './services/images'
import { saveSession } from './services/db'
import { canShare, downloadPhoto, sharePhoto } from './services/share'
import './App.css'

function BlobImage({ blob, ...props }) {
  const ref = useRef(null)
  useEffect(() => { if (!blob) return; const url = URL.createObjectURL(blob); ref.current.src = url; return () => URL.revokeObjectURL(url) }, [blob])
  return <img ref={ref} {...props}/>
}
const titles = { welcome: 'Welcome', layout: 'Choose layout', frame: 'Choose frame', camera: 'Camera', preview: 'Preview', result: 'Your photo', gallery: 'Local gallery', setup: 'Event setup', settings: 'Settings' }
function Heading({ eyebrow, title, children }) { return <div className="screen-heading"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{children}</p></div> }

function App() {
  const [settings, setSettings] = useState(readSettings)
  const [page, setPage] = useState('welcome'), [operator, setOperator] = useState(false), [menu, setMenu] = useState(false)
  const [layout, setLayout] = useState(settings.layout), [frame, setFrame] = useState(settings.frame)
  const [photos, setPhotos] = useState([]), [composed, setComposed] = useState(null), [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [stored, setStored] = useState(false)
  const hold = useRef(null), lock = useRef(false), compositionId = useRef(0)
  const eventKey = JSON.stringify([settings.eventName, settings.eventDate])
  useEffect(() => () => clearTimeout(hold.current), [])
  useEffect(() => { window.scrollTo(0, 0); document.title = `${titles[page]} · Good Moments` }, [page])
  const go = (next) => { setError(''); setNotice(''); setPage(next) }
  function reset() { compositionId.current++; setPhotos([]); setComposed(null); setResult(null); setStored(false); setLayout(settings.layout); setFrame(settings.frame); go('welcome') }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen()
      else setNotice('For fullscreen on iPad, use Safari → Share → Add to Home Screen.')
    } catch { setNotice('Fullscreen is unavailable here. On iPad, use Add to Home Screen.') }
  }
  function persistSettings(value) {
    try { localStorage.setItem('photobooth.settings', JSON.stringify(value)); setSettings(value); setLayout(value.layout); setFrame(value.frame); go('welcome'); setNotice('Your booth settings are saved.') } catch { setError('Settings could not be saved. Browser storage may be full or disabled.') }
  }
  async function prepare(captures) {
    const token = ++compositionId.current
    setPhotos(captures); setComposed(null); go('preview'); setBusy(true)
    try { const blob = await composePhoto({ photos: captures, layout, frame, settings }); if (token === compositionId.current) setComposed(blob) } catch (e) { if (token === compositionId.current) setError(e.message) } finally { if (token === compositionId.current) setBusy(false) }
  }
  async function finish() {
    if (!composed || lock.current) return
    lock.current = true; setBusy(true); setError('')
    try {
      const now = new Date(), id = `${now.getTime()}-${crypto.getRandomValues(new Uint32Array(2)).join('-')}`
      const session = { id, eventKey, eventName: settings.eventName, eventDate: settings.eventDate, createdAt: now.toISOString(), layout, frame, originals: photos, finalPhoto: composed, thumbnail: await thumbnail(composed), filename: `Photobooth_${now.toISOString().replace(/[:.]/g, '-')}.jpg` }
      setResult(session); go('result')
      try { await saveSession(session); setStored(true) } catch { setStored(false); setError('Your photo is ready, but the local gallery could not save it. Save to Device now, or free storage and retry.') }
    } catch (e) { setError(e.message || 'The photo could not be prepared. Try again.') } finally { setBusy(false); lock.current = false }
  }
  async function retrySave() {
    if (lock.current) return
    lock.current = true; setBusy(true)
    try { await saveSession(result); setStored(true); setError('') } catch { setError('Local storage is still unavailable. Use Save to Device to keep this photo.') } finally { lock.current = false; setBusy(false) }
  }
  function beginHold(event) { if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return; if (event.repeat) return; clearTimeout(hold.current); hold.current = setTimeout(() => { setOperator(true); setMenu(true) }, 3000) }
  function endHold() { clearTimeout(hold.current) }
  const step = ['layout','frame','camera','preview','result'].indexOf(page)
  return <div className={`app-shell ${page === 'welcome' ? 'welcome-shell' : ''}`}>
    <header className="site-header"><button className="brand" disabled={page === 'camera' || busy} aria-label="Good Moments. Hold for three seconds to open operator controls." onPointerDown={beginHold} onPointerUp={endHold} onPointerLeave={endHold} onPointerCancel={endHold} onKeyDown={beginHold} onKeyUp={endHold} onBlur={endHold} onContextMenu={(e) => e.preventDefault()}><span className="brand-mark"><Icon name="camera" size={25}/></span><span>good moments<span className="brand-sub">THE PHOTOBOOTH EXPERIENCE</span></span></button><div className="header-actions">{operator && <button className="text-button" disabled={busy || page === 'camera'} onClick={() => setMenu(true)}><Icon name="settings" size={18}/> Operator</button>}{page !== 'welcome' && page !== 'camera' && <button className="icon-button" disabled={busy} aria-label="Return to welcome" onClick={reset}><Icon name="home"/></button>}<button className="icon-button fullscreen" aria-label="Toggle fullscreen" onClick={fullscreen}><Icon name="expand" size={20}/></button></div></header>
    {step >= 0 && <nav className="steps" aria-label="Photo session progress">{['Layout','Frame','Capture','Preview','Keep it'].map((name,i) => <span key={name} className={i === step ? 'active' : i < step ? 'complete' : ''} aria-current={i === step ? 'step' : undefined}><b>{i < step ? <Icon name="check" size={12}/> : `0${i+1}`}</b><span>{name}</span></span>)}</nav>}
    <main>
      {error && <div className="notice error" role="alert">{error}</div>}{notice && <div className="notice" role="status">{notice}</div>}
      {page === 'welcome' && <section className="welcome page-enter"><Botanical className="leaves-top"/><Botanical className="leaves-bottom"/><div className="welcome-content"><span className="eyebrow"><span/> A LITTLE PAUSE. A LOVELY MEMORY. <span/></span>{settings.logo ? <img className="welcome-logo" src={settings.logo} alt="Event logo"/> : <div className="welcome-camera"><Icon name="camera" size={54}/><span className="sparkle">✧</span></div>}<h1>Capture the<br/><em>good moments.</em></h1><p className="welcome-description">Gather your favorite people. Strike a little pose.<br/>Make a memory you can hold on to.</p>{settings.showTitle && <div className="event-label">{settings.eventName}<span>{formatDate(settings.eventDate)}</span></div>}<button className="button start-button" onClick={() => { setLayout(settings.layout); setFrame(settings.frame); go('layout') }}>Start photo <Icon name="arrow"/></button><p className="small-note tap-note">A few smiles. A few seconds. All yours.</p><div className="welcome-features">{[['camera','Photos'],['print','Keepsakes'],['smile','Laughs'],['heart','Memories']].map(([icon,text]) => <span key={text}><Icon name={icon} size={23}/>{text}</span>)}</div></div><span className="welcome-side-note">MADE FOR THE MOMENTS THAT MATTER</span></section>}
      {page === 'layout' && <section className="selection-page page-enter"><Heading eyebrow="01 / FIND YOUR FORMAT" title="A little space for your smiles.">Pick a layout. Make it a memory.</Heading><div className="layout-grid">{layouts.map((item) => <button key={item.id} className={`choice-card ${layout === item.id ? 'selected' : ''}`} aria-pressed={layout === item.id} onClick={() => setLayout(item.id)}><span className="selection-check">{layout === item.id && <Icon name="check" size={16}/>}</span><div className="sample-stage"><FrameSample layout={item.id} frame="minimal"/></div><h2>{item.name}</h2><p>{item.detail}</p><span className="photo-count">{item.count} {item.count === 1 ? 'PHOTO' : 'PHOTOS'}</span></button>)}</div><div className="actions"><button className="button secondary" onClick={() => go('welcome')}><Icon name="back"/> Back</button><button className="button" onClick={() => go('frame')}>Choose a frame <Icon name="arrow"/></button></div></section>}
      {page === 'frame' && <section className="selection-page page-enter"><Heading eyebrow="02 / THE FINISHING TOUCH" title="Frame your kind of happy.">A little detail that makes it yours.</Heading><div className="frame-grid">{frames.map((item) => <button key={item.id} className={`choice-card frame-card ${frame === item.id ? 'selected' : ''}`} aria-pressed={frame === item.id} onClick={() => setFrame(item.id)}><span className="selection-check">{frame === item.id && <Icon name="check" size={16}/>}</span><div className="sample-stage"><FrameSample layout={layout} frame={item.id}/></div><h2>{item.name}</h2><p>{item.detail}</p></button>)}</div><div className="actions"><button className="button secondary" onClick={() => go('layout')}><Icon name="back"/> Back</button><button className="button" onClick={() => go('camera')}>Let’s take photos <Icon name="camera"/></button></div></section>}
      {page === 'camera' && <Camera settings={settings} layout={layout} onComplete={prepare} onBack={() => go('frame')}/>}
      {page === 'preview' && <section className="preview-page page-enter"><Heading eyebrow="LOOK AT YOU" title="That’s a keeper.">A little collection of your best moments.</Heading><div className="photo-display">{composed ? <BlobImage blob={composed} alt="Your composed photobooth preview"/> : <div className="empty-state" role="status">{busy ? 'Putting your memories together…' : 'Preview unavailable. Retry or retake your photos.'}</div>}</div><div className="actions"><button className="button secondary" disabled={busy} onClick={() => { setPhotos([]); setComposed(null); go('camera') }}><Icon name="refresh"/> Retake photos</button>{!composed && !busy ? <button className="button" onClick={() => prepare(photos)}>Retry preview</button> : <button className="button" disabled={!composed || busy} onClick={finish}>Use these photos <Icon name="check"/></button>}</div><p className="small-note">{getLayout(layout).name} · {frames.find((f) => f.id === frame)?.name} frame</p></section>}
      {page === 'result' && result && <section className="result-page page-enter"><div className="screen-heading"><span className="success-mark"><Icon name="check" size={25}/></span><h1>A moment to keep.</h1><p>Your photo is ready. Take the memory with you.</p></div><div className="result-grid"><div className="photo-display"><BlobImage blob={result.finalPhoto} alt="Your finished photobooth photo" className="print-photo"/></div><div className="result-actions"><span className="eyebrow">MADE WITH A LITTLE HAPPINESS</span><h2>{result.eventName}</h2><p>{formatDate(result.eventDate)}</p><button className="button" onClick={() => { downloadPhoto(result.finalPhoto, result.filename); setNotice('Download requested. On iPad, check Downloads or use Share Photo to save to Photos.') }}><Icon name="download"/> Save to device</button>{canShare(result) && <button className="button secondary" onClick={async () => { try { await sharePhoto(result) } catch (e) { if (e.name !== 'AbortError') setError('Sharing is unavailable right now. Use Save to Device instead.') } }}><Icon name="share"/> Share photo</button>}<button className="button secondary" onClick={() => window.print()}><Icon name="print"/> Print photo</button><div className="saved-note"><Icon name={stored ? 'check' : 'gallery'} size={18}/>{stored ? 'Also saved in your local gallery.' : 'Not yet saved to the local gallery.'}</div>{!stored && <button className="text-button" disabled={busy} onClick={retrySave}>Retry saving to gallery</button>}<button className="button secondary another-button" disabled={busy} onClick={reset}><Icon name="camera"/> Take another photo</button>{operator && <button className="text-button" disabled={busy} onClick={() => go('gallery')}>Back to gallery</button>}</div></div></section>}
      {operator && page === 'setup' && <EventSetup settings={settings} onSave={persistSettings}/>}
      {operator && page === 'settings' && <Settings settings={settings} onSave={persistSettings} eventKey={eventKey} onFullscreen={fullscreen} onCameraTest={() => { setLayout('single'); go('camera') }}/>}
      {operator && page === 'gallery' && <Gallery eventKey={eventKey} onOpen={(session) => { setResult(session); setStored(true); go('result') }}/>}
    </main>
    <footer className="site-footer"><span><Icon name="leaf" size={15}/> A keepsake of being together.</span><span>CAPTURE · SMILE · KEEP</span></footer>
    {menu && <Dialog title="Operator studio" onClose={() => setMenu(false)}><p>Set the scene, revisit your photos, or get the booth ready.</p><div className="operator-menu">{[['setup','Event setup','camera'],['gallery','Local gallery','gallery'],['settings','Booth settings','settings']].map(([next,label,icon]) => <button className="button secondary" key={next} onClick={() => { setMenu(false); go(next) }}><Icon name={icon}/>{label}<Icon name="arrow"/></button>)}<button className="button" onClick={() => { setMenu(false); setOperator(false); reset() }}>Enter guest mode <Icon name="arrow"/></button></div><p className="small-note">Hold the Good Moments logo for 3 seconds to return here. This is a convenience control, not a security lock.</p></Dialog>}
  </div>
}
export default App
