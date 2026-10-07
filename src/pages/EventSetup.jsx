import { useEffect, useState } from 'react'
import { frames, layouts } from '../data/booth'
import { templates, getTemplate } from '../data/templates'
import { readLogo } from '../services/images'
import { validateTemplate } from '../services/template-renderer'
import { FrameSample } from '../components/BoothArt'
import TemplateSample from '../components/TemplateSample'

export default function EventSetup({ settings, onSave }) {
  const [form, setForm] = useState(settings), [uploadError, setUploadError] = useState(''), [loadingLogo, setLoadingLogo] = useState(false)
  const [validation, setValidation] = useState(null), [retry, setRetry] = useState(0)
  const change = (key, value) => setForm(old => ({ ...old, [key]: value }))
  useEffect(() => {
    let live = true
    async function check() {
      const errors = {}
      if (!form.enabledTemplates?.length) errors.enabledTemplates = 'Keep at least one strip template enabled.'
      if (!form.enabledTemplates?.includes(form.templateId)) errors.templateId = 'The default template must be enabled.'
      if (!getTemplate(form.templateId)?.layoutIds.includes('strip')) errors.templateId = 'Choose a compatible strip template.'
      for (const t of templates.filter(t => form.enabledTemplates?.includes(t.id))) {
        try { await validateTemplate(t, form) } catch (error) { errors[t.id] = `${t.name}: ${error.message}` }
      }
      if (live) setValidation({ form, errors })
    }
    check()
    return () => { live = false }
  }, [form, retry])
  const checked = validation?.form === form, errors = checked ? validation.errors : {}, valid = checked && !Object.keys(errors).length
  async function upload(event) {
    const file = event.target.files[0]
    if (!file) return
    setLoadingLogo(true)
    try { change('logo', await readLogo(file)); setUploadError('') } catch (error) { setUploadError(error.message) } finally { setLoadingLogo(false) }
  }
  return <section className="operator-page page-enter"><div className="screen-heading"><span className="eyebrow">MAKE IT YOURS</span><h1>Set the occasion.</h1><p>A few little details for a day to remember.</p></div><div className="setup-grid"><form className="form-card" onSubmit={event => { event.preventDefault(); if (valid && !loadingLogo && !uploadError) onSave(form) }}>
    <label>Event name<input maxLength={160} value={form.eventName} onChange={e => change('eventName', e.target.value)} placeholder="Erwin & Maria’s Wedding"/></label>
    <label>Event date<input type="date" value={form.eventDate} onChange={e => change('eventDate', e.target.value)}/></label>
    <label>Minimal Clean footer caption<input maxLength={120} value={form.footerCaption} onChange={e => change('footerCaption', e.target.value)}/></label>
    <label>Colorful Fun main message<input maxLength={60} value={form.mainMessage} onChange={e => change('mainMessage', e.target.value)}/></label>
    <fieldset><legend>Polaroid photo captions</legend>{[0, 1, 2].map(i => <label key={i}>Photo {i + 1}<input maxLength={80} value={form.photoCaptions?.[i] || ''} onChange={e => { const captions = [...(form.photoCaptions || ['', '', ''])]; captions[i] = e.target.value; change('photoCaptions', captions) }}/></label>)}</fieldset>
    <div className="form-row"><label>Default layout<select value={form.layout} onChange={e => change('layout', e.target.value)}>{layouts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label><label>{form.layout === 'strip' ? 'Default template' : 'Default frame'}{form.layout === 'strip' ? <select value={form.templateId} onChange={e => change('templateId', e.target.value)}>{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select> : <select value={form.frame} onChange={e => change('frame', e.target.value)}>{frames.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>}</label></div>
    {errors.templateId && <p role="alert" className="notice error">{errors.templateId}</p>}
    <fieldset><legend>Available guest strip templates</legend><p className="small-note">Single, double and grid keep all existing frames.</p>{templates.map(t => <div key={t.id}><label className="template-toggle"><input type="checkbox" checked={form.enabledTemplates?.includes(t.id) || false} onChange={e => change('enabledTemplates', e.target.checked ? [...form.enabledTemplates, t.id] : form.enabledTemplates.filter(id => id !== t.id))}/>{t.name}</label>{errors[t.id] && <p role="alert" className="notice error">{errors[t.id]}</p>}</div>)}{errors.enabledTemplates && <p role="alert" className="notice error">{errors.enabledTemplates}</p>}</fieldset>
    <div className="form-row"><label>Countdown<select value={form.countdown} onChange={e => change('countdown', Number(e.target.value))}>{[3, 5, 10].map(n => <option value={n} key={n}>{n} seconds</option>)}</select></label><label>Photo quality<select value={form.quality} onChange={e => change('quality', e.target.value)}><option value="high">High</option><option value="standard">Standard</option></select></label></div>
    <label>Event logo (optional)<input type="file" accept="image/*" disabled={loadingLogo} onChange={upload}/></label>
    {form.logo && <div className="logo-upload"><img src={form.logo} alt="Event logo"/><button type="button" className="text-button" onClick={() => { change('logo', ''); setUploadError('') }}>Remove logo</button></div>}
    {uploadError && <p role="alert" className="notice error">{uploadError}<button type="button" className="text-button" onClick={() => setUploadError('')}>Keep current logo</button></p>}
    {!checked && <p role="status">Checking text and template assets…</p>}
    {Object.keys(errors).length > 0 && <button type="button" className="button secondary" onClick={() => setRetry(n => n + 1)}>Retry validation</button>}
    <button disabled={!valid || loadingLogo || Boolean(uploadError)} className="button" type="submit">Save & start booth</button>
  </form><aside className="setup-preview">{form.layout === 'strip' ? <TemplateSample templateId={form.templateId} settings={form} large/> : <FrameSample layout={form.layout} frame={form.frame} large/>}<h2>{form.eventName}</h2><span className="small-note">Sample illustrations · Draft changes save only on Save.</span></aside></div></section>
}
