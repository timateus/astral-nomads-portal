import type { Archive } from './data'
import type { Material } from './types'

export type FacetKey = 'type' | 'author' | 'country' | 'medium' | 'kw' | 'place' | 'courtesy' | 'ltype' | 'ent' | 'has'
export const FACET_KEYS: FacetKey[] = ['type', 'author', 'country', 'medium', 'kw', 'place', 'courtesy', 'ltype', 'ent', 'has']
export type SortKey = 'relevance' | 'year-asc' | 'year-desc' | 'title' | 'random'
export type ViewKey = 'grid' | 'list' | 'timeline'

export interface FilterState {
  q: string
  facets: Record<FacetKey, string[]>
  from: number | null
  to: number | null
  sort: SortKey
  view: ViewKey
}

export function parseFilters(sp: URLSearchParams): FilterState {
  const facets = Object.fromEntries(FACET_KEYS.map((k) => [k, sp.getAll(k)])) as Record<FacetKey, string[]>
  const num = (v: string | null) => (v && /^\d{4}$/.test(v) ? Number(v) : null)
  return {
    q: sp.get('q') ?? '',
    facets,
    from: num(sp.get('from')),
    to: num(sp.get('to')),
    sort: (sp.get('sort') as SortKey) || 'relevance',
    view: (sp.get('view') as ViewKey) || 'grid',
  }
}

export function toSearchParams(f: FilterState): URLSearchParams {
  const sp = new URLSearchParams()
  if (f.q) sp.set('q', f.q)
  for (const k of FACET_KEYS) for (const v of f.facets[k]) sp.append(k, v)
  if (f.from != null) sp.set('from', String(f.from))
  if (f.to != null) sp.set('to', String(f.to))
  if (f.sort !== 'relevance') sp.set('sort', f.sort)
  if (f.view !== 'grid') sp.set('view', f.view)
  return sp
}

export function emptyFilters(): FilterState {
  return parseFilters(new URLSearchParams())
}

/** Build an /explore link for a single facet value, e.g. exploreLink({ kw: ['поэзия'] }). */
export function exploreLink(facets: Partial<Record<FacetKey, string[]>>, extra?: { from?: number; to?: number; q?: string }) {
  const f = emptyFilters()
  Object.assign(f.facets, facets)
  if (extra?.from) f.from = extra.from
  if (extra?.to) f.to = extra.to
  if (extra?.q) f.q = extra.q
  const s = toSearchParams(f).toString()
  return `/explore${s ? `?${s}` : ''}`
}

export function activeCount(f: FilterState) {
  return FACET_KEYS.reduce((n, k) => n + f.facets[k].length, 0) + (f.from != null || f.to != null ? 1 : 0) + (f.q ? 1 : 0)
}

export function valuesOf(m: Material, key: FacetKey, enriched = true): string[] {
  switch (key) {
    case 'type':
      return [m.type]
    case 'author':
      return m.authorIds
    case 'country':
      return m.country ? [m.country] : []
    case 'medium':
      return m.mediums
    case 'kw':
      return m.keywordKeys
    case 'place':
      return m.placeKey ? [m.placeKey] : []
    case 'courtesy':
      return m.courtesyKey ? [m.courtesyKey] : []
    case 'ltype':
      return m.materialType ? [m.materialType] : []
    case 'ent':
      return enriched ? m.entityKeys : m.sourceEntityKeys
    case 'has': {
      const out: string[] = []
      if (m.pdf) out.push('pdf')
      if (m.video) out.push('video')
      if (m.image) out.push('image')
      return out
    }
  }
}

function matchesFacet(m: Material, key: FacetKey, selected: string[], enriched: boolean) {
  if (!selected.length) return true
  const vals = valuesOf(m, key, enriched)
  // "has" is a set of requirements (AND); every other facet is OR within itself
  return key === 'has' ? selected.every((s) => vals.includes(s)) : selected.some((s) => vals.includes(s))
}

