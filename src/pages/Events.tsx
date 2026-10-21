import { Link, useParams } from 'react-router-dom'
import { useArchive } from '../data'
import { itemsForms, pick, plural, t } from '../i18n'
import type { ArchiveEvent, Entity } from '../types'
import { NotFound } from './NotFound'
import { PageHead } from '../components/PageHead'
import { MinedMark, RefChips } from '../components/Links'
import { InstitutionPage } from './Institutions'

/** Status from the dates (the source labels go stale), falling back to the label. */
export function eventStatus(e: ArchiveEvent, today = new Date().toISOString().slice(0, 10)): 'upcoming' | 'now' | 'past' {
  if (e.start && e.end) return today < e.start ? 'upcoming' : today > e.end ? 'past' : 'now'
  const l = e.labels.ru ?? []
  return l.includes('Скоро') ? 'upcoming' : l.includes('Сейчас') ? 'now' : 'past'
}

export function EventCard({ e }: { e: ArchiveEvent }) {
  const { lang } = useArchive()
  const status = eventStatus(e)
  return (
    <Link to={`/events/${e.slug}`} className="event-card">
      <div className="event-card-img">
        {e.image ? <img src={e.image} alt="" loading="lazy" /> : <span className="event-card-ph">✶</span>}
        <span className={`badge badge--${status}`}>{t(status, lang)}</span>
      </div>
      <div className="event-card-body">
        <strong>{pick(e.title, lang)}</strong>
        <span>{pick(e.dateText, lang)}</span>
        <span className="muted">{pick(e.location, lang)}</span>
      </div>
    </Link>
  )
}

type ChronicleRow =
  | { kind: 'event'; year: number | null; e: ArchiveEvent }
  | { kind: 'program'; year: number | null; p: Entity }

function eventYear(e: ArchiveEvent) {
  return e.start ? Number(e.start.slice(0, 4)) : null
}

