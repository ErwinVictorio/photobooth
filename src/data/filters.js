export const filters = [
  { id: 'original', name: 'Original', css: 'none' },
  { id: 'warm', name: 'Warm', css: 'sepia(.18) saturate(1.18) brightness(1.03)' },
  { id: 'soft', name: 'Soft', css: 'saturate(.82) brightness(1.08) contrast(.9)' },
  { id: 'vintage', name: 'Vintage', css: 'sepia(.32) saturate(.78) contrast(.92)' },
  { id: 'bw', name: 'B&W', css: 'grayscale(1) contrast(1.08)' },
]
export const getFilter = (id) => filters.find((filter) => filter.id === id) || filters[0]
