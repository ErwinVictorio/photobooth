import { ORIGINAL_FILTER, PHOTO_FILTERS } from '../data/photo-filters'

export function validatePhotoFilter(value) {
  return Boolean(value && value.version === 1 && PHOTO_FILTERS.some(preset => preset.id === value.presetId) && Number.isFinite(value.intensity) && value.intensity >= 0 && value.intensity <= 1)
}
export function normalizePhotoFilter(value) {
  return validatePhotoFilter(value) ? { presetId: value.presetId, intensity: value.intensity, version: 1 } : { ...ORIGINAL_FILTER }
}
export function transformPhotoPixels(data, value) {
  const { presetId, intensity } = normalizePhotoFilter(value)
  if (presetId === 'original' || intensity === 0) return data
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], l = .2126 * r + .7152 * g + .0722 * b
    let nr = r, ng = g, nb = b
    if (presetId === 'classic-bw') nr = ng = nb = (l - 128) * 1.08 + 128
    if (presetId === 'sepia') { nr = .393 * r + .769 * g + .189 * b; ng = .349 * r + .686 * g + .168 * b; nb = .272 * r + .534 * g + .131 * b }
    if (presetId === 'warm-vintage') { nr = (r * .8 + l * .2) * .9 + 24; ng = (g * .8 + l * .2) * .9 + 15; nb = (b * .8 + l * .2) * .85 + 9 }
    if (presetId === 'soft-color') { nr = (r * .88 + l * .12) * .88 + 17; ng = (g * .88 + l * .12) * .88 + 17; nb = (b * .88 + l * .12) * .88 + 17 }
    if (presetId === 'cool-film') { nr = (r * .85 + l * .15) * .95 + 2; ng = (g * .85 + l * .15) * .95 + 8; nb = (b * .85 + l * .15) * .95 + 17 }
    const blend = (original, filtered) => original + (Math.max(0, Math.min(255, filtered)) - original) * intensity
    data[i] = blend(r, nr); data[i + 1] = blend(g, ng); data[i + 2] = blend(b, nb)
  }
  return data
}

// Works inside the caller's clip/rotation. Only the temporary photo is processed.
export function drawFilteredCover(ctx, image, x, y, width, height, value) {
  const filter = normalizePhotoFilter(value)
  const iw = image.videoWidth || image.naturalWidth || image.width, ih = image.videoHeight || image.naturalHeight || image.height
  const ratio = Math.max(width / iw, height / ih), sw = width / ratio, sh = height / ratio
  if (filter.presetId === 'original' || filter.intensity === 0) {
    ctx.drawImage(image, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, width, height); return
  }
  const canvas = document.createElement('canvas')
  const scale = Math.min(2, Math.max(1, Math.hypot(ctx.getTransform().a, ctx.getTransform().b)))
  canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale))
  try {
    const photo = canvas.getContext('2d', { willReadFrequently: true })
    photo.drawImage(image, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height)
    const pixels = photo.getImageData(0, 0, canvas.width, canvas.height)
    transformPhotoPixels(pixels.data, filter); photo.putImageData(pixels, 0, 0)
    ctx.drawImage(canvas, x, y, width, height)
  } finally { canvas.width = canvas.height = 1 }
}
