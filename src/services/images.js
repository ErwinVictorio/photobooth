import { drawFilteredCover } from './photo-filters'
import { formatDate, getFrame, getLayout } from '../data/booth'
import { getTemplate } from '../data/templates'
import { composeTemplate } from './template-renderer'

export function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = source instanceof Blob ? URL.createObjectURL(source) : source
    const release = () => { if (source instanceof Blob) URL.revokeObjectURL(url) }
    image.onload = () => { release(); resolve(image) }
    image.onerror = () => { release(); reject(new Error('This image could not be opened.')) }
    image.src = url
  })
}
export const canvasBlob = (canvas, quality = 0.94) => new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not generate the image. Please try again.')), 'image/jpeg', quality))

export function drawCover(ctx, image, x, y, width, height) {
  const iw = image.videoWidth || image.naturalWidth || image.width
  const ih = image.videoHeight || image.naturalHeight || image.height
  const ratio = Math.max(width / iw, height / ih)
  const sw = width / ratio, sh = height / ratio
  ctx.drawImage(image, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, width, height)
}
export function photoRects(layoutId, width, height) {
  const layout = getLayout(layoutId)
  const pad = width * 0.065, gap = width * 0.028
  const footer = height * (layout.id === 'strip' ? 0.115 : 0.16)
  const w = (width - pad * 2 - gap * (layout.cols - 1)) / layout.cols
  const h = (height - pad * 2 - footer - gap * (layout.rows - 1)) / layout.rows
  return Array.from({ length: layout.count }, (_, i) => ({ x: pad + (i % layout.cols) * (w + gap), y: pad + Math.floor(i / layout.cols) * (h + gap), width: w, height: h }))
}

function leaves(ctx, x, y, scale, color, rotate = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotate); ctx.scale(scale, scale)
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.4
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(26, 44, 9, 98); ctx.stroke()
  for (let i = 0; i < 5; i++) {
    const py = 12 + i * 17
    ctx.save(); ctx.translate(12 + Math.sin(i) * 5, py); ctx.rotate(i % 2 ? -1.05 : 1.05)
    ctx.globalAlpha = 0.55 + i * 0.07
    ctx.beginPath(); ctx.ellipse(0, -11, 6, 17, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  }
  ctx.restore()
}

export function drawFrame(ctx, width, height, frameId) {
  const frame = getFrame(frameId)
  ctx.strokeStyle = frame.accent; ctx.lineWidth = Math.max(1, width * 0.002)
  ctx.strokeRect(width * 0.026, width * 0.026, width * 0.948, height - width * 0.052)
  if (frame.decoration === 'leaves') {
    leaves(ctx, width * 0.028, width * 0.023, width / 530, frame.accent, -0.4)
    leaves(ctx, width * 0.972, height - width * 0.023, width / 530, frame.accent, Math.PI - 0.4)
  }
  if (frame.decoration === 'confetti') {
    const colors = ['#d8a299', '#d6bb79', '#8eac99']
    for (let i = 0; i < 22; i++) {
      ctx.save(); ctx.translate(i % 2 ? width * 0.035 : width * 0.965, (i + 1) / 24 * height); ctx.rotate(i * 0.8)
      ctx.fillStyle = colors[i % 3]; ctx.fillRect(-width * 0.01, 0, width * 0.019, width * 0.008); ctx.restore()
    }
  }
}

export async function composePhoto({ photos, layout: layoutId, frame: frameId, settings, templateId, filter }) {
  if (templateId) {
    const template = getTemplate(templateId)
    if (!template?.layoutIds.includes(layoutId)) throw new Error('Choose a template compatible with this layout.')
    return composeTemplate({ photos, templateId, settings, filter, width: settings.quality === 'standard' ? 630 : 900 })
  }
  const layout = getLayout(layoutId), frame = getFrame(frameId)
  if (photos.length !== layout.count) throw new Error('The photo session is incomplete. Please retake your photos.')
  const scale = settings.quality === 'standard' ? 0.7 : 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(layout.width * scale); canvas.height = Math.round(layout.height * scale)
  const ctx = canvas.getContext('2d'), { width, height } = canvas
  ctx.fillStyle = frame.bg; ctx.fillRect(0, 0, width, height)
  const rects = photoRects(layoutId, width, height)
  for (let i = 0; i < photos.length; i++) {
    const image = await loadImage(photos[i]), r = rects[i]
    drawFilteredCover(ctx, image, r.x, r.y, r.width, r.height, filter)
  }
  drawFrame(ctx, width, height, frameId)
  const last = rects[rects.length - 1], footerY = last.y + last.height
  const footerH = height - footerY
  ctx.fillStyle = frame.ink; ctx.textAlign = 'center'
  const label = settings.showTitle ? settings.eventName.trim() || 'Good Memories' : 'Good Memories'
  let size = width * 0.046
  ctx.font = `italic ${size}px Georgia, serif`
  while (ctx.measureText(label).width > width * 0.78 && size > 12) { size -= 1; ctx.font = `italic ${size}px Georgia, serif` }
  const hasLogo = Boolean(settings.logo)
  if (hasLogo) {
    const logo = await loadImage(settings.logo)
    const box = footerH * 0.25, ratio = Math.min(box * 2 / logo.width, box / logo.height)
    ctx.drawImage(logo, (width - logo.width * ratio) / 2, footerY + footerH * 0.08, logo.width * ratio, logo.height * ratio)
  }
  ctx.fillText(label, width / 2, footerY + footerH * (hasLogo ? 0.58 : 0.45))
  ctx.font = `${width * 0.022}px Arial, sans-serif`
  ctx.fillText(formatDate(settings.eventDate), width / 2, footerY + footerH * (hasLogo ? 0.8 : 0.7))
  return canvasBlob(canvas)
}

export async function thumbnail(blob) {
  const image = await loadImage(blob), canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * Math.min(1, 320 / Math.max(image.width, image.height)))
  canvas.height = Math.round(image.height * Math.min(1, 320 / Math.max(image.width, image.height)))
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.75)
}
export async function readLogo(file) {
  if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.')
  const image = await loadImage(file), canvas = document.createElement('canvas')
  const scale = Math.min(1, 400 / Math.max(image.width, image.height))
  canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale)
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}
