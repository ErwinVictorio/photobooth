# Template release implementation — October 7, 2026

The five-template **three-photo strip release** is implemented. Digital output stays 900 x 2100 (high) or 630 x 1470 (standard). This report separates completed software checks from device-dependent release gates.

## Delivered

- Classic Wedding, Minimal Clean, Film Retro, Vintage Polaroid and Colorful Fun, with one authored palette each.
- Versioned registry in `src/data/templates.js`, with explicit dimensions, slot positions/rotation/radius/crop, text bounds, logo boxes, font dependencies and supported layouts.
- One Canvas renderer for template samples, setup preview, capture progress, final preview and JPEG. Captured photographs are never color-filtered by template artwork.
- Polaroid photos and their paper mounts, tape and captions share the same center rotation. Photo clipping occurs before decorations and event text.
- All / Wedding / Minimal / Retro / Fun filters; selection survives filtering. A separate enlarged preview does not select a design until Use this template. Native modal focus containment, Escape/close and focus restoration are supported.
- Responsive picker: one column on narrow phones, two on tablets, five on sufficiently wide screens. Persistent selection/action bar reserves bottom space and safe-area padding. Reduced-motion preferences use the existing app rules.
- Event name/date/logo, Minimal footer caption, Fun heading and three Polaroid captions. Empty optional text stays empty. Text shrinks/wraps within explicit limits; oversized values block operator saving with visible template-specific errors.
- Enabled-template controls and default validation: at least one strip template remains enabled and the default is enabled. Other layouts retain their six existing frames.
- Camera framing follows the current slot's aspect ratio. New originals retain the full camera field of view, downsampled to the existing 1600/1000-pixel width limits and mirrored according to settings. Composition applies the crop. Existing cropped originals cannot recover missing image areas.
- New sessions store `templateId`, `templateVersion` and `originalFormat`. Existing gallery records are read directly without relabeling or regenerating final JPEGs.
- Public files are recursively included in the service worker cache list and version hash. Font loading is awaited; failures expose retry and prevent incomplete exports. Font decoding is reused, temporary image sources/canvases are released after composition and preview object URLs are revoked on changes/unmount.

## Verification

- ESLint: passed.
- Production Vite build: passed; approximately 86.4 kB gzip JavaScript, plus a 1.20 MB bundled font cached locally.
- Existing browser suite: all 11 checks passed, covering capture/save, gallery, retake, storage failure/retry, legacy layouts, camera switching/denial and offline gallery reload.
- Template suite: all 12 reported checks passed with no uncaught browser exceptions. Renderer fixtures compare sample/export JPEG bytes with identical input; inspect transformed photo pixels, source crops and original colors; verify logo pixels, standard/high dimensions, missing photos, long text, invalid logos and layout incompatibility.
- UI checks cover filters, selection persistence, modal cancel/Escape/focus, explicit selection, widths of 390/820/1180/1440 pixels, invalid text, empty availability, disabled default and cancellation of unsaved settings.
- Offline checks exercise all five designs through synthetic camera capture, preview and committed gallery save, verifying template ID/version, uncropped original aspect ratio and unchanged preview/final byte sizes.
- Compatibility check inserts an old-format record without template metadata into isolated test storage, reopens it, compares the JPEG SHA-256 hash and checks that legacy frame/name fields remain unchanged.
- Injected font-load failure blocks setup saving; restoring the loader and retrying recovers.

Reproduce from the project root:

```text
npm run lint
npm run build
npm run test:browser
npm run test:templates
```

Both browser runners use hidden headless Edge, a synthetic camera, temporary profiles and isolated storage. `BROWSER_PATH` can select another Chromium executable. On this workstation, VS Code's bundled Node runtime was used because standalone Node was absent from PATH. Evidence is under ignored `artifacts/browser-check/` and `artifacts/template-check/`; each runner writes `results.json` and screenshots. Renderer test bundles remain under `artifacts/`, outside the production build.

## Assets and free-only policy

No new npm package was installed. Decorative geometry and sample illustrations are original project artwork, generated locally by Canvas. No stock photographs or external image-generation service is required.

Cormorant Garamond is bundled unmodified from the [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond), with its full [SIL OFL 1.1 notice](../public/fonts/OFL-CormorantGaramond.txt). Source filename: `CormorantGaramond[wght].ttf`; local filename: `public/fonts/CormorantGaramond.ttf`; downloaded October 7, 2026; SHA-256: `b20b7d9626dd956b2c5e558692ad328b1f19e3275e2782db4fa07670d83f35e0`. The template font does not require a runtime network request to a third party. App controls retain their system sans-serif stack.

## Remaining release gates and future scope

- Real iPad Safari front/rear camera, orientation changes, Share Sheet, Home Screen offline relaunch, actual portrait crop/face clearance and long-event memory/performance checks need the target hardware. Headless synthetic-camera results are not evidence of those checks.
- Physical print composition needs the printer, media and bleed/cut requirements. No 2 x 6 inch or 300-PPI printing claim is made; the digital strip remains 3:7.
- Phase E explicitly follows a stable first pack: dedicated single/double/grid artwork, additional palettes and optional imported packages remain future work. The first-delivery requirement in section 7 keeps the five new designs strip-only. They are not stretched into other layouts, and an arbitrary uploaded PNG is not treated as a complete template.
- Phase A uses neutral original illustrations rather than licensed sample photographs. Runtime samples use the actual composer; the earlier static SVG studies are historical visual references, not runtime overlays or exact font/spacing specifications.

The software release is ready for hardware review. The overall plan must not be marked fully accepted until those device-dependent gates are verified.
