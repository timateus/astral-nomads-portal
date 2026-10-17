import { useRef, useState } from 'react'
import { t } from '../i18n'
import type { Lang } from '../types'

interface Props {
  min: number
  max: number
  /** counts under the current filters */
  counts: Map<number, number>
  /** counts across the whole archive (drawn as ghost bars) */
  totals: Map<number, number>
  from: number | null
  to: number | null
  onChange: (from: number | null, to: number | null) => void
  lang: Lang
  compact?: boolean
}

/** Year distribution with drag-to-select range. Heights use a sqrt scale: 1990 alone holds half the archive. */
export function YearHistogram({ min, max, counts, totals, from, to, onChange, lang, compact }: Props) {
  const years = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  const peak = Math.max(1, ...totals.values())
  const scale = (n: number) => (n ? Math.max(6, Math.sqrt(n / peak) * 100) : 0)
  const ref = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ a: number; b: number } | null>(null)
  const [hover, setHover] = useState<number | null>(null)

  const yearAt = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect()
    const i = Math.round(((clientX - r.left) / r.width) * (years.length - 1))
    return years[Math.max(0, Math.min(years.length - 1, i))]
  }

  const lo = drag ? Math.min(drag.a, drag.b) : from
  const hi = drag ? Math.max(drag.a, drag.b) : to
  const hasRange = lo != null || hi != null
  const inRange = (y: number) => !hasRange || ((lo == null || y >= lo) && (hi == null || y <= hi))
  const shown = hover ?? null

  return (
    <div className={`hist${compact ? ' hist--compact' : ''}`}>
      <div
        ref={ref}
        className="hist-bars"
        role="slider"
        tabIndex={0}
        aria-label={t('year', lang)}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={lo ?? min}
        aria-valuetext={hasRange ? `${lo ?? min}–${hi ?? max}` : t('yearsAll', lang)}
        onPointerDown={(e) => {
          ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
          const y = yearAt(e.clientX)
          setDrag({ a: y, b: y })
        }}
        onPointerMove={(e) => {
          const y = yearAt(e.clientX)
          setHover(y)
          if (drag) setDrag({ ...drag, b: y })
        }}
        onPointerLeave={() => setHover(null)}
        onPointerUp={() => {
          if (!drag) return
          const a = Math.min(drag.a, drag.b)
          const b = Math.max(drag.a, drag.b)
          setDrag(null)
          // tapping the only selected year again clears the selection
          if (a === b && from === a && to === b) onChange(null, null)
          else onChange(a, b)
        }}
        onKeyDown={(e) => {
          const cur = lo ?? min
          if (e.key === 'ArrowLeft') onChange(Math.max(min, cur - 1), hi ?? max)
          if (e.key === 'ArrowRight') onChange(Math.min(max, cur + 1), hi ?? max)
          if (e.key === 'Escape') onChange(null, null)
        }}
      >
        {years.map((y) => (
          <div key={y} className={`hist-col${inRange(y) ? ' is-in' : ''}${shown === y ? ' is-hover' : ''}`}>
            <span className="hist-ghost" style={{ height: `${scale(totals.get(y) ?? 0)}%` }} />
            <span className="hist-bar" style={{ transform: `scaleY(${scale(counts.get(y) ?? 0) / 100})` }} />
          </div>
        ))}
        {shown != null && (
          <span className="hist-tip" style={{ left: `${((shown - min) / (max - min || 1)) * 100}%` }}>
            {shown}: {counts.get(shown) ?? 0}
          </span>
        )}
      </div>
      <div className="hist-axis">
        {years
          .filter((y) => y % 10 === 0 || y === min)
          .map((y) => (
            <span key={y} style={{ left: `${((y - min) / (max - min || 1)) * 100}%` }}>
              {y % 10 === 0 ? y : ''}
            </span>
          ))}
      </div>
      {!compact && (
        <div className="hist-foot">
          <span>{hasRange ? `${lo ?? min} – ${hi ?? max}` : t('dragToSelect', lang)}</span>
          {hasRange && !drag && (
            <button type="button" className="link-btn" onClick={() => onChange(null, null)}>
              {t('yearsAll', lang)}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
