import { useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { MaterialCard } from '../components/Cards'
import { EntityChip, MinedMark, PdfSources, PersonChip, Snippets } from '../components/Links'
import { isOriginalRef, useArchive, visibleRefs, type Backlinks } from '../data'
import { exploreLink } from '../filters'
import { pick, plural, t, itemsForms } from '../i18n'
import { KIND_LABELS, KIND_ORDER, roleLabel } from '../roles'
import type { Entity, EntityKind } from '../types'
import { EventCard } from './Events'
import { NotFound } from './NotFound'

function linkCount(b?: Backlinks) {
  return b ? b.materials.length + b.authors.length + b.events.length : 0
}

export function Institutions() {
  const { archive, lang, enriched } = useArchive()
  const [kind, setKind] = useState<EntityKind | null>(null)
  const [country, setCountry] = useState<string | null>(null)
  const [q, setQ] = useState('')

  // exhibitions and projects are listed under Events
  const all = (enriched ? archive.entities : archive.entities.filter((e) => e.source)).filter((e) => e.kind !== 'program')
  const needle = q.trim().toLowerCase()
  const list = all
    .filter((e) => !kind || e.kind === kind)
    .filter((e) => !country || e.country === country)
    .filter((e) => !needle || `${e.name.ru} ${e.name.en} ${e.type?.ru} ${e.type?.en} ${e.location?.ru} ${e.location?.en}`.toLowerCase().includes(needle))
    .sort((a, b) => linkCount(archive.entityLinks.get(b.id)) - linkCount(archive.entityLinks.get(a.id)) || pick(a.name, lang).localeCompare(pick(b.name, lang), lang))
  const countries = [...new Set(all.map((e) => e.country).filter(Boolean))] as string[]

  return (
    <div className="page">
      <h1 className="page-title">{enriched ? (lang === 'ru' ? 'Институции и сообщества' : 'Institutions & communities') : t('institutions', lang)}</h1>
      <p className="lead page-lead">
        {!enriched
          ? lang === 'ru'
            ? 'Институции, представленные в архиве.'
            : 'Institutions represented in the archive.'
          : lang === 'ru'
            ? `Галереи, музеи, фонды, группы, площадки и учебные заведения, которые упоминаются в материалах, биографиях и событиях архива — ${all.length}. Выставки и проекты — в разделе «События». У ${archive.entities.filter((e) => e.source).length} из них есть страница на исходном сайте (✶); остальные (◇) мы собрали по текстам архива.`
            : `Galleries, museums, foundations, groups, venues and schools named in the archive's materials, biographies and events — ${all.length} in total. Exhibitions and projects are under Events. ${archive.entities.filter((e) => e.source).length} have a page on the original site (✶); the rest (◇) we compiled from the archive’s texts.`}
      </p>
      <div className="entity-filters">
        <div className="chips">
          <button type="button" className={`chip${!kind ? ' is-on' : ''}`} onClick={() => setKind(null)}>
            {lang === 'ru' ? 'Все' : 'All'} · {all.length}
          </button>
          {KIND_ORDER.filter((k) => k !== 'program').map((k) => {
            const n = all.filter((e) => e.kind === k).length
            return n ? (
              <button key={k} type="button" className={`chip${kind === k ? ' is-on' : ''}`} onClick={() => setKind(kind === k ? null : k)}>
                {KIND_LABELS[k].many[lang]} · {n}
              </button>
            ) : null
          })}
        </div>
        <div className="entity-filters-row">
          <label className="select">
            <span className="sr-only">{t('country', lang)}</span>
            <select value={country ?? ''} onChange={(e) => setCountry(e.target.value || null)}>
              <option value="">{lang === 'ru' ? 'Все страны' : 'All countries'}</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {pick(archive.terms.country.get(c)?.label, lang) || c}
                </option>
              ))}
            </select>
          </label>
          <input className="inline-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchShort', lang) + '…'} aria-label={t('searchShort', lang)} />
        </div>
      </div>
      <div className="entity-grid">
        {list.map((e) => (
          <EntityCard key={e.id} e={e} />
        ))}
      </div>
      {!list.length && (
        <div className="empty">
          <p className="empty-title">{t('noResults', lang)}</p>
        </div>
      )}
    </div>
  )
}

