import PhotoFilterPicker from '../components/filters/PhotoFilterPicker'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { FriendsSession } from '../services/friends/session'
import { THEMES, randomId } from '../services/friends/protocol'
import { saveSession } from '../services/db'
import { thumbnail } from '../services/images'
import { canShare, downloadPhoto, sharePhoto } from '../services/share'
import Dialog from '../components/Dialog'
import './Friends.css'

function FriendsGuide() {
  return <details className="friends-guide" lang="fil">
    <summary>Paano gamitin? <span>Simple guide para sa inyong dalawa</span></summary>
    <div className="friends-guide-body">
      <p>Ikaw ang <strong>host</strong> kapag ikaw ang gumawa ng room. Isang friend lang ang puwedeng sumali.</p>
      <ol>
        <li><strong>Gumawa at i-share ang link.</strong><p>Host: pindutin ang <b>Create room</b>. Kapag lumabas ang link, pindutin ang <b>Copy invitation</b> at i-send sa friend mo sa chat. Hindi pa kailangan ng camera sa step na ito.</p></li>
        <li><strong>Sumali at buksan ang cameras.</strong><p>Friend: buksan ang link → <b>Enable camera</b> → <b>Allow</b> → <b>Join room</b>.<br/>Host: pindutin din ang <b>Enable camera</b> at <b>Allow</b>, tapos <b>Admit friend</b> kapag may join request.</p></li>
        <li><strong>I-confirm na kayo ang magkausap.</strong><p>Ihambing sa chat ang code sa inyong screens. Kapag pareho, parehong pindutin ang <b>Code matches — share camera</b>.</p></li>
        <li><strong>Ready, pose, smile!</strong><p>Host ang pipili ng frame. Parehong pindutin ang <b>I am ready</b>, tapos host ang pipindot ng <b>Take 3 photos</b>. Mag-pose sa bawat countdown!</p></li>
        <li><strong>Piliin at i-save ang memory.</strong><p>Kung gusto ninyo ang pictures, parehong pindutin ang <b>Approve photos</b>, tapos kanya-kanyang <b>Download photo</b>. Gusto ulitin? Pindutin ang <b>Retake all photos</b> bago mag-approve.</p></li>
      </ol>
      <div className="friends-guide-tips"><strong>Para tuloy-tuloy ang session</strong><p>Panatilihing bukas ang page. Pagbalik mula sa chat, pindutin ulit ang <b>Enable camera</b> kung naka-pause ito. Bumalik sa parehong browser sa loob ng 5 minutes para ma-restore ang room. I-enable at i-confirm ulit ang camera pagkatapos mag-reconnect.</p><p>Hindi makakonekta? Subukan ang ibang Wi-Fi o mobile data. Kung magkaibang device kayo, gamitin ang online app link; hindi ang link na may <b>localhost</b>.</p><p>Ang <b>Save to local gallery</b> ay sa browser ng device mo lang. Mag-<b>Download photo</b> para may sarili kang file bago umalis.</p></div>
    </div>
  </details>
}

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

function HostAudio({ stream }) {
  const ref = useRef(null)
  const [blocked, setBlocked] = useState(false)
  useEffect(() => {
    const audio = ref.current
    let active = true
    audio.srcObject = stream
    if (stream) audio.play().then(() => { if (active) setBlocked(false) }).catch(() => { if (active) setBlocked(true) })
    return () => { active = false; audio.pause(); audio.srcObject = null }
  }, [stream])
  return <><audio ref={ref} autoPlay/>{stream && blocked && <button className="button" onClick={() => ref.current.play().then(() => setBlocked(false)).catch(() => setBlocked(true))}>Listen to host</button>}</>
}

