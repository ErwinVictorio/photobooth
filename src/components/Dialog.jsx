import { useEffect, useRef } from 'react'
import Icon from './Icon'
export default function Dialog({ title, children, onClose }) {
  const ref = useRef(null)
  useEffect(() => { const el = ref.current; el.showModal(); return () => el.close() }, [])
  return <dialog ref={ref} onCancel={onClose} aria-labelledby="dialog-title"><div className="dialog-head"><h2 id="dialog-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><Icon name="close"/></button></div>{children}</dialog>
}
