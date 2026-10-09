# Live photo stage

## Behavior

The local camera screen now shows **Live camera filters** before capture. Open **Stickers, text & images** to add text, heart/star/flower/smile stickers, or a local image. Select and drag an element on the camera. Size, rotation, color, text, and Remove controls apply to the selected element. Arrow keys move focused elements; Shift increases the step. Touch dragging uses pointer capture and does not scroll the page while dragging an element.

The shutter is directly below the camera, above the editing panels. Live processing is bounded to a 640-pixel longest side and approximately 15 frames per second. The final image retains the existing export resolution. These are rendering bounds, not a guarantee of measured phone performance.

Settings lock for the entire countdown/capture sequence. Image preparation blocks the shutter until it completes. One decoration arrangement is applied to all shots in the sequence. Position, size and rotation remain relative to the photo slot, so exports and live views use the same crop and arrangement at different sizes. Camera mirroring affects only camera pixels; text and stickers stay readable.

Raw captured JPEGs remain untouched. The final composition applies the selected filter once, then draws decorations, then the existing frame artwork. `photoOverlays` stores per-shot snapshots alongside `photoFilter` and `originals` in gallery records. Changing a filter on the review screen regenerates from raw originals without filtering sticker colors or doubling the effect. Retaking keeps the current live selection; a new session clears decorations and resets the filter.

Gallery sharing, downloads and printing use the final decorated Blob. Existing records/callers without overlay metadata retain their original behavior. Local image decorations are resized through the existing bounded image reader and kept on this device; no server upload occurs.

## Reusable components

`src/components/live/LivePhotoStage.jsx` owns the layered display and drag interactions. Its video ref is externally controlled, so the caller continues to own media permissions and track cleanup.

```jsx
<LivePhotoStage
  videoRef={videoRef}
  ready={cameraReady}
  mirror={frontCamera && mirrorEnabled}
  ratio={photoSlot.width / photoSlot.height}
  filter={filter}
  overlays={overlays}
  selectedId={selectedId}
  onSelect={setSelectedId}
  onChange={setOverlays}
  disabled={capturing}
  onError={setError}
>
  {/* Countdown, connection notices, and badges */}
</LivePhotoStage>
```

`LiveOverlayControls` is a companion editor. Pass the same overlay selection/state, a `disabled` flag, and `onBusy` to block capture while preparing an uploaded image. There is a limit of 12 elements; text is limited to 40 characters.

Element model:

```js
{
  id: 'unique-id',
  type: 'text', // text, sticker, image
  text: 'Hello!',
  x: 0.5, y: 0.5, // normalized center, 0–1
  size: 0.08,     // font/image width relative to photo width, 0.06–0.45
  rotation: 0,   // degrees, -180–180
  color: '#ffffff',
  // image elements use src: a local PNG data URL
}
```

`src/services/photo-overlays.js` provides validation/normalization, image loading and the shared Canvas overlay renderer. Legacy and template composition receive `overlays`, indexed by original photo index. Their slot crop, clipping and rotation remain intact. Overlay image caches and animation frames are released when the stage unmounts; moving an image does not decode it again.

## Verification and limits

`npm.cmd run test:filters` includes normalized position/size, clipping, rotation, local-image validation, aspect-preserving image sizing, and immutable settings checks alongside filter/protocol regressions. The template browser fixture also checks image decorations stay colored over B&W photo slots in rotated and regular templates.

No browser is connected in the current environment; actual live preview, touch gestures, Safari camera behavior and mobile performance need device verification. The previously attempted headless browser suite was blocked at debugger initialization. Browser pixel/interaction additions are not claimed as passed.

This live editor is integrated into **local booth**. Friends continues to use synchronized post-capture filters; live decoration transport would need a separate protocol/media integration. There is no facial tracking, background removal, independent per-shot editor, or freeform layer reorder UI.

These are local source changes. Deploy the new build to see them on the public Vercel link.
