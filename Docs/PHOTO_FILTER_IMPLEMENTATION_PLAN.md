# Reusable Photo Filters — Full Implementation Plan

Status: Planning only; no filter feature implemented by this document.

## 1. Goal and reference

Magdagdag ng reusable filter picker na madaling ikabit sa local booth at Friends mode. User chooses a photo look, sees the composed preview, adjusts intensity, and saves/downloads/shares the same filtered output.

The supplied screenshot is a visual reference for a **“Tune the print”** panel: selectable looks beside a photo strip, including a readable “Classic B&W” option and a warm/vintage appearance. Exact color values cannot be recovered from the screenshot; presets will be tuned against representative photos during implementation.

Filters affect **photo pixels only**. Frame colors, borders, paper, logos, stickers, and captions retain their original appearance.

Initial scope:

- One selected preset and intensity for all photos in a local strip.
- A reusable controlled React picker with thumbnail options.
- Reversible editing from untouched original captures.
- Identical filter settings used for preview and final output.
- Friends mode integration with one shared, host-controlled look and both participants approving the updated preview.

Out of scope for the first release: facial tracking, beauty retouching, AR masks, background removal, stickers, paper textures, per-photo filter selection, and user-uploaded LUTs. These can be separate future extensions.

## 2. Current code and integration points

| Existing file | Current role | Planned change |
| --- | --- | --- |
| `src/App.jsx` | Owns captures, composed preview, and saved result | Own local filter selection; regenerate preview from originals; save filter metadata |
| `src/pages/Camera.jsx` | Captures original JPEG photos | Preserve raw captures; optional live preview in a later phase |
| `src/services/images.js` | `composePhoto`, `drawCover`, JPEG export | Add optional filter settings and apply only during photo-slot drawing |
| `src/services/template-renderer.js` | Renders templates | Apply the same photo-only renderer inside existing slot clipping/transforms |
| `src/pages/Friends.jsx` | Friends UI and approval controls | Mount the reusable picker; guests see the host’s shared choice |
| `src/services/friends/session.js` | Capture, synchronization, review, approval | Own/synchronize shared filter state and rebuild review without discarding photos |
| `src/services/friends/photos.js` | Six-photo composition | Accept shared filter settings and render both columns consistently |
| `src/services/friends/protocol.js` | Validates transport and limits | Validate filter messages; handle protocol compatibility |
| `src/services/friends/storage.js` | Restores room credentials/settings | Persist validated shared filter settings alongside room metadata |
| `src/pages/Gallery.jsx` | Shows saved photos and any recomposition paths | Keep old records compatible; reuse saved filter metadata for recomposition where applicable |

Before implementation, inspect every caller of composition functions and every gallery/template export path so no saved/exported image accidentally loses the selected filter.

## 3. User flow

### Local booth

1. User takes photos normally; captures remain unfiltered.
2. Preview page shows the current strip and a **“Tune your photos”** panel.
3. User selects a preset. The selected option has a visible border/check and accessible selected state.
4. An **Intensity** slider appears for non-original presets, from 0–100%.
5. Regenerate the strip from originals. Keep the previous preview visible while the new image renders, with a small “Updating preview…” status.
6. User can choose **Original** at any time to remove the effect.
7. **Use these photos** becomes available only when the newest preview is ready.
8. Gallery thumbnail, download, share, and final result all use that approved Blob.

Desktop: compact panel beside the preview where existing layout permits. Mobile: panel below the preview with horizontally scrollable preset cards and a full-width intensity control. Match the app’s current sage/cream visual style.

### Friends mode

1. Complete the existing three-pose capture and open review.
2. Host selects a shared look; guest sees the selection in read-only mode.
3. Both devices regenerate their previews using the same settings and untouched photos.
4. Every filter change clears both approvals immediately.
5. Approval stays disabled until the latest matching revision is rendered on both devices.
6. Both users approve again. Host exports and sends the final filtered image through the existing final-photo transfer.

Use review-stage editing first to avoid changing timed capture or video transport. Personal filters per participant can be a later enhancement, with explicit rules for host/guest columns.

## 4. Initial presets

Names below are proposed product labels, not an exact transcription of the screenshot.

| Stable ID | Display name | Intended appearance |
| --- | --- | --- |
| `original` | Original | Unchanged photo; intensity control hidden |
| `classic-bw` | Classic B&W | Neutral monochrome with gentle contrast |
| `warm-vintage` | Warm Vintage | Warm tone, slightly muted saturation, lifted dark tones |
| `soft-color` | Soft Color | Softer contrast with natural color |
| `sepia` | Sepia | Brown monochrome, old-print feel |
| `cool-film` | Cool Film | Subtle cool cast and restrained saturation |

Start with these six. Tune numerical parameters visually on light/dark skin tones, indoor lighting, bright backgrounds, and low-light samples. Avoid excessive whitening or crushed shadows. Default new sessions to `original` unless a user explicitly chooses to remember a preference.

## 5. Reusable component contract

Proposed files:

