import type { MaterialType } from '../types'

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const s = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true }
  switch (name) {
    case 'search':
      return <svg {...s}><circle cx="11" cy="11" r="6.5" {...P} /><path d="m20 20-4.2-4.2" {...P} /></svg>
    case 'close':
      return <svg {...s}><path d="M6 6l12 12M18 6 6 18" {...P} /></svg>
    case 'grid':
      return <svg {...s}><rect x="4" y="4" width="6.5" height="6.5" rx="1" {...P} /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1" {...P} /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1" {...P} /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" {...P} /></svg>
    case 'list':
      return <svg {...s}><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" {...P} /></svg>
    case 'timeline':
      return <svg {...s}><path d="M3 12h18M7 8v8M12 5v14M17 9v6" {...P} /></svg>
    case 'filter':
      return <svg {...s}><path d="M4 6h16M7 12h10M10 18h4" {...P} /></svg>
    case 'arrow-left':
      return <svg {...s}><path d="M15 5l-7 7 7 7" {...P} /></svg>
    case 'arrow-right':
      return <svg {...s}><path d="M9 5l7 7-7 7" {...P} /></svg>
    case 'arrow-up-right':
      return <svg {...s}><path d="M7 17 17 7M8 7h9v9" {...P} /></svg>
    case 'download':
      return <svg {...s}><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" {...P} /></svg>
    case 'play':
      return <svg {...s}><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></svg>
    case 'shuffle':
      return <svg {...s}><path d="M4 7h3.5c4 0 5 10 9 10H20M4 17h3.5c1.6 0 2.7-1.6 3.6-3.6M13 10.6c.9-1.9 2-3.6 3.5-3.6H20M17.5 4.5 20 7l-2.5 2.5M17.5 14.5 20 17l-2.5 2.5" {...P} /></svg>
    case 'zoom':
      return <svg {...s}><circle cx="11" cy="11" r="6.5" {...P} /><path d="m20 20-4.2-4.2M8.5 11h5M11 8.5v5" {...P} /></svg>
    case 'book':
      return <svg {...s}><path d="M5 4.5h9.5A4.5 4.5 0 0 1 19 9v10.5H9.5A4.5 4.5 0 0 1 5 15z M9 4.5v15" {...P} /></svg>
    default:
      return null
  }
}

export function TypeGlyph({ type }: { type: MaterialType }) {
  const s = { width: 28, height: 28, viewBox: '0 0 24 24', 'aria-hidden': true, className: 'type-glyph' }
  if (type === 'library') return <svg {...s}><path d="M5 4.5h9.5A4.5 4.5 0 0 1 19 9v10.5H9.5A4.5 4.5 0 0 1 5 15z M9 4.5v15" {...P} /></svg>
  if (type === 'multimedia') return <svg {...s}><rect x="3.5" y="6" width="17" height="12" rx="2" {...P} /><path d="M10.5 9.5v5l4-2.5z" {...P} /></svg>
  return <svg {...s}><rect x="4.5" y="4.5" width="15" height="15" rx="1" {...P} /><path d="m4.5 16 4.5-4.5 4 4 2.5-2.5 4 4" {...P} /></svg>
}
