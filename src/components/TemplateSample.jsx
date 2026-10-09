import { useEffect, useState } from 'react'
import { composeTemplate } from '../services/template-renderer'
import { getTemplate } from '../data/templates'

export default function TemplateSample({ templateId, settings, photos, large = false, filter, overlays }) {
  const [result, setResult] = useState(null), [retry, setRetry] = useState(0)
  useEffect(() => {
    let live = true, url
    composeTemplate({ photos: photos || [], templateId, settings, sample: true, width: large ? 630 : 270, filter, overlays })
      .then(blob => { if (live) { url = URL.createObjectURL(blob); setResult({ url, templateId, settings, photos, filter, overlays }) } })
      .catch(error => { if (live) setResult({ error: error.message, templateId, settings, photos, filter, overlays }) })
    return () => { live = false; if (url) URL.revokeObjectURL(url) }
  }, [templateId, settings, photos, large, retry, filter, overlays])
  const current = result?.templateId === templateId && result?.settings === settings && result?.photos === photos && result?.filter === filter && result?.overlays === overlays ? result : null
  if (current?.error) return <div className="template-error" role="alert"><p>{current.error}</p><button type="button" className="text-button" onClick={() => setRetry(n => n + 1)}>Retry template</button></div>
  return current?.url ? <img className="template-sample" src={current.url} alt={`${getTemplate(templateId)?.name}, ${photos ? 'capture progress' : 'sample illustrations'}`}/> : <span className="template-loading" role="status">Preparing design…</span>
}