function matchesYear(m: Material, f: FilterState) {
  if (f.from == null && f.to == null) return true
  if (m.year == null) return false
  return (f.from == null || m.year >= f.from) && (f.to == null || m.year <= f.to)
}

export interface Result {
  items: Material[]
  /** facet → value → count, computed with that facet's own selection removed */
  counts: Record<FacetKey, Map<string, number>>
  /** year → count with the year filter removed */
  yearCounts: Map<number, number>
  scores: Map<string, number> | null
}

function searchIds(archive: Archive, q: string): Map<string, number> | null {
  const query = q.trim()
  if (!query) return null
  let hits = archive.search.search(query)
  if (!hits.length) hits = archive.search.search(query, { combineWith: 'OR' })
  return new Map(hits.map((h) => [String(h.id), h.score]))
}

let shuffleSeed = Math.random()
export function reshuffle() {
  shuffleSeed = Math.random()
}
function seeded(id: string) {
  let h = Math.floor(shuffleSeed * 2 ** 31)
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 2654435761)
  return (h >>> 0) / 2 ** 32
}

export function runQuery(archive: Archive, f: FilterState, enriched = true): Result {
  const scores = searchIds(archive, f.q)
  const base = scores ? archive.materials.filter((m) => scores.has(m.id)) : archive.materials

  const counts = Object.fromEntries(FACET_KEYS.map((k) => [k, new Map<string, number>()])) as Result['counts']
  const yearCounts = new Map<number, number>()
  const items: Material[] = []

  for (const m of base) {
    const fails = FACET_KEYS.filter((k) => !matchesFacet(m, k, f.facets[k], enriched))
    const yearOk = matchesYear(m, f)
    if (fails.length === 0 && yearOk) items.push(m)
    // disjunctive counts: an item counts towards facet K if it passes every *other* filter
    for (const k of FACET_KEYS) {
      if (!yearOk || fails.some((x) => x !== k)) continue
      for (const v of valuesOf(m, k, enriched)) counts[k].set(v, (counts[k].get(v) ?? 0) + 1)
    }
    if (fails.length === 0 && m.year != null) yearCounts.set(m.year, (yearCounts.get(m.year) ?? 0) + 1)
  }

  const title = (m: Material) => m.title.ru ?? m.title.en ?? ''
  const byYear = (a: Material, b: Material) => (a.year ?? 9999) - (b.year ?? 9999) || title(a).localeCompare(title(b), 'ru')
  switch (f.sort) {
    case 'year-asc':
      items.sort(byYear)
      break
    case 'year-desc':
      items.sort((a, b) => -byYear(a, b))
      break
    case 'title':
      items.sort((a, b) => title(a).localeCompare(title(b), 'ru'))
      break
    case 'random':
      items.sort((a, b) => seeded(a.id) - seeded(b.id))
      break
    default:
      if (scores) items.sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))
      else items.sort((a, b) => Number(!!b.image) - Number(!!a.image) || byYear(a, b))
  }
  return { items, counts, yearCounts, scores }
}

/** Items sharing authors / themes / mediums / decade with `m`, best first. */
export function related(archive: Archive, m: Material, limit = 8): Material[] {
  const scored: [Material, number][] = []
  for (const o of archive.materials) {
    if (o.id === m.id) continue
    let s = 0
    s += o.keywordKeys.filter((k) => m.keywordKeys.includes(k)).length * 2
    s += o.mediums.filter((k) => m.mediums.includes(k)).length
    if (o.year && m.year && Math.abs(o.year - m.year) <= 3) s += 1.5
    if (o.type === m.type) s += 0.5
    if (o.authorIds.some((a) => m.authorIds.includes(a))) s += 0.5
    if (!o.image) s -= 1
    if (s > 0) scored.push([o, s + seeded(o.id) * 0.5])
  }
  return scored.sort((a, b) => b[1] - a[1]).slice(0, limit).map(([o]) => o)
}
