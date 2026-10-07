# Photobooth Template Design Plan

Status: five-template first-release software implemented October 7, 2026. Automated browser checks completed; real-iPad/print acceptance and conditional Phase E remain open. See [implementation report](TEMPLATE_IMPLEMENTATION_REPORT.md).
Reference: the five-template design board supplied in chat on October 7, 2026.

## Execution progress

- [Open the Phase A design review](template-mockups/index.html): five 900 x 2100 strip studies and picker, enlarged-preview, and operator-setup studies at 820 x 1180 and 1180 x 820.
- Editable SVG sources and rendered PNGs are available in `Docs/template-mockups/`; reproduction and verification notes are in [the mockup README](template-mockups/README.md).
- The first draft uses the same three original, labeled sample illustrations in all designs. This deliberately substitutes for sample photographs pending real-photo crop review; it does not complete photographic acceptance testing.
- All artwork is original vector geometry, with installed serif/sans fallbacks and no new dependency or paid service. These studies are not runtime templates or transparent overlay files.
- Phases B/C: versioned registry, local font, shared composer, rotated/clipped windows, all five designs, filters and enlarged preview are implemented.
- Phase D software: operator text/date/logo/captions, availability/default validation, uncropped new captures, session metadata, old-gallery compatibility and offline asset caching are implemented and tested.
- Real iPad Safari, physical photographic crop/face review, long-event soak and printer validation remain hardware acceptance gates. Phase E remains the explicitly conditional extension after first-pack stability; the first delivery keeps other layouts on their existing frames.

## User-provided sample UI

Original reference image: [Five Photobooth Templates Gallery.png](<Five Photobooth Templates Gallery.png>).

![User-provided sample UI showing Classic Wedding, Minimal Clean, Film Retro, Vintage Polaroid, and Colorful Fun templates, selection screens, and color palettes](<Five Photobooth Templates Gallery.png>)

Use this board as the visual reference for the five template designs, selection cards, selected states, and palettes. The image is preserved unchanged; implementation details and free-only requirements are specified below.

Related full-app reference: [Pastel Photobooth App Storyboard.png](<Pastel Photobooth App Storyboard.png>).

**User requirement:** Any additional library must be free to use for this commercial photobooth, with no required subscription, paid API, credits, or trial expiry. The design and implementation workflow must have a complete free path.

## 1. Recommended direction

Build a curated template system using designed artwork plus the existing Canvas composer. Start with five three-photo-strip templates matching the reference. Keep the botanical booth interface consistent while the finished photo design changes with the selected template.

A template should define its own background, photo windows, decorations, text areas, colors, and typography. It is more than the current frame color or border style.

Recommended production workflow:

1. Create accurate layouts and reusable vector elements directly in SVG/code. Figma is an optional authoring tool only if the required workflow is available without payment.
2. Prepare botanical artwork, paper textures, tape, and illustrated stickers as separate image assets using original artwork or assets licensed for the intended use. Paid AI generation or credits are not part of the required workflow.
3. Clean transparency and masks in Photopea when needed.
4. Export final local assets, with explicit photo-window coordinates recorded in template metadata.
5. Render the template through Canvas for the picker sample, captured-photo preview, and final JPEG.

The design tools are authoring tools only. The running booth uses bundled files and does not require a design-service login, network connection, or image-generation API.

## 2. Five initial designs

| Template | Art direction | Suggested construction | Editable content |
| --- | --- | --- | --- |
| Classic Wedding | Ivory, sage, muted gold; flowers at corners; generous name area | Cream base, thin vector border, transparent botanical overlay | Couple/event name, date, optional logo |
| Minimal Clean | White, charcoal, soft gray; restrained greenery and large whitespace | Mostly vector geometry; small botanical accent; separate header/footer text | Heading, event date, footer caption |
| Film Retro | Black film surround, sprocket holes, warm neutral labels, small doodles | Vector film structure, subtle texture, transparent doodles | Footer message and date |
| Vintage Polaroid | Warm kraft paper, taped and slightly rotated white photo mounts | Paper background, per-slot rotation and clipping, tape/floral overlays | Short caption per photo, event/date footer |
| Colorful Fun | Pastel pink, coral, yellow, sky blue, lavender; sticker accents | Vector color blocks plus transparent illustrated stickers | Main message, event name/date |

Film Retro should not automatically recolor guest photos. A warm photo filter would be a separate, explicit option in a later editing phase.

Create one polished palette per template first. Additional palettes should be authored variants, especially where raster artwork is involved; recoloring the whole output would also alter skin tones and photographs.

## 3. Tools and alternatives

