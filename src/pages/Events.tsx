import { Link, useParams } from 'react-router-dom'
import { useArchive } from '../data'
import { pick, t } from '../i18n'
import type { ArchiveEvent } from '../types'
import { NotFound } from './NotFound'
import { MinedMark, RefChips } from '../components/Links'

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

export function Events() {
  const { archive, lang } = useArchive()
  const order = { now: 0, upcoming: 1, past: 2 }
  const events = [...archive.raw.events].sort((a, b) => order[eventStatus(a)] - order[eventStatus(b)] || (eventStatus(a) === 'past' ? (b.start ?? '').localeCompare(a.start ?? '') : (a.start ?? '').localeCompare(b.start ?? '')))
  const groups = (['now', 'upcoming', 'past'] as const).map((s) => [s, events.filter((e) => eventStatus(e) === s)] as const).filter(([, es]) => es.length)
  return (
    <div className="page">
      <h1 className="page-title">{t('events', lang)}</h1>
      {groups.map(([s, es]) => (
        <section key={s}>
          <div className="section-head">
            <h2>{t(s, lang)}</h2>
          </div>
          <div className="event-grid">
            {es.map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export function EventPage() {
  const { slug } = useParams()
  const { archive, lang, enriched } = useArchive()
  const e = archive.raw.events.find((x) => x.slug === slug)
  if (!e) return <NotFound />
  const status = eventStatus(e)
  const authors = e.authorIds.map((id) => archive.authorById.get(id)).filter(Boolean)
  // the original site lists authors; curators, other participants and venues come from our reading of the text
  const minedRefs = { entities: e.refs?.entities ?? [], people: (e.refs?.people ?? []).filter((r) => !e.authorIds.includes(r.id)) }
  const others = archive.raw.events.filter((x) => x.id !== e.id)
  return (
    <div className="page event">
      <nav className="crumbs" aria-label="Breadcrumbs">
        <Link to="/events">{t('events', lang)}</Link>
      </nav>
      <header className="event-hero">
        {e.image && <img src={e.image} alt="" className="event-hero-img" />}
        <div>
          <p className="kicker">
            <span className={`badge badge--${status}`}>{t(status, lang)}</span>{' '}
            {e.labels[lang]?.filter((l) => !/^(Скоро|Сейчас|Прошло|Upcoming|Now on|Past)$/.test(l)).join(' · ')}
          </p>
          <h1 className="page-title">{pick(e.title, lang)}</h1>
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
