import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MaterialCard } from '../components/Cards'
import { YearHistogram } from '../components/YearHistogram'
import { TYPE_ORDER, useArchive } from '../data'
import { exploreLink } from '../filters'
import { pick, plural, t, worksForms } from '../i18n'
import type { Material } from '../types'
import { NotFound } from './NotFound'
import { EventCard } from './Events'
import { EntityChip, entityPath, MinedMark, PersonChip, Snippets } from '../components/Links'
import { FACT_LABELS } from '../roles'
import { personPath, visibleRefs } from '../data'

function worksOf(materials: Material[], id: string) {
  return materials.filter((m) => m.authorIds.includes(id))
}

function span(ms: Material[]) {
  const ys = ms.map((m) => m.year).filter((y): y is number => y != null)
  if (!ys.length) return ''
  const a = Math.min(...ys)
  const b = Math.max(...ys)
  return a === b ? `${a}` : `${a}–${b}`
}

export function Authors() {
  const { archive, lang } = useArchive()
  const [country, setCountry] = useState<string | null>(null)
  const list = archive.authors
    .map((a) => ({ a, works: worksOf(archive.materials, a.id) }))
    .filter(({ a }) => !country || a.country === country)
    .sort((x, y) => pick(x.a.name, lang).localeCompare(pick(y.a.name, lang), lang))
  const countries = [...new Set(archive.authors.map((a) => a.country).filter(Boolean))] as string[]

  return (
    <div className="page">
      <h1 className="page-title">{t('authors', lang)}</h1>
      <div className="chips chips--filter">
        <button type="button" className={`chip${!country ? ' is-on' : ''}`} onClick={() => setCountry(null)}>
          {lang === 'ru' ? 'Все' : 'All'} · {archive.authors.length}
        </button>
        {countries.map((c) => (
          <button key={c} type="button" className={`chip${country === c ? ' is-on' : ''}`} onClick={() => setCountry(country === c ? null : c)}>
            {pick(archive.terms.country.get(c)?.label, lang)} · {archive.authors.filter((a) => a.country === c).length}
          </button>
        ))}
      </div>
      <div className="author-grid">
        {list.map(({ a, works }) => (
          <Link key={a.id} to={`/authors/${a.slug}`} className="author-card">
            <div className="author-card-photo">{a.photo ? <img src={a.photo} alt="" loading="lazy" /> : null}</div>
            <div className="author-card-body">
              <strong>{pick(a.name, lang)}</strong>
              <span>{pick(a.location, lang)}</span>
              <span className="author-card-stats">
                {plural(works.length, lang, worksForms)}
                {span(works) && ` · ${span(works)}`}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function AuthorPage() {
  const { slug } = useParams()
  const { archive, lang, enriched } = useArchive()
  const a = slug ? archive.authorById.get(slug) : undefined
  const works = useMemo(() => (a ? worksOf(archive.materials, a.id).sort((x, y) => (x.year ?? 0) - (y.year ?? 0)) : []), [archive, a])
  const [tab, setTab] = useState<string>('all')
  const [range, setRange] = useState<[number | null, number | null]>([null, null])
  const [aboutOpen, setAboutOpen] = useState(false)

  if (!a) return <NotFound />

  const types = TYPE_ORDER.filter((k) => works.some((w) => w.type === k))
  const byType = tab === 'all' ? works : works.filter((w) => w.type === tab)
  const shown = byType.filter((w) => (range[0] == null || (w.year ?? 0) >= range[0]) && (range[1] == null || (w.year ?? 0) <= range[1]))
  const counts = new Map<number, number>()
  const totals = new Map<number, number>()
  for (const w of works) if (w.year) totals.set(w.year, (totals.get(w.year) ?? 0) + 1)
  for (const w of byType) if (w.year) counts.set(w.year, (counts.get(w.year) ?? 0) + 1)
  const ys = works.map((w) => w.year).filter((y): y is number => y != null)
  const backlinks = archive.personLinks.get(a.id)
  const events = [...new Set([...archive.raw.events.filter((e) => e.authorIds.includes(a.id)), ...(enriched ? (backlinks?.events ?? []).map((x) => x.item) : [])])]
  const facts = enriched ? (a.facts ?? []) : []
  const refEntities = visibleRefs(a.refs?.entities, enriched).map((r) => ({ e: archive.entityById.get(r.id), role: r.role })).filter((x) => x.e)
  const refPeople = visibleRefs(a.refs?.people, enriched).map((r) => ({ p: archive.personById.get(r.id), role: r.role })).filter((x) => x.p)
  const elsewhere = !enriched ? [] : [
    ...(backlinks?.materials ?? []).map(({ item, ref }) => ({ to: `/item/${item.type}/${item.slug}`, title: pick(item.title, lang), snippet: ref.snippet, role: ref.role })),
    ...(backlinks?.authors ?? []).map(({ item, ref }) => ({ to: `/authors/${item.slug}`, title: pick(item.name, lang), snippet: ref.snippet, role: ref.role })),
    ...(backlinks?.entities ?? []).map(({ item, ref }) => ({ to: entityPath(item), title: pick(item.name, lang), snippet: undefined, role: ref.role })),
  ]
  const themes = new Map<string, number>()
  for (const w of works) for (const k of w.keywordKeys) themes.set(k, (themes.get(k) ?? 0) + 1)
  const bio = pick(a.bio, lang)
  const about = pick(a.about, lang)

  return (
    <div className="page author">
      <nav className="crumbs" aria-label="Breadcrumbs">
        <Link to="/authors">{t('authors', lang)}</Link>
      </nav>
      <header className="author-hero">
        {a.photo && <img className="author-photo" src={a.photo} alt={pick(a.name, lang)} />}
        <div>
          <p className="kicker">{pick(a.location, lang)}</p>
          <h1 className="page-title">{pick(a.name, lang)}</h1>
          {bio && <div className="prose" dangerouslySetInnerHTML={{ __html: bio }} />}
          {about && (
            <button type="button" className="btn" onClick={() => setAboutOpen(true)}>
              {t('readMore', lang)}
            </button>
          )}
          <dl className="stats">
            <div>
              <dt>{t('works', lang)}</dt>
              <dd>{works.length}</dd>
            </div>
            {ys.length > 0 && (
              <div>
                <dt>{t('activeYears', lang)}</dt>
                <dd>{span(works)}</dd>
              </div>
            )}
            {types.map((k) => (
              <div key={k}>
                <dt>{t(k, lang)}</dt>
                <dd>{works.filter((w) => w.type === k).length}</dd>
              </div>
            ))}
          </dl>
          {facts.length > 0 && (
            <dl className="meta facts is-mined-block">
              <div className="mined-head">
                <MinedMark lang={lang} />
              </div>
              {facts.map((f, i) => {
                const [kind, target] = f.ref?.split(':') ?? []
                const to = kind === 'entity' && archive.entityById.get(target) ? entityPath(archive.entityById.get(target)!) : kind === 'person' && archive.personById.get(target) ? personPath(archive.personById.get(target)!) : undefined
                return (
                  <div key={i}>
                    <dt>{FACT_LABELS[f.k]?.[lang] ?? f.k}</dt>
                    <dd>{to ? <Link to={to}>{pick(f.v, lang)}</Link> : pick(f.v, lang)}</dd>
                  </div>
                )
              })}
            </dl>
          )}
        </div>
      </header>

      {themes.size > 0 && (
        <div className="tags tags--author">
          {[...themes]
            .sort((x, y) => y[1] - x[1])
            .map(([k, n]) => (
              <Link key={k} to={exploreLink({ author: [a.id], kw: [k] })} className="tag">
                #{pick(archive.terms.keyword.get(k)?.label, lang)} <small>{n}</small>
              </Link>
            ))}
        </div>
      )}

      {works.length > 0 && (
        <section className="author-works">
          <div className="section-head">
            <h2>{t('works', lang)}</h2>
            <Link className="text-link" to={exploreLink({ author: [a.id] })}>
              {t('explore', lang)} →
            </Link>
          </div>
          <div className="author-works-bar">
            {types.length > 1 && (
              <div className="seg seg--text" role="group">
                <button type="button" aria-pressed={tab === 'all'} onClick={() => setTab('all')}>
                  {lang === 'ru' ? 'Все' : 'All'} · {works.length}
                </button>
                {types.map((k) => (
                  <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}>
                    {t(k, lang)} · {works.filter((w) => w.type === k).length}
                  </button>
                ))}
              </div>
            )}
            {ys.length > 1 && Math.max(...ys) > Math.min(...ys) && (
              <div className="author-hist">
                <YearHistogram min={Math.min(...ys)} max={Math.max(...ys)} counts={counts} totals={totals} from={range[0]} to={range[1]} onChange={(x, y) => setRange([x, y])} lang={lang} />
              </div>
            )}
          </div>
          <div className="grid">
            {shown.map((m) => (
              <MaterialCard key={m.id} m={m} trail={shown.map((x) => x.id)} />
            ))}
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section>
          <div className="section-head">
            <h2>{t('events', lang)}</h2>
          </div>
          <div className="event-grid">
            {events.map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </div>
        </section>
      )}

      {(refEntities.length > 0 || refPeople.length > 0) && (
        <section>
          <div className="section-head">
            <h2>
              {lang === 'ru' ? 'Связи' : 'Connections'} <MinedMark lang={lang} />
            </h2>
          </div>
          <p className="muted section-note">
            {lang === 'ru' ? 'Институции, группы, проекты и люди из биографии и текстов об авторе.' : 'Institutions, groups, projects and people named in the biography and essays.'}
          </p>
          <div className="chip-links">
            {refEntities.map(({ e, role }) => (
              <EntityChip key={e!.id} e={e!} role={role === 'mention' ? undefined : role} lang={lang} />
            ))}
            {refPeople.map(({ p, role }) => (
              <PersonChip key={p!.id} p={p!} role={role} lang={lang} />
            ))}
          </div>
        </section>
      )}

      {elsewhere.length > 0 && (
        <section>
          <div className="section-head">
            <h2>
              {lang === 'ru' ? 'Упоминается в архиве' : 'Elsewhere in the archive'} <MinedMark lang={lang} />
            </h2>
          </div>
          <Snippets items={elsewhere} lang={lang} />
        </section>
      )}

      {aboutOpen && (
        <div className="sheet-backdrop" onClick={() => setAboutOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label={pick(a.name, lang)} onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <div>
                <p className="kicker">{t('aboutAuthor', lang)}</p>
                <h2>{pick(a.name, lang)}</h2>
              </div>
              <button type="button" className="icon-btn" onClick={() => setAboutOpen(false)} aria-label={t('close', lang)} autoFocus>
                ✕
              </button>
            </div>
            <div className="prose prose--long" dangerouslySetInnerHTML={{ __html: about }} />
          </div>
        </div>
      )}
    </div>
  )
}
