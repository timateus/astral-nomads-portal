import { useState } from 'react'
import { t } from '../i18n'
import type { Lang } from '../types'

export interface FacetOption {
  key: string
  label: string
  count: number
  image?: string
}

interface Props {
  title: string
  options: FacetOption[]
  selected: string[]
  onToggle: (key: string) => void
  lang: Lang
  limit?: number
  /** keep the given order instead of sorting by count */
  fixedOrder?: boolean
  variant?: 'list' | 'chips' | 'people'
}

export function FacetGroup({ title, options, selected, onToggle, lang, limit = 7, fixedOrder, variant = 'list' }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [filter, setFilter] = useState('')
  const visible = options.filter((o) => o.count > 0 || selected.includes(o.key))
  if (!visible.length) return null
  const sorted = fixedOrder ? visible : [...visible].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, lang))
  const needle = filter.trim().toLowerCase()
  const filtered = needle ? sorted.filter((o) => o.label.toLowerCase().includes(needle)) : sorted
  // selected options always stay visible even when collapsed
  const shown = expanded || needle ? filtered : filtered.filter((o, i) => i < limit || selected.includes(o.key))
  const hidden = filtered.length - shown.length

  return (
    <fieldset className={`facet facet--${variant}`}>
      <legend className="facet-title">
        {title}
        {selected.length > 0 && <span className="facet-badge">{selected.length}</span>}
      </legend>
      {sorted.length > 12 && (
        <input className="facet-filter" type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="…" aria-label={`${title}: ${t('searchShort', lang)}`} />
      )}
      <div className="facet-options">
        {shown.map((o) => {
          const on = selected.includes(o.key)
          return (
            <label key={o.key} className={`facet-opt${on ? ' is-on' : ''}${o.count === 0 ? ' is-zero' : ''}`}>
              <input type="checkbox" checked={on} onChange={() => onToggle(o.key)} />
              {variant === 'people' && (o.image ? <img src={o.image} alt="" className="facet-avatar" loading="lazy" /> : <span className="facet-avatar" />)}
              <span className="facet-label">{o.label}</span>
              <span className="facet-count">{o.count}</span>
            </label>
          )
        })}
      </div>
      {(hidden > 0 || (expanded && filtered.length > limit)) && !needle && (
        <button type="button" className="link-btn facet-more" onClick={() => setExpanded(!expanded)}>
          {expanded ? t('showLess', lang) : `${t('showMore', lang)} (${hidden})`}
        </button>
      )}
    </fieldset>
  )
}
