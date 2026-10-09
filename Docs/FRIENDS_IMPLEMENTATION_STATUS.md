# Two-person Friends mode — implementation and verification

Updated: October 10, 2026

Status: Implemented as a free, two-person beta. Production build is ready for the existing Vercel project. No public deployment was performed. Actual iPhone/iPad and separate-network acceptance remains open.

## Implemented

- Welcome entry: **Photo with a friend**. Existing local booth remains available.
- Invitation fragment contains a random host peer ID and separate secret; it is removed from the guest address bar after entry.
- PeerJS public signaling with explicit STUN-only configuration. No paid TURN defaults, provider keys, custom application backend, or cloud database.
- Host can create and copy the invitation before enabling a camera. Guest camera preparation remains required before Join. Microphone off by default; optional host-only live voice guidance after both identity confirmations. Front/rear selection and mirror-consistent previews/stills.
- Challenge-response invitation validation; host admission; one guest slot; extra participants rejected.
- Matching confirmation code, confirmed by both people through their existing chat before media sharing.
- Host-selected Botanical, Rose, and Film paired frames.
- Two Ready controls; configuration changes reset readiness.
- Five clock samples, future scheduled captures, three local stills per participant, and cancellation of late/hidden-camera captures.
- JPEG signature/dimension/size validation, bounded chunks, backpressure, SHA-256 verification, receipt acknowledgments, and visible transfer progress.
- Full-session retake and both participants' approval of the current capture generation.
- One 1200 × 2000 final JPEG delivered identically to both devices.
- Download, supported native sharing, and explicit local-gallery save. Gallery originals are empty for Friends records; only the final image and thumbnail are saved.
- Cameras stop after successful final delivery. Enable them again after Take another session.
- Reconnect token and five-minute grace with local room recovery. Both reconfirm identity and readiness after reconnecting.
- Ten-minute waiting expiry, one-hour admitted room lifetime, heartbeat monitoring, transfer timeouts, and host-end cleanup.
- Leave confirmation, offline entry feedback, invalid-link feedback, and retained completed result after disconnect/end.
- Lazy-loaded Friends bundle included in the existing offline app-shell cache. Networking itself still requires internet.
- Build flag `VITE_FRIENDS_ENABLED=false` to disable Friends entry and invitation routing.

## Verification

### Host voice guidance

Host-only audio uses a separate authenticated PeerJS media call (`metadata.kind = host-audio`), so enabling or muting it does not rebuild the video call or discard captures. Host permission requests are audio-only with echo cancellation, noise suppression and automatic gain control requested. The guest answers without sending a microphone stream. Mic state is live only; it is not restored from storage. Permission errors use a dedicated message. Late permission grants are stopped if the user has paused/left in the meantime.

Host controls: Enable mic, Mute/Unmute, and Turn mic off. Guest playback uses an audio element and offers Listen to host when autoplay fails. Pausing camera, hiding the page, ending, losing the data connection and renewed admission all stop/revoke mic use. No audio recording or new paid service is added. STUN-only networking limitations remain.

Protocol is version 3; reopen both clients after deployment. Simulated consent/mute/cleanup/denial/authentication tests pass through `npm.cmd run test:filters`. The Friends browser suite includes a synthetic microphone transport check, but real WebRTC audio transport, Safari playback, speaker/headphone routing and audibility remain unverified in the current environment.

### Latest host-recovery correction

The earlier localStorage fix still ended host sessions on recoverable PeerJS errors and never rebuilt a destroyed Peer. Host and guest now retry recoverable signaling/network errors. Destroyed transports and temporary ID collisions recreate/retry the original ID and secret; waiting hosts re-register after app switching. A resume probe checks data-channel liveness instead of trusting `connection.open` after Safari resumes. Only a valid challenge proof and matching resume token can replace a stale occupied connection.

Credentials are saved before registration, repeated retries do not extend the recovery deadline, and reopening the same guest invitation uses its saved resume credentials. Room expiry and explicit Leave still end/clear the room. Cameras remain paused until users enable them again. Unsaved interrupted captures still reset.

Current correction checks: `npm.cmd run test:filters` passes simulated host network loss, destroyed Peer replacement, ID collision, stable invitation, authenticated stale-connection replacement, rejection of another resume token, liveness acknowledgments/timeouts, and bounded recovery expiry. Lint and production build pass. These simulated transports do not establish actual iPhone or public-broker reliability; the browser debugger was unavailable in this environment. The integration results below are historical, before this correction.