```text
src/components/filters/PhotoFilterPicker.jsx
src/components/filters/PhotoFilterPicker.css
src/components/filters/FilterThumbnail.jsx
src/data/photo-filters.js
src/services/photo-filters.js
src/hooks/useFilteredComposition.js
```

`PhotoFilterPicker` is controlled and presentation-focused. It must not know about rooms, PeerJS, gallery saves, route navigation, or camera permissions.

```jsx
const [filter, setFilter] = useState({
  presetId: 'original',
  intensity: 1,
  version: 1,
})

<PhotoFilterPicker
  value={filter}
  onChange={setFilter}
  sample={photos[0] ?? null}
  disabled={finalizing}
  readOnly={false}
  busy={rendering}
  label="Tune your photos"
/>
```

| Prop | Contract |
| --- | --- |
| `value` | Validated `{ presetId, intensity, version }`; intensity uses 0–1 internally |
| `onChange` | Emits a normalized next value; no direct mutation |
| `sample` | Optional original Blob used for small preset thumbnails |
| `disabled` | Prevent changes during capture/finalization or a parent-defined lock |
| `readOnly` | Displays current selection without allowing edits; useful for guests |
| `busy` | Announces preview rendering; slider may remain usable while rendering |
| `label` | Accessible group title with a sensible default |

No sample: show labeled preset swatches/placeholders. Selecting a filter must still work. Thumbnails are illustrative; the full strip preview is authoritative.

Use native radio controls for preset selection and a labeled native range input for intensity. Support keyboard navigation, visible focus, readable contrast, and roughly 44px touch targets. Do not communicate selection by color alone.

## 6. Shared rendering design

The service layer owns preset definitions, normalization, and pixel rendering. Suggested exports:

```js
normalizePhotoFilter(value)
validatePhotoFilter(value)
renderFilteredPhoto(source, filter, { width, height })
drawFilteredCover(ctx, source, rect, filter)
```

Implementation decision: use one deterministic Canvas/ImageData color transform for the first release. This avoids relying on CSS-only effects or an unverified browser-specific Canvas filter path. Do not add a package unless measured performance requires it.

Pipeline:

1. Decode the original source once where possible.
2. Crop and scale into a temporary photo canvas at the target slot dimensions.
3. For non-original settings, transform its RGB pixels using the preset’s documented operations; preserve alpha.
4. Blend transformed and original RGB by intensity: `output = original * (1 - intensity) + filtered * intensity`.
5. Draw the temporary canvas into the destination photo slot.
6. Draw frame decoration, typography, and other artwork through the existing renderer.

Use `ctx.save()`/`ctx.restore()` around slot rendering. Preserve clipping, slot rotation, crop, mirroring, and existing template draw order. Never apply a filter to the finished full strip, because that would alter its paper and decorations.

`original` and intensity zero should take the existing drawing path. Repeated adjustments always start from original captures, never from a previously filtered JPEG. Apply effects once, then encode the finished image once through the existing `canvasBlob` helper.

Template renderers must keep existing output dimensions and quality behavior. Friends still-image transfer limits and final-image limits remain enforced.

## 7. Preview state and performance

`useFilteredComposition` coordinates asynchronous composition; it does not own selected filter settings.

- Increment a request ID when photos, layout, template, frame, or filter settings change.
- Only the latest request may publish its Blob or error.
- Debounce slider-driven composition by approximately 150ms; preset changes can render immediately.
- Keep the previous preview visible while updating, but prevent it from being approved/exported as the new selection.
- On render failure, show Retry and Original options; do not silently export stale output.
- Revoke object URLs and release decoded images/canvases when replaced or unmounted.
- Render thumbnails at small dimensions and cache only a bounded set for the current sample.
- Compose slots sequentially to avoid allocating all full-resolution intermediate buffers at once.

Measure representative mobile devices before introducing Web Workers or OffscreenCanvas. Target a responsive picker and a sub-second standard preview on a representative phone; treat this as a benchmark goal, not a guarantee before measurement.

## 8. Local booth integration

- Add selected filter state to `App.jsx`, with `original` as the initial value.
- Pass optional `filter` to `composePhoto` and `composeTemplate`; existing callers default to Original.
- Mount the picker on the preview page, after capture.
- Consolidate initial composition and filter-change composition through the same coordinator.
- Include the selected filter in the composition request identity so older work cannot overwrite newer settings.
- Preserve filter selection on retake within the session; reset it when starting a new session unless remembered preferences are explicitly enabled.
- Save `{ presetId, intensity, version }` as `photoFilter` on the gallery record.
- Continue storing original captures unchanged.
- Existing gallery records without `photoFilter` resolve to Original.
- Update any existing gallery recomposition/export path to read the saved metadata. A gallery that only displays final Blobs needs no extra rendering.

## 9. Friends synchronization and consent

Use a distinct **filter revision** rather than the capture generation. Existing `resetCapture()` discards photos, so it must not be called merely to change the review filter.

Suggested message contracts:

```js
{ type: 'filter-update', generation, revision, filter }
{ type: 'filter-rendered', generation, revision }
{ type: 'approve', generation, revision }
```