| Tool | Recommended role | Tradeoff |
| --- | --- | --- |
| Figma | Master dimensions, component alignment, SVG/PNG asset export | Good default for precise and reusable layouts; does not automatically produce the app's photo-slot metadata |
| Photopea | Layer masks, transparent cutouts, paper/tape cleanup | Useful for preparing raster artwork and inspecting alpha transparency |
| Canva | Fast operator-created event decoration and design drafts | Good optional authoring path; PNG transparent-background export has plan restrictions. Do not make it a runtime requirement |
| Native SVG + Canvas | Lines, film holes, color blocks, positioning, clipping, text, final export | Best fit for this app's current implementation; requires authored template metadata |
| Optional AI image generation | Isolated flowers, paper textures, decorative sticker sets | Useful for artwork exploration; exact slot geometry, dates, and guest names should be defined separately |

The tool comparison above describes possible authoring roles, not required purchases. The free-only requirement takes priority: skip premium exports, paid asset packs, subscriptions, and paid generation features. Canva transparent export and AI generation must not be dependencies of this plan.

### Free library policy and default stack

The first template release should add **no new library** unless a concrete need appears. Use the existing React/Vite project with native CSS, SVG, Canvas, IndexedDB, and browser APIs for selection, composition, storage, and offline behavior.

| Need | Initial choice | Additional paid service required |
| --- | --- | --- |
| Template cards, filters, dialog, responsive layout | Existing React components and CSS | No |
| Icons and decorative geometric elements | Local SVG artwork | No |
| Photo crop, rotation, layers, text, JPEG export | Native Canvas API | No |
| Template registry and settings | Local JavaScript data and existing storage | No |
| Transitions and selected states | CSS transitions; respect reduced motion | No |
| Offline assets | Existing service worker and bundled files | No |

Before adding any future library, verify its exact version's license allows the intended commercial use and distribution, retain required license notices, and check that the needed feature is not restricted to a paid edition. Prefer a maintained permissively licensed package, and record its purpose, license, and alternative in this document. Do not install a new package merely for template decoration.

Apply the same rule to fonts, illustrations, textures, stickers, and sample photos: use original work or assets with suitable usage rights and no required purchase. Keep license/attribution information with downloaded assets. Bundle runtime assets locally so the booth can operate offline. This requirement concerns software and design dependencies; printer consumables and optional hosting/domain costs are separate.

Keep event text out of decorative raster files so names and dates remain editable. Use locally bundled fonts with suitable redistribution rights. Test actual font files before finalizing script-font choices; use a legible serif/sans fallback if a font fails to load.

Official references checked for this proposal:

- [Figma export documentation](https://help.figma.com/hc/en-us/articles/360040028114-Export-from-Figma)
- [Photopea masks documentation](https://www.photopea.com/learn/masks)
- [Canva transparent-background export](https://www.canva.com/help/transparent-background/)

## 4. Asset package and rendering order

Each template variant should contain:

```text
public/templates/classic-wedding/strip-v1/
  background.png       # optional texture; a solid color can replace it
  overlay.png          # transparent ornamentation above the photos
  thumbnail.jpg        # generated by the same composer

src/data/templates.js  # dimensions, assets, slots, text areas, palette, version
public/fonts/           # bundled font files used by the templates
```

Use optimized PNG where transparency is needed. Simple shapes can be drawn by Canvas or supplied as self-contained SVG. SVG assets must not depend on external fonts/images. Maintain editable source artwork separately from runtime exports.

Render order:

```text
Background color / texture
  -> Photo mount shadows and paper shapes
  -> Captured photos, clipped and transformed per slot
  -> Decorative overlay: flowers, tape, borders, stickers
  -> Event text, captions, date, and logo
  -> Final JPEG and thumbnail
```

The overlay must have real transparent photo windows. A white rectangle or checkerboard painted into an image is not transparency. The supplied design board is a visual reference, not a ready-to-use overlay: it already includes sample faces, labels, and preview UI.

## 5. Template metadata

Store these fields explicitly:

- Stable template ID, version, display name, category, thumbnail, supported layout IDs.
- Reference canvas width/height and export background color.
- Asset paths and font dependencies.
- Photo slots: center/position, width, height, rotation, corner radius, photo index, and crop rule.
- Text boxes: source field, bounds, font, color, alignment, min/max font size, line limit, and overflow behavior.
- Optional logo box and supported palette variants.

Use a reference coordinate system and scale all positions consistently. Vintage Polaroid requires rotation around each slot's center; tape and the white mount must follow the same transform. Rotating only a CSS preview will not rotate the exported image.

Text fitting must be bounded. Long names should wrap or reduce font size within a tested minimum, with visible validation if they still do not fit. Wait for local fonts and assets before rendering; show a recoverable error instead of exporting an incomplete design.

## 6. Integration with the current app

Baseline code inspected before implementation (see the implementation report for current changes):

- `src/data/booth.js`: four layouts and six procedural frames.
- `src/services/images.js`: generic regular photo slots, frame decoration, fixed footer text.
- `src/components/BoothArt.jsx`: a separate sample renderer.
- `src/pages/Camera.jsx`: capture cropped to the first generic slot's aspect ratio.
- `build/offline-plugin.js`: explicit static precache list plus bundled build files.

Required evolution:

1. Introduce a template registry while retaining existing frame/layout IDs for compatibility.
2. Resolve the selected layout and template into one complete render specification.
3. Make picker samples and final-photo previews use the same layout, decorations, and font rules as export.
4. Add rotated/clipped slots, configurable text boxes, and layered artwork to the composer.
5. For future sessions, retain uncropped camera originals and apply template crops during composition. Current captures are already cropped; do not promise recovery of image areas absent from existing originals.
6. Show the actual selected slot's crop in the camera framing guide, including differences between slots if applicable.
7. Persist template ID/version with new sessions. Keep stored final JPEGs and existing gallery records unchanged.
8. Add all template assets and fonts to production precaching and version hashing. The current explicit cache list will not automatically include new public template folders.
9. Decode assets for the selected template on demand and release temporary resources between sessions to control iPad memory use.

No new backend or database service is required. A drag-and-drop canvas library is unnecessary for the curated first release; reconsider one only if an operator-facing freeform editor becomes a confirmed requirement.

## 7. Template-picker experience

Preserve the existing flow:

```text
Choose layout -> Choose template -> Camera -> Preview -> Save
```

- Rename the guest-facing frame selection to **Choose a template** when richer templates are available.
- Show large sample thumbnails, a clear selected border/checkmark, and the template name.
- Initial filters: **All / Wedding / Minimal / Retro / Fun**. Vintage Polaroid belongs under Retro. Add Seasonal only when it has real templates.
- Filter templates by supported layout before allowing selection.
- Offer a larger preview before capture so the guest understands crops and decorative overlaps.
- Keep event text/logo customization in operator setup; guests only choose the design.
- Use neutral or clearly marked sample imagery in picker thumbnails; never accidentally export those sample photos into a guest result.

For the first delivery, provide the five new designs only for the three-photo strip. Existing frames remain available for single, double, and grid. Each later layout variant needs a deliberate art layout, not a stretched strip.

### UI idea: visual direction

Use the supplied five-template board for thumbnail presentation and the existing botanical storyboard for the surrounding app. Keep a cream background (`#F8F5EF`), sage primary buttons (`#6F8062`), dark-green text (`#3F5140`), warm-beige borders (`#EADFCF`), and restrained gold accents (`#B98D57`). Template artwork can be colorful or dark while navigation stays visually consistent.

- Serif screen headings, readable sans-serif controls, and script fonts only inside templates where appropriate.
- Rounded cards of approximately 20 px, light shadows, and clear spacing around each strip.
- All interactive targets at least 48 x 48 CSS pixels; primary actions approximately 60 px tall.
- Selected cards use a sage border, checkmark, and a visible selected label, not color alone.
- Keyboard focus, accessible selection states, sufficient text contrast, and reduced-motion support.

### UI idea: Choose a template

```text
[Back]              Choose a template             [Home]
               A little style for your memories.

        Layout  ->  Template  ->  Capture  ->  Preview

       [All] [Wedding] [Minimal] [Retro] [Fun]

       [large strip preview]   [large strip preview]
       Classic Wedding         Minimal Clean
       [Selected checkmark]    [View larger]

       [large strip preview]   [large strip preview]
       Film Retro              Vintage Polaroid

       [large strip preview]
       Colorful Fun

       Classic Wedding selected       [Continue ->]
```

On iPad portrait, use two columns so details remain legible; allow scrolling for the remaining cards. On a wide landscape/desktop screen, use up to five columns when cards remain large enough. On narrow phones, keep two columns only if controls and previews fit; otherwise use one. Avoid compressing all five designs into tiny thumbnails just to fit a single row.

Use a bottom action bar with the selected template name and Continue button. Reserve content space beneath it and include the device safe-area inset so the last card is never hidden. Continue requires a compatible selected template. Filtering must not silently choose a different template; keep the current selection named in the action bar even when its card is filtered out.

Each card has a selection control and a separate View larger control; do not nest interactive buttons. Enlarging an unselected template must not change the current selection until the guest presses Use this template.

### UI idea: enlarged template preview

```text
Classic Wedding                                  [Close]

                [large complete photo strip]

           Ivory / Sage / Gold     3-photo strip
                    Sample photos

            [Back to templates] [Use this template]
```

Show the entire strip without cropping its artwork. A close/cancel action retains the previous selection. Use a dialog on larger displays and a full-height dialog on small displays, with focus contained inside and restored on close. Show palette swatches as descriptive labels initially; make them interactive only after real palette variants exist.

### UI idea: camera, review, and final result

- Camera: show the selected template name, shot count, and framing guide. Keep decorations away from the live face area; show a small strip progress preview beside or below the live feed where space permits.
- Review: make the finished strip the main focus, with **Retake photos** and **Use these photos** as the two primary choices. Render the same crop, text, and artwork that will be exported.
- Result: show the finished image with **Save to Device**, supported **Share Photo**, **Print Photo**, and **Take Another**. Retain the local-save success/error state. Do not add a QR block to this local-only release.

### UI idea: operator template setup

```text
Event setup

[Event name                  ]   [Live template preview]
[Event date                  ]   [Names/date/logo shown]
[Upload logo] [Remove logo]       [Actual output ratio ]
[Default layout              ]
[Default template            ]

Available guest templates
[x] Wedding  [x] Minimal  [x] Film  [x] Polaroid  [x] Fun

                          [Save & start booth]
```

Use a two-column form/preview arrangement on landscape tablets, stacked on portrait or narrow screens. Preview changes locally while editing, but persist them only on Save. Add guest-template availability controls as part of the template integration; at least one compatible template must remain enabled for every offered layout, and the default must be enabled. Display long-text, incompatible-layout, and missing-asset errors beside the affected field before the operator starts the booth.

## 8. Dimensions and print boundary

The existing high-quality strip is **900 x 2100 pixels**, a **3:7** aspect ratio. Use that size for the initial digital templates to preserve current behavior.

A physical **2 x 6 inch** strip is **1:3**, so it needs a separate composition. At a target 300 pixels per inch, that is **600 x 1800 pixels**. Do not silently resize a 3:7 design into 1:3: it would stretch, crop, or require padding.

Before making print-specific artwork, establish the printer model, media, required cut/bleed/safe margins, and whether a larger sheet contains duplicate strips. Pixel dimensions alone do not guarantee the browser prints at the intended physical size.

## 9. Delivery phases

### Phase A — Approve visual direction

Produce five static full-size strip mockups using the same sample photographs, plus UI mockups for the template picker, enlarged preview, and operator setup at iPad portrait and landscape sizes. Review decorative density, crop, typography, footer space, and palette side by side. Finalize names and master dimensions. Use the free authoring path described above.

### Phase B — Build one complete vertical slice

Implement Minimal Clean first: registry, local fonts, accurate slot positioning, configurable text, identical sample/export rendering, and offline assets. Validate it end to end before expanding the pack.

### Phase C — Complete the five-template pack

Add Classic Wedding, Film Retro, Colorful Fun, then Vintage Polaroid. Implement and verify rotations/clipping before completing the last design. Add the picker filters and enlarged preview.

### Phase D — Event customization and release checks

Wire event names/date/logo into supported text areas; validate long names and missing assets. Confirm compatibility with saved sessions, offline reload, gallery saving, and actual iPad output.

### Phase E — Extend after the first pack is stable

Author single/double/grid variants, more palettes, and optional imported custom frame packages. A custom package needs both artwork and photo-slot metadata; uploading a PNG alone cannot reliably describe where photos belong.

## 10. Acceptance criteria

- All five templates match the approved direction at full output size.
- Preview and exported image share crop, rotation, decoration, text positioning, and font.
- Transparent windows reveal only the correct captured photo; no sample faces or placeholder text appear in export.
- Decoration does not unexpectedly cover the main face area; thumbnail and full-size review both pass.
- Long event names, dates, logos, and absent optional fields fit without overlap or clipping.
- Single/double/grid retain their existing behavior until dedicated new variants are introduced.
- Existing gallery records remain readable and are not regenerated or relabeled.
- Every template works after offline reload, including local typography.
- Assets/fonts failing to load expose retry or a clearly identified fallback before saving.
- Repeated capture/export on a real iPad remains responsive with no accumulating image resources.
- Print claims are made only after testing the selected paper/printer configuration.
- All added libraries and required assets follow the free-only policy, with documented licenses and no paid runtime dependency.
- Picker, enlarged preview, and operator setup follow the UI ideas above; touch targets, selection persistence, cancel behavior, validation, and responsive layouts are checked.

## Next release gate

The five **900 x 2100** template implementations and local automated checks are complete. Review the running pack on the target iPad with actual photographs, verify camera/Share Sheet/offline relaunch and a long-event soak, then establish the printer/media requirements before print-specific artwork or the conditional Phase E extension. Details and reproducible checks are in [TEMPLATE_IMPLEMENTATION_REPORT.md](TEMPLATE_IMPLEMENTATION_REPORT.md).