Deploy this correction and reopen both clients on the updated build before testing. On iPhone, use the same Safari tab/origin for the host, switch to Messenger and back within five minutes, and verify the original invitation remains usable. Test both a waiting host and an already-admitted room. A Messenger in-app browser does not share Safari's local room credentials.

Tests use generated camera video, isolated browser profiles, and no real webcam images.

- ESLint and production Vite build pass.
- Existing local booth suite: 11 browser checks pass, including offline use, storage failure, retake, gallery persistence/deletion, layout capture, and permission recovery.
- Existing template suite: all 12 checks pass, including five offline templates and unchanged legacy gallery records.
- Friends integration: all 9 checks pass using independent headless Edge processes and real WebRTC, with a local test-only PeerJS broker. It covers protocol validation, admission/third-person rejection, configuration readiness reset, countdown cancellation/stale messages, three paired captures, two approvals, matching output hashes, signaling and participant reconnect, camera cleanup, wrong invitation secrets, declined admission/corrupt transfers, mobile UI, cancel-safe leave, offline feedback, and malformed invitations.
- The free public PeerJS broker was also exercised successfully for the full two-person controller capture/result flow. This was two browsers on the same computer, not two different physical networks. The production UI entry/camera/leave flow was checked separately.
- Example public-broker run: measured browser capture-call differences were approximately 0.15 ms, 1.15 ms, and 0.55 ms. These are one synthetic local run, not sensor-exposure measurements or a reliability guarantee.

Artifacts are generated in ignored folders:

- `artifacts/friends-check/results.json` and `friends-mobile.png`
- `artifacts/friends-public-check/results.json`
- `artifacts/browser-check/`
- `artifacts/template-check/`

## Run locally

```sh
npm ci
npm run dev
```

Open the displayed localhost URL, select Photo with a friend and create a room. Copy the invitation, then enable the camera. Send its invitation to a second browser on the same computer for a quick local check. A localhost invitation cannot connect a friend on another device to your website; use the HTTPS Vercel URL for that.

For reproducible tests:

```sh
npm run lint
npm run build
npm run test:friends
npm run test:browser
npm run test:templates
```

`test:friends` runs a temporary local broker from the **development-only** `peer` dependency. That broker is a test fixture, not part of the deployed application. Tests default to Microsoft Edge on Windows; set `BROWSER_PATH` for another installed Chromium executable.

To additionally test the external free broker in PowerShell:

```powershell
$env:FRIENDS_PUBLIC_BROKER = '1'
npm run test:friends
Remove-Item Env:FRIENDS_PUBLIC_BROKER
```

The optional public run sends connection metadata to PeerJS and uses synthetic camera media over direct WebRTC. It does not enable a paid relay.

## Vercel deployment

Use the existing project with Vite, build command `npm run build`, and output `dist`. No server deployment or runtime provider secret is needed. `VITE_FRIENDS_ENABLED` defaults to enabled; set it to `false` and rebuild to withdraw the beta while retaining local booth mode.

Use the deployed HTTPS URL when creating invitations. Check the actual project's hosting-plan eligibility and free limits; personal Vercel Hobby eligibility must not be assumed for a commercial photobooth business. Do not upgrade or enable paid usage automatically.

The app uses free PeerServer Cloud only for signaling and explicitly supplies `stun:stun.l.google.com:19302` as its ICE server. No TURN relay is configured. Restricted networks can therefore fail even for two people. The recovery is another network, retry, or local booth mode—not paid fallback.

References: [PeerJS free cloud](https://peerjs.com/server/getting-started), [PeerJS network limitations](https://peerjs.com/client/faq), [Vercel Hobby eligibility](https://vercel.com/docs/plans/hobby).

## Remaining release gates and limits

1. Deploy to the intended Vercel project and test its actual invitation URL.
2. Test real iPad/iPhone Safari, Android Chrome, front/rear cameras, portrait/landscape, Share Sheet, and Home Screen mode.
3. Test two devices on separate Wi-Fi networks and Wi-Fi versus cellular. Document unsupported networks instead of claiming universal connectivity.
4. Confirm usable timeout/recovery on restrictive networks with TURN absent.
5. Collect repeated physical-device timing/memory observations before asserting the plan's 95% timing target.
6. Verify final-result Save/Share/gallery actions on physical devices. Automated tests exercise matching result bytes and existing storage behavior; they do not establish iOS native-share behavior.

Host closure/reload ends the room. There is no cloud recovery, public room directory, central room quota, or permanent result link. Free public signaling is shared infrastructure; availability and rate limits are outside this application's control. Gallery deletion cannot erase files the other person already saved.
