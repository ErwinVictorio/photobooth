import { useId } from 'react'
import { PHOTO_FILTERS } from '../../data/photo-filters'
import { normalizePhotoFilter } from '../../services/photo-filters'
import FilterThumbnail from './FilterThumbnail'
import './PhotoFilterPicker.css'

export default function PhotoFilterPicker({ value, onChange, sample = null, disabled = false, readOnly = false, busy = false, label = 'Tune your photos' }) {
  const id = useId(), filter = normalizePhotoFilter(value)
  return <fieldset className="photo-filter-picker" disabled={disabled || readOnly} aria-busy={busy}>
    <legend>{label}</legend>
    {readOnly && <p className="small-note">Your host chooses the shared photo look.</p>}
    <div className="filter-options">{PHOTO_FILTERS.map(preset => <label className={`filter-option ${filter.presetId === preset.id ? 'selected' : ''}`} key={preset.id}>
      <input type="radio" name={id} value={preset.id} checked={filter.presetId === preset.id} onChange={() => onChange?.({ ...filter, presetId: preset.id })}/>
      <FilterThumbnail sample={sample} preset={preset}/><strong>{preset.name}</strong><small>{preset.description}</small>
    </label>)}</div>
    {filter.presetId !== 'original' && <div className="filter-intensity"><label htmlFor={`${id}-intensity`}>Intensity <output>{Math.round(filter.intensity * 100)}%</output></label><input id={`${id}-intensity`} type="range" min="0" max="100" step="1" value={Math.round(filter.intensity * 100)} onChange={event => onChange?.({ ...filter, intensity: Number(event.target.value) / 100 })}/></div>}
    <p className="filter-render-status small-note" role="status">{busy ? 'Updating preview…' : 'Filters change your photos. Your frame stays just as it is.'}</p>
  </fieldset>
}