function EntityCard({ e }: { e: Entity }) {
  const { archive, lang, enriched } = useArchive()
  const all = archive.entityLinks.get(e.id)
  const keep = <T extends { ref: { role: string } }>(xs: T[]) => xs.filter((x) => enriched || isOriginalRef(x.ref.role))
  const b = all && { materials: keep(all.materials), authors: keep(all.authors), events: keep(all.events) }
  const parts = [
    b?.materials.length ? plural(b.materials.length, lang, itemsForms) : '',
    b?.authors.length ? `${b.authors.length} ${lang === 'ru' ? 'авт.' : b.authors.length === 1 ? 'author' : 'authors'}` : '',
    b?.events.length ? `${b.events.length} ${lang === 'ru' ? 'соб.' : b.events.length === 1 ? 'event' : 'events'}` : '',
  ].filter(Boolean)
  return (
    <Link to={`/institutions/${e.id}`} className={`entity-card entity-card--${e.kind}${e.source ? '' : ' is-mined'}`}>
      <div className="entity-card-top">
        <span className="entity-kind">{KIND_LABELS[e.kind].one[lang]}</span>
        {!enriched ? null : e.source ? (
          <span className="entity-source" title={lang === 'ru' ? 'Есть страница на сайте исходного архива' : 'Has a page on the original archive site'}>
            ✶ {lang === 'ru' ? 'архив' : 'archive'}
          </span>
        ) : (
          <MinedMark lang={lang} iconOnly />
        )}
      </div>
      {e.logo && <img src={e.logo} alt="" className="entity-card-logo" loading="lazy" />}
      <strong className="entity-card-name">{pick(e.name, lang)}</strong>
      <span className="entity-card-type">{[enriched ? pick(e.type, lang) : '', pick(e.location, lang)].filter(Boolean).join(' · ')}</span>
      {parts.length > 0 && <span className="entity-card-stats">{parts.join(' · ')}</span>}
    </Link>
  )
}

