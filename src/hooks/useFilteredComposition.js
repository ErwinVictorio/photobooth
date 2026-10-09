import { useEffect, useState } from 'react'

// The caller owns the selection; request identity prevents stale exports.
export default function useFilteredComposition(render, enabled, source) {
  const [state, setState] = useState({ blob: null, error: '', request: null, source: null })
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let disposed = false
    const timer = setTimeout(() => {
      render().then(blob => { if (!disposed) setState({ blob, error: '', request: render, source }) })
        .catch(error => { if (!disposed) setState(previous => ({ blob: previous.source === source ? previous.blob : null, error: error.message || 'Preview could not render.', request: render, source })) })
    }, 150)
    return () => { disposed = true; clearTimeout(timer) }
  }, [render, enabled, retry, source])
  const current = state.request === render
  return { blob: state.source === source ? state.blob : null, error: current ? state.error : '', busy: enabled && !current, ready: enabled && current && Boolean(state.blob) && !state.error, retry: () => { setState(previous => ({ ...previous, request: null })); setRetry(value => value + 1) } }
}
