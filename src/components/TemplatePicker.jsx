import { useState } from 'react'
import { availableTemplates, getTemplate } from '../data/templates'
import TemplateSample from './TemplateSample'
import Dialog from './Dialog'

export default function TemplatePicker({ layout, templateId, settings, onSelect, onBack, onContinue }) {
  const [filter, setFilter] = useState('All'), [enlarged, setEnlarged] = useState(null)
  const available = availableTemplates(layout, settings), selected = available.find(t => t.id === templateId), preview = getTemplate(enlarged)
  return <section className="selection-page template-page page-enter">
    <div className="screen-heading"><span className="eyebrow">02 / MAKE IT YOURS</span><h1>Choose a template</h1><p>A little style for your memories.</p></div>
    <div className="template-filters" aria-label="Template categories">{['All', 'Wedding', 'Minimal', 'Retro', 'Fun'].map(category => <button className="button secondary" key={category} aria-pressed={filter === category} onClick={() => setFilter(category)}>{category}</button>)}</div>
    <p className="small-note sample-note">Sample illustrations · Your photos will fill these windows.</p>
    <div className="template-grid">{available.filter(t => filter === 'All' || t.category === filter).map(t => <article key={t.id} className={`template-card ${selected?.id === t.id ? 'selected' : ''}`}>
      <div className="template-art"><TemplateSample templateId={t.id} settings={settings}/></div>
      <button className="template-select" aria-pressed={selected?.id === t.id} onClick={() => onSelect(t.id)}><strong>{t.name}</strong><span>{selected?.id === t.id ? '✓ Selected' : 'Select template'}</span></button>
      <button className="button secondary" aria-label={`View larger: ${t.name}`} onClick={() => setEnlarged(t.id)}>View larger</button>
    </article>)}</div>
    {!available.some(t => filter === 'All' || t.category === filter) && <p className="empty-state">No enabled templates in this category. Try All.</p>}
    <div className="template-action-bar"><button className="button secondary" onClick={onBack}>Back</button><span role="status">{selected ? `${selected.name} selected` : 'Choose a compatible template'}</span><button className="button" disabled={!selected} onClick={onContinue}>Continue →</button></div>
    {preview && <Dialog title={preview.name} onClose={() => setEnlarged(null)}><div className="enlarged-template"><TemplateSample templateId={preview.id} settings={settings} large/></div><div className="template-palette">{preview.colors.map((color, i) => <span key={color}><i style={{ background: color }}/>{preview.palette[i]}</span>)}</div><p className="sample-note">3-photo strip · Sample illustrations</p><div className="actions"><button className="button secondary" onClick={() => setEnlarged(null)}>Back to templates</button><button className="button" onClick={() => { onSelect(preview.id); setEnlarged(null) }}>Use this template</button></div></Dialog>}
  </section>
}
