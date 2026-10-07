import { useEffect, useRef } from 'react'
import { drawFrame, photoRects } from '../services/images'
import { getFrame, getLayout } from '../data/booth'

export function Botanical({ className = '' }) {
  return <svg className={`botanical ${className}`} viewBox="0 0 250 330" fill="none" aria-hidden="true">
    <path d="M20 330C110 205 55 100 210 10M45 270C120 210 160 235 241 158M57 218C31 163 24 100 10 59" stroke="#859078" strokeWidth="2"/>
    {[[67,250,-50],[104,220,40],[143,212,-60],[187,190,35],[68,196,-30],[76,155,38],[107,112,-38],[145,69,45],[184,34,-45],[38,163,-60],[23,112,15]].map(([x,y,r],i) => <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}><path d="M0 0C-32-10-34-51 0-69 21-47 27-19 0 0Z" fill={i % 3 === 0 ? '#b5bca2' : '#7d8e72'} opacity={0.38 + i % 3 * 0.12}/><path d="M0 0V-60" stroke="#6f8062" opacity=".4"/></g>)}
  </svg>
}

export function FrameSample({ layout = 'strip', frame = 'botanical', large = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current, ctx = canvas.getContext('2d')
    const l = getLayout(layout), f = getFrame(frame)
    canvas.width = 300; canvas.height = Math.round(300 * l.height / l.width)
    ctx.fillStyle = f.bg; ctx.fillRect(0, 0, canvas.width, canvas.height)
    photoRects(layout, canvas.width, canvas.height).forEach((r, i) => {
      const gradient = ctx.createLinearGradient(r.x, r.y, r.x + r.width, r.y + r.height)
      gradient.addColorStop(0, ['#d8dfd0','#e8d4c3','#d8cdc2','#ded5c9'][i]); gradient.addColorStop(1, '#f1e8d8')
      ctx.fillStyle = gradient; ctx.fillRect(r.x, r.y, r.width, r.height)
      ctx.save(); ctx.beginPath(); ctx.rect(r.x,r.y,r.width,r.height); ctx.clip()
      ctx.fillStyle = '#8b9b7f'; ctx.globalAlpha = 0.45
      ctx.beginPath(); ctx.ellipse(r.x + r.width * 0.72,r.y + r.height * 0.7,r.width * 0.14,r.height * 0.55,-0.6,0,Math.PI*2);ctx.fill()
      ctx.fillStyle = '#f8f5ef';ctx.globalAlpha = 0.8
      ctx.beginPath();ctx.arc(r.x+r.width*.32,r.y+r.height*.4,Math.min(r.width,r.height)*.15,0,Math.PI*2);ctx.fill()
      ctx.restore()
    })
    drawFrame(ctx, canvas.width, canvas.height, frame)
    ctx.fillStyle = f.ink; ctx.font = 'italic 13px Georgia'; ctx.textAlign = 'center'; ctx.fillText('Good Memories', 150, canvas.height - 18)
  }, [layout, frame])
  return <canvas ref={ref} className={`frame-sample ${large ? 'large' : ''}`} aria-label={`${getFrame(frame).name} frame, ${getLayout(layout).name} layout`} role="img"/>
}
