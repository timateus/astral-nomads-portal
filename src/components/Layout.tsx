import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useArchive } from '../data'
import { t } from '../i18n'
import { Icon } from './Icons'
import { SearchPalette } from './SearchPalette'

export function Layout() {
  const { archive, lang, setLang, enriched, setEnriched } = useArchive()
  const [palette, setPalette] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName)
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        setPalette(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!pathname.startsWith('/explore')) window.scrollTo(0, 0)
  }, [pathname])

  const nav = [
    ['/explore', t('explore', lang)],
    ['/authors', t('authors', lang)],
    ['/people', lang === 'ru' ? 'Персоналии' : 'People'],
    ['/institutions', t('institutions', lang)],
    ['/events', t('events', lang)],
  ] as const

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        {lang === 'ru' ? 'К содержанию' : 'Skip to content'}
      </a>
      <header className="masthead">
        <Link to="/" className="brand" aria-label="Astral Nomads">
          <span className="brand-mark" aria-hidden="true">✶</span>
          <span className="brand-name">Astral Nomads</span>
        </Link>
        <nav className="mainnav" aria-label={lang === 'ru' ? 'Основное меню' : 'Main'}>
          {nav.map(([to, label]) => (
            <NavLink key={to} to={to}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="masthead-tools">
          <button type="button" className="search-trigger" onClick={() => setPalette(true)}>
            <Icon name="search" size={17} />
            <span>{t('searchShort', lang)}</span>
            <kbd>⌘K</kbd>
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={enriched}
            className={`enriched-switch${enriched ? ' is-on' : ''}`}
            onClick={() => setEnriched(!enriched)}
            title={
              lang === 'ru'
                ? 'Показывать данные, которые мы собрали по текстам архива (◇): институции, персоналии, связи, факты. Выключите, чтобы видеть только исходный архив.'
                : 'Show data we compiled from the archive’s texts (◇): institutions, people, links, facts. Turn off to see only the original archive.'
            }
          >
            <span className="enriched-switch-track" aria-hidden="true">
              <span className="enriched-switch-thumb" />
            </span>
            <span className="enriched-switch-label">
              <span aria-hidden="true">◇ </span>
              {lang === 'ru' ? 'Дополнения' : 'Added data'}
            </span>
          </button>
          <div className="lang-switch" role="group" aria-label="Language">
            {(['ru', 'en'] as const).map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>
      <nav className="mobilenav" aria-label={lang === 'ru' ? 'Основное меню' : 'Main'}>
        {nav.map(([to, label]) => (
          <NavLink key={to} to={to}>
            {label}
          </NavLink>
        ))}
      </nav>
      <main id="main">
        <Outlet />
      </main>
      <footer className="footer">
        <div>
          <strong>Astral Nomads</strong>
          <p>{t('tagline', lang)}</p>
        </div>
        <p className="footer-note">
          {t('dataNote', lang)} {new Date(archive.generatedAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.{' '}
          <a href={archive.raw.source} target="_blank" rel="noopener">
            {archive.raw.source.replace('https://', '')}
          </a>
        </p>
        <p className="footer-note">
          <span className="mined-mark">◇</span>{' '}
          {lang === 'ru'
            ? '— дополнения: институции, персоналии, связи и факты, которые мы собрали по текстам самого архива (метаданным, биографиям, описаниям событий). Их можно скрыть переключателем «Дополнения» в шапке.'
            : '— added data: institutions, people, links and facts we compiled from the archive’s own texts (metadata, biographies, event descriptions). Hide them with the “Added data” switch in the header.'}
        </p>
      </footer>
      {palette && <SearchPalette onClose={() => setPalette(false)} />}
    </div>
  )
}
