# Photobooth with Friends — Full Feature Plan

Date: October 9, 2026

Status: Two-person beta implemented locally. See [implementation status and verification](FRIENDS_IMPLEMENTATION_STATUS.md) for completed behavior and remaining physical-device/network/deployment gates. The specifications below remain acceptance targets, not a claim that every release gate has passed.

Revised scope: **Two people only, Vercel deployment, and free services only.** This revision supersedes the earlier custom-server and paid-relay direction. Implementation resumed under these constraints.

### Fixed constraints

- Exactly one host and one friend per room; group rooms are out of scope.
- Keep the React/Vite website deployable as a static app on Vercel.
- No paid APIs, subscriptions, credit-card-dependent trials, automatic upgrades, or usage-based billing.
- Use PeerJS with its free public signaling service for the initial connectivity prototype.
- No separately hosted custom Node.js room server, online database, accounts, or cloud photo storage.
- Start with direct WebRTC connections and STUN. Do not assume a free TURN relay is included.
- If a network cannot connect without TURN, show recovery guidance; never silently switch to a paid service.
- Two participants reduce bandwidth and complexity but do not eliminate network restrictions or service limits.

## 1. Product goal

Let two friends in different locations open a shared link, see each other's live camera, pose together, and create one downloadable photobooth strip.

The first release combines their pictures side by side. Making both people appear inside one seamless scene through background removal is a later feature.

Example:

```text
Create room → Share invitation → Friend joins → Choose frame
     → Both ready → Shared countdown → Capture three poses
     → Both approve → Generate one strip → Both download

┌─────────────────────────┐
│       GOOD MOMENTS      │
│ ┌──────────┬──────────┐ │
│ │   Host   │  Friend  │ │  Pose 1
│ ├──────────┼──────────┤ │
│ │   Host   │  Friend  │ │  Pose 2
│ ├──────────┼──────────┤ │
│ │   Host   │  Friend  │ │  Pose 3
│ └──────────┴──────────┘ │
│     Together, anywhere │
└─────────────────────────┘
```

## 2. Relationship to the existing application

The existing project uses React, Vite, native browser APIs, local storage, and IndexedDB. The original project plan describes a local, offline-capable kiosk application with no backend or cloud photo storage.

Friends mode is an optional online extension. The website stays on Vercel and uses an external free signaling broker to help the two browsers connect. The host browser manages the temporary room. No custom backend deployment, user accounts, online photo database, or permanent cloud photo storage is required by this design.

Provide two clear entry points:

- **Start Photo:** existing local booth experience.
- **Photo with Friends:** create or join an online room.

Keep existing local capture, templates, gallery, printing, operator access, and offline behavior working. Existing photos and gallery records must remain readable. Friends mode must display that an internet connection is required.

This plan is additive to [the original project plan](Photobooth_Web_App_Full_Project_Plan.md). Its online architecture applies only to Friends mode.

## 3. First-release scope

### Included

- Two participants: one host and one guest.
- Temporary room and shareable invitation link.
- Camera permission and device preview before joining.
- Host approval of the joining guest.
- Live video previews of both participants; microphone disabled.
- Host-controlled selection of a compatible frame.
- Fixed host-left and guest-right positions.
- Three paired shots per session.
- Ready buttons for both participants.
- Coordinated countdown and local capture on each device.
- Reliable transfer of captured still images.
- Shared preview, full-session retake, and approval from both participants.
- One final JPEG delivered to both participants.
- Download and supported native sharing.
- Optional explicit save into each device's local gallery.
- Clear connection, interruption, expiry, and transfer states.

### Out of scope

- More than two participants, including future group-room or media-server expansion under this plan.
- Microphone, voice chat, text chat, and recording.
- Background removal and seamless shared scenes.
- Individual-shot retakes and live collaborative editing.
- Public room discovery, permanent result links, and cloud galleries.
- Accounts, payments, subscriptions, and analytics containing personal media.
- Host migration, cross-device session recovery, and offline remote sessions.
- Arbitrary uploaded room assets; start with bundled compatible templates.

