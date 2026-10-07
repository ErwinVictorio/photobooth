import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// Original vector artwork. No remote resources, downloaded assets, or dependencies.
const output = resolve('Docs/template-mockups')
await mkdir(output, { recursive: true })
const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')
const rect = (x, y, w, h, fill, radius = 0, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" ${extra}/>`
const text = (x, y, value, size = 28, fill = '#3f5140', extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-family="Arial, sans-serif" ${extra}>${esc(value)}</text>`
const serif = (x, y, value, size, color, extra = '') => text(x, y, value, size, color, `style="font-family:Georgia,serif" ${extra}`)
const leaf = (x, y, scale = 1, rotation = 0) => `<g transform="translate(${x} ${y}) rotate(${rotation}) scale(${scale})"><path d="M0 0Q45-130 8-290" fill="none" stroke="#788465" stroke-width="4"/>${Array.from({ length: 7 }, (_, i) => `<ellipse cx="${i % 2 ? 0 : 33}" cy="${-30 - i * 33}" rx="13" ry="33" transform="rotate(${i % 2 ? -40 : 40} ${i % 2 ? 0 : 33} ${-30 - i * 33})" fill="${i % 2 ? '#9da787' : '#728466'}"/>`).join('')}</g>`
const flower = (x, y, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})">${Array.from({ length: 10 }, (_, i) => `<ellipse cx="0" cy="-30" rx="14" ry="30" fill="#fff8e7" stroke="#dec99f" stroke-width="2" transform="rotate(${i * 36})"/>`).join('')}<circle r="17" fill="#cda968"/><circle r="8" fill="#e5cc91"/></g>`
const people = (i) => `<svg viewBox="0 0 720 440" preserveAspectRatio="xMidYMid slice" width="100%" height="100%"><rect width="720" height="440" fill="${['#d9dfd4', '#e3d4c8', '#d6dde1'][i]}"/><path d="M0 350Q170 150 360 320T720 250V440H0Z" fill="#bdc7b8"/>${[0, 1, 2].map((p) => `<g transform="translate(${145 + p * 220} ${i === 1 && p === 1 ? 22 : 0})"><ellipse cx="0" cy="450" rx="120" ry="200" fill="${['#f8f1df', '#69816e', '#b77f68'][p]}"/><ellipse cy="178" rx="73" ry="96" fill="#443b35"/><ellipse cy="200" rx="57" ry="72" fill="${['#d7a67e', '#b88060', '#e0b48f'][p]}"/><path d="M-60 180Q-70 70 50 120L60 180Q20 170 0 132Q-20 165-60 180" fill="#443b35"/><path d="M-23 201h7m32 0h7M-18 230Q0 249 18 230" fill="none" stroke="#563c30" stroke-width="5" stroke-linecap="round"/>${i === 2 ? '<path d="M70 300l35-70m-24 22l-8-29" stroke="#d7a67e" stroke-width="18" stroke-linecap="round"/>' : ''}</g>`).join('')}<rect y="409" width="720" height="31" fill="#ffffff" fill-opacity=".78"/>${text(360, 431, 'SAMPLE ILLUSTRATION', 17, '#465044', 'text-anchor="middle" letter-spacing="3"')}</svg>`

const templates = [
  { id: 'classic-wedding', name: 'Classic Wedding', category: 'Wedding', bg: '#faf4e7', ink: '#455440', palette: ['#faf4e7', '#788465', '#cda968'], label: 'Erwin & Maria', slots: [250, 765, 1280].map(y => ({ x: 110, y, w: 680, h: 475, r: 0 })) },
  { id: 'minimal-clean', name: 'Minimal Clean', category: 'Minimal', bg: '#ffffff', ink: '#303b36', palette: ['#ffffff', '#303b36', '#9da787'], label: 'Good Memories', slots: [310, 835, 1360].map(y => ({ x: 105, y, w: 690, h: 485, r: 0 })) },
  { id: 'film-retro', name: 'Film Retro', category: 'Retro', bg: '#22221f', ink: '#f7eedb', palette: ['#22221f', '#ad8759', '#f7eedb'], label: 'Best moments', slots: [125, 680, 1235].map(y => ({ x: 120, y, w: 660, h: 510, r: 0 })) },
  { id: 'vintage-polaroid', name: 'Vintage Polaroid', category: 'Retro', bg: '#ceb18c', ink: '#493c31', palette: ['#ceb18c', '#fff8e9', '#788465'], label: 'Days like these', slots: [145, 715, 1285].map((y, i) => ({ x: 115, y, w: 670, h: 440, r: [-3, 2, -2][i] })) },
  { id: 'colorful-fun', name: 'Colorful Fun', category: 'Fun', bg: '#ffd1df', ink: '#304677', palette: ['#ffd1df', '#ff957d', '#ffdc7c', '#a3cfe1', '#c6b0df'], label: 'Capture the moment!', slots: [260, 780, 1300].map(y => ({ x: 110, y, w: 680, h: 475, r: 0 })) },
]

function artwork(t) {
  let art = rect(0, 0, 900, 2100, t.bg)
  if (t.id === 'classic-wedding') art += rect(35, 35, 830, 2030, 'none', 0, 'stroke="#cda968" stroke-width="3"') + rect(49, 49, 802, 2002, 'none', 0, 'stroke="#dfcfb1" stroke-width="2"') + text(450, 152, 'TOGETHER IS A BEAUTIFUL PLACE', 24, t.ink, 'text-anchor="middle" letter-spacing="4"')
  if (t.id === 'minimal-clean') art += serif(110, 130, 'Good', 65, t.ink, 'font-style="italic"') + serif(110, 208, 'Memories', 65, t.ink, 'font-style="italic"') + text(780, 145, 'OCT 07', 24, t.ink, 'text-anchor="end" letter-spacing="4"') + text(780, 185, '2026', 24, t.ink, 'text-anchor="end" letter-spacing="4"')
  if (t.id === 'film-retro') {
    for (let y = 40; y < 2070; y += 98) art += rect(30, y, 38, 55, '#f3ead6', 7) + rect(832, y, 38, 55, '#f3ead6', 7)
    art += text(450, 74, 'GOOD MOMENTS • 35 MM', 23, '#c9a670', 'text-anchor="middle" letter-spacing="5"')
  }
  if (t.id === 'vintage-polaroid') {
    for (let i = 0; i < 400; i++) art += `<circle cx="${(i * 137) % 900}" cy="${(i * 251) % 2100}" r="${i % 3 + 1}" fill="#997750" opacity=".15"/>`
  }
  if (t.id === 'colorful-fun') art += `<path d="M0 0H900V175Q560 300 400 140T0 210Z" fill="#ffdc7c"/><path d="M0 630Q220 650 70 1000T160 1560L0 1800Z" fill="#a3cfe1"/><path d="M900 700Q740 900 870 1350T650 2100H900Z" fill="#c6b0df"/>` + text(450, 120, 'GOOD VIBES', 65, t.ink, 'text-anchor="middle" font-weight="bold" transform="rotate(-4 450 120)"')
  t.slots.forEach((s, i) => {
    const polaroid = t.id === 'vintage-polaroid'
    art += `<g transform="rotate(${s.r} ${s.x + s.w / 2} ${s.y + s.h / 2})">`
    art += rect(s.x - 17, s.y - 17, s.w + 34, s.h + (polaroid ? 112 : 34), polaroid ? '#fffaf0' : '#fffdf5', 3)
    art += `<svg x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" viewBox="0 0 720 440" preserveAspectRatio="xMidYMid slice" overflow="hidden">${people(i)}</svg>`
    if (polaroid) art += serif(450, s.y + s.h + 63, ['Good friends', 'Same lovely chaos', 'Best memories'][i], 37, t.ink, 'text-anchor="middle" font-style="italic"') + `<path d="M${s.x - 35} ${s.y - 20}l150-25 7 62-150 25Z" fill="#eddbb8" opacity=".9"/>`
    if (t.id === 'film-retro') art += text(90, s.y + 30, `0${i + 1}`, 19, '#c9a670', `transform="rotate(90 90 ${s.y + 30})"`)
    art += '</g>'
  })
  if (t.id === 'classic-wedding') art += leaf(50, 360, 1, -10) + leaf(845, 1745, 1, 180) + leaf(60, 2030, .8, 0) + flower(65, 75, 1.3) + flower(845, 2020, 1.3) + flower(65, 1950, .85)
  if (t.id === 'minimal-clean') art += leaf(47, 650, .7, 0) + leaf(852, 1870, .55, 180)
  if (t.id === 'vintage-polaroid') art += flower(95, 645, .9) + leaf(42, 2030, .8, -8)
  if (t.id === 'colorful-fun') {
    art += flower(790, 215, .85) + `<path d="M55 1090c-95-60-45-135 0-85 45-50 95 25 0 85" fill="#ff957d" stroke="#fff8ef" stroke-width="12"/>`
    art += `<g transform="translate(805 1280) rotate(14)">${rect(-55, -35, 110, 80, '#a3cfe1', 15, 'stroke="#fff8ef" stroke-width="12"')}<circle r="24" fill="#304677"/><circle r="12" fill="#fff8ef"/></g>`
  }
  const footerY = t.id === 'minimal-clean' ? 1955 : 1925
  art += serif(450, footerY, t.label, t.id === 'colorful-fun' ? 57 : 62, t.ink, 'text-anchor="middle" font-style="italic"')
  art += text(450, footerY + 68, 'OCTOBER 7, 2026', 25, t.ink, 'text-anchor="middle" letter-spacing="4"')
  if (t.id === 'classic-wedding') art += text(450, 2054, '♡', 35, '#b98d57', 'text-anchor="middle"')
  return art
}
const svg = (w, h, body, label) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>${body}</svg>`
const strip = (t, x, y, w, h) => `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 900 2100">${artwork(t)}</svg>`
const button = (x, y, w, label, primary = false) => rect(x, y, w, 60, primary ? '#6f8062' : '#fffdf8', 18, 'stroke="#d8cfbe"') + text(x + w / 2, y + 37, label, 18, primary ? '#ffffff' : '#3f5140', 'text-anchor="middle"')
function screen(kind, landscape) {
  const w = landscape ? 1180 : 820, h = landscape ? 820 : 1180
  let body = rect(0, 0, w, h, '#f8f5ef') + text(30, 35, 'GOOD MOMENTS / DESIGN STUDY', 13, '#66715d', 'letter-spacing="2"') + text(w - 30, 35, 'SAMPLE CONTENT', 13, '#66715d', 'text-anchor="end"')
  if (kind === 'picker') {
    body += button(28, 65, 90, 'Back') + serif(w / 2, 109, 'Choose a template', 38, '#3f5140', 'text-anchor="middle"') + text(w / 2, 148, 'A little style for your memories.', 19, '#68745f', 'text-anchor="middle"')
    body += text(w / 2, 188, 'Layout   →   Template   →   Capture   →   Preview', 16, '#68745f', 'text-anchor="middle"')
    ;['All', 'Wedding', 'Minimal', 'Retro', 'Fun'].forEach((name, i) => { body += button((w - 550) / 2 + i * 112, 211, 102, name, i === 0) })
    const cw = landscape ? 210 : 360, ch = landscape ? 410 : 355
    templates.forEach((t, i) => {
      const x = landscape ? 25 + i * 230 : 40 + i % 2 * 380
      const y = landscape ? 300 : 298 + Math.floor(i / 2) * 375
      // Portrait is a scroll-content mockup; the bottom bar is drawn after the clipped cards.
      body += rect(x, y, cw, ch, '#fffdf9', 20, `stroke="${i === 1 ? '#6f8062' : '#eadfcf'}" stroke-width="${i === 1 ? 3 : 1}"`) + strip(t, x + (cw - (landscape ? 112 : 96)) / 2, y + 15, landscape ? 112 : 96, landscape ? 260 : 224)
      body += text(x + cw / 2, y + (landscape ? 302 : 269), t.name, 20, '#3f5140', 'text-anchor="middle"') + text(x + cw / 2, y + (landscape ? 329 : 294), i === 1 ? '✓ Selected' : t.category, 15, '#68745f', 'text-anchor="middle"') + button(x + 12, y + ch - 57, cw - 24, 'View larger')
    })
    body += rect(0, h - 104, w, 104, '#f8f5ef', 0, 'stroke="#eadfcf"') + text(32, h - 61, 'Minimal Clean selected', 22) + text(32, h - 32, landscape ? '3-photo strip · Sample illustrations' : 'Scroll for more templates ↓', 16, '#68745f') + button(w - 250, h - 82, 220, 'Continue →', true)
  } else if (kind === 'preview') {
    body += serif(40, 104, 'Minimal Clean', 38, '#3f5140') + button(w - 142, 65, 110, 'Close')
    const sh = h - 360, sw = sh * 3 / 7
    body += strip(templates[1], (w - sw) / 2, 150, sw, sh) + text(w / 2, h - 167, 'White / Charcoal / Sage · 3-photo strip', 19, '#3f5140', 'text-anchor="middle"') + text(w / 2, h - 135, 'Sample illustrations • selection changes only on Use', 16, '#68745f', 'text-anchor="middle"') + button(w / 2 - 260, h - 95, 240, 'Back to templates') + button(w / 2 + 0, h - 95, 260, 'Use this template', true)
  } else {
    body += serif(40, 105, 'Set the occasion.', 42, '#3f5140') + text(40, 146, 'Your details, beautifully remembered.', 19, '#68745f')
    const fw = landscape ? 570 : 760
    body += rect(30, 180, fw, 510, '#fffdf8', 20, 'stroke="#eadfcf"')
    ;[['Event name', 'Good Memories'], ['Event date', 'October 7, 2026'], ['Default layout', 'Photo strip'], ['Default template', 'Minimal Clean']].forEach(([label, value], i) => { const y = 220 + i * 95; body += text(55, y, label, 17) + rect(55, y + 12, fw - 50, 54, '#ffffff', 10, 'stroke="#d8cfbe"') + text(72, y + 46, value, 19) })
    body += button(55, 610, 175, 'Upload logo') + text(250, 646, 'No logo added', 16, '#68745f')
    const sh = landscape ? 470 : 270, sw = sh * 3 / 7, px = landscape ? 790 : (w - sw) / 2, py = landscape ? 195 : 714
    body += strip(templates[1], px, py, sw, sh) + text(px + sw / 2, py + sh + 26, 'Live preview', 18, '#3f5140', 'text-anchor="middle"')
    const y = landscape ? 737 : 1045
    body += text(40, y, 'Available guest templates', 21) + text(40, y + 37, '☑ Wedding   ☑ Minimal   ☑ Film   ☑ Polaroid   ☑ Fun', 18)
    body += button(w - 320, h - 90, 290, 'Save & start booth →', true)
    if (!landscape) body += text(40, 1130, 'Changes save on Save.', 16, '#68745f')
  }
  return svg(w, h, body, `${kind}, iPad ${landscape ? 'landscape' : 'portrait'} design mockup`)
}
for (const t of templates) await writeFile(resolve(output, `${t.id}.svg`), svg(900, 2100, artwork(t), `${t.name} — sample illustration, design mockup`))
for (const kind of ['picker', 'preview', 'operator']) for (const landscape of [false, true]) await writeFile(resolve(output, `${kind}-${landscape ? 'landscape' : 'portrait'}.svg`), screen(kind, landscape))
await writeFile(resolve(output, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Template design review</title><style>*{box-sizing:border-box}body{margin:0;background:#f8f5ef;color:#3f5140;font:17px/1.6 Arial,sans-serif}main{max-width:1500px;margin:auto;padding:36px}h1,h2,h3{font-family:Georgia,serif;font-weight:normal}h1{font-size:44px;margin-bottom:8px}.strips{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:24px}img{width:100%;height:auto;display:block;box-shadow:0 8px 24px #3f514015}a{color:inherit}a:focus-visible{outline:3px solid #6f8062;outline-offset:6px}.palette{display:flex;gap:7px;margin:16px 0}.palette span{width:24px;height:24px;border-radius:50%;border:1px solid #7775}.screens{display:grid;grid-template-columns:1fr 1.44fr;gap:28px;align-items:start}small{color:#65715f}figure{margin:0}figcaption{padding:10px 0}section{margin:40px 0}nav a{display:inline-block;padding:12px 20px;background:white;border-radius:12px;margin:8px 8px 8px 0}@media(max-width:900px){.strips{grid-template-columns:repeat(2,minmax(0,1fr))}.screens{grid-template-columns:1fr}}@media(max-width:420px){main{padding:20px}.strips{grid-template-columns:1fr}}</style><main><small>GOOD MOMENTS / PHASE A / OCTOBER 7, 2026</small><h1>Five ways to remember.</h1><p>Original vector design studies at 900 × 2100. The same three neutral sample illustrations appear in every design. These are review mockups, not guest exports.</p><nav><a href="#designs">Five designs</a><a href="#picker">Picker</a><a href="#preview">Enlarged preview</a><a href="#operator">Operator setup</a></nav><section id="designs" class="strips">${templates.map(t => `<article><h2>${t.name}</h2><a href="${t.id}.svg"><img src="${t.id}.svg" alt="${t.name} full strip mockup" width="900" height="2100"></a><div class="palette">${t.palette.map(c => `<span style="background:${c}" title="${c}"></span>`).join('')}</div><small>${t.category} · <a href="${t.id}.svg" download>Download SVG</a></small></article>`).join('')}</section>${['picker', 'preview', 'operator'].map(kind => `<section id="${kind}"><h2>${{ picker: 'Choose a template', preview: 'A closer look', operator: 'Operator setup' }[kind]}</h2><p>Static visual study; controls are illustrative.${kind === 'picker' ? ' Portrait shows the initial scroll viewport, with remaining cards below the fold.' : ''}</p><div class="screens">${['portrait', 'landscape'].map(o => `<figure><a href="${kind}-${o}.svg"><img src="${kind}-${o}.svg" alt="${kind} ${o} UI mockup" loading="lazy"></a><figcaption>iPad ${o} · ${o === 'portrait' ? '820 × 1180' : '1180 × 820'}</figcaption></figure>`).join('')}</div></section>`).join('')}<p>Review spacing, crop windows, artwork density, footer room, and palettes. Typography uses installed Georgia/Arial fallbacks; bundled font selection and real-photo crop checks remain part of implementation. No print-size claim is made.</p></main></html>`)
console.log(`Created five full-size strips and six tablet UI mockups in ${output}`)