export function InstitutionPage() {
  const { slug } = useParams()
  const { pathname } = useLocation()
  const { archive, lang, enriched } = useArchive()
  const e = slug ? archive.entityById.get(slug) : undefined
  const b = e ? archive.entityLinks.get(e.id) : undefined

  const groups = useMemo(() => {
    const byRole = new Map<string, Backlinks['materials']>()
    for (const x of (b?.materials ?? []).filter((x) => enriched || isOriginalRef(x.ref.role))) {
      const key = x.ref.role.startsWith('credit:') ? 'credit' : x.ref.role
      if (!byRole.has(key)) byRole.set(key, [])
      byRole.get(key)!.push(x)
    }
    return [...byRole]
  }, [b, enriched])

  if (!e) return <NotFound />
  if (e.kind === 'program' && !pathname.startsWith('/events/')) return <Navigate to={`/events/${e.id}`} replace />
  const crumb = e.kind === 'program' ? { to: '/events', label: t('events', lang) } : { to: '/institutions', label: enriched ? (lang === 'ru' ? 'Институции и сообщества' : 'Institutions & communities') : t('institutions', lang) }
  if (!e.source && !enriched) return <NotFound />

  const desc = pick(e.description, lang)
  const mentions = !enriched ? [] : [
    ...(b?.authors ?? []).map(({ item, ref }) => ({ to: `/authors/${item.slug}`, title: pick(item.name, lang), snippet: ref.snippet, role: ref.role })),
    ...(b?.events ?? []).filter(({ ref }) => ref.role === 'mention').map(({ item, ref }) => ({ to: `/events/${item.slug}`, title: pick(item.title, lang), snippet: ref.snippet, role: ref.role })),
  ]
  const eventsLinked = enriched ? (b?.events ?? []).filter(({ ref }) => ref.role !== 'mention') : []
  const related = !enriched ? [] : [...(e.refs?.entities ?? []).map((r) => ({ ent: archive.entityById.get(r.id), role: r.role })), ...(b?.entities ?? []).map((x) => ({ ent: x.item, role: x.ref.role }))].filter(
    (x, i, arr) => x.ent && arr.findIndex((y) => y.ent?.id === x.ent!.id) === i,
  )
  const people = visibleRefs(e.refs?.people, enriched).map((r) => archive.personById.get(r.id)).filter(Boolean)
  const allMaterials = (b?.materials ?? []).map((x) => x.item)

  return (
    <div className="page entity">
      <nav className="crumbs" aria-label="Breadcrumbs">
        <Link to={crumb.to}>{crumb.label}</Link>
      </nav>
      <header className="author-hero">
        {e.logo ? <img className="author-photo author-photo--logo" src={e.logo} alt={pick(e.name, lang)} /> : <div className={`entity-mark entity-mark--${e.kind}`} aria-hidden="true">✶</div>}
        <div>
          <p className="kicker">
            {!enriched ? null : e.source ? <span className="entity-source">✶ {lang === 'ru' ? 'страница архива' : 'archive page'} · </span> : <><MinedMark lang={lang} /> · </>}
            {KIND_LABELS[e.kind].one[lang]}
            {enriched && pick(e.type, lang) ? ` · ${pick(e.type, lang)}` : ''}
            {pick(e.location, lang) ? ` · ${pick(e.location, lang)}` : ''}
            {e.year ? ` · ${e.year}` : ''}
          </p>
          <h1 className="page-title">{pick(e.name, lang)}</h1>
          {desc && (e.descriptionHtml ? <div className="prose" dangerouslySetInnerHTML={{ __html: desc }} /> : <p className="prose">{desc}</p>)}
          <dl className="meta">
            {pick(e.address, lang) && (
              <div>
                <dt>{t('address', lang)}</dt>
                <dd>{pick(e.address, lang)}</dd>
              </div>
            )}
            {((e.phones?.length ?? 0) > 0 || (e.emails?.length ?? 0) > 0) && (
              <div>
                <dt>{t('contacts', lang)}</dt>
                <dd className="stack">
                  {e.phones?.map((p) => (
                    <a key={p} href={`tel:${p.replace(/\s/g, '')}`}>
                      {p}
                    </a>
                  ))}
                  {e.emails?.map((m) => (
                    <a key={m} href={`mailto:${m}`}>
                      {m}
                    </a>
                  ))}
                </dd>
              </div>
            )}
            {e.country && (
              <div>
                <dt>{t('country', lang)}</dt>
                <dd>{pick(archive.terms.country.get(e.country)?.label, lang)}</dd>
              </div>
            )}
          </dl>
          <p className="provenance">
            {e.source ? (
              <a className="text-link" href={e.url} target="_blank" rel="noopener">
                {t('originalPage', lang)} ↗
              </a>
            ) : lang === 'ru' ? (
              'Карточка собрана по текстам архива: метаданным материалов, биографиям и описаниям событий.'
            ) : (
              'Compiled from the archive’s own texts: material metadata, biographies and event descriptions.'
            )}
          </p>
        </div>
      </header>

      {groups.map(([role, items]) => (
        <section key={role}>
          <div className="section-head">
            <h2>
              {role === 'source' ? t('archive', lang) : role === 'credit' ? (lang === 'ru' ? 'В выходных данных' : 'In the credits') : role === 'mention' ? (lang === 'ru' ? 'Упоминается в материалах' : 'Mentioned in items') : roleLabel(role, lang)}
              <span className="count"> {items.length}</span>
              {!isOriginalRef(role) && <MinedMark lang={lang} />}
            </h2>
            {items.length > 8 && (
              <Link className="text-link" to={exploreLink({ ent: [e.id] })}>
                {t('explore', lang)} →
              </Link>
            )}
          </div>
          <div className="grid">
            {items.slice(0, 24).map(({ item }) => (
              <MaterialCard key={item.id} m={item} trail={allMaterials.map((m) => m.id)} />
            ))}
          </div>
        </section>
      ))}

      {eventsLinked.length > 0 && (
        <section>
          <div className="section-head">
            <h2>
              {t('events', lang)} <MinedMark lang={lang} />
            </h2>
          </div>
          <div className="event-grid">
            {eventsLinked.map(({ item, ref }) => (
              <div key={item.id} className="event-with-role">
                <span className="role-tag">{roleLabel(ref.role, lang)}</span>
                <EventCard e={item} />
              </div>
            ))}
          </div>
        </section>
      )}

      {enriched && <PdfSources sources={e.sources} lang={lang} />}

      {mentions.length > 0 && (
        <section>
          <div className="section-head">
            <h2>
              {lang === 'ru' ? 'В текстах архива' : 'In the archive’s texts'} <MinedMark lang={lang} />
            </h2>
          </div>
          <Snippets items={mentions} lang={lang} />
        </section>
      )}

      {(people.length > 0 || related.length > 0) && (
        <section>
          <div className="section-head">
            <h2>
              {lang === 'ru' ? 'Связи' : 'Connections'} <MinedMark lang={lang} />
            </h2>
          </div>
          <div className="chip-links">
            {people.map((p) => (
              <PersonChip key={p!.id} p={p!} lang={lang} />
            ))}
            {related.map(({ ent, role }) => (
              <EntityChip key={ent!.id} e={ent!} role={role === 'mention' ? undefined : role} lang={lang} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
