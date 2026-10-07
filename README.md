# Good Moments Photobooth

A React/Vite photobooth for an iPad kiosk, based on the botanical storyboard in `Docs/`. Capture, compose, and keep photos on the current device. No backend, accounts, or photo uploads.

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

Hold the **Good Moments logo for three seconds** (or focus it and hold Enter/Space). Choose Event setup, Local gallery, or Booth settings. Enter guest mode hides operator navigation again. This is a convenience gate, not authentication.

Event setup saves the event name/date, optional local logo, default frame/layout, quality, and countdown. Settings cover front/rear preference, mirroring, event title, sound, fullscreen, storage totals, confirmed event/all-photo deletion, and offline readiness. Camera changes use the last saved settings.

## Guest flow

Welcome → layout → frame → camera/countdown → preview/retake → final photo.

- Single, two-photo, three-photo strip, and four-photo grid layouts.
- Six locally drawn frame styles, with consistent frame artwork in samples and final JPEGs.
- Front camera preview and output use the same mirror setting. Captures use the photo slot's aspect ratio.
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
