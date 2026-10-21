import { PageHead } from '../components/PageHead'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MaterialCard, MaterialRow } from '../components/Cards'
import { FacetGroup, type FacetOption } from '../components/FacetGroup'
import { Icon } from '../components/Icons'
import { YearHistogram } from '../components/YearHistogram'
import { decadeOf, TYPE_ORDER, useArchive } from '../data'
import { activeCount, parseFilters, reshuffle, runQuery, toSearchParams, type FacetKey, type FilterState, type SortKey, type ViewKey } from '../filters'
import { itemsForms, pick, plural, t } from '../i18n'
import type { Material, Term } from '../types'

const PAGE = 48

export function Explore() {
  const { archive, lang, enriched } = useArchive()
  const [sp, setSp] = useSearchParams()
  const f = useMemo(() => parseFilters(sp), [sp])
  const result = useMemo(() => runQuery(archive, f, enriched), [archive, f, enriched])
  const totals = useMemo(() => runQuery(archive, { ...parseFilters(new URLSearchParams()) }).yearCounts, [archive])
  const [qDraft, setQDraft] = useState(f.q)
  const [drawer, setDrawer] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  const sentinel = useRef<HTMLDivElement>(null)

  const update = (patch: Partial<FilterState>, replace = false) => {
    setSp(toSearchParams({ ...f, ...patch }), { replace })
    setLimit(PAGE)
  }
  const toggle = (key: FacetKey, value: string) => {
    const cur = f.facets[key]
    update({ facets: { ...f.facets, [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] } })
  }

  // keep the input in sync on back/forward, debounce typing into the URL
  useEffect(() => setQDraft(f.q), [f.q])
  useEffect(() => {
    if (qDraft === f.q) return
    const id = setTimeout(() => update({ q: qDraft }, true), 220)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDraft])

  // infinite scroll
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver((es) => es[0].isIntersecting && setLimit((l) => l + PAGE), { rootMargin: '600px' })
    io.observe(el)
    return () => io.disconnect()
  }, [result.items.length, f.view])

  const opts = (key: FacetKey, terms: Iterable<Term>): FacetOption[] =>
    [...terms].map((term) => ({ key: term.key, label: pick(term.label, lang), count: result.counts[key].get(term.key) ?? 0 }))

  const facetPanel = (
    <div className="facets">
      <FacetGroup
        title={t('type', lang)}
        lang={lang}
        fixedOrder
        variant="chips"
        selected={f.facets.type}
        onToggle={(v) => toggle('type', v)}
        options={TYPE_ORDER.map((k) => ({ key: k, label: t(k, lang), count: result.counts.type.get(k) ?? 0 }))}
      />
      <FacetGroup
        title={t('authors', lang)}
        lang={lang}
        variant="people"
        limit={6}
        selected={f.facets.author}
        onToggle={(v) => toggle('author', v)}
        options={archive.authors.map((a) => ({ key: a.id, label: pick(a.name, lang), count: result.counts.author.get(a.id) ?? 0, image: a.photo }))}
      />
      {enriched && (
        <FacetGroup
          title={lang === 'ru' ? 'Персоналии ◇' : 'People ◇'}
          lang={lang}
          limit={6}
          selected={f.facets.person}
          onToggle={(v) => toggle('person', v)}
          options={opts('person', archive.terms.person.values())}
        />
      )}
      <FacetGroup title={t('medium', lang)} lang={lang} selected={f.facets.medium} onToggle={(v) => toggle('medium', v)} options={opts('medium', archive.terms.medium.values())} />
      <FacetGroup title={t('keywords', lang)} lang={lang} variant="chips" limit={14} selected={f.facets.kw} onToggle={(v) => toggle('kw', v)} options={opts('kw', archive.terms.keyword.values())} />
      <FacetGroup title={t('country', lang)} lang={lang} selected={f.facets.country} onToggle={(v) => toggle('country', v)} options={opts('country', archive.terms.country.values())} />
      <FacetGroup title={t('place', lang)} lang={lang} limit={5} selected={f.facets.place} onToggle={(v) => toggle('place', v)} options={opts('place', archive.terms.place.values())} />
      <FacetGroup title={t('libraryType', lang)} lang={lang} selected={f.facets.ltype} onToggle={(v) => toggle('ltype', v)} options={opts('ltype', archive.terms.libraryType.values())} />
      <FacetGroup
        title={enriched ? (lang === 'ru' ? 'Институции и проекты ◇' : 'Institutions & projects ◇') : lang === 'ru' ? 'Институция' : 'Institution'}
        lang={lang}
        limit={6}
        selected={f.facets.ent}
        onToggle={(v) => toggle('ent', v)}
        options={opts('ent', [...archive.terms.entity.values()].filter((term) => enriched || archive.entityById.get(term.key)?.source))}
      />
      <FacetGroup title={t('courtesy', lang)} lang={lang} limit={5} selected={f.facets.courtesy} onToggle={(v) => toggle('courtesy', v)} options={opts('courtesy', archive.terms.courtesy.values())} />
      <FacetGroup
        title={t('format', lang)}
        lang={lang}
        fixedOrder
        selected={f.facets.has}
        onToggle={(v) => toggle('has', v)}
        options={[
          { key: 'image', label: t('hasImage', lang), count: result.counts.has.get('image') ?? 0 },
          { key: 'pdf', label: t('hasPdf', lang), count: result.counts.has.get('pdf') ?? 0 },
          { key: 'video', label: t('hasVideo', lang), count: result.counts.has.get('video') ?? 0 },
          ...(enriched ? [{ key: 'mined', label: lang === 'ru' ? 'С найденными связями ◇' : 'With found links ◇', count: result.counts.has.get('mined') ?? 0 }] : []),
        ]}
      />
    </div>
  )

  const chips = activeChips(f, archive.terms, archive.authors, lang).filter((c) => enriched || !(c.id.startsWith('person:') || c.id === 'has:mined'))
  const n = activeCount(f)
  const trail = result.items.map((m) => m.id)
  const items = result.items.slice(0, limit)

  return (
    <div className="explore">
      <div className="explore-head">
        <PageHead title={t('explore', lang)} />
        <label className="bigsearch">
          <Icon name="search" size={22} />
          <input type="search" value={qDraft} onChange={(e) => setQDraft(e.target.value)} placeholder={t('searchPlaceholder', lang)} aria-label={t('searchShort', lang)} />
        </label>
        <YearHistogram min={archive.yearMin} max={archive.yearMax} counts={result.yearCounts} totals={totals} from={f.from} to={f.to} onChange={(from, to) => update({ from, to })} lang={lang} />
      </div>

      <div className="explore-body">
        <aside className={`explore-side${drawer ? ' is-open' : ''}`} aria-label={t('filters', lang)}>
          <div className="drawer-head">
            <strong>{t('filters', lang)}</strong>
            <button type="button" className="icon-btn" onClick={() => setDrawer(false)} aria-label={t('close', lang)}>
              <Icon name="close" />
            </button>
          </div>
          {facetPanel}
          <div className="drawer-foot">
            <button type="button" className="btn btn--primary" onClick={() => setDrawer(false)}>
              {t('showResults', lang)} · {result.items.length}
            </button>
          </div>
        </aside>

        <section className="explore-results" aria-live="polite">
          <div className="toolbar">
            <button type="button" className="btn btn--ghost filters-btn" onClick={() => setDrawer(true)}>
              <Icon name="filter" /> {t('filters', lang)}
              {n > 0 && <span className="facet-badge">{n}</span>}
            </button>
            <span className="toolbar-count">{plural(result.items.length, lang, itemsForms)}</span>
            <div className="toolbar-right">
              <label className="select">
                <span className="sr-only">Sort</span>
                <select
                  value={f.sort}
                  onChange={(e) => {
                    if (e.target.value === 'random') reshuffle()
                    update({ sort: e.target.value as SortKey })
                  }}
                >
                  <option value="relevance">{t('sortRelevance', lang)}</option>
                  <option value="year-asc">{t('sortYearAsc', lang)}</option>
                  <option value="year-desc">{t('sortYearDesc', lang)}</option>
                  <option value="title">{t('sortTitle', lang)}</option>
                  <option value="random">{t('sortRandom', lang)}</option>
                </select>
              </label>
              <div className="seg" role="group" aria-label="View">
                {(['grid', 'list', 'timeline'] as ViewKey[]).map((v) => (
                  <button key={v} type="button" aria-pressed={f.view === v} onClick={() => update({ view: v }, true)} title={t(v === 'grid' ? 'viewGrid' : v === 'list' ? 'viewList' : 'viewTimeline', lang)}>
                    <Icon name={v} />
                    <span className="sr-only">{t(v === 'grid' ? 'viewGrid' : v === 'list' ? 'viewList' : 'viewTimeline', lang)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {chips.length > 0 && (
            <div className="chips">
              {chips.map((c) => (
                <button key={c.id} type="button" className="chip is-on" onClick={() => update(c.remove(f))}>
                  {c.label} <Icon name="close" size={14} />
                </button>
              ))}
              <button type="button" className="link-btn" onClick={() => setSp(toSearchParams({ ...parseFilters(new URLSearchParams()), view: f.view, sort: f.sort }))}>
                {t('clearAll', lang)}
              </button>
            </div>
          )}

          {result.items.length === 0 ? (
            <div className="empty">
              <p className="empty-title">{t('noResults', lang)}</p>
              <p>{t('noResultsHint', lang)}</p>
            </div>
          ) : f.view === 'list' ? (
            <div className="rows">
              {items.map((m) => (
                <MaterialRow key={m.id} m={m} trail={trail} />
              ))}
            </div>
          ) : f.view === 'timeline' ? (
            <Timeline items={result.items} trail={trail} />
          ) : (
            <div className="grid">
              {items.map((m, i) => (
                <MaterialCard key={m.id} m={m} trail={trail} eager={i < 8} />
              ))}
            </div>
          )}
          {f.view !== 'timeline' && limit < result.items.length && <div ref={sentinel} className="sentinel" />}
        </section>
      </div>
    </div>
  )
}

function Timeline({ items, trail }: { items: Material[]; trail: string[] }) {
  const { lang } = useArchive()
  const byDecade = new Map<number, Map<number, Material[]>>()
  for (const m of [...items].sort((a, b) => (a.year ?? 0) - (b.year ?? 0))) {
    if (m.year == null) continue
    const d = decadeOf(m.year)
    if (!byDecade.has(d)) byDecade.set(d, new Map())
    const ym = byDecade.get(d)!
    if (!ym.has(m.year)) ym.set(m.year, [])
    ym.get(m.year)!.push(m)
  }
  return (
    <div className="timeline">
      {[...byDecade].map(([decade, years]) => (
        <section key={decade} className="tl-decade">
          <h2 className="tl-decade-title">
            {decade}
            {t('decade', lang)}
          </h2>
          {[...years].map(([year, ms]) => (
            <div key={year} className="tl-year">
              <div className="tl-year-label">
                <span>{year}</span>
                <small>{ms.length}</small>
              </div>
              <div className="tl-strip">
                {ms.map((m) => (
                  <MaterialCard key={m.id} m={m} trail={trail} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

interface Chip {
  id: string
  label: string
  remove: (f: FilterState) => Partial<FilterState>
}

function activeChips(f: FilterState, terms: ReturnType<typeof useArchive>['archive']['terms'], authors: ReturnType<typeof useArchive>['archive']['authors'], lang: 'ru' | 'en'): Chip[] {
  const out: Chip[] = []
  if (f.q) out.push({ id: 'q', label: `«${f.q}»`, remove: () => ({ q: '' }) })
  const label = (key: FacetKey, v: string): string => {
    switch (key) {
      case 'type':
        return t(v as 'artifact', lang)
      case 'author':
        return pick(authors.find((a) => a.id === v)?.name, lang) || v
      case 'country':
        return pick(terms.country.get(v)?.label, lang) || v
      case 'medium':
        return pick(terms.medium.get(v)?.label, lang) || v
      case 'kw':
        return `#${pick(terms.keyword.get(v)?.label, lang) || v}`
      case 'place':
        return pick(terms.place.get(v)?.label, lang) || v
      case 'courtesy':
        return pick(terms.courtesy.get(v)?.label, lang) || v
      case 'ltype':
        return pick(terms.libraryType.get(v)?.label, lang) || v
      case 'person':
        return pick(terms.person.get(v)?.label, lang) || v
      case 'ent':
        return pick(terms.entity.get(v)?.label, lang) || v
      case 'has':
        if (v === 'mined') return lang === 'ru' ? 'С найденными связями ◇' : 'With found links ◇'
        return t(v === 'pdf' ? 'hasPdf' : v === 'video' ? 'hasVideo' : 'hasImage', lang)
    }
  }
  for (const key of Object.keys(f.facets) as FacetKey[]) {
    for (const v of f.facets[key]) out.push({ id: `${key}:${v}`, label: label(key, v), remove: (s) => ({ facets: { ...s.facets, [key]: s.facets[key].filter((x) => x !== v) } }) })
  }
  if (f.from != null || f.to != null) out.push({ id: 'year', label: `${f.from ?? '…'}–${f.to ?? '…'}`, remove: () => ({ from: null, to: null }) })
  return out
}
