# Photo filter implementation

## Delivered behavior

Local preview now offers six presets with intensity controls: Original, Classic B&W, Warm Vintage, Soft Color, Sepia, and Cool Film. Original is the default. Filter changes regenerate the strip from untouched captures; frame, logo, paper, and captions keep their colors. Changing to Original removes the effect. Retakes retain the selection; starting another local session resets it.

The newest completed preview is required before **Use these photos**. Downloads, native sharing, gallery thumbnails, and print use the approved final Blob. Filter metadata is saved alongside the existing originals. Older gallery images remain displayable without metadata.

Friends review uses the same component and rendering service. Host changes propagate to the guest, invalidate both approvals immediately, and require a matching rendered revision on both devices before approval. Edits retain all six captures. The guest sees read-only controls. Final transfer still sends one identical JPEG to both devices.

Room recovery persists validated filter settings. Older saved rooms without those settings default to Original. Photo captures themselves are not stored in room recovery. Friends protocol version is now 2; mixed versions receive a refresh message. An incompatible unadmitted connection cannot end an existing host session.

## Attach the reusable picker

```jsx
import { useState } from 'react'
import PhotoFilterPicker from '../components/filters/PhotoFilterPicker'
import { ORIGINAL_FILTER } from '../data/photo-filters'

function PhotoEditor({ photos, finalizing }) {
  const [filter, setFilter] = useState(ORIGINAL_FILTER)
  return <PhotoFilterPicker
    value={filter}
    onChange={setFilter}
    sample={photos[0]}
    disabled={finalizing}
  />
}
```

Optional props: `readOnly`, `busy`, and `label`. The picker emits `{ presetId, intensity, version }`; intensity is 0–1. It does not own camera, route, storage, or transport state. Thumbnail samples are optional. Native radio and range inputs provide keyboard controls and selected state.

Pass the value as `filter` to `composePhoto` or `composeTemplate`, or as the fourth argument to `composeFriends`. All callers default to Original when the argument is absent or invalid. For custom renderers, use `drawFilteredCover(ctx, image, x, y, width, height, filter)` inside your existing clipping and transforms.

`useFilteredComposition(renderCallback, enabled, originals)` handles debouncing, stale asynchronous results, preview errors, and retries. Use a stable callback, bind export/approval to its `ready` flag, and pass the original captures as the source identity. It keeps the previous preview during filter edits, but never enables exporting an old image under new settings.

## Rendering and resource lifecycle

Presets use deterministic Canvas/ImageData RGB transforms. Intensity blends transformed and original pixels; alpha is preserved. Original/zero intensity draws directly. Only each photo's cropped intermediate canvas is processed. No new package, cloud processing, or media permission is required.

Preset thumbnails are bounded to six small canvases for the mounted picker. Their temporary image URLs are released by the existing image loader; decoded image sources are cleared after use. Intermediate photo canvases are released after drawing. Full composition is sequential and slider changes are debounced by 150ms.

Local booth now also has live camera filters and draggable text/sticker/image decorations. See [live-stage integration](LIVE_PHOTO_STAGE_IMPLEMENTATION.md). Friends controls remain on the review screen. Skin retouching and AR masks remain outside this release.

## Verification

Current run: lint, production build, and `test:filters` passed. The browser tool reported no connected browser. The template headless runner failed before executing its checks with `Browser command timed out: Runtime.enable`; the Friends headless runner also stalled and was stopped. Browser regression additions are present but are not claimed as passed.

- `npm.cmd run test:filters`: checks Original/zero identity, grayscale, alpha, intensity interpolation, invalid values, unchanged source pixels, cover crop, saved-room compatibility, host authority, approval invalidation, and stale revision rejection.
- Template browser fixture now checks monochrome photo slots while preserving logo/paper colors in all five templates.
- Friends browser regression now changes the review look, verifies approval clearing and preserved captures, rejects an outdated approval, and checks matching final-image hashes.
- Browser test debugger connections and commands now have bounded timeouts to report stalled connections.

Actual iPhone Safari / Android Chrome appearance, keyboard interaction, preview latency, and Messenger app-switch testing remain required. Automated protocol/color checks do not establish real-device rendering performance. Check the task completion report for the checks that ran successfully in the current environment.

No public deployment is performed by these changes.