function Room({ invitation, recovery, onLeave, onRestart }) {
  const [session] = useState(() => new FriendsSession(invitation, { recovery }))
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot)
  const [leaving, setLeaving] = useState(false), [savedBlob, setSavedBlob] = useState(null), [saving, setSaving] = useState(false), [notice, setNotice] = useState('')
  const reviewPanel = useRef(null), resultPanel = useRef(null)
  const cleanup = useRef(null), saveLock = useRef(false), resultRecord = useRef(null)
  useEffect(() => {
    clearTimeout(cleanup.current)
    if (location.hash.startsWith('#friend=')) history.replaceState(null, '', location.pathname + location.search)
    const visibility = () => { if (document.hidden) session.suspend(); else session.resumePage() }
    const unload = event => { if (session.state.stage !== 'setup' && session.state.stage !== 'ended') { event.preventDefault(); event.returnValue = '' } }
    const pagehide = () => session.suspend()
    const resume = () => session.resumePage()
    window.addEventListener('pageshow', resume); window.addEventListener('online', resume)
    if (recovery) session.start()
    document.addEventListener('visibilitychange', visibility); window.addEventListener('beforeunload', unload); window.addEventListener('pagehide', pagehide)
    return () => {
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('beforeunload', unload); window.removeEventListener('pagehide', pagehide)
      window.removeEventListener('pageshow', resume); window.removeEventListener('online', resume)
      // React StrictMode immediately remounts effects; defer disposal until a real unmount.
      cleanup.current = setTimeout(() => session.dispose(), 0)
    }
  }, [session, recovery])
  const hasPreview = Boolean(state.preview)
  useEffect(() => {
    const target = state.result ? resultPanel.current : state.stage === 'review' && hasPreview ? reviewPanel.current : null
    if (target) { target.scrollIntoView({ block: 'start', behavior: 'auto' }); target.focus({ preventScroll: true }) }
  }, [state.stage, state.result, hasPreview])
  const result = state.result && { finalPhoto: state.result, filename: 'Good_Moments_Friends.jpg', eventName: 'Photobooth with Friends' }
  async function save() {
    if (!result || saveLock.current) return
    saveLock.current = true; setSaving(true)
    try {
      if (resultRecord.current?.finalPhoto !== result.finalPhoto) {
        const now = new Date()
        resultRecord.current = { ...result, id: `friends-${randomId()}`, eventKey: 'friends', eventDate: now.toISOString().slice(0, 10), createdAt: now.toISOString(), layout: 'friends-paired', frame: state.theme, originals: [], photoFilter: state.photoFilter, thumbnail: await thumbnail(result.finalPhoto) }
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
      <FriendsGuide/>
      {!session.host && <HostAudio stream={state.audioRemote}/>}
      {state.connected && !state.result && !['review', 'composing', 'finalizing'].includes(state.stage) && <div className="friend-panel"><h2>Host voice guidance</h2><p>{session.host ? 'Your friend can hear you after you enable your microphone. Live audio is not recorded.' : state.hostMicEnabled ? state.hostMicMuted ? 'Host microphone is muted.' : 'Host microphone is on. Listen for instructions.' : 'Host microphone is off. Your microphone is not shared.'}</p>
        {session.host && <div className="actions">{!state.micEnabled ? <button className="button secondary" disabled={state.micBusy || !state.confirmed || !state.remoteConfirmed} onClick={() => session.enableMic()}>{state.micBusy ? 'Opening microphone...' : 'Enable mic'}</button> : <><button className="button secondary" onClick={() => session.toggleMic()}>{state.micMuted ? 'Unmute mic' : 'Mute mic'}</button><button className="text-button" onClick={() => session.stopMic()}>Turn mic off</button></>}</div>}
        {state.micError && <p className="notice error" role="alert">{state.micError}</p>}<p className="small-note">Confirm your friend first. Headphones can help reduce echo.</p></div>}
      <div className="friend-status" role="status">{state.status || (invitation ? 'Enable your camera, then join your friend.' : 'Create a room first, then copy the invitation for your friend.')}{state.expiresAt && state.stage !== 'ended' && <small>Room ends by {new Date(state.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Return within 5 minutes if you switch apps.</small>}</div>
      {state.error && <p className="notice error" role="alert">{state.error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      {state.stage === 'setup' && <div className="friend-panel"><h2>{invitation ? 'Join your friend' : 'Invite one friend'}</h2>{!invitation && <p><strong>Create room → Copy invitation → Enable camera</strong></p>}<p>Your live camera and captured photos will be shared with the person you admit. Either person can save them. Host audio is optional and starts only after Enable mic. The guest microphone is never shared.</p><p className="small-note">Free direct connections need internet and may not work on every Wi-Fi or mobile network. No paid fallback is used.</p></div>}
      {state.stage === 'setup' && <div className="actions"><button className="button" disabled={Boolean(invitation) && !state.cameraReady} onClick={() => session.start()}>{invitation ? 'Join room' : 'Create room'}</button></div>}
      {state.invite && !state.connected && state.stage !== 'ended' && <div className="friend-panel"><h2>Send this link to your friend</h2><input aria-label="Invitation link" value={state.invite} readOnly onFocus={event => event.target.select()}/><div className="actions"><button className="button" onClick={copyInvite}>Copy invitation</button>{navigator.share && <button className="button secondary" onClick={async () => { try { await navigator.share({ title: 'Take a photo with me', url: state.invite }) } catch (error) { if (error.name !== 'AbortError') setNotice('Sharing failed. Copy the invitation instead.') } }}>Share invitation</button>}</div></div>}
      {!['review', 'composing', 'finalizing', 'result', 'ended'].includes(state.stage) && <>
        <div className={`friend-cameras theme-${state.theme}`}>
          <Video stream={session.host ? state.local : state.remote} mirror={session.host ? state.mirror : state.remoteMirror} label={session.host ? 'You · host' : 'Your friend · host'} onReady={session.host ? video => session.cameraLoaded(video) : undefined}/>
          <Video stream={session.host ? state.remote : state.local} mirror={!session.host ? state.mirror : state.remoteMirror} label={session.host ? 'Your friend' : 'You'} onReady={!session.host ? video => session.cameraLoaded(video) : undefined}/>
          {state.countdown && <div className="friend-countdown" role="timer" aria-label={`Capture in ${state.countdown}`}>{state.countdown}</div>}
        </div>
        {cameraControls && <div className="actions"><button className="button secondary" disabled={saving} onClick={() => session.camera('user')}>{state.local ? 'Front camera' : 'Enable camera'}</button><button className="button secondary" onClick={() => session.camera('environment')}>Rear camera</button>{state.local && <button className="text-button" onClick={() => session.pauseCamera()}>Pause camera</button>}</div>}
      </>}
      {state.pending && <div className="friend-panel"><h2>Your friend wants to join</h2><p>Admit only the person you sent the invitation to.</p><div className="actions"><button className="button" onClick={() => session.accept()}>Admit friend</button><button className="button secondary" onClick={() => session.reject()}>Decline</button></div></div>}
      {state.connected && (!state.confirmed || !state.remoteConfirmed) && <div className="friend-panel"><h2>Confirm your friend</h2><p>Compare this code through the chat where you shared the link. Both screens must match before sharing video or enabling host audio.</p><strong className="friend-code">{state.code || 'Preparing…'}</strong><button className="button" disabled={state.confirmed || !state.code} onClick={() => session.confirm()}>{state.confirmed ? 'Waiting for your friend to confirm' : 'Code matches — share camera'}</button></div>}
      {state.stage === 'booth' && state.connected && <div className="friend-panel"><h2>Make it your moment</h2><fieldset disabled={!session.host}><legend>{session.host ? 'Choose a frame' : 'Your host chooses the frame'}</legend><div className="actions">{Object.entries(THEMES).map(([id, theme]) => <button key={id} className={`button ${state.theme === id ? '' : 'secondary'}`} aria-pressed={state.theme === id} onClick={() => session.setTheme(id)}>{theme.name}</button>)}</div></fieldset><p>{state.ready ? 'You are ready.' : 'Get your pose ready.'} {state.remoteReady ? 'Your friend is ready.' : 'Waiting for your friend to get ready.'}</p><div className="actions"><button className="button secondary" disabled={!state.remote || !state.cameraReady || !state.confirmed || !state.remoteConfirmed} onClick={() => session.setReady()}>{state.ready ? 'Not ready yet' : 'I am ready'}</button>{session.host && <button className="button" disabled={!state.ready || !state.remoteReady} onClick={() => session.begin()}>Take 3 photos</button>}</div></div>}
      {['syncing', 'countdown', 'transferring', 'composing'].includes(state.stage) && <div className="actions"><button className="button secondary" onClick={() => session.requestReset('Capture cancelled. Get ready to try again.')}>Cancel capture</button></div>}
      {state.stage === 'review' && state.preview && <div className="friend-panel friend-review" ref={reviewPanel} tabIndex={-1}><h2>Review your photos</h2><p>Both friends must tap Approve photos to unlock saving.</p><div className="actions"><button className="button secondary" onClick={() => session.requestReset()}>Retake all photos</button><button className="button" disabled={state.approved || state.filterBusy || !state.remoteFilterReady} onClick={() => session.approve()}>Approve photos</button></div><Photo blob={state.preview}/><PhotoFilterPicker value={state.photoFilter} onChange={value => session.setFilter(value)} sample={session.own[0]} readOnly={!session.host} busy={state.filterBusy}/>{state.filterBusy && state.error && <button className="button secondary" onClick={() => session.review().catch(error => session.fail(error.message))}>Retry preview</button>}<p>{state.approved ? 'You approved these photos.' : 'Happy with your photos?'} {state.remoteApproved ? 'Your friend approved.' : 'Waiting for your friend’s approval.'}</p></div>}
      {result && <div className="friend-panel friend-result" ref={resultPanel} tabIndex={-1}><h2>Your photo is ready</h2><p>{state.received ? 'Both devices received the finished photo.' : 'This copy is ready. Your friend’s receipt is not confirmed.'}</p><div className="actions friend-save-actions"><button className="button" onClick={() => downloadPhoto(result.finalPhoto, result.filename)}>Save to device</button>{canShare(result) && <button className="button secondary" onClick={async () => { try { await sharePhoto(result) } catch (error) { if (error.name !== 'AbortError') setNotice('Sharing failed. Download instead.') } }}>Share photo</button>}<button className="button secondary" disabled={saving || savedBlob === result.finalPhoto} onClick={save}>{savedBlob === result.finalPhoto ? 'Saved to gallery' : saving ? 'Saving…' : 'Save to local gallery'}</button></div><p className="small-note">On iPhone, use Share photo and choose Save Image, or check Downloads after Save to device. Save to local gallery keeps a copy in this browser.</p><Photo blob={result.finalPhoto}/>{state.stage === 'result' && <button className="text-button" onClick={() => session.requestReset()}>Take another session</button>}</div>}
      {state.stage === 'reconnecting' && <button className="button" onClick={() => session.retryConnection()}>Reconnect</button>}
      {state.stage === 'ended' && <div className="actions"><button className="button" onClick={onRestart}>Start a new room</button><button className="button secondary" onClick={onLeave}>Return to local booth</button></div>}
      <p className="small-note friend-footer">Free two-person beta · No account · No cloud photo storage<br/>If the connection fails, try another Wi-Fi or mobile network.</p>
    </main>
    {leaving && <Dialog title="Leave this room?" onClose={() => setLeaving(false)}><p>Download your finished photo first. Unsaved captures will be discarded. Leaving as host ends the room.</p><div className="actions"><button className="button secondary" onClick={() => setLeaving(false)}>Stay here</button><button className="button" onClick={() => { session.end(); onLeave() }}>Leave room</button></div></Dialog>}
  </div>
}

export default function Friends({ entry, onLeave }) {
  const [attempt, setAttempt] = useState(0)
  if (entry?.error && attempt === 0) return <div className="friend-panel"><h1>Invitation unavailable</h1><p role="alert">{entry.error}</p><button className="button" onClick={onLeave}>Return to local booth</button></div>
  return <Room key={attempt} recovery={attempt === 0 ? entry?.recovery : null} invitation={attempt === 0 ? entry?.invitation : null} onLeave={onLeave} onRestart={() => setAttempt(value => value + 1)}/>
}
