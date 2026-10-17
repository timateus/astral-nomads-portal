import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MaterialCard, Shelf } from '../components/Cards'
import { Icon } from '../components/Icons'
import { decadeOf, materialPath, useArchive } from '../data'
import { exploreLink } from '../filters'
import { pick, plural, t, worksForms } from '../i18n'
import { setTrail } from '../trail'
import type { Material } from '../types'
import { EventCard, eventStatus } from './Events'

function sample<T>(arr: T[], n: number) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}

export function Home() {
  const { archive, lang } = useArchive()
  const navigate = useNavigate()
  const withImg = useMemo(() => archive.materials.filter((m) => m.image), [archive])
  const [picks, setPicks] = useState(() => sample(withImg, 10))

  const decades = useMemo(() => {
    const map = new Map<number, Material[]>()
    for (const m of archive.materials) {
      if (m.year == null) continue
      const d = decadeOf(m.year)
      if (!map.has(d)) map.set(d, [])
      map.get(d)!.push(m)
    }
    return [...map].sort((a, b) => a[0] - b[0])
  }, [archive])
  const maxDecade = Math.max(...decades.map(([, ms]) => ms.length))

  const themes = useMemo(() => {
    const c = new Map<string, number>()
    for (const m of archive.materials) for (const k of m.keywordKeys) c.set(k, (c.get(k) ?? 0) + 1)
    return [...c].sort((a, b) => b[1] - a[1]).slice(0, 36)
  }, [archive])
  const maxTheme = themes[0]?.[1] ?? 1

  const mediums = useMemo(
    () =>
      [...archive.terms.medium.values()]
        .map((term) => {
          const ms = archive.materials.filter((m) => m.mediums.includes(term.key))
          return { term, count: ms.length, cover: ms.find((m) => m.image && m.type !== 'multimedia') ?? ms.find((m) => m.image) }
        })
        .filter((x) => x.count > 0)
        .sort((a, b) => b.count - a.count),
    [archive],
  )

  const library = archive.materials.filter((m) => m.type === 'library')
  const multimedia = archive.materials.filter((m) => m.type === 'multimedia')
  const events = archive.raw.events.filter((e) => eventStatus(e) !== 'past')

  const surprise = () => {
    const m = withImg[Math.floor(Math.random() * withImg.length)]
    setTrail(sample(withImg, 40).map((x) => x.id).filter((id) => id !== m.id).concat(m.id).reverse())
    navigate(materialPath(m))
  }

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-text">
          <p className="kicker">{t('tagline', lang)}</p>
          <h1 className="hero-title">
            {lang === 'ru' ? (
              <>
                От самиздата <br />
                до видео-арта
              </>
            ) : (
              <>
                From samizdat <br />
                to video art
              </>
            )}
          </h1>
          <p className="hero-lead">
            {lang === 'ru'
              ? 'Книги, рисунки, живопись, видео, авторы и институции региона — пять десятилетий искусства, собранные в один открытый архив.'
              : 'Books, drawings, paintings, video, artists and institutions of the region — five decades of art in one open archive.'}
          </p>
          <div className="hero-actions">
            <Link to="/explore" className="btn btn--primary btn--lg">
              {t('explore', lang)} →
            </Link>
            <button type="button" className="btn btn--lg" onClick={surprise}>
              <Icon name="shuffle" /> {t('surprise', lang)}
            </button>
          </div>
          <dl className="hero-stats">
            <div>
              <dd>{archive.materials.length}</dd>
              <dt>{t('items', lang)}</dt>
            </div>
            <div>
              <dd>{archive.authors.length}</dd>
              <dt>{t('authors', lang).toLowerCase()}</dt>
            </div>
            <div>
              <dd>
                {archive.yearMin}–{archive.yearMax}
              </dd>
              <dt>{t('year', lang).toLowerCase()}</dt>
            </div>
          </dl>
        </div>
        <div className="hero-mosaic" aria-hidden="true">
          {picks.slice(0, 5).map((m) => (
            <Link key={m.id} to={materialPath(m)} tabIndex={-1} onClick={() => setTrail(picks.map((p) => p.id))}>
              <img src={m.image} alt="" />
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>{t('browseByDecade', lang)}</h2>
          <Link className="text-link" to={exploreLink({}) + '?view=timeline'}>
            {t('timeline', lang)} →
          </Link>
        </div>
        <div className="decades">
          {decades.map(([d, ms]) => {
            const covers = ms.filter((m) => m.image).slice(0, 3)
            return (
              <Link key={d} to={exploreLink({}, { from: d, to: d + 9 })} className="decade">
                <div className="decade-covers">
                  {covers.map((m) => (
                    <img key={m.id} src={m.image} alt="" loading="lazy" />
                  ))}
                </div>
                <div className="decade-label">
                  <strong>
                    {d}
                    {t('decade', lang)}
                  </strong>
                  <span>{plural(ms.length, lang, { ru: ['материал', 'материала', 'материалов'], en: ['item', 'items'] })}</span>
                </div>
                <span className="decade-meter" style={{ width: `${Math.max(6, (ms.length / maxDecade) * 100)}%` }} />
              </Link>
            )
          })}
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>{t('authors', lang)}</h2>
          <Link className="text-link" to="/authors">
            {t('viewAll', lang)} →
          </Link>
        </div>
        <div className="portraits">
          {archive.authors.map((a) => {
            const n = archive.materials.filter((m) => m.authorIds.includes(a.id)).length
            return (
              <Link key={a.id} to={`/authors/${a.slug}`} className="portrait">
                {a.photo ? <img src={a.photo} alt="" loading="lazy" /> : <span className="person-ph" />}
                <strong>{pick(a.name, lang)}</strong>
                <span>{pick(a.location, lang)}</span>
                {n > 0 && <small>{plural(n, lang, worksForms)}</small>}
              </Link>
            )
          })}
        </div>
      </section>

      <section className="split">
        <div>
          <div className="section-head">
            <h2>{t('browseByTheme', lang)}</h2>
          </div>
          <div className="cloud">
            {themes.map(([k, n]) => (
              <Link key={k} to={exploreLink({ kw: [k] })} className="cloud-term" style={{ fontSize: `${0.9 + Math.sqrt(n / maxTheme) * 1.1}rem` }}>
                {pick(archive.terms.keyword.get(k)?.label, lang)}
                <small>{n}</small>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="section-head">
            <h2>{t('browseByMedium', lang)}</h2>
          </div>
          <div className="mediums">
            {mediums.map(({ term, count, cover }) => (
              <Link key={term.key} to={exploreLink({ medium: [term.key] })} className="medium">
                {cover?.image ? <img src={cover.image} alt="" loading="lazy" /> : <span />}
                <strong>{pick(term.label, lang)}</strong>
                <small>{count}</small>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Shelf title={t('library', lang)} items={library} to={exploreLink({ type: ['library'] })} count={library.length} />
      <Shelf title={t('multimedia', lang)} items={multimedia} to={exploreLink({ type: ['multimedia'] })} count={multimedia.length} />

      {events.length > 0 && (
        <section>
          <div className="section-head">
            <h2>{t('events', lang)}</h2>
            <Link className="text-link" to="/events">
              {t('viewAll', lang)} →
            </Link>
          </div>
          <div className="event-grid">
            {events.map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="section-head">
          <h2>{t('fromTheArchive', lang)}</h2>
          <button type="button" className="btn btn--ghost" onClick={() => setPicks(sample(withImg, 10))}>
            <Icon name="shuffle" /> {t('sortRandom', lang)}
          </button>
        </div>
        <div className="grid grid--loose">
          {picks.map((m) => (
            <MaterialCard key={m.id} m={m} trail={picks.map((p) => p.id)} />
          ))}
        </div>
      </section>
    </div>
  )
}
