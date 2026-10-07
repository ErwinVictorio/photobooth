const paths = {
  camera: <><path d="M14 4h-4L8 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-4z"/><circle cx="12" cy="13" r="4"/></>,
  arrow: <><path d="M4 12h16m-6-6 6 6-6 6"/></>,
  back: <path d="M20 12H4m6-6-6 6 6 6"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  home: <><path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z"/></>,
  gallery: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><path d="m3 17 5-5 4 4 4-6 5 7"/></>,
  settings: <><path d="m10 3-1 3-3 1-3 3v4l3 3 3 1 1 3h4l1-3 3-1 3-3v-4l-3-3-3-1-1-3z"/><circle cx="12" cy="12" r="3"/></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
  share: <><path d="M12 15V2m-4 4 4-4 4 4M7 10H4v12h16V10h-3"/></>,
  print: <><path d="M6 8V2h12v6M6 17H3V8h18v9h-3M6 14h12v8H6z"/></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5M5 7a8 8 0 0 1 14-2l1 3M4 16l1 3a8 8 0 0 0 14-2"/></>,
  heart: <path d="M20 4c-3-2-6 0-8 2-2-2-5-4-8-2-5 4 1 10 8 16 7-6 13-12 8-16z"/>,
  smile: <><circle cx="12" cy="12" r="9"/><path d="M8 9h.01M16 9h.01M7 14q5 6 10 0"/></>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  expand: <path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></>,
  leaf: <><path d="M20 3C9 2 2 8 5 15s16 5 15-12ZM4 21 16 8"/></>,
}
export default function Icon({ name, size = 22, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.camera}</svg>
}
