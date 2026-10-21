import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useArchive } from '../data'
import { t } from '../i18n'
import { Icon } from './Icons'
import { SearchPalette } from './SearchPalette'
import { EnrichedInfo } from './EnrichedInfo'

export function Layout() {
  const { archive, lang, setLang, enriched, setEnriched } = useArchive()
  const [palette, setPalette] = useState(false)
  const [info, setInfo] = useState(false)
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
  ].filter(([to]) => enriched || to !== '/people') as [string, string][]

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        {lang === 'ru' ? 'К содержанию' : 'Skip to content'}
      </a>
      <header className="masthead">
        <div className="masthead-row">
          <Link to="/" className="brand" aria-label="Astral Nomads">
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Astral Nomads" className="brand-logo" width="245" height="52" />
          </Link>
          <p className="brand-tagline">{lang === 'ru' ? 'Архив и библиотека современного искусства Центральной Азии' : 'Archive and library of contemporary art from Central Asia'}</p>
          <div className="masthead-tools">
            <button type="button" className="search-trigger" onClick={() => setPalette(true)} aria-label={t('searchShort', lang)} title={`${t('searchShort', lang)} (⌘K)`}>
              <Icon name="search" size={20} />
            </button>
            <span className="enriched-wrap">
              <button
                type="button"
                role="switch"
                aria-checked={enriched}
                className={`enriched-switch${enriched ? ' is-on' : ''}`}
                onClick={() => {
                  setEnriched(!enriched)
                  setInfo(!enriched)
                }}
                title={
                  lang === 'ru'
                    ? 'Показывать данные, которые мы собрали по текстам архива (◇): институции, персоналии, связи, факты. Выключите, чтобы видеть только исходный архив.'
                    : 'Show data we compiled from the archive’s texts (◇): institutions, people, links, facts. Turn off to see only the original archive.'
                }
              >
                <span className="enriched-switch-box" aria-hidden="true" />
                <span className="enriched-switch-label">{lang === 'ru' ? 'Дополнения' : 'Added data'}</span>
              </button>
              {info && enriched && <EnrichedInfo onClose={() => setInfo(false)} />}
            </span>
            <div className="lang-switch" role="group" aria-label="Language">
              {(['ru', 'en'] as const).map((l) => (
                <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
        <nav className="mainnav" aria-label={lang === 'ru' ? 'Основное меню' : 'Main'}>
          <NavLink to="/" end>
            {t('home', lang)}
          </NavLink>
          {nav.map(([to, label]) => (
            <NavLink key={to} to={to}>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="footer-brand">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Astral Nomads" width="160" height="34" />
          <p>{t('tagline', lang)}</p>
        </div>
        <p className="footer-note">
          {t('dataNote', lang)} {new Date(archive.generatedAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.{' '}
          <a href={archive.raw.source} target="_blank" rel="noopener">
            {archive.raw.source.replace('https://', '')}
          </a>
        </p>
        <p className="footer-note">
          <a href={`${import.meta.env.BASE_URL}v1/`}>{lang === 'ru' ? 'Предыдущая версия интерфейса' : 'Previous version of the interface'}</a>
        </p>
        {enriched && (
        <p className="footer-note">
          <span className="mined-mark">◇</span>{' '}
          {lang === 'ru'
            ? '— дополнения: институции, персоналии, связи и факты, которые мы собрали по текстам самого архива (метаданным, биографиям, описаниям событий). Их можно скрыть переключателем «Дополнения» в шапке.'
            : '— added data: institutions, people, links and facts we compiled from the archive’s own texts (metadata, biographies, event descriptions). Hide them with the “Added data” switch in the header.'}
        </p>
        )}
      </footer>
      {palette && <SearchPalette onClose={() => setPalette(false)} />}
    </div>
  )
}