- Only host may publish a filter update; guest ignores unauthorized changes.
- Validate preset IDs, finite intensity in range, supported version, safe-integer revision, and current capture generation before rendering.
- Reject stale revisions and clear approvals for every accepted update.
- Immediately disable approval while the host’s edit is pending, including before any debounce completes.
- Associate rendered previews and approval messages with the exact revision.
- Finalize only when both devices rendered and approved that revision and no newer edit is pending.
- Rate-limit/debounce filter changes to avoid excessive render work or transport traffic.
- Use a dedicated review recomposition method that retains the six originals and abandons stale asynchronous work.
- Send shared filter settings in admission/reset state so reconnecting participants agree on the room’s selected look.
- Preserve the selected look in room recovery metadata; validate it before restoring. Backward-compatible saved rooms without filter fields resolve to Original.
- Recovery restores room/filter metadata; it does not restore unsaved captures that the current connection recovery discards. Start a fresh capture when originals are unavailable.

Adding revision-aware approval changes protocol behavior. Bump the Friends protocol version and provide a clear “Refresh both devices to use the updated booth” message for mismatched clients, rather than accepting old approval messages.

## 10. Persistence and privacy

- Room recovery stores small filter settings only, alongside existing credentials.
- Do not put photo Blobs or base64 images in localStorage.
- Saved gallery records continue using the existing IndexedDB service.
- An optional remembered local preset can use a separate versioned localStorage key; do not mix it with room credentials. This preference is not required for the first release.
- Explicit room leave/expiry still clears room recovery data.
- Validate stored and network values rather than trusting parsed JSON.
- No server upload, account, or cloud processing is needed for these color filters.

## 11. Implementation phases

### Phase 1 — Reusable foundation

Create the preset registry, normalization/validation helpers, photo-only rendering service, controlled picker, styling, and thumbnail lifecycle handling. Verify that Original preserves the existing rendering path and the picker is usable without a sample.

### Phase 2 — Local preview and export

Integrate the picker into the preview page; add composition coordination; thread filters through legacy and template rendering; persist gallery metadata. Verify filtered download/share matches the approved preview and switching to Original uses untouched captures.

### Phase 3 — Friends review integration

Add host controls, read-only guest selection, revision-based synchronization, approval invalidation, protocol compatibility handling, and saved room filter metadata. Verify both participants approve exactly the same revision.

### Phase 4 — Mobile verification and documentation

Tune presets against representative photos, verify Safari/Android behavior, measure preview latency, update usage guidance, and document the small component integration contract.

### Optional later phase — Live camera preview

If requested, show a filtered live preview before capture. Keep raw capture unchanged and compare preview/export color consistency. CSS video filters may be an approximation; a shared canvas-rendered live preview requires a separately measured rendering budget. Friends remote video remains raw unless an explicit media-processing feature is added.

## 12. Validation plan

Run existing `npm.cmd run lint`, `npm.cmd run build`, template checks, local booth browser checks, and Friends checks as appropriate to the implemented phase.

Add meaningful regression coverage:

| Area | Required checks |
| --- | --- |
| Filter math | Original/zero intensity identity, full B&W neutral RGB, intermediate blending, invalid parameters, alpha preservation |
| Composition | Photo slots change; captions/frame pixels stay unchanged; crops, mirror, clipping, and rotation preserved |
| Local UI | Selection, slider, keyboard use, retake, newest-request wins, error retry, disabled approval while rendering |
| Output | Final Blob and gallery thumbnail reflect approved settings; originals remain unchanged; older records still work |
| Friends | Host-only updates, guest read-only state, stale revision rejection, approval clearing, matching final result, reconnect settings |
| Compatibility | Friendly protocol mismatch; unknown presets/version handled safely |
| Lifecycle | No unreleased object URLs; bounded thumbnail memory; unmount during rendering cannot publish stale state |

Manually test iPhone Safari and Android Chrome with real images. Desktop emulation does not establish actual mobile rendering quality or performance. Include a Messenger app switch during Friends review to verify it does not bypass approval or resurrect an old preview.

## 13. Acceptance criteria

- Picker can be attached using the documented props without importing room or gallery logic.
- All six presets are selectable and Original is the default.
- Intensity is reversible, keyboard accessible, and mobile friendly.
- Filters affect photo pixels only in legacy, template, and Friends output.
- Preview/download/share/gallery agree on the selected settings.
- Original captures remain available for retake/recomposition.
- Rapid changes cannot export an old preview under a new filter label.
- Friends finalization requires both approvals for the newest rendered revision.
- Existing gallery records and valid saved rooms remain readable.
- Required automated checks pass, and real mobile verification is recorded separately.

## 14. Expected deliverables

1. Reusable picker and thumbnail components with existing-app styling.
2. Versioned preset registry and shared photo rendering service.
3. Composition coordination hook and integrations for local/template/Friends flows.
4. Gallery metadata and room-recovery compatibility updates.
5. Revision-aware Friends messages and approval safeguards.
6. Regression checks, mobile verification notes, and a short integration example.

Recommended execution order: complete and verify the local booth implementation before extending Friends synchronization. This produces a reusable rendering foundation that both flows can share.