export function Events() {
  const { archive, lang, enriched } = useArchive()
  const current = archive.raw.events
    .filter((e) => eventStatus(e) !== 'past')
    .sort((a, b) => (eventStatus(a) === 'now' ? -1 : 0) - (eventStatus(b) === 'now' ? -1 : 0) || (a.start ?? '').localeCompare(b.start ?? ''))

  // past events from the archive + exhibitions and projects we found in its texts and PDFs
  const rows: ChronicleRow[] = [
    ...archive.raw.events.filter((e) => eventStatus(e) === 'past').map((e) => ({ kind: 'event' as const, year: eventYear(e), e })),
    ...(enriched ? archive.entities.filter((x) => x.kind === 'program').map((p) => ({ kind: 'program' as const, year: p.year ?? null, p })) : []),
  ]
  const title = (r: ChronicleRow) => (r.kind === 'event' ? pick(r.e.title, lang) : pick(r.p.name, lang))
  const dated = rows.filter((r) => r.year != null).sort((a, b) => a.year! - b.year! || title(a).localeCompare(title(b), lang))
  const undated = rows.filter((r) => r.year == null).sort((a, b) => title(a).localeCompare(title(b), lang))
  const decades = new Map<number, ChronicleRow[]>()
  for (const r of dated) {
    const d = Math.floor(r.year! / 10) * 10
    if (!decades.has(d)) decades.set(d, [])
    decades.get(d)!.push(r)
  }
  const span = dated.length ? `${dated[0].year}–${dated[dated.length - 1].year}` : ''

  return (
    <div className="page">
      <PageHead title={t('events', lang)} />
      {current.length > 0 && (
        <section>
          <div className="section-head">
            <h2>{lang === 'ru' ? 'Сейчас и скоро' : 'Now & upcoming'}</h2>
          </div>
          <div className="event-grid">
            {current.map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="section-head">
          <h2>
            {lang === 'ru' ? 'Хроника' : 'Chronicle'} {span && <span className="count">{span}</span>}
          </h2>
          {enriched && (
            <span className="muted chronicle-legend">
              <span className="entity-source">✶</span> {lang === 'ru' ? 'страница архива' : 'archive page'}
              {'  '}
              <MinedMark lang={lang} iconOnly /> {lang === 'ru' ? 'найдено в текстах и PDF' : 'found in texts and PDFs'}
            </span>
          )}
        </div>
        {[...decades].map(([decade, rs]) => (
          <div key={decade} className="chronicle-decade">
            <h3 className="chronicle-decade-title">
              {decade}
              {t('decade', lang)}
            </h3>
            <ul className="chronicle">
              {rs.map((r) => (
                <ChronicleItem key={r.kind === 'event' ? r.e.id : r.p.id} r={r} />
              ))}
            </ul>
          </div>
        ))}
      </section>

      {undated.length > 0 && (
        <section>
          <div className="section-head">
            <h2>
              {lang === 'ru' ? 'Регулярные и без точной даты' : 'Recurring & undated'} <MinedMark lang={lang} />
            </h2>
          </div>
          <ul className="chronicle chronicle--undated">
            {undated.map((r) => (
              <ChronicleItem key={r.kind === 'event' ? r.e.id : r.p.id} r={r} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function ChronicleItem({ r }: { r: ChronicleRow }) {
  const { archive, lang, enriched } = useArchive()
  if (r.kind === 'event') {
    const e = r.e
    return (
      <li>
        <Link to={`/events/${e.slug}`} className="chronicle-row">
          <span className="chronicle-year">{r.year ?? '—'}</span>
          <span className="chronicle-main">
            <strong>{pick(e.title, lang)}</strong>
            <small>{[pick(e.dateText, lang), pick(e.location, lang)].filter(Boolean).join(' · ')}</small>
          </span>
          {enriched && <span className="entity-source">✶</span>}
        </Link>
      </li>
    )
  }
  const p = r.p
  const b = archive.entityLinks.get(p.id)
  const n = b ? b.materials.length : 0
  const place = pick(p.location, lang) || (p.country ? pick(archive.terms.country.get(p.country)?.label, lang) : '')
  return (
    <li>
      <Link to={`/events/${p.id}`} className="chronicle-row is-mined">
        <span className="chronicle-year">{r.year ?? ''}</span>
        <span className="chronicle-main">
          <strong>{pick(p.name, lang)}</strong>
          <small>{[pick(p.type, lang), place, n ? plural(n, lang, itemsForms) : ''].filter(Boolean).join(' · ')}</small>
        </span>
        <MinedMark lang={lang} iconOnly />
      </Link>
    </li>
  )
}

export function EventPage() {
  const { slug } = useParams()
  const { archive, lang, enriched } = useArchive()
  const e = archive.raw.events.find((x) => x.slug === slug)
  // exhibitions and projects found in the archive's texts live under /events too
  if (!e && enriched && slug && archive.entityById.get(slug)?.kind === 'program') return <InstitutionPage />
  if (!e) return <NotFound />
  const status = eventStatus(e)
  const authors = e.authorIds.map((id) => archive.authorById.get(id)).filter(Boolean)
  // the original site lists authors; curators, other participants and venues come from our reading of the text
  const minedRefs = { entities: e.refs?.entities ?? [], people: (e.refs?.people ?? []).filter((r) => !e.authorIds.includes(r.id)) }
  const others = archive.raw.events.filter((x) => x.id !== e.id)
  return (
    <div className="page event">
      <PageHead title={pick(e.title, lang)} crumbs={[{ to: '/events', label: t('events', lang) }]} />
      <header className="event-hero">
        {e.image && <img src={e.image} alt="" className="event-hero-img" />}
        <div>
          <p className="kicker">
            <span className={`badge badge--${status}`}>{t(status, lang)}</span>{' '}
            {e.labels[lang]?.filter((l) => !/^(Скоро|Сейчас|Прошло|Upcoming|Now on|Past)$/.test(l)).join(' · ')}
          </p>
          <p className="lead">{pick(e.lead, lang)}</p>
          <dl className="meta meta--inline">
            <div>
              <dt>{lang === 'ru' ? 'Даты' : 'Dates'}</dt>
              <dd>{pick(e.dateText, lang)}</dd>
            </div>
            <div>
              <dt>{lang === 'ru' ? 'Место' : 'Location'}</dt>
              <dd>{pick(e.location, lang)}</dd>
            </div>
          </dl>
        </div>
      </header>
      <div className="prose event-body" dangerouslySetInnerHTML={{ __html: pick(e.description, lang) }} />
      {authors.length > 0 && (
        <section>
          <div className="section-head">
            <h2>{t('authors', lang)}</h2>
          </div>
          <div className="people people--wide">
            {authors.map((p) => (
              <Link key={p!.id} to={`/authors/${p!.slug}`} className="person">
                {p!.photo ? <img src={p!.photo} alt="" /> : <span className="person-ph" />}
                <span>
                  <strong>{pick(p!.name, lang)}</strong>
                  <small>{pick(p!.location, lang)}</small>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {enriched && minedRefs.entities.length + minedRefs.people.length > 0 && (
        <section>
          <div className="section-head">
            <h2>
              {lang === 'ru' ? 'Участники и институции' : 'People & institutions'} <MinedMark lang={lang} />
            </h2>
          </div>
          <RefChips refs={minedRefs} lang={lang} />
        </section>
      )}
      <section>
        <div className="section-head">
          <h2>{lang === 'ru' ? 'Другие события' : 'Other events'}</h2>
        </div>
        <div className="event-grid">
          {others.map((x) => (
            <EventCard key={x.id} e={x} />
          ))}
        </div>
      </section>
    </div>
  )
}
