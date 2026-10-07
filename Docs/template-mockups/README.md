# Phase A template design review

Historical design studies: the runtime template release is now implemented. See [the implementation report](../TEMPLATE_IMPLEMENTATION_REPORT.md) for current behavior, verification and remaining device checks. The scope statements below describe the initial mockup deliverable.

Open [index.html](index.html) in a browser to compare all five strips and six UI studies. Each strip has a full-size **900 x 2100 SVG and PNG**. UI images are **820 x 1180 portrait** and **1180 x 820 landscape**.

## Delivered

- Classic Wedding: ivory paper, fine gold border, original flowers/leaves, names and date.
- Minimal Clean: white space, serif heading, charcoal text, narrow botanical accents.
- Film Retro: dark surround, sprocket holes, numbered frames, warm labels. Sample colors are unchanged.
- Vintage Polaroid: kraft background, paper mounts, tape and captions rotating with the photo windows.
- Colorful Fun: pastel blocks, heart/flower/camera stickers, large celebratory heading.
- Picker studies: filters, selected border/checkmark/name, separate enlargement action, bottom continuation bar. The portrait image shows the first scroll viewport, with the fifth card below the fold.
- Enlarged preview studies: complete strip, palette description, cancel and explicit selection actions.
- Operator studies: landscape side-by-side form/preview, portrait stacked form/preview, default layout/template and guest availability.

## Scope and provenance

All decorative art and the three sample illustrations were authored directly in `scripts/template-mockups.mjs` for this project. No stock photos, downloaded fonts, external images, libraries, network services, subscriptions, or attribution-dependent assets were added. The user-supplied board remains a visual reference only; its faces were not extracted.

These are static design studies. Their controls do not change settings or capture photos. Sample illustrations are explicitly labeled and are not runtime assets. The full-app renderer, saved gallery, camera, settings, and existing frame/layout IDs are unchanged.

The plan requested the same sample photographs; this initial draft instead uses the same three neutral illustrations, avoiding an unverified stock-photo license. Real-photo crop/face-clearance review remains outstanding. Typography uses installed Georgia/Arial fallbacks; redistributable local font selection is still pending. Optional logo placement, long text, missing fields/assets, keyboard behavior, actual touch interaction, offline capture/export, and real iPad performance are implementation checks, not proven by these mockups.

## Reproduce

From the project root:

```powershell
node scripts/template-mockups.mjs
./scripts/render-template-mockups.ps1
```

The first command regenerates the SVGs and HTML. The second uses a hidden headless Microsoft Edge process to produce the PNGs; pass `-BrowserPath` to select another Chromium executable. On this workstation, Node was supplied by VS Code's bundled runtime with `ELECTRON_RUN_AS_NODE=1` because standalone Node was not on PATH.

## Verification — October 7, 2026

- Generator ran successfully; focused ESLint check exited successfully.
- All eleven SVGs parsed as XML and rendered successfully in headless Edge.
- PNG dimensions checked: five 900 x 2100; three 820 x 1180; three 1180 x 820.
- Visually inspected the combined five-design review and both orientations of picker/operator screens.
- No app build or app regression tests were required or run for this mockup-only deliverable.
- This is the Phase A review draft, not completed Phase B integration or an approved production design. Review the direction before implementing Minimal Clean as specified by the plan.
