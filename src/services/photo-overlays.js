import { loadImage } from './images'

export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value))
export function normalizeOverlay(value) {
  if (!value || !['text', 'sticker', 'image'].includes(value.type)) return null
  if (value.type === 'image' && !/^data:image\/png;base64,/.test(value.src || '')) return null
  return { id: String(value.id), type: value.type, text: String(value.text || '').slice(0, 40), src: value.type === 'image' ? value.src : undefined, x: clamp(Number.isFinite(value.x) ? value.x : .5), y: clamp(Number.isFinite(value.y) ? value.y : .5), size: clamp(Number.isFinite(value.size) ? value.size : .15, .06, .45), rotation: clamp(Number.isFinite(value.rotation) ? value.rotation : 0, -180, 180), color: /^#[a-f0-9]{6}$/i.test(value.color || '') ? value.color : '#ffffff' }
}
export async function loadOverlayImages(overlays) {
  const images = new Map()
  try {
    for (const overlay of overlays || []) if (overlay.type === 'image' && !images.has(overlay.src)) images.set(overlay.src, await loadImage(overlay.src))
    return images
  } catch (error) { images.forEach(image => { image.src = '' }); throw error }
}
export function drawPhotoOverlays(ctx, overlays, x, y, width, height, images = new Map()) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip()
  for (const input of overlays || []) {
    const item = normalizeOverlay(input)
    if (!item) continue
    ctx.save(); ctx.translate(x + item.x * width, y + item.y * height); ctx.rotate(item.rotation * Math.PI / 180)
    if (item.type === 'image') {
      const image = images.get(item.src)
      if (image) { const w = width * item.size, h = w * image.naturalHeight / image.naturalWidth; ctx.drawImage(image, -w / 2, -h / 2, w, h) }
    } else {
      ctx.font = `${item.type === 'text' ? 'bold ' : ''}${width * item.size}px Arial, sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = item.color
      ctx.strokeStyle = '#182016'; ctx.lineWidth = Math.max(1, width * .003); ctx.lineJoin = 'round'
      ctx.strokeText(item.text, 0, 0); ctx.fillText(item.text, 0, 0)
    }
    ctx.restore()
  }
  ctx.restore()
}
export async function drawDecoratedCover(ctx, image, x, y, width, height, filter, overlays, drawPhoto) {
  const images = await loadOverlayImages(overlays)
  try { drawPhoto(ctx, image, x, y, width, height, filter); drawPhotoOverlays(ctx, overlays, x, y, width, height, images) }
  finally { images.forEach(image => { image.src = '' }) }
}
