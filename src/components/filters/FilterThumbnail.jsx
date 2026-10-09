import { useEffect, useRef, useState } from 'react'
import { loadImage } from '../../services/images'
import { drawFilteredCover } from '../../services/photo-filters'

export default function FilterThumbnail({ sample, preset }) {
  const canvas = useRef(null)
  const [unavailable, setUnavailable] = useState(false)
  useEffect(() => {
    let disposed = false
    if (sample) loadImage(sample).then(image => {
      if (!disposed) {
        try { drawFilteredCover(canvas.current.getContext('2d'), image, 0, 0, 112, 84, { presetId: preset.id, intensity: 1, version: 1 }); setUnavailable(false) }
        catch { setUnavailable(true) }
      }
      image.src = ''
    }).catch(() => { if (!disposed) setUnavailable(true) })
    return () => { disposed = true }
  }, [sample, preset.id])
  return <span className="filter-thumbnail" style={{ background: preset.color }} aria-hidden="true"><canvas ref={canvas} width="112" height="84" hidden={!sample || unavailable}/>{(!sample || unavailable) && <span>◒</span>}</span>
}
