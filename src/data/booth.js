export const layouts = [
  { id: 'single', name: 'Single', detail: 'One lovely moment', count: 1, cols: 1, rows: 1, width: 1200, height: 1500 },
  { id: 'double', name: 'Two photos', detail: 'Better together', count: 2, cols: 2, rows: 1, width: 1800, height: 1200 },
  { id: 'strip', name: 'Photo strip', detail: 'Three little memories', count: 3, cols: 1, rows: 3, width: 900, height: 2100 },
  { id: 'grid', name: 'Four photos', detail: 'A little more fun', count: 4, cols: 2, rows: 2, width: 1500, height: 1800 },
]

export const frames = [
  { id: 'classic', name: 'Classic', detail: 'Timeless & warm', bg: '#faf5e9', ink: '#8b7651', accent: '#c7b283', decoration: 'line' },
  { id: 'minimal', name: 'Minimal', detail: 'Simply beautiful', bg: '#ffffff', ink: '#50584d', accent: '#abb5a0', decoration: 'line' },
  { id: 'botanical', name: 'Botanical', detail: 'A touch of nature', bg: '#f8f5ef', ink: '#3f5140', accent: '#839378', decoration: 'leaves' },
  { id: 'gold', name: 'Golden hour', detail: 'Made to celebrate', bg: '#f5ead5', ink: '#8b6635', accent: '#b98d57', decoration: 'line' },
  { id: 'blush', name: 'Blush', detail: 'Soft & romantic', bg: '#f9edeb', ink: '#946969', accent: '#d7a59c', decoration: 'leaves' },
  { id: 'confetti', name: 'Confetti', detail: 'Bring the happy', bg: '#faf2e7', ink: '#826d68', accent: '#bd8f76', decoration: 'confetti' },
]

export const getLayout = (id) => layouts.find((item) => item.id === id) || layouts[2]
export const getFrame = (id) => frames.find((item) => item.id === id) || frames[2]
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export const formatDate = (date) => date ? new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : ''
export const defaults = { eventName: 'Good people. Beautiful memories.', eventDate: localDate(), layout: 'strip', frame: 'botanical', countdown: 3, quality: 'high', facing: 'user', mirror: true, sound: false, showTitle: true, logo: '' }

export function readSettings() {
  try {
    const value = JSON.parse(localStorage.getItem('photobooth.settings')) || {}
    return { ...defaults, ...value, layout: getLayout(value.layout).id, frame: getFrame(value.frame).id, countdown: [3, 5, 10].includes(value.countdown) ? value.countdown : 3 }
  } catch { return { ...defaults } }
}
