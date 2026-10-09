import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { FriendsSession } from '../services/friends/session'
import { THEMES, randomId } from '../services/friends/protocol'
import { saveSession } from '../services/db'
import { thumbnail } from '../services/images'
import { canShare, downloadPhoto, sharePhoto } from '../services/share'
import Dialog from '../components/Dialog'
import './Friends.css'

function Video({ stream, mirror, label, onReady }) {
  const ref = useRef(null)
  useEffect(() => {
    const video = ref.current
    video.srcObject = stream
    if (stream) video.play().catch(() => {})
    return () => { video.srcObject = null }
  }, [stream])
  return <div className="friend-video"><video ref={ref} autoPlay playsInline muted style={{ transform: mirror ? 'scaleX(-1)' : undefined }} onLoadedData={() => onReady?.(ref.current)}/>{!stream && <span className="friend-placeholder">Camera not shared</span>}<span className="friend-label">{label}</span></div>
}
function Photo({ blob }) {
  const ref = useRef(null)
  useEffect(() => { const url = URL.createObjectURL(blob); ref.current.src = url; return () => URL.revokeObjectURL(url) }, [blob])
  return <img ref={ref} className="friend-photo" alt="Three paired photos, host on the left and friend on the right"/>
}

function Room({ invitation, onLeave, onRestart }) {
  const [session] = useState(() => new FriendsSession(invitation))
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot)
  const [leaving, setLeaving] = useState(false), [savedBlob, setSavedBlob] = useState(null), [saving, setSaving] = useState(false), [notice, setNotice] = useState('')
  const cleanup = useRef(null), saveLock = useRef(false), resultRecord = useRef(null)
  useEffect(() => {
    clearTimeout(cleanup.current)
    if (location.hash.startsWith('#friend=')) history.replaceState(null, '', location.pathname + location.search)
    const visibility = () => { if (document.hidden) session.pauseCamera() }
    const unload = event => { if (session.state.stage !== 'setup' && session.state.stage !== 'ended') { event.preventDefault(); event.returnValue = '' } }
    const pagehide = () => session.end('Page closed. Create a new room to continue.')
    document.addEventListener('visibilitychange', visibility); window.addEventListener('beforeunload', unload); window.addEventListener('pagehide', pagehide)
    return () => {
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('beforeunload', unload); window.removeEventListener('pagehide', pagehide)
      // React StrictMode immediately remounts effects; defer disposal until a real unmount.
      cleanup.current = setTimeout(() => session.dispose(), 0)
    }
  }, [session])
  const result = state.result && { finalPhoto: state.result, filename: 'Good_Moments_Friends.jpg', eventName: 'Photobooth with Friends' }
  async function save() {
    if (!result || saveLock.current) return
    saveLock.current = true; setSaving(true)
    try {
      if (resultRecord.current?.finalPhoto !== result.finalPhoto) {
        const now = new Date()
        resultRecord.current = { ...result, id: `friends-${randomId()}`, eventKey: 'friends', eventDate: now.toISOString().slice(0, 10), createdAt: now.toISOString(), layout: 'friends-paired', frame: state.theme, originals: [], thumbnail: await thumbnail(result.finalPhoto) }
      }
      await saveSession(resultRecord.current); setSavedBlob(result.finalPhoto); setNotice('Saved to this device. Find it in Local gallery → All photos.')
    } catch { setNotice('Gallery save failed. Download your photo to keep it, then retry.') }
    finally { saveLock.current = false; setSaving(false) }
  }
  async function copyInvite() {
    try { await navigator.clipboard.writeText(state.invite); setNotice('Invitation copied. Send it privately to one friend.') }
    catch { setNotice('Copy is unavailable. Select and copy the invitation below.') }
  }
  const cameraControls = !['countdown', 'transferring', 'syncing', 'composing', 'finalizing', 'ended'].includes(state.stage)
  return <div className="app-shell friends-shell">
    <header className="site-header"><strong>good moments <span className="small-note">/ with a friend</span></strong><button className="button secondary" onClick={() => setLeaving(true)}>Leave room</button></header>
    <main className="friends-page">
      <div className="screen-heading"><span className="eyebrow">TWO FRIENDS. ONE MEMORY.</span><h1>Together, anywhere.</h1><p>Three poses, one shared photo strip.</p></div>
      <div className="friend-status" role="status">{state.status || 'Enable your camera to get started.'}{state.expiresAt && state.stage !== 'ended' && <small>Room ends by {new Date(state.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Keep this page open.</small>}</div>
      {state.error && <p className="notice error" role="alert">{state.error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      {state.stage === 'setup' && <div className="friend-panel"><h2>{invitation ? 'Join your friend' : 'Invite one friend'}</h2><p>Your live camera and captured photos will be shared with the person you admit. Either person can save them. No microphone is used.</p><p className="small-note">Free direct connections need internet and may not work on every Wi-Fi or mobile network. No paid fallback is used.</p></div>}
      {!['result', 'ended'].includes(state.stage) && <>
        <div className={`friend-cameras theme-${state.theme}`}>
          <Video stream={session.host ? state.local : state.remote} mirror={session.host ? state.mirror : state.remoteMirror} label={session.host ? 'You · host' : 'Your friend · host'} onReady={session.host ? video => session.cameraLoaded(video) : undefined}/>
          <Video stream={session.host ? state.remote : state.local} mirror={!session.host ? state.mirror : state.remoteMirror} label={session.host ? 'Your friend' : 'You'} onReady={!session.host ? video => session.cameraLoaded(video) : undefined}/>
          {state.countdown && <div className="friend-countdown" role="timer" aria-label={`Capture in ${state.countdown}`}>{state.countdown}</div>}
        </div>
        {cameraControls && <div className="actions"><button className="button secondary" disabled={saving} onClick={() => session.camera('user')}>{state.local ? 'Front camera' : 'Enable camera'}</button><button className="button secondary" onClick={() => session.camera('environment')}>Rear camera</button>{state.local && <button className="text-button" onClick={() => session.pauseCamera()}>Pause camera</button>}</div>}
      </>}
      {state.stage === 'setup' && <div className="actions"><button className="button" disabled={!state.cameraReady} onClick={() => session.start()}>{invitation ? 'Join room' : 'Create room'}</button></div>}
      {state.invite && !state.connected && state.stage !== 'ended' && <div className="friend-panel"><h2>Send this link to your friend</h2><input aria-label="Invitation link" value={state.invite} readOnly onFocus={event => event.target.select()}/><div className="actions"><button className="button" onClick={copyInvite}>Copy invitation</button>{navigator.share && <button className="button secondary" onClick={async () => { try { await navigator.share({ title: 'Take a photo with me', url: state.invite }) } catch (error) { if (error.name !== 'AbortError') setNotice('Sharing failed. Copy the invitation instead.') } }}>Share invitation</button>}</div></div>}
      {state.pending && <div className="friend-panel"><h2>Your friend wants to join</h2><p>Admit only the person you sent the invitation to.</p><div className="actions"><button className="button" onClick={() => session.accept()}>Admit friend</button><button className="button secondary" onClick={() => session.reject()}>Decline</button></div></div>}
      {state.connected && (!state.confirmed || !state.remoteConfirmed) && <div className="friend-panel"><h2>Confirm your friend</h2><p>Compare this code through the chat where you shared the link. Both screens must match before sharing video.</p><strong className="friend-code">{state.code || 'Preparing…'}</strong><button className="button" disabled={state.confirmed || !state.code} onClick={() => session.confirm()}>{state.confirmed ? 'Waiting for your friend to confirm' : 'Code matches — share camera'}</button></div>}
      {state.stage === 'booth' && state.connected && <div className="friend-panel"><h2>Make it your moment</h2><fieldset disabled={!session.host}><legend>{session.host ? 'Choose a frame' : 'Your host chooses the frame'}</legend><div className="actions">{Object.entries(THEMES).map(([id, theme]) => <button key={id} className={`button ${state.theme === id ? '' : 'secondary'}`} aria-pressed={state.theme === id} onClick={() => session.setTheme(id)}>{theme.name}</button>)}</div></fieldset><p>{state.ready ? 'You are ready.' : 'Get your pose ready.'} {state.remoteReady ? 'Your friend is ready.' : 'Waiting for your friend to get ready.'}</p><div className="actions"><button className="button secondary" disabled={!state.remote || !state.cameraReady || !state.confirmed || !state.remoteConfirmed} onClick={() => session.setReady()}>{state.ready ? 'Not ready yet' : 'I am ready'}</button>{session.host && <button className="button" disabled={!state.ready || !state.remoteReady} onClick={() => session.begin()}>Take 3 photos</button>}</div></div>}
      {['syncing', 'countdown', 'transferring', 'composing'].includes(state.stage) && <div className="actions"><button className="button secondary" onClick={() => session.requestReset('Capture cancelled. Get ready to try again.')}>Cancel capture</button></div>}
      {state.stage === 'review' && state.preview && <div className="friend-panel"><Photo blob={state.preview}/><p>{state.approved ? 'You approved these photos.' : 'Happy with your photos?'} {state.remoteApproved ? 'Your friend approved.' : 'Waiting for your friend’s approval.'}</p><div className="actions"><button className="button secondary" onClick={() => session.requestReset()}>Retake all photos</button><button className="button" disabled={state.approved} onClick={() => session.approve()}>Approve photos</button></div></div>}
      {result && <div className="friend-panel"><Photo blob={result.finalPhoto}/><p>{state.received ? 'Both devices received the finished photo.' : 'This copy is ready. Your friend’s receipt is not confirmed.'}</p><div className="actions"><button className="button" onClick={() => downloadPhoto(result.finalPhoto, result.filename)}>Download photo</button>{canShare(result) && <button className="button secondary" onClick={async () => { try { await sharePhoto(result) } catch (error) { if (error.name !== 'AbortError') setNotice('Sharing failed. Download instead.') } }}>Share photo</button>}<button className="button secondary" disabled={saving || savedBlob === result.finalPhoto} onClick={save}>{savedBlob === result.finalPhoto ? 'Saved to gallery' : saving ? 'Saving…' : 'Save to local gallery'}</button></div>{state.stage === 'result' && <button className="text-button" onClick={() => session.requestReset()}>Take another session</button>}</div>}
      {state.stage === 'reconnecting' && !session.host && <button className="button" onClick={() => session.retryConnection()}>Reconnect</button>}
      {state.stage === 'ended' && <div className="actions"><button className="button" onClick={onRestart}>Start a new room</button><button className="button secondary" onClick={onLeave}>Return to local booth</button></div>}
      <p className="small-note friend-footer">Free two-person beta · No account · No cloud photo storage<br/>If the connection fails, try another Wi-Fi or mobile network.</p>
    </main>
    {leaving && <Dialog title="Leave this room?" onClose={() => setLeaving(false)}><p>Download your finished photo first. Unsaved captures will be discarded. Leaving as host ends the room.</p><div className="actions"><button className="button secondary" onClick={() => setLeaving(false)}>Stay here</button><button className="button" onClick={() => { session.end(); onLeave() }}>Leave room</button></div></Dialog>}
  </div>
}

export default function Friends({ entry, onLeave }) {
  const [attempt, setAttempt] = useState(0)
  if (entry?.error && attempt === 0) return <div className="friend-panel"><h1>Invitation unavailable</h1><p role="alert">{entry.error}</p><button className="button" onClick={onLeave}>Return to local booth</button></div>
  return <Room key={attempt} invitation={attempt === 0 ? entry?.invitation : null} onLeave={onLeave} onRestart={() => setAttempt(value => value + 1)}/>
}