## 4. User journey and screens

### A. Entry

Show **Create Room** and an explanation: “Invite one friend and take photos together. Both devices need internet and camera access.” Invitation links open the join flow directly.

### B. Camera preparation

Show the participant's own camera preview, camera switch, mirror setting, and permission recovery instructions. Ask for a short optional display name. Do not transmit camera video until the participant explicitly joins the call.

### C. Host lobby

Show the invitation link, Copy Link, Share Link where supported, room expiry, and “Waiting for your friend.” The host sees and accepts a pending join request. A room has only one guest slot.

### D. Guest lobby

Resolve the invitation, validate availability, prepare the camera, and request admission. Show waiting, rejected, room full, expired, or connection failed states. Do not reveal the host's video to an unapproved guest.

### E. Shared booth

Show both previews inside the intended paired layout. Keep controls readable on narrow phones and landscape tablets. Label local and remote previews, connection status, readiness, and shot number.

The host chooses a compatible frame. Both participants press Ready. Changing the frame or camera, losing camera readiness, or reconnecting resets readiness. The host can start only after both are ready and media/data connections are healthy.

### F. Capture

Show the same shot number and countdown on both devices. Capture each participant locally at the agreed target time. Transfer both still images before advancing to the next pose. Network delay may lengthen the pause between poses.

Provide a visible Cancel action. Cancellation invalidates the current capture generation and prevents late messages from advancing it.

### G. Review

Both participants see the paired three-shot preview. Each can choose **Approve Photos** or **Request Retake**. A retake resets the full sequence and both approvals. Finalization requires two approvals of the same photo/configuration revision.

### H. Result

The host generates the final JPEG once and sends that exact file to the guest. Both see Download, supported Share, Save to Local Gallery, and Take Another Session.

Do not claim both have received the photo until the guest acknowledges the complete file. If disconnected, keep any locally available result downloadable.

### I. Leave and end

Warn before leaving when unsaved photos exist. A guest can leave; the host can end the room. Stop camera tracks and release temporary media on exit. Explain that downloaded or locally saved copies on the other device cannot be recalled.

## 5. Technical architecture

```text
                Vercel HTTPS React/Vite app
                  /                    \
             Host browser          Guest browser
                  |                    |
                  +-- Free PeerJS -----+
                  |   signaling broker |
                  |   (connection setup)|
                  |                    |
                  +---- WebRTC --------+
                       live video
                       control messages
                       still-image files
                       final JPEG
                Host manages admission and TTL
                No paid relay or custom server
```

### Frontend

Continue with the current React/Vite stack and browser camera/Canvas APIs. Avoid introducing a routing, database, or UI library solely for this feature unless the implementation needs it.

### Free signaling and browser-owned rooms

