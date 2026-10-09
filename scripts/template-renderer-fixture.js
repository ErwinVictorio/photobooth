import { composeTemplate, validateTemplate } from '../src/services/template-renderer'
import { composePhoto } from '../src/services/images'
import { templates } from '../src/data/templates'
import { defaults, readSettings } from '../src/data/booth'

window.rendererChecks = async function () {
  const checks = []
  function assert(value, message) { if (!value) throw new Error(message) }
  async function rejects(fn, message) { let rejected = false; try { await fn() } catch { rejected = true } assert(rejected, message) }
  const colors = [[240, 25, 110], [20, 210, 210], [35, 60, 230]]
  const photos = await Promise.all(colors.map(async ([r, g, b]) => {
    const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 900
    const ctx = canvas.getContext('2d'); ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(0, 0, 1600, 900)
    // Side bars must be cropped from the landscape source by the strip's cover rule.
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 100, 900); ctx.fillRect(1500, 0, 100, 900)
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  }))
  const logoCanvas = document.createElement('canvas'); logoCanvas.width = 200; logoCanvas.height = 100
  const logoCtx = logoCanvas.getContext('2d'); logoCtx.fillStyle = '#f00000'; logoCtx.fillRect(0, 0, 200, 100)
  const settings = { ...defaults, eventName: 'Erwin & Maria', logo: logoCanvas.toDataURL() }
  for (const t of templates) {
    const args = { photos, templateId: t.id, settings }
    const output = await composeTemplate(args), sample = await composeTemplate({ ...args, sample: true })
    const bytes = new Uint8Array(await output.arrayBuffer()), sampleBytes = new Uint8Array(await sample.arrayBuffer())
    assert(bytes.length === sampleBytes.length && bytes.every((value, i) => value === sampleBytes[i]), `${t.name}: sample and export differ`)
    const image = await createImageBitmap(output)
    assert(image.width === 900 && image.height === 2100, `${t.name}: wrong output dimensions`)
    const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 2100
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0); image.close()
    for (const slot of t.slots) {
      const angle = slot.rotation * Math.PI / 180
      for (const dx of [0, slot.width * .42, -slot.width * .42]) {
        const x = slot.x + slot.width / 2 + dx * Math.cos(angle), y = slot.y + slot.height / 2 + dx * Math.sin(angle)
        const rgb = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data
        assert(colors[slot.photoIndex].every((v, i) => Math.abs(v - rgb[i]) < 12), `${t.name}: photo index, crop, rotation or color mismatch`)
      }
    }
    const logoPixel = ctx.getImageData(450, 1820, 1, 1).data
    assert(logoPixel[0] > 200 && logoPixel[1] < 40, `${t.name}: logo missing`)
    const filtered = await createImageBitmap(await composeTemplate({ ...args, filter: { presetId: 'classic-bw', intensity: 1, version: 1 } }))
    const filteredCanvas = document.createElement('canvas'); filteredCanvas.width = 900; filteredCanvas.height = 2100
    const filteredCtx = filteredCanvas.getContext('2d'); filteredCtx.drawImage(filtered, 0, 0); filtered.close()
    for (const slot of t.slots) {
      const rgb = filteredCtx.getImageData(Math.round(slot.x + slot.width / 2), Math.round(slot.y + slot.height / 2), 1, 1).data
      assert(Math.abs(rgb[0] - rgb[1]) < 4 && Math.abs(rgb[1] - rgb[2]) < 4, `${t.name}: photo filter not applied`)
    }
    for (const [x, y] of [[450, 1820], [450, 25]]) {
      const before = ctx.getImageData(x, y, 1, 1).data, after = filteredCtx.getImageData(x, y, 1, 1).data
      assert(before.every((value, i) => Math.abs(value - after[i]) < 5), `${t.name}: filter changed logo or paper`)
    }
    const overlays = photos.map(() => [{ id: 'red-image', type: 'image', src: logoCanvas.toDataURL(), x: .5, y: .5, size: .3, rotation: 0 }])
    const decorated = await createImageBitmap(await composeTemplate({ ...args, overlays, filter: { presetId: 'classic-bw', intensity: 1, version: 1 } }))
    filteredCtx.drawImage(decorated, 0, 0); decorated.close()
    for (const slot of t.slots) {
      const rgb = filteredCtx.getImageData(Math.round(slot.x + slot.width / 2), Math.round(slot.y + slot.height / 2), 1, 1).data
      assert(rgb[0] > 200 && rgb[1] < 40 && rgb[2] < 40, `${t.name}: image overlay missing, cropped incorrectly, or filtered`)
    }
    const standard = await createImageBitmap(await composePhoto({ ...args, layout: 'strip', settings: { ...settings, quality: 'standard' } }))
    assert(standard.width === 630 && standard.height === 1470, `${t.name}: standard dimensions`); standard.close()
    await validateTemplate(t, { ...settings, eventName: '', eventDate: '', footerCaption: '', mainMessage: '', photoCaptions: ['', '', ''], logo: '' })
    await rejects(() => validateTemplate(t, { ...settings, eventName: 'W'.repeat(160), footerCaption: 'W'.repeat(120) }), `${t.name}: oversized text was accepted`)
    await rejects(() => composeTemplate({ ...args, photos: photos.slice(0, 2) }), `${t.name}: missing photo accepted`)
    const link = document.createElement('a'); link.href = URL.createObjectURL(output); link.textContent = t.name; link.download = `${t.id}.jpg`; document.body.append(link)
    const preview = document.createElement('img'); preview.src = link.href; preview.width = 180; document.body.append(preview)
    checks.push(`${t.name}: identical sample/export bytes, clipping/crop/color, logo, text bounds, 900/630 widths, no placeholder export`)
  }
  await rejects(() => composePhoto({ photos, templateId: 'minimal-clean', layout: 'grid', settings }), 'Incompatible template accepted')
  await rejects(() => validateTemplate(templates[0], { ...settings, logo: 'data:image/png;base64,invalid' }), 'Invalid logo accepted')
  await rejects(() => validateTemplate(templates.find(t => t.id === 'vintage-polaroid'), { ...settings, photoCaptions: ['W'.repeat(80)] }), 'Oversized photo caption accepted')
  localStorage.setItem('photobooth.settings', JSON.stringify({ templateId: 'deleted', enabledTemplates: [], frame: 'blush' }))
  assert(readSettings().templateId === 'minimal-clean' && readSettings().frame === 'blush', 'Settings compatibility failed')
  localStorage.removeItem('photobooth.settings')
  checks.push('Incompatible layouts, invalid logos and oversized captions rejected; stale settings migrate without losing frame IDs')
  return checks
}
