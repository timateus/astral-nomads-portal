import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Shelf } from '../components/Cards'
import { Icon } from '../components/Icons'
import { Lightbox } from '../components/Lightbox'
import { MinedMark, RefChips } from '../components/Links'
import { Thumb } from '../components/Thumb'
import { isOriginalRef, materialPath, useArchive, visibleRefs } from '../data'
import { exploreLink, related } from '../filters'
import { pick, t, type StringKey } from '../i18n'
import { getTrail } from '../trail'
import type { Bi } from '../types'
import { NotFound } from './NotFound'

function youtubeId(url: string) {
  return url.match(/(?:embed\/|v=|youtu\.be\/)([\w-]{11})/)?.[1]
}

function formatSize(bytes: number) {
  return bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.round(bytes / 1e3)} KB`
}

export function Item() {
  const { type, slug } = useParams()
  const { archive, lang, enriched } = useArchive()
  const navigate = useNavigate()
  const m = archive.byId.get(`${type}:${slug}`)
  const [zoom, setZoom] = useState(false)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    setPlaying(false)
    setZoom(false)
  }, [m?.id])

  const trail = getTrail()
  const pos = m ? trail.indexOf(m.id) : -1
  const prev = pos > 0 ? archive.byId.get(trail[pos - 1]) : undefined
  const next = pos >= 0 && pos < trail.length - 1 ? archive.byId.get(trail[pos + 1]) : undefined

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName) || zoom) return
      if (e.key === 'ArrowLeft' && prev) navigate(materialPath(prev), { replace: true })
      if (e.key === 'ArrowRight' && next) navigate(materialPath(next), { replace: true })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, navigate, zoom])

  const shelves = useMemo(() => {
    if (!m) return null
    const byAuthor = archive.materials.filter((o) => o.id !== m.id && o.authorIds.some((a) => m.authorIds.includes(a)))
    const sameYear = m.year ? archive.materials.filter((o) => o.id !== m.id && o.year === m.year && !byAuthor.includes(o)) : []
    return { byAuthor, related: related(archive, m, 12), sameYear }
  }, [archive, m])

  if (!m) return <NotFound />

  const title = pick(m.title, lang) || t('untitled', lang)
  const vid = m.video ? youtubeId(m.video) : undefined
  const authors = m.authorIds.map((id) => archive.authorById.get(id)!).filter(Boolean)
  const section = m.type

  const rows: [string, ReactNode][] = []
  const add = (k: StringKey, v: Bi | string | undefined, link?: string) => {
    const s = typeof v === 'string' ? v : pick(v, lang)
    if (s) rows.push([t(k, lang), link ? <Link to={link}>{s}</Link> : s])
  }
  // people listed as chips below make the long name lists redundant
  const listedPeople = enriched && (m.refs?.people ?? []).some((r) => r.role === 'artist')
  if (pick(m.originalTitle, lang) !== title) add('originalTitle', m.originalTitle)
  if (!authors.length && !listedPeople) add('creators', m.creators)
  if (m.mediums.length) {
    rows.push([
      t('medium', lang),
      <>
        {pick(m.medium, lang)}
        <span className="dd-tags">
          {m.mediums.map((k) => (
            <Link key={k} to={exploreLink({ medium: [k] })} className="tag">
              {pick(archive.terms.medium.get(k)?.label, lang)}
            </Link>
          ))}
        </span>
      </>,
    ])
  } else add('medium', m.medium)
  add('dimensions', m.dimensions)
  if (m.year) rows.push([t('yearCreated', lang), <Link to={exploreLink({}, { from: m.year, to: m.year })}>{pick(m.yearText, lang) || m.year}</Link>])
  add('place', m.place, m.placeKey ? exploreLink({ place: [m.placeKey] }) : undefined)
  if (m.country) add('country', archive.terms.country.get(m.country)?.label, exploreLink({ country: [m.country] }))
  add('editors', m.editors)
  if (!listedPeople) add('artists', m.artists)
  add('publisher', m.publisher)
  add('languages', m.languages)
  add('pages', m.pages)
  add('printRun', m.printRun)
  add('cover', m.cover)
  if (m.materialType && m.materialType !== 'other') add('libraryType', archive.terms.libraryType.get(m.materialType)?.label, exploreLink({ ltype: [m.materialType] }))
  add('courtesy', m.courtesy, m.courtesyKey ? exploreLink({ courtesy: [m.courtesyKey] }) : undefined)
  for (const [role, value] of m.credits?.[lang] ?? m.credits?.[lang === 'ru' ? 'en' : 'ru'] ?? []) rows.push([role, value])
  const shownRefs = { entities: visibleRefs(m.refs?.entities, enriched), people: visibleRefs(m.refs?.people, enriched) }
  const hasRefs = shownRefs.entities.length + shownRefs.people.length > 0
  const refsAllOriginal = [...shownRefs.entities, ...shownRefs.people].every((r) => isOriginalRef(r.role))

  return (
    <article className="item">
      <nav className="crumbs" aria-label="Breadcrumbs">
        <Link to="/explore">{t('explore', lang)}</Link>
        <span aria-hidden="true">/</span>
        <Link to={exploreLink({ type: [section] })}>{t(section, lang)}</Link>
        {pos >= 0 && (
          <span className="crumbs-pager">
            <button type="button" className="icon-btn" disabled={!prev} onClick={() => prev && navigate(materialPath(prev), { replace: true })} aria-label={t('prev', lang)} title="←">
              <Icon name="arrow-left" />
            </button>
            <span>
              {pos + 1} / {trail.length}
            </span>
            <button type="button" className="icon-btn" disabled={!next} onClick={() => next && navigate(materialPath(next), { replace: true })} aria-label={t('next', lang)} title="→">
              <Icon name="arrow-right" />
            </button>
          </span>
        )}
      </nav>

      <div className="item-grid">
        <div className="item-media">
          {vid ? (
            playing ? (
              <div className="video">
                <iframe src={`https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&rel=0`} title={title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
              </div>
            ) : (
              <button type="button" className="video video--poster" onClick={() => setPlaying(true)} aria-label={`${t('watch', lang)}: ${title}`}>
                <Thumb m={m} lang={lang} eager />
                <span className="play-big">
                  <Icon name="play" size={30} />
                </span>
              </button>
            )
          ) : m.image ? (
            <button type="button" className="item-image" onClick={() => setZoom(true)} aria-label={`${t('zoom', lang)}: ${title}`}>
              <img src={m.image} alt={title} />
              <span className="zoom-hint">
                <Icon name="zoom" size={16} /> {t('zoom', lang)}
              </span>
            </button>
          ) : (
            <Thumb m={m} lang={lang} />
          )}
          <div className="item-actions">
            {m.pdf && (
              <a className="btn btn--primary" href={m.pdf} rel="nofollow">
                <Icon name="download" /> {t('download', lang)}
                {m.pdfSize ? <small>{formatSize(m.pdfSize)}</small> : null}
              </a>
            )}
            {m.readable && (
              <a className="btn" href={m.url} target="_blank" rel="noopener">
                <Icon name="book" /> {t('readOnline', lang)}
              </a>
            )}
          </div>
        </div>

        <div className="item-info">
          <p className="kicker">
            <Link to={exploreLink({ type: [section] })}>{t(`${section}One`, lang)}</Link>
            {m.year ? (
              <>
                {' · '}
                <Link to={exploreLink({}, { from: m.year, to: m.year })}>{m.year}</Link>
              </>
            ) : null}
          </p>
          <h1 className="item-title">{title}</h1>
          {authors.length > 0 && (
            <div className="people">
              {authors.map((p) => {
                return (
                  <Link key={p.id} to={`/authors/${p.slug}`} className="person">
                    {p.photo ? <img src={p.photo} alt="" /> : <span className="person-ph" />}
                    <span>
                      <strong>{pick(p.name, lang)}</strong>
                      <small>{pick(p.location, lang)}</small>
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
          {pick(m.description, lang) && <p className="item-desc">{pick(m.description, lang)}</p>}
          <dl className="meta">
            {rows.map(([k, v], i) => (
              <div key={`${k}-${i}`}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {m.keywordKeys.length > 0 && (
            <div className="tags">
              {m.keywordKeys.map((k) => (
                <Link key={k} to={exploreLink({ kw: [k] })} className="tag">
                  #{pick(archive.terms.keyword.get(k)?.label, lang)}
                </Link>
              ))}
            </div>
          )}
          {hasRefs && (
            <div className="item-refs">
              <h2 className="facet-title">
                {lang === 'ru' ? 'Люди и институции' : 'People & institutions'}
                {!refsAllOriginal && <MinedMark lang={lang} />}
              </h2>
              <RefChips refs={shownRefs} lang={lang} />
            </div>
          )}
          <a className="text-link source-link" href={m.url} target="_blank" rel="noopener">
            {t('originalPage', lang)} <Icon name="arrow-up-right" size={14} />
          </a>
        </div>
      </div>

      {shelves && (
        <>
          {authors.length > 0 && <Shelf title={`${t('moreByAuthor', lang)}: ${authors.map((a) => pick(a.name, lang)).join(', ')}`} items={shelves.byAuthor.slice(0, 16)} count={shelves.byAuthor.length} to={exploreLink({ author: m.authorIds })} />}
          <Shelf title={t('similar', lang)} items={shelves.related} />
          {m.year && <Shelf title={`${t('sameYear', lang)} · ${m.year}`} items={shelves.sameYear.slice(0, 16)} count={shelves.sameYear.length} to={exploreLink({}, { from: m.year, to: m.year })} />}
        </>
      )}

      {zoom && m.image && <Lightbox src={m.imageLarge ?? m.image} alt={title} onClose={() => setZoom(false)} lang={lang} />}
    </article>
  )
}
