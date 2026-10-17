import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { materialPath, useArchive } from '../data'
import { exploreLink } from '../filters'
import { pick, t } from '../i18n'
import { Icon } from './Icons'
import { setTrail } from '../trail'

interface Hit {
  group: string
  label: string
  sub?: string
  image?: string
  to: string
}

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е')

export function SearchPalette({ onClose }: { onClose: () => void }) {
  const { archive, lang, enriched } = useArchive()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const hits = useMemo<Hit[]>(() => {
    const needle = norm(q.trim())
    if (!needle) {
      // starting points when empty
      return archive.authors.slice(0, 6).map((a) => ({ group: t('authors', lang), label: pick(a.name, lang), sub: pick(a.location, lang), image: a.photo, to: `/authors/${a.slug}` }))
    }
    const out: Hit[] = []
    const has = (v?: string) => !!v && norm(v).includes(needle)
    for (const a of archive.authors) {
      if (has(a.name.ru) || has(a.name.en)) out.push({ group: t('authors', lang), label: pick(a.name, lang), sub: pick(a.location, lang), image: a.photo, to: `/authors/${a.slug}` })
    }
    for (const term of archive.terms.keyword.values()) {
      if (has(term.label.ru) || has(term.label.en)) out.push({ group: t('keywords', lang), label: pick(term.label, lang), to: exploreLink({ kw: [term.key] }) })
    }
    for (const term of archive.terms.medium.values()) {
      if (has(term.label.ru) || has(term.label.en)) out.push({ group: t('medium', lang), label: pick(term.label, lang), to: exploreLink({ medium: [term.key] }) })
    }
    for (const e of archive.raw.events) {
      if (has(e.title.ru) || has(e.title.en)) out.push({ group: t('events', lang), label: pick(e.title, lang), sub: pick(e.dateText, lang), image: e.image, to: `/events/${e.slug}` })
    }
    for (const e of archive.entities) {
      if (!enriched && !e.source) continue
      if (has(e.name.ru) || has(e.name.en)) out.push({ group: t('institutions', lang), label: pick(e.name, lang), sub: [pick(e.type, lang), pick(e.location, lang)].filter(Boolean).join(' · '), image: e.logo, to: `/institutions/${e.id}` })
    }
    for (const p of archive.people) {
      if (enriched && !p.authorId && (has(p.name.ru) || has(p.name.en))) out.push({ group: lang === 'ru' ? 'Персоналии' : 'People', label: pick(p.name, lang), sub: pick(p.name, lang === 'ru' ? 'en' : 'ru'), to: `/people/${p.id}` })
    }
    const grouped = out.slice(0, 12)
    const ids = archive.search.search(q.trim()).slice(0, 8)
    for (const h of ids) {
      const m = archive.byId.get(String(h.id))
      if (!m) continue
      grouped.push({
        group: t('archive', lang),
        label: pick(m.title, lang),
        sub: [m.authorIds.map((id) => pick(archive.authorById.get(id)?.name, lang)).join(', '), m.year].filter(Boolean).join(' · '),
        image: m.image,
        to: materialPath(m),
      })
    }
    return grouped
  }, [q, archive, lang, enriched])

  useEffect(() => setActive(0), [q])

  const go = (to: string) => {
    onClose()
    if (to.startsWith('/item/')) setTrail(hits.filter((h) => h.to.startsWith('/item/')).map((h) => h.to.replace(/^\/item\/(\w+)\/(.+)$/, '$1:$2')))
    navigate(to)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(hits.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (e.metaKey || e.ctrlKey || !hits[active]) go(exploreLink({}, { q: q.trim() }))
      else go(hits[active].to)
    }
  }

  let lastGroup = ''
  return createPortal(
    <div className="palette-backdrop" onClick={onClose}>
      <div className="palette" role="dialog" aria-modal="true" aria-label={t('searchShort', lang)} onClick={(e) => e.stopPropagation()} onKeyDown={onKey}>
        <div className="palette-input">
          <Icon name="search" size={20} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('searchPlaceholder', lang)}
            aria-label={t('searchShort', lang)}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={hits[active] ? `ph-${active}` : undefined}
          />
          <kbd>esc</kbd>
        </div>
        <ul className="palette-list" id="palette-list" role="listbox">
          {hits.map((h, i) => {
            const head = h.group !== lastGroup ? h.group : null
            lastGroup = h.group
            return (
              <li key={`${h.to}-${i}`} role="presentation">
                {head && <div className="palette-group">{head}</div>}
                <button id={`ph-${i}`} type="button" role="option" aria-selected={i === active} className={`palette-hit${i === active ? ' is-active' : ''}`} onMouseEnter={() => setActive(i)} onClick={() => go(h.to)}>
                  {h.image ? <img src={h.image} alt="" loading="lazy" /> : <span className="palette-hit-ph" />}
                  <span className="palette-hit-text">
                    <span>{h.label}</span>
                    {h.sub && <small>{h.sub}</small>}
                  </span>
                </button>
              </li>
            )
          })}
          {q.trim() && !hits.length && <li className="palette-empty">{t('noResults', lang)}</li>}
        </ul>
        {q.trim() && (
          <button type="button" className="palette-foot" onClick={() => go(exploreLink({}, { q: q.trim() }))}>
            {t('pressEnter', lang).replace('Enter', '⌘ Enter')} →
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
