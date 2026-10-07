// Coordinates are authored for the digital 3:7 strip, never stretched to other layouts.
const slots = (ys, x, width, height, rotations = [0, 0, 0]) => ys.map((y, photoIndex) => ({ x, y, width, height, rotation: rotations[photoIndex], radius: 3, photoIndex, crop: 'cover' }))
const title = { field: 'eventName', x: 110, y: 1870, width: 680, height: 110, maxSize: 60, minSize: 26, lines: 2, font: 'BoothSerif', align: 'center' }
const date = { field: 'eventDate', x: 130, y: 2010, width: 640, height: 38, maxSize: 25, minSize: 20, lines: 1, font: 'BoothSerif', align: 'center' }
const base = { version: 1, layoutIds: ['strip'], width: 900, height: 2100, fonts: ['/fonts/CormorantGaramond.ttf'], assets: [], thumbnail: 'composer', logo: { x: 365, y: 1785, width: 170, height: 70 } }
export const templates = [
  { ...base, id: 'classic-wedding', name: 'Classic Wedding', category: 'Wedding', bg: '#faf4e7', ink: '#455440', palette: ['Ivory', 'Sage', 'Gold'], colors: ['#faf4e7', '#788465', '#cda968'], slots: slots([250, 760, 1270], 110, 680, 475), texts: [title, date] },
  { ...base, id: 'minimal-clean', name: 'Minimal Clean', category: 'Minimal', bg: '#ffffff', ink: '#303b36', palette: ['White', 'Charcoal', 'Sage'], colors: ['#ffffff', '#303b36', '#9da787'], slots: slots([300, 800, 1300], 105, 690, 460), texts: [{ ...title, y: 65, height: 155, maxSize: 68 }, { field: 'footerCaption', x: 110, y: 1880, width: 680, height: 100, maxSize: 38, minSize: 24, lines: 2, font: 'BoothSerif', align: 'center' }, date] },
  { ...base, id: 'film-retro', name: 'Film Retro', category: 'Retro', bg: '#22221f', ink: '#f7eedb', palette: ['Black', 'Warm gold', 'Cream'], colors: ['#22221f', '#ad8759', '#f7eedb'], slots: slots([125, 680, 1235], 120, 660, 510), texts: [title, date] },
  { ...base, id: 'vintage-polaroid', name: 'Vintage Polaroid', category: 'Retro', bg: '#ceb18c', ink: '#493c31', palette: ['Kraft', 'Paper', 'Sage'], colors: ['#ceb18c', '#fff8e9', '#788465'], slots: slots([140, 685, 1230], 115, 670, 415, [-3, 2, -2]), texts: [title, date] },
  { ...base, id: 'colorful-fun', name: 'Colorful Fun', category: 'Fun', bg: '#ffd1df', ink: '#304677', palette: ['Pink', 'Coral', 'Yellow', 'Sky', 'Lavender'], colors: ['#ffd1df', '#ff957d', '#ffdc7c', '#a3cfe1', '#c6b0df'], slots: slots([250, 760, 1270], 110, 680, 475), texts: [title, date] },
]
export const getTemplate = id => templates.find(t => t.id === id)
export const availableTemplates = (layout, settings) => templates.filter(t => t.layoutIds.includes(layout) && (!Array.isArray(settings.enabledTemplates) || settings.enabledTemplates.includes(t.id)))
export function resolveTemplate(layout, id, settings) {
  const available = availableTemplates(layout, settings)
  return available.find(t => t.id === id) || available[0] || null
}
