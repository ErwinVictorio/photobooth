# Photobooth MVP implementation

Implement the Version 1 guest flow from the full project plan, using the supplied botanical storyboard. Photos stay on this browser/device. No backend, accounts, cloud uploads, or QR sharing.

## Implementation scope

- Responsive welcome, layout, frame, camera, preview, result, gallery, event setup, and settings screens.
- Four layouts; six locally rendered frame styles; automatic multi-shot capture and full-session retake.
- Canvas composition with event branding, JPEG export, local originals/final/thumbnail storage, download and supported file sharing.
- Operator access by holding the welcome logo for three seconds; confirmed deletion and storage feedback.
- Production offline app shell, installation manifest, and Vercel configuration.

## Approach

Keep the existing React/Vite installation and use native Canvas, IndexedDB, CSS, and service-worker APIs. Optional UI, animation, routing, and database wrappers in the recommended stack are deferred; they are not required for the MVP behavior. Frame artwork is rendered locally and shared between previews and exported images.

## Release gates

- Run ESLint, production build, and automated browser checks where local tooling permits.
- Verify real iPad Safari camera permission, front/rear switch, portrait/landscape, Share Sheet, Home Screen installation, and offline relaunch on hardware.
- Actual printer sizing/AirPrint depends on the selected printer and remains a later phase.
- Public Vercel deployment requires an available hosting account/project; prepare configuration locally first.

## Implemented — October 7, 2026

- Complete Version 1 guest flow with four layouts and six procedural frame designs.
- Live camera, front/rear preference and switch, mirror-consistent capture, 3/5/10-second countdown, optional sound, automatic multi-shot, and full-session retake.
- Camera permission/reconnect errors, duplicate-capture guard, stream cleanup, and cancellation when the app is hidden.
- Canvas JPEG composition, crop-to-slot behavior, event name/date/logo, standard/high quality, and frame overlays.
- IndexedDB sessions containing original captures, final JPEG, and thumbnail; transaction completion is required before showing a saved state.
- Download, conditional native file share, browser print layout, and Take Another.
- Local gallery with This Event / Today / All filters, reopen/download/print, and confirmed deletion.
- Operator setup/settings, local settings persistence, storage totals, event/all-photo clearing, and offline readiness feedback.
- Production service worker, versioned app cache, manifest, PNG installation icons, and Vercel configuration.

## Validation

- ESLint: passed with no warnings or errors.
- Vite production build: passed; bundled JavaScript approximately 81.5 kB gzip.
- Eleven integration checks passed in headless Microsoft Edge using a synthetic camera and isolated temporary storage:
  1. iPad portrait and mobile layouts without horizontal overflow.
  2. Three-shot capture, 900 × 2100 JPEG, and committed originals.
  3. Download action supplies a JPEG filename and blob URL.
  4. Gallery persistence after reload, reopen, and cancel-safe delete.
  5. Setup/settings screens, cancel-safe bulk deletion, and settings persistence.
  6. Retake leaves saved gallery records unchanged.
  7. Simulated storage-full failure retains the final image; retry saves it.
  8. Two-photo 1800 × 1200 and four-grid 1500 × 1800 composition; synthetic camera switching stops the prior stream; landscape layout has no horizontal overflow.
  9. Permission denial disables capture and exposes retry/back controls.
  10. Confirmed deletion removes only the selected session.
  11. Production app and gallery reload with the network disabled.
- No uncaught browser exceptions in the integration run.
- Reviewed generated screenshots for the welcome, frame selection, and camera screens at iPad portrait size.
- Reproducible runner: `npm run build` then `npm run test:browser`. Evidence: `artifacts/browser-check/results.json` and screenshots (ignored development artifacts).

## Remaining work / deliberate deferrals

- Real iPad Safari and iOS Home Screen/offline relaunch checks; real camera hardware, Share Sheet/AirDrop, and long event soak testing.
- Hosting configuration is ready, but no Vercel account/project was provided and no public deployment was made.
- Printer model, paper dimensions, and AirPrint validation. The generic browser print action is available.
- Optional filters/editor, imported transparent PNG frames, bulk ZIP export, event templates, multiple themes, PIN protection, and later business features.
- The default design uses installed serif/sans-serif fonts and local vector botanical artwork; it does not require external fonts or image services.
