import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useArchive } from '../data'
import { t } from '../i18n'

export interface Crumb {
  to: string
  label: string
}

/**
 * Page heading in the original archive's manner: breadcrumbs, a centred
 * capitalised title and a rule underneath, on a full-width white band.
 */
export function PageHead({ title, crumbs = [], kicker, children }: { title: string; crumbs?: Crumb[]; kicker?: ReactNode; children?: ReactNode }) {
  const { lang } = useArchive()
  return (
    <header className="pagehead">
      <nav className="pagehead-crumbs" aria-label={lang === 'ru' ? 'Навигация' : 'Breadcrumbs'}>
        <Link to="/">{t('home', lang)}</Link>
        {crumbs.map((c) => (
          <span key={c.to}>
            <span className="sep" aria-hidden="true">
              /
            </span>
            <Link to={c.to}>{c.label}</Link>
          </span>
        ))}
      </nav>
      {kicker && <p className="pagehead-kicker">{kicker}</p>}
      <h1 className="pagehead-title">{title}</h1>
      {children && <div className="pagehead-extra">{children}</div>}
    </header>
  )
}
