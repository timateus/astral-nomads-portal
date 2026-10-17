import { Link } from 'react-router-dom'
import { materialPath, useArchive } from '../data'
import { pick, t } from '../i18n'
import type { Material } from '../types'
import { Thumb } from './Thumb'
import { setTrail } from '../trail'

function creatorLine(m: Material, names: (id: string) => string, lang: 'ru' | 'en') {
  if (m.authorIds.length) return m.authorIds.map(names).join(', ')
  return pick(m.creators, lang)
}

export function MaterialCard({ m, trail, eager }: { m: Material; trail?: string[]; eager?: boolean }) {
  const { archive, lang } = useArchive()
  const names = (id: string) => pick(archive.authorById.get(id)?.name, lang)
  const country = m.country ? pick(archive.terms.country.get(m.country)?.label, lang) : ''
  return (
    <Link to={materialPath(m)} className="card" onClick={() => trail && setTrail(trail)}>
      <Thumb m={m} lang={lang} eager={eager} />
      <div className="card-body">
        <span className="card-kicker">
          {t(`${m.type}One`, lang)}
          {m.year ? <> · {m.year}</> : null}
        </span>
        <span className="card-title">{pick(m.title, lang) || t('untitled', lang)}</span>
        <span className="card-meta">{[creatorLine(m, names, lang), country].filter(Boolean).join(' · ')}</span>
      </div>
    </Link>
  )
}

export function MaterialRow({ m, trail }: { m: Material; trail?: string[] }) {
  const { archive, lang } = useArchive()
  const names = (id: string) => pick(archive.authorById.get(id)?.name, lang)
  return (
    <Link to={materialPath(m)} className="row" onClick={() => trail && setTrail(trail)}>
      <Thumb m={m} lang={lang} />
      <span className="row-title">
        {pick(m.title, lang) || t('untitled', lang)}
        <span className="row-sub">{pick(m.medium, lang)}</span>
      </span>
      <span className="row-author">{creatorLine(m, names, lang)}</span>
      <span className="row-type">{t(`${m.type}One`, lang)}</span>
      <span className="row-year">{m.year ?? '—'}</span>
    </Link>
  )
}

/** Horizontal strip of cards with a heading and an optional "view all" link. */
export function Shelf({ title, items, to, count }: { title: string; items: Material[]; to?: string; count?: number }) {
  const { lang } = useArchive()
  if (!items.length) return null
  const trail = items.map((m) => m.id)
  return (
    <section className="shelf">
      <div className="section-head">
        <h2>{title}</h2>
        {to && (
          <Link to={to} className="text-link">
            {t('viewAll', lang)}
            {count ? ` · ${count}` : ''} →
          </Link>
        )}
      </div>
      <div className="shelf-track">
        {items.map((m) => (
          <MaterialCard key={m.id} m={m} trail={trail} />
        ))}
      </div>
    </section>
  )
}
