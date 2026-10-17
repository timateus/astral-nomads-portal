import { Link, useParams } from 'react-router-dom'
import { MaterialCard } from '../components/Cards'
import { useArchive } from '../data'
import { pick, plural, t, itemsForms } from '../i18n'
import { NotFound } from './NotFound'

export function Institutions() {
  const { archive, lang } = useArchive()
  return (
    <div className="page">
      <h1 className="page-title">{t('institutions', lang)}</h1>
      <div className="author-grid">
        {archive.raw.institutions.map((i) => {
          const n = archive.materials.filter((m) => m.institutionIds.includes(i.id)).length
          return (
            <Link key={i.id} to={`/institutions/${i.slug}`} className="author-card author-card--inst">
              <div className="author-card-photo">{i.logo ? <img src={i.logo} alt="" loading="lazy" /> : null}</div>
              <div className="author-card-body">
                <strong>{pick(i.name, lang)}</strong>
                <span>{pick(i.location, lang)}</span>
                {n > 0 && <span className="author-card-stats">{plural(n, lang, itemsForms)}</span>}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function InstitutionPage() {
  const { slug } = useParams()
  const { archive, lang } = useArchive()
  const i = archive.raw.institutions.find((x) => x.slug === slug)
  if (!i) return <NotFound />
  const works = archive.materials.filter((m) => m.institutionIds.includes(i.id))
  return (
    <div className="page">
      <nav className="crumbs" aria-label="Breadcrumbs">
        <Link to="/institutions">{t('institutions', lang)}</Link>
      </nav>
      <header className="author-hero">
        {i.logo && <img className="author-photo author-photo--logo" src={i.logo} alt={pick(i.name, lang)} />}
        <div>
          <p className="kicker">{pick(i.location, lang)}</p>
          <h1 className="page-title">{pick(i.name, lang)}</h1>
          <div className="prose" dangerouslySetInnerHTML={{ __html: pick(i.description, lang) }} />
          <dl className="meta">
            {pick(i.address, lang) && (
              <div>
                <dt>{t('address', lang)}</dt>
                <dd>{pick(i.address, lang)}</dd>
              </div>
            )}
            {(i.phones.length > 0 || i.emails.length > 0) && (
              <div>
                <dt>{t('contacts', lang)}</dt>
                <dd className="stack">
                  {i.phones.map((p) => (
                    <a key={p} href={`tel:${p.replace(/\s/g, '')}`}>
                      {p}
                    </a>
                  ))}
                  {i.emails.map((e) => (
                    <a key={e} href={`mailto:${e}`}>
                      {e}
                    </a>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </header>
      {works.length > 0 && (
        <section>
          <div className="section-head">
            <h2>{t('library', lang)}</h2>
          </div>
          <div className="grid">
            {works.map((m) => (
              <MaterialCard key={m.id} m={m} trail={works.map((x) => x.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
