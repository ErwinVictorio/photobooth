import { canvasBlob, drawCover, loadImage } from '../images'
import { LIMITS, THEMES } from './protocol'

export async function captureStill(video, mirror) {
  if (!video || video.readyState < 2 || !video.videoWidth) throw new Error('Camera is not ready. Enable your camera and try again.')
  const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale)
  const context = canvas.getContext('2d')
  if (mirror) { context.translate(canvas.width, 0); context.scale(-1, 1) }
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  for (const quality of [0.88, 0.7, 0.5]) {
    const blob = await canvasBlob(canvas, quality)
    if (blob.size <= LIMITS.still) return blob
  }
  throw new Error('Photo is too large. Try another camera.')
}

export async function validatePhoto(blob, kind) {
  const header = new Uint8Array(await blob.slice(0, 3).arrayBuffer())
  if (header[0] !== 255 || header[1] !== 216 || header[2] !== 255) throw new Error('Only JPEG photos are accepted.')
  const image = await loadImage(blob)
  const max = kind === 'still' ? 1600 : 2400
  if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth > max || image.naturalHeight > max) throw new Error('Received image dimensions exceed the limit.')
  return image
}

export async function composeFriends(host, guest, theme) {
  if (host.length !== 3 || guest.length !== 3 || !THEMES[theme]) throw new Error('All six photos are needed.')
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 2000
  const ctx = canvas.getContext('2d'), colors = THEMES[theme]
  ctx.fillStyle = colors.paper; ctx.fillRect(0, 0, 1200, 2000)
  ctx.fillStyle = colors.ink; ctx.textAlign = 'center'; ctx.font = 'bold 48px Georgia'; ctx.fillText('good moments', 600, 105)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const image = await validatePhoto((col === 0 ? host : guest)[row], 'still')
      drawCover(ctx, image, 60 + col * 552, 165 + row * 545, 528, 515)
    }
  }
  ctx.font = '34px Georgia'; ctx.fillText('Together, anywhere.', 600, 1880)
  ctx.font = '22px sans-serif'; ctx.fillText('TWO FRIENDS. ONE LITTLE MEMORY.', 600, 1930)
  return canvasBlob(canvas, 0.92)
}