Use the PeerJS browser library with the free PeerServer Cloud broker for the prototype. Its documented role is connection signaling, not application room authorization or photo storage. The public service is shared infrastructure; do not promise unlimited capacity or guaranteed availability. See [PeerJS setup](https://peerjs.com/server/getting-started) and [PeerServer Cloud](https://peerjs.com/server/cloud).

The host browser holds room state, invitation secrets, admission decisions, expiry, and the single guest slot in memory. Establish a data connection for admission first; start video only after the invitation is validated and the host accepts. Closing or reloading the host page ends the room. No durable room lookup or server-enforced app-wide quotas are available in this architecture.

### WebRTC

Use a peer connection for live video and data channels. Keep microphone access off. Use an ordered reliable control channel and a separate reliable file channel, with scheduling so large transfers do not delay capture controls.

Configure an explicit STUN-only ICE list for the initial prototype, after checking the chosen endpoint's current usage terms. Inspect the library's actual ICE configuration rather than relying on defaults. Direct connections may fail on restrictive Wi-Fi or mobile networks even with only two people. [PeerJS connection limitations](https://peerjs.com/client/faq)

TURN is not a required dependency in this revision. An optional free relay may be evaluated later only if its current terms require no payment method and cannot incur charges. Without a verified qualifying relay, explain connection failures and suggest trying another Wi-Fi or mobile network. Do not claim universal connectivity.

### Deployment boundary

Deploy the existing Vite build to Vercel. The browser connects directly to PeerServer Cloud for signaling and to the friend over WebRTC for video and files. This design does not require Vercel Functions, a persistent server process, or a server-side room store.

Free Vercel Hobby hosting is intended for personal, non-commercial use and has usage limits. This zero-cost target covers the personal friends prototype; do not assume it covers the original paid photobooth business. Check the actual project's eligibility before deployment, without upgrading the account automatically. [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)

## 6. Proposed frontend modules

These are proposed names, to be adapted after inspecting the existing application code:

```text
src/pages/friends/
  FriendsEntry.jsx
  FriendsRoom.jsx
  FriendsResult.jsx
src/components/friends/
  InvitePanel.jsx
  ParticipantPreview.jsx
  ConnectionStatus.jsx
  SharedCountdown.jsx
  PairedPhotoPreview.jsx
src/services/friends/
  roomClient.js
  peerConnection.js
  sessionProtocol.js
  captureScheduler.js
  imageTransfer.js
  friendsComposer.js
```

Keep transport logic outside UI components. Isolate Friends session state from local booth session state. Reuse existing camera and composition utilities only after verifying their lifecycle and rendering contracts.

## 7. Room lifecycle and access

Proposed pilot defaults, enforced by the host browser while the room is open:

| Setting | Initial target |
| --- | --- |
| Participants | Exactly two |
| Waiting-room expiry | 10 minutes without admission |
| Maximum room lifetime | 60 minutes from creation |
| Reconnect grace period | 60 seconds |
| Pending admission timeout | 60 seconds |
| Concurrent sessions per room | One |

Generate a fresh random peer ID and a separate high-entropy invitation secret. Knowing the peer ID alone must not grant admission. The host retains its authority locally; the guest receives a separate reconnect token only after admission. Bind application messages to the admitted data connection, not a sender name in the payload. Compare an identity-confirmation code through the friends' existing communication channel before sharing video; public peer IDs are not verified identities.

Put the host peer ID and invitation secret in the URL fragment. Submit the secret over the data channel for host-side validation, never as a public peer ID or signaling metadata. Remove the fragment after reading it when safe. Use a restrictive referrer policy and avoid third-party scripts on room pages. A fragment reduces incidental leakage but does not replace admission checks.

Accept one guest, then reject all additional connections. Reconnect requires that participant's token and the same still-running host session. Do not promote a guest to host. End Room closes connections and destroys the peer instance. A reload cannot restore the room; create a new invitation. When the host is unreachable, show “Room unavailable or host offline,” since there is no authoritative online room registry to distinguish every cause.

## 8. Session protocol and state

Room state:

```text
CREATING → WAITING → ADMISSION → CONNECTING → CONNECTED
                                 ↓              ↓
                              FAILED       RECONNECTING
                                                ↓
                                         CONNECTED / ENDED
```

Capture state:

```text
CONFIGURING → READY → PREPARING → COUNTDOWN → CAPTURING
     ↑                                          ↓
     +------ RETAKE ← REVIEW ← TRANSFERRING ------+
                       ↓
                  FINALIZING → RESULT
```

Represent each protocol message with a version, unique message ID, room ID, session ID, capture generation, configuration revision, message type, and validated payload. Derive participant identity from the authenticated transport rather than trusting a supplied sender field.

Suggested message types:

- PeerJS handles signaling; application data-channel messages handle request admission, admit/reject, heartbeat, resume, leave, and end. Room creation is local to the host.
- Peer control: configuration, ready, prepare shot, prepare acknowledgment, schedule shot, capture acknowledgment, cancel, retake, approve, result receipt.
- File transfer: metadata, chunk, completion, verification acknowledgment, abort.

The host coordinates session ordering. Both browsers validate expected state transitions, role permissions, and revision numbers. Ignore duplicates, stale shots, and messages from previous generations. The guest must reject a capture command if it has not marked itself ready.

Never advance a shot just because a timer elapsed; require successful local captures and verified image receipt. Bound every wait with a visible recovery action.

## 9. Countdown and synchronization

Perfect simultaneous exposure cannot be guaranteed across independent browser cameras and networks. The goal is a closely coordinated photo experience, with measured timing rather than a claim of exact synchronization.

1. Exchange several ping/pong samples over the control channel.
2. Estimate clock offset and round-trip delay, favoring low-delay samples.
3. Host asks both devices to prepare a specific shot/revision.
4. Both acknowledge camera readiness and matching configuration.
5. Host schedules capture at a future time with enough lead time for the countdown.
6. Each browser maps that time to its own monotonic clock and schedules its local capture.
7. Exchange actual capture timing and resulting image metadata.

Do not begin a fresh three-second timer when a message happens to arrive. Re-estimate timing after reconnection. Cancel a late schedule instead of taking an unexpectedly delayed photo. If a tab is hidden, camera ends, readiness changes, or the connection drops, abort the current sequence and require a restart.

Proposed validation target: at least 95% of shot pairs within 200 ms measured capture-time difference under the documented normal-network test setup. Revisit the threshold after the device spike; it is not yet an established capability or a guarantee about sensor exposure time.

## 10. Image capture and transfer

Capture a still from each local camera instead of using a screenshot of the lower-quality remote preview. Start with bounded JPEG dimensions, for example a 1600-pixel longest edge, and tune quality using actual device memory and output tests.

Proposed initial limits:

- Up to 2 MB per captured still; recompress or offer retry when exceeded.
- Three stills per participant.
- Up to 10 MB final JPEG.
- Enforce decoded image dimension limits as well as compressed byte limits.

Treat these as implementation defaults to validate, not universal browser limits.

Transfer metadata before chunks, including transfer ID, purpose, shot index, byte count, dimensions, MIME type, and checksum. Chunk sizes must respect the negotiated data-channel limit; use conservative chunks and backpressure via buffered-amount monitoring. Reject oversized, unexpected, corrupt, or unsupported files.

Display transfer progress. A transfer is complete only after byte-count and checksum validation plus successful image decoding. Use bounded retries. For the pilot, restart an interrupted transfer rather than implementing byte-range resume.

After a reload, in-memory originals may be lost. Do not promise recovery of an unfinished session. Keep complete locally available results downloadable if the other participant disappears.

## 11. Composition and templates

Start with one paired three-row template and a small set of bundled frame variants. Each row contains the host on the left and guest on the right. Use an explicit paired-layout definition rather than silently changing existing single-person template slots.

For each still, store source dimensions and mirror preference. Apply the same mirror rule in local preview and final rendering, avoiding double mirroring. Define consistent crop behavior for portrait/landscape cameras. Allow safe areas for faces and readable captions.

Each browser can compose a review preview from the same originals and configuration. After both approve the current revision, the host generates the authoritative final JPEG. Deliver that exact file to the guest so downloads match byte for byte.

Validate maximum Canvas dimensions and memory on the oldest supported iPad before fixing export dimensions. Handle composition failure without discarding source images immediately.

## 12. Storage, consent, and privacy

Before joining, explain: “Your live camera and captured photos will be shared with the person in this room. Either participant can save the final photo.”

Room mode must not reuse a blanket statement that photos never leave the device. Photos travel directly to the other participant in the initial STUN-only design. If a qualifying free relay is adopted later, update the disclosure accordingly. Do not claim that the other participant cannot screenshot, record, or retain shared images.

Keep temporary captures in browser memory by default. Save a final photo into IndexedDB only when the participant chooses Save to Local Gallery. Existing local-mode save behavior remains unchanged.

Never send photo files through the signaling service. Minimize local diagnostics; exclude invitation tokens, credentials, image content, and full signaling payloads. The public broker and network providers may process connection metadata; do not claim control over their logging or retention.

Release temporary Blob URLs and media buffers after retake, cancellation, expiry, or departure. Local saved copies follow the existing gallery deletion flow. Room expiry cannot erase files already saved by another person.

## 13. Security and abuse controls

- HTTPS frontend and secure broker signaling.
- Host-side invitation validation, guest admission, role checks, schemas, and state transitions; validate incoming messages on both devices.
- Bounded pending connections, join attempts, message sizes, and file sizes in each browser. These are local protections, not server-wide abuse prevention.
- One admitted guest per host; close unexpected media calls and extra data connections.
- No paid TURN credentials or provider secrets in the frontend. Any later free relay must have a safe credential design before adoption.
- Random unguessable credentials, no public room directory, and room TTL enforcement.
- Escape display names and captions; do not render participant HTML.
- Clear expired local room state, destroy the host peer, and discard reconnect tokens when ending.
- Avoid logging secrets; keep error reports free of participant media.

Vite-exposed configuration is public. Only non-secret settings belong there. This design has no backend in which to hide a provider secret; reject any integration that requires embedding one. The free broker's service-side protections are outside the app's control.

## 14. Failure and recovery behavior

| Situation | Expected behavior |
| --- | --- |
| Camera denied | Explain how to allow access; offer retry or leave |
| Missing/busy camera | Show an actionable message; do not mark ready |
| Invitation expired/full | Dedicated screen with return-to-home action |
| Guest rejected | Explain admission was declined; do not expose media |
| Peer connection fails | Explain free direct connection could not be established; offer bounded retry, another network, or leave |
| Disconnect during countdown | Cancel generation; no silent partial continuation |
| Disconnect during transfer | Keep valid local files; retry after reconnect or restart |
| Tab hidden/device locks | Pause session, clear readiness, require return and restart |
| Host disconnects | Wait for grace period; then end room without host migration |
| Free broker outage or limit | Explain service unavailable; offer later retry without a paid fallback |
| Host reloads/closes tab | End the room; preserve locally available result; require a fresh invitation |
| Corrupt/oversized image | Reject transfer; offer retry or restart capture |
| One participant requests retake | Invalidate approvals and restart all three shots |
| Local storage full | Keep download available; show gallery-save failure |
| Native sharing unavailable | Download fallback |
| Room expires | Stop new captures, close connections, retain completed result for download |

## 15. Mobile and accessibility requirements

- Test Safari on actual iPhone/iPad and Chrome on Android, plus desktop Chrome/Edge.
- Establish minimum supported browser/OS versions from test results.
- Use inline playback and user-gesture-compatible media startup.
- Handle camera changes without stale tracks or readiness.
- Recalculate layout on orientation changes without changing capture identity.
- Display text with connection indicators; do not rely only on color or sound.
- Provide large touch controls, keyboard operation, visible focus, and readable contrast.
- Respect reduced-motion preferences.
- Keep countdown numbers visible even with sound disabled.
- Test Safari tabs and Home Screen/PWA mode separately.

## 16. Offline and service-worker behavior

Local booth mode retains its offline support. Friends entry may load from the cache, but room creation/join must fail gracefully when offline.

Never cache authenticated room responses, credentials, or temporary remote images through the service worker. Review current caching and routing before introducing room URLs. The app shell must resolve invitation links on direct navigation and refresh.

Do not activate an app update in the middle of a room session. Include a protocol version handshake so incompatible clients receive a clear reload instruction before capture.

## 17. Zero-cost infrastructure policy

Target additional service spend: **zero**. Use eligible free Vercel hosting, the documented free PeerServer Cloud broker, browser-native capture/Canvas/storage, and direct WebRTC media transfer. There is no paid API, custom room server, or purchased relay in this scope.

Do not activate trials requiring a payment method, metered overages, or automatic upgrades. If a free service becomes unavailable or changes its terms, disable the affected online feature or evaluate another genuinely free option. Keep local booth mode available.

Two people per room is not a site-wide concurrency allowance. Do not invent a supported number of simultaneous rooms or a monthly free quota for the public broker. Record test connection success, timing, and failures locally without participant media or invitation secrets; no paid monitoring service is required.

The app can remain free by accepting service limits and unsupported networks. It cannot guarantee uninterrupted availability, unlimited traffic, or successful connections on every network. Keep this limitation visible in the Friends entry screen.

## 18. Implementation phases and completion gates

### Phase 0 — Existing-code review and design contract

Inspect navigation, camera lifecycle, Canvas renderer, storage schema, service worker, and current tests. Finalize paired layout, consent copy, protocol schema, and supported-device test list.

**Gate:** reviewed integration map and no required changes to existing stored photos.

### Phase 1 — Connectivity proof of concept

Build a two-browser PeerJS prototype using the free broker and explicit STUN-only configuration. Test admission, video, data-channel text, and image transfer locally and from a Vercel preview on separate networks. Inspect selected ICE candidates to verify whether successful connections are direct.

**Gate:** two actual devices connect on at least one documented separate-network pair, exchange an image, and release camera/network resources on exit without paid infrastructure. Also verify a clear timeout on blocked networks. Record unsupported network combinations; do not hide them or purchase a relay to pass this gate.

### Phase 2 — Rooms and admission

Implement browser-owned create/join, invitation validation, expiry, guest-slot locking, admission, bounded pending connections, and reconnect tokens. Explicitly handle host reload and broker unavailability.

**Gate:** only the admitted two participants can access the room; expired credentials and unauthorized host commands fail.

### Phase 3 — Shared booth UI

Add entry points, lobby, paired live previews, compatible template selection, Ready controls, and connection status. Preserve the local mode.

**Gate:** configuration and readiness match on both devices, including after camera changes and reconnects.

### Phase 4 — Coordinated capture

Implement clock estimates, prepare/acknowledge scheduling, three-shot sequence, generation invalidation, and local image capture.

**Gate:** documented capture timing results and reliable cancellation under delayed messages, disconnects, and hidden tabs.

### Phase 5 — Files, preview, and approval

Implement bounded file transfer, checksums, previews, full-session retake, and two-party approval of one revision.

**Gate:** no mixed-session images, incomplete transfers, stale approvals, or late captures can reach finalization.

### Phase 6 — Result and local saving

Generate the final JPEG, send the identical file, confirm receipt, and wire download/native share/explicit gallery save.

**Gate:** both devices download matching files; save/share failures preserve available results.

### Phase 7 — Hardening and deployment

Run security, network, mobile, accessibility, offline-regression, and resource-cleanup checks. Deploy a limited pilot with monitoring and rollback controls.

**Gate:** release checklist passed with actual-device evidence. Build success alone is insufficient.

## 19. Verification plan

### Automated protocol and room-controller tests

- Host/guest authorization, admission locking, expiry, and reconnect credentials.
- Duplicate/out-of-order messages and stale configuration/capture generations.
- Ready invalidation and approvals bound to the exact photo revision.
- Capture cancellation, timeouts, late schedules, and clock-offset calculations.
- Transfer size limits, chunk assembly, corruption, backpressure, and retry bounds.
- Local room cleanup, third-participant rejection, pending-connection limits, and host reload behavior.
- Free-broker unavailability and connection timeout without any paid-service fallback.

### Browser integration tests

Use two independent browser contexts with synthetic cameras. Exercise create/join, reject/accept, ready, three shots, retake, approval, result transfer, and download. Add disconnection and delayed-message cases.

Verify no microphone permission request, camera shutdown after exit, and identical final-file hashes. Synthetic cameras cannot prove physical-camera timing or Safari behavior.

### Real-device matrix

| Pair/network | Required coverage |
| --- | --- |
| Desktop + desktop, same Wi-Fi | Baseline flow and controls |
| iPad Safari + Android Chrome | Camera, crop, orientation, save/share |
| iPhone Safari + desktop | Mobile join and lifecycle |
| Separate Wi-Fi networks | Internet connection and signaling |
| Wi-Fi + cellular | Direct-connect success/failure and variable latency |
| Network requiring a relay | Clear timeout and alternate-network guidance with TURN absent |
| Free broker unavailable | Bounded retries; no paid fallback; local booth still usable |
| Throttled/lossy network | Progress, cancellation, timeout, recovery |
| Lock/unlock or switch apps | Explicit readiness reset and restart |

### Existing-app regression

Run the repository's applicable lint, build, browser, and template checks after integration. Verify local booth capture, templates, local gallery compatibility, operator access, download, and cached offline use. Add meaningful new checks for protocol and service behavior.

## 20. Release acceptance checklist

- [ ] Two users can enter one room through an invitation without accounts.
- [ ] Guest approval occurs before video is shared.
- [ ] Both see live previews and matching frame configuration.
- [ ] Capture requires both users to be ready.
- [ ] Three paired shots complete with measured timing evidence.
- [ ] Retake invalidates the full prior sequence and approvals.
- [ ] Both approve the same revision before finalization.
- [ ] Both receive a matching downloadable final JPEG.
- [ ] Direct connection works on documented test networks; unsupported networks show an actionable failure.
- [ ] A third participant is rejected without disrupting the admitted pair.
- [ ] Vercel deployment works without a separately deployed custom server.
- [ ] No paid APIs, payment-method-dependent trials, automatic upgrades, or usage charges are introduced.
- [ ] Camera denial, expiry, room full, disconnect, and backgrounding have usable recovery.
- [ ] Temporary secrets/media are excluded from logs and caches.
- [ ] Cameras and peer connections close when users leave.
- [ ] Local booth and existing gallery remain compatible and offline-capable.
- [ ] Actual iPad/iPhone checks supplement automated browser checks.
- [ ] Free-service limitations, Vercel plan eligibility, and host-reload behavior are documented.

## 21. Rollout and rollback

Ship behind a Friends-mode feature flag. Start with a small invited personal-use pilot, one guest per room, and local diagnostic results for connection reliability, capture timing, completion, and memory use. Do not claim centrally enforced global room limits without a backend.

If reliability is poor, disable new room creation while preserving the local booth entry. Drain active rooms where possible. Keep data changes backward-compatible so disabling the feature does not remove existing local photos. Never use gallery deletion as a rollback mechanism.

## 22. Decisions before implementation

The proposed product defaults are two participants, three side-by-side poses, no microphone, no accounts, no cloud gallery, and full-session retakes.

Implementation must finalize:

1. Verify free PeerServer Cloud availability and the chosen STUN endpoint; confirm actual PeerJS ICE defaults before setting the explicit no-paid-relay configuration.
2. Minimum supported devices/browser versions based on the connectivity spike.
3. Export resolution, JPEG limits, and compatible paired template designs.
4. Final room lifetime, admission, reconnect, and rate-limit values.
5. Measured acceptable capture timing and network-quality thresholds.

Build the free connectivity proof of concept first, then the complete two-person flow. More participants are not part of this plan. Do not add a custom server, paid relay, or paid provider as an implementation shortcut.

## 23. References

- [Original local photobooth plan](Photobooth_Web_App_Full_Project_Plan.md)
- [Current application overview](../README.md)
- [WebRTC peer connections, signaling, and ICE](https://webrtc.org/getting-started/peer-connections)
- [WebRTC data channels](https://webrtc.org/getting-started/data-channels)
- [WebRTC remote streams](https://webrtc.org/getting-started/remote-streams)
- [PeerJS free signaling setup](https://peerjs.com/server/getting-started)
- [PeerServer Cloud shared-service guidance](https://peerjs.com/server/cloud)
- [PeerJS FAQ and network limitations](https://peerjs.com/client/faq)
- [Vercel Hobby plan and eligibility](https://vercel.com/docs/plans/hobby)

Provider capabilities, pricing, browser limits, and deployment APIs must be checked against current official documentation when implementation begins.
