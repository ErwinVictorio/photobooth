export function downloadPhoto(blob, filename) {
  const url = URL.createObjectURL(blob), a = document.createElement('a')
  a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
export function shareFile(session) { return new File([session.finalPhoto], session.filename, { type: 'image/jpeg' }) }
export function canShare(session) {
  try { return Boolean(navigator.canShare?.({ files: [shareFile(session)] })) } catch { return false }
}
export const sharePhoto = (session) => navigator.share({ files: [shareFile(session)], title: session.eventName })
