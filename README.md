# Good Moments Photobooth

A React/Vite photobooth for an iPad kiosk, based on the botanical storyboard in `Docs/`. Local booth mode captures, composes, and keeps photos on the current device. Optional Friends mode shares live camera and photos directly with one invited friend using free PeerJS signaling and WebRTC. No application backend, accounts, or cloud photo storage.

## Photo with a friend

Choose **Photo with a friend** and **Create room**. Copy and share the invitation first, then enable your camera and admit your friend, compare the confirmation code in your existing chat, and both confirm camera sharing. Both press Ready; the host starts three photos. Approve together, then download or explicitly save the shared strip to your local gallery.

The website still builds as a static Vercel app. There are no paid API keys or TURN subscriptions. Direct connections may fail on restrictive networks; try another network. Keep the host page open. See [Friends implementation and deployment notes](Docs/FRIENDS_IMPLEMENTATION_STATUS.md) for checks, commands, and remaining real-device gates. Set `VITE_FRIENDS_ENABLED=false` and rebuild to disable the beta.

## Run locally

Use a current Node.js release compatible with the installed Vite version.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Camera access requires localhost or HTTPS. Opening a plain HTTP LAN address from an iPad does not provide a secure camera context; use an HTTPS deployment for hardware testing.

```sh
npm run lint
npm run build
npm run preview
npm run test:browser
```

The integration runner uses installed Microsoft Edge on Windows with a synthetic camera and an isolated temporary profile. Set `BROWSER_PATH` to use another Chromium executable. Build first. It writes results and screenshots to ignored `artifacts/browser-check/`. It does not access a real webcam or existing browser photos.

If Node is not on PATH but desktop VS Code is installed, this workspace can also run through its bundled runtime in PowerShell:

```powershell
$env:ELECTRON_RUN_AS_NODE = '1'
& "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe" node_modules/vite/bin/vite.js
```

## Operator controls

Click **Operator** at the top right of the welcome screen, or click the **Good Moments logo** at the top left. Choose Event setup, Local gallery, or Booth settings. The three-second logo hold still works. Enter guest mode returns to the welcome screen. This is a convenience gate, not authentication.

Event setup saves the event name/date, optional local logo, default template/frame/layout, template availability, captions, quality, and countdown. It validates text fit and template assets before saving. Settings cover front/rear preference, mirroring, event title, sound, fullscreen, storage totals, confirmed event/all-photo deletion, and offline readiness. Camera changes use the last saved settings.

## Guest flow

Welcome → layout → template (or legacy frame) → camera/countdown → preview/retake → final photo.

- Single, two-photo, three-photo strip, and four-photo grid layouts.
- Five curated strip templates with category filters and larger previews: Classic Wedding, Minimal Clean, Film Retro, Vintage Polaroid and Colorful Fun. One shared composer renders sample and captured-photo output, including rotated Polaroid mounts.
- Single, double and grid retain six locally drawn frame styles.
- Front camera preview and output use the same mirror setting. New originals keep the full camera field of view at bounded resolution; final composition applies the selected slot crop.
- Full-session retake; camera tracks stop when leaving capture or hiding the app.
- Final JPEG, thumbnail, and original captures are committed together to IndexedDB only after **Use these photos**.
- Storage failure preserves the final image in the current screen and offers download plus retry.
- Save to Device requests a download. Supported browsers also offer native file sharing. iPad users choose Save to Photos, Files, or AirDrop in the Share Sheet as available.
- Print opens the browser print dialog with only the final photo. Exact paper sizing and AirPrint require testing with the chosen printer.

Photos remain scoped to this browser and origin. Clearing browser data can remove the gallery. Save important photos to the device. Renaming the event or changing its date starts a different **This event** gallery group; prior photos remain in **All photos**.

## Offline and hosting

The production build generates a versioned service worker, manifest, and app icons. Assets and the app shell are precached without a CDN or external fonts. Open once online and check **Booth settings → Ready for offline use**. Then use Safari's **Share → Add to Home Screen** on the iPad. Offline caching is intentionally disabled during Vite development.

New versions wait until the old app's tabs/windows close before activating, so a live capture is not interrupted by an update. Reopen while online before an event to obtain updates.

`vercel.json` supplies the Vite build/output settings and camera permissions policy. Import this directory into your Vercel project to deploy it over HTTPS. No public deployment has been performed by this implementation.

## Release scope

See `Docs/IMPLEMENTATION_STATUS.md` for verification and remaining release gates. Actual iPad camera, sharing, Home Screen installation, and printer checks remain necessary. Filters/stickers, custom frame PNG imports, bulk ZIP export, PIN authentication, cloud/QR sharing, and later business features are deferred. The MVP uses native browser APIs and CSS rather than adding the optional UI/database/PWA wrappers from the recommended stack.

For template implementation details, font licensing and acceptance checks, see [the template report](Docs/TEMPLATE_IMPLEMENTATION_REPORT.md). After `npm run build`, run `npm run test:browser` for the base regression suite and `npm run test:templates` for rendering, picker, validation, legacy gallery and all-five-template offline checks.
