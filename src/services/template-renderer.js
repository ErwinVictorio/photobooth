import { drawFilteredCover } from './photo-filters'
import { getTemplate } from '../data/templates'
import { formatDate } from '../data/booth'
import { canvasBlob, loadImage } from './images'

let fontPromise
export function templateFonts() {
  if (!fontPromise) fontPromise = (async () => {
    const font = new FontFace('BoothSerif', 'url(/fonts/CormorantGaramond.ttf)', { weight: '300 700' })
    try { await font.load(); document.fonts.add(font) } catch { fontPromise = null; throw new Error('Template font could not load. Reconnect and retry; no incomplete image was saved.') }
  })()
  return fontPromise
}
function leaf(ctx, x, y, scale = 1, rotation = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.scale(scale, scale)
  ctx.strokeStyle = '#788465'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(45, -130, 8, -290); ctx.stroke()
  for (let i = 0; i < 7; i++) { ctx.save(); ctx.translate(i % 2 ? 0 : 33, -30 - i * 33); ctx.rotate(i % 2 ? -.7 : .7); ctx.fillStyle = i % 2 ? '#9da787' : '#728466'; ctx.beginPath(); ctx.ellipse(0, 0, 13, 33, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
  ctx.restore()
}
function flower(ctx, x, y, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale)
  for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.fillStyle = '#fff8e7'; ctx.strokeStyle = '#dec99f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -30, 14, 30, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke() }
  ctx.fillStyle = '#cda968'; ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill(); ctx.restore()
}
function shape(ctx, path, fill) { ctx.fillStyle = fill; ctx.fill(new Path2D(path)) }
function background(ctx, t) {
  ctx.fillStyle = t.bg; ctx.fillRect(0, 0, 900, 2100)
  if (t.id === 'classic-wedding') { ctx.strokeStyle = '#cda968'; ctx.lineWidth = 3; ctx.strokeRect(35, 35, 830, 2030); ctx.lineWidth = 1; ctx.strokeRect(49, 49, 802, 2002) }
  if (t.id === 'film-retro') {
    ctx.fillStyle = '#f3ead6'
    for (let y = 40; y < 2070; y += 98) for (const x of [30, 832]) { ctx.beginPath(); ctx.roundRect(x, y, 38, 55, 7); ctx.fill() }
  }
  if (t.id === 'vintage-polaroid') {
    ctx.fillStyle = '#997750'; ctx.globalAlpha = .15
    for (let i = 0; i < 400; i++) { ctx.beginPath(); ctx.arc(i * 137 % 900, i * 251 % 2100, i % 3 + 1, 0, Math.PI * 2); ctx.fill() }
    ctx.globalAlpha = 1
  }
  if (t.id === 'colorful-fun') {
    shape(ctx, 'M0 0H900V175Q560 300 400 140T0 210Z', '#ffdc7c')
    shape(ctx, 'M0 630Q220 650 70 1000T160 1560L0 1800Z', '#a3cfe1')
    shape(ctx, 'M900 700Q740 900 870 1350T650 2100H900Z', '#c6b0df')
  }
}
function decoration(ctx, t) {
  if (t.id === 'classic-wedding') { leaf(ctx, 50, 360, 1, -.17); leaf(ctx, 845, 1745, 1, Math.PI); leaf(ctx, 60, 2030, .8); flower(ctx, 65, 75, 1.3); flower(ctx, 845, 2020, 1.3); flower(ctx, 65, 1950, .85) }
  if (t.id === 'minimal-clean') { leaf(ctx, 47, 650, .7); leaf(ctx, 852, 1810, .55, Math.PI) }
  if (t.id === 'vintage-polaroid') { flower(ctx, 70, 610, .8); leaf(ctx, 42, 2030, .8, -.14) }
  if (t.id === 'colorful-fun') {
    flower(ctx, 790, 200, .85); shape(ctx, 'M55 1090c-95-60-45-135 0-85 45-50 95 25 0 85', '#ff957d')
    ctx.save(); ctx.translate(805, 1260); ctx.rotate(.24); ctx.fillStyle = '#a3cfe1'; ctx.strokeStyle = '#fff8ef'; ctx.lineWidth = 12; ctx.beginPath(); ctx.roundRect(-55, -35, 110, 80, 15); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#304677'; ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  }
}
export function fitText(ctx, value, box) {
  const valueText = String(value || '').trim()
  if (!valueText) return null
  for (let size = box.maxSize; size >= box.minSize; size--) {
    ctx.font = `${size}px ${box.font}`
    const lines = ['']
    for (const word of valueText.split(/\s+/u)) {
      const candidate = lines.at(-1) ? `${lines.at(-1)} ${word}` : word
      if (ctx.measureText(candidate).width <= box.width) lines[lines.length - 1] = candidate
      else if (lines.at(-1)) lines.push(word)
      else lines[0] = word
    }
    if (lines.length <= box.lines && lines.length * size * 1.15 <= box.height && lines.every(line => ctx.measureText(line).width <= box.width)) return { size, lines }
  }
  throw new Error(`${box.field === 'eventName' ? 'Event name' : box.field === 'eventDate' ? 'Event date' : 'Caption'} is too long for this template. Shorten it in Event setup.`)
}
function drawText(ctx, value, box, color) {
  const fit = fitText(ctx, value, box)
  if (!fit) return
  ctx.font = `${fit.size}px ${box.font}`; ctx.fillStyle = color; ctx.textAlign = box.align; ctx.textBaseline = 'middle'
  fit.lines.forEach((line, i) => ctx.fillText(line, box.x + box.width / 2, box.y + box.height / 2 + (i - (fit.lines.length - 1) / 2) * fit.size * 1.15))
}
const fixedBox = (y, maxSize = 26) => ({ field: 'heading', x: 120, y, width: 660, height: 80, minSize: 24, maxSize, lines: 1, font: 'BoothSerif', align: 'center' })
export async function validateTemplate(t, settings) {
  await templateFonts()
  const ctx = document.createElement('canvas').getContext('2d')
  for (const box of t.texts) fitText(ctx, fieldValue(box.field, settings), box)
  if (t.id === 'colorful-fun') fitText(ctx, settings.mainMessage, fixedBox(65, 65))
  if (t.id === 'vintage-polaroid') for (let i = 0; i < 3; i++) fitText(ctx, settings.photoCaptions?.[i], { ...fixedBox(0, 36), field: 'photo caption', width: 600, height: 65 })
  if (settings.logo) { const image = await loadImage(settings.logo); image.src = '' }
}
function fieldValue(field, settings) {
  if (field === 'eventDate') return formatDate(settings.eventDate)
  if (field === 'eventName') return settings.showTitle ? settings.eventName : ''
  return settings[field] || ''
}
export async function composeTemplate({ photos, templateId, settings, width = 900, sample = false, filter }) {
  const t = getTemplate(templateId)
  if (!t) throw new Error('This template is unavailable. Please select another design.')
  if (!sample && photos.length !== t.slots.length) throw new Error('The photo session is incomplete. Please retake your photos.')
  await templateFonts()
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = Math.round(width * t.height / t.width)
  const ctx = canvas.getContext('2d'); ctx.scale(width / t.width, width / t.width)
  background(ctx, t)
  for (const r of t.slots) {
    ctx.save(); ctx.translate(r.x + r.width / 2, r.y + r.height / 2); ctx.rotate(r.rotation * Math.PI / 180)
    const x = -r.width / 2, y = -r.height / 2, polaroid = t.id === 'vintage-polaroid'
    ctx.fillStyle = '#fffaf0'; ctx.shadowColor = '#35281822'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4
    ctx.fillRect(x - 17, y - 17, r.width + 34, r.height + (polaroid ? 105 : 34)); ctx.shadowColor = 'transparent'
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, r.width, r.height, r.radius); ctx.clip()
    if (photos[r.photoIndex]) {
      const image = await loadImage(photos[r.photoIndex]); drawFilteredCover(ctx, image, x, y, r.width, r.height, filter); image.src = ''
    } else if (sample) drawSample(ctx, x, y, r.width, r.height, r.photoIndex)
    ctx.restore()
    if (polaroid) {
      ctx.fillStyle = '#eddbb8'; ctx.globalAlpha = .9; ctx.fillRect(x - 30, y - 32, 150, 48); ctx.globalAlpha = 1
      drawText(ctx, settings.photoCaptions?.[r.photoIndex], { ...fixedBox(y + r.height + 12, 36), field: 'photo caption', x: x + 25, width: r.width - 50, height: 65 }, t.ink)
    }
    ctx.restore()
  }
  decoration(ctx, t)
  if (t.id === 'classic-wedding') drawText(ctx, 'TOGETHER IS A BEAUTIFUL PLACE', fixedBox(95, 26), t.ink)
  if (t.id === 'film-retro') drawText(ctx, 'GOOD MOMENTS · 35 MM', fixedBox(10, 25), '#c9a670')
  if (t.id === 'colorful-fun') drawText(ctx, settings.mainMessage || '', fixedBox(65, 65), t.ink)
  for (const box of t.texts) drawText(ctx, fieldValue(box.field, settings), box, t.ink)
  if (settings.logo) {
    const image = await loadImage(settings.logo), box = t.logo, scale = Math.min(box.width / image.width, box.height / image.height)
    ctx.drawImage(image, box.x + (box.width - image.width * scale) / 2, box.y + (box.height - image.height * scale) / 2, image.width * scale, image.height * scale); image.src = ''
  }
  const blob = await canvasBlob(canvas); canvas.width = canvas.height = 1; return blob
}
function drawSample(ctx, x, y, width, height, index) {
  ctx.save(); ctx.translate(x, y); ctx.scale(width / 720, height / 440)
  ctx.fillStyle = ['#d9dfd4', '#e3d4c8', '#d6dde1'][index]; ctx.fillRect(0, 0, 720, 440)
  for (let i = 0; i < 3; i++) {
    const cx = 145 + i * 220; ctx.fillStyle = ['#f8f1df', '#69816e', '#b77f68'][i]; ctx.beginPath(); ctx.ellipse(cx, 440, 120, 200, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#443b35'; ctx.beginPath(); ctx.ellipse(cx, 178, 73, 96, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = ['#d7a67e', '#b88060', '#e0b48f'][i]; ctx.beginPath(); ctx.ellipse(cx, 200, 57, 72, 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#563c30'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx - 23, 201); ctx.lineTo(cx - 16, 201); ctx.moveTo(cx + 16, 201); ctx.lineTo(cx + 23, 201); ctx.moveTo(cx - 18, 230); ctx.quadraticCurveTo(cx, 249, cx + 18, 230); ctx.stroke()
  }
  ctx.restore()
}
