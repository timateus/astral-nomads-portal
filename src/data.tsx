import MiniSearch from 'minisearch'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ArchiveEvent, Author, Bi, Entity, Lang, Material, Person, RawArchive, RawMaterial, Ref, Term } from './types'

/** Medium categories, matched against the free-text "technique" field in both languages. */
const MEDIUMS: { key: string; label: Bi; re: RegExp }[] = [
  { key: 'drawing', label: { ru: 'Рисунок', en: 'Drawing' }, re: /рисун|drawing/i },
  { key: 'painting', label: { ru: 'Живопись', en: 'Painting' }, re: /живопис|холст|painting|canvas/i },
  { key: 'video', label: { ru: 'Видео', en: 'Video' }, re: /видео|video|кино|film/i },
  { key: 'installation', label: { ru: 'Инсталляция', en: 'Installation' }, re: /инсталляц|installation/i },
  { key: 'object', label: { ru: 'Объект', en: 'Object' }, re: /объект|глин|фанер|object|clay/i },
  { key: 'album', label: { ru: 'Альбом / блокнот', en: 'Album / notebook' }, re: /альбом|блокнот|album|notebook/i },
  { key: 'collage', label: { ru: 'Коллаж', en: 'Collage' }, re: /коллаж|collage/i },
  { key: 'photo', label: { ru: 'Фотография', en: 'Photography' }, re: /фото|photo/i },
  { key: 'environment', label: { ru: 'Энвайронмент', en: 'Environment' }, re: /энвайронмент|environment/i },
  { key: 'text', label: { ru: 'Текст', en: 'Text' }, re: /текст|записи|\btext/i },
  { key: 'publication', label: { ru: 'Публикация', en: 'Publication' }, re: /публикац|сборник|каталог|publication|catalogue/i },
]

export const TYPE_ORDER = ['artifact', 'library', 'multimedia'] as const

export interface Backlinks {
  materials: { item: Material; ref: Ref }[]
  authors: { item: Author; ref: Ref }[]
  events: { item: ArchiveEvent; ref: Ref }[]
  entities: { item: Entity; ref: Ref }[]
}

export interface Archive {
  raw: RawArchive
  entities: Entity[]
  entityById: Map<string, Entity>
  people: Person[]
  personById: Map<string, Person>
  /** who links to an entity / a person, with the role of each link */
  entityLinks: Map<string, Backlinks>
  personLinks: Map<string, Backlinks>
  materials: Material[]
  byId: Map<string, Material>
  authors: Author[]
  authorById: Map<string, Author>
  terms: {
    medium: Map<string, Term>
    keyword: Map<string, Term>
    place: Map<string, Term>
    courtesy: Map<string, Term>
    country: Map<string, Term>
    libraryType: Map<string, Term>
    entity: Map<string, Term>
    person: Map<string, Term>
  }
  yearMin: number
  yearMax: number
  search: MiniSearch
  generatedAt: string
}

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()
const slugKey = (s: string) => norm(s).replace(/[«»"'“”().]/g, '').replace(/\s*\+\s*/g, '+')

function cleanPlace(s: string) {
  // "г. Алматы", "г.Караганда", "Галерея LOOK, Алматы, Казахстан" → first city-ish segment
  const parts = s.split(/[,–-]/).map((p) => p.replace(/^\s*г\.\s*/i, '').trim()).filter(Boolean)
  if (!parts.length) return ''
  // prefer a segment that is a known city over a venue name
  const known = parts.find((p) => /^(Алматы|Almaty|Караганда|Karagand|Ташкент|Tashkent|Бишкек|Bishkek|Душанбе|Dushanbe|Ош|Osh|Фергана|Fergh?ana|Лондон|London|Манчестер|Manchester|Москва|Moscow)/i.test(p))
  return known ?? parts[0]
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function build(raw: RawArchive): Archive {
  const medium = new Map<string, Term>(MEDIUMS.map((m) => [m.key, { key: m.key, label: m.label }]))
  const keyword = new Map<string, Term>()
  const place = new Map<string, Term>()
  const courtesy = new Map<string, Term>()
  const country = new Map<string, Term>(Object.entries(raw.facets.countries).map(([k, label]) => [k, { key: k, label }]))
  const libraryType = new Map<string, Term>(Object.entries(raw.facets.libraryTypes).map(([k, label]) => [k, { key: k, label }]))
  libraryType.set('other', { key: 'other', label: { ru: 'Другое', en: 'Other' } })

  // the source tags many works with the artist's surname; the author facet already covers that
  const authorWords = new Set(raw.authors.flatMap((a) => `${a.name.ru ?? ''} ${a.name.en ?? ''}`.split(/\s+/).map(slugKey)))

  const materials: Material[] = raw.materials.map((m: RawMaterial) => {
    const medText = `${m.medium?.ru ?? ''} ${m.medium?.en ?? ''}`
    const mediums = MEDIUMS.filter((x) => x.re.test(medText)).map((x) => x.key)
    if (m.type === 'multimedia' && !mediums.includes('video')) mediums.push('video')

    const ru = m.keywords.ru ?? []
    const en = m.keywords.en ?? []
    const aligned = ru.length === en.length
    const keywordKeys: string[] = []
    ru.forEach((k, i) => {
      const key = slugKey(k)
      if (!key || keywordKeys.includes(key) || authorWords.has(key)) return
      keywordKeys.push(key)
      const existing = keyword.get(key)
      if (!existing) keyword.set(key, { key, label: { ru: capitalize(k), en: aligned && en[i] ? capitalize(en[i]) : undefined } })
      else if (!existing.label.en && aligned && en[i]) existing.label.en = capitalize(en[i])
    })

    let placeKey: string | undefined
    const pr = cleanPlace(m.place?.ru ?? '')
    if (pr) {
      placeKey = slugKey(pr)
      if (!place.has(placeKey)) place.set(placeKey, { key: placeKey, label: { ru: pr, en: cleanPlace(m.place?.en ?? '') || undefined } })
    }

    let courtesyKey: string | undefined
    const cr = m.courtesy?.ru?.trim()
    if (cr) {
      courtesyKey = slugKey(cr)
      if (!courtesy.has(courtesyKey)) courtesy.set(courtesyKey, { key: courtesyKey, label: { ru: capitalize(cr), en: m.courtesy?.en ? capitalize(m.courtesy.en) : undefined } })
    }

    const entityKeys = (m.refs?.entities ?? []).map((r) => r.id)
    const sourceEntityKeys = (m.refs?.entities ?? []).filter((r) => r.role === 'source').map((r) => r.id)
    const personKeys = (m.refs?.people ?? []).map((r) => r.id)
    // courtesy / place links only restate the item's own fields, so they don't count as found links
    const minedLinks = (m.refs?.entities ?? []).filter((r) => !['source', 'courtesy', 'place'].includes(r.role)).length + personKeys.length
    return { ...m, materialType: m.type === 'library' ? m.materialType ?? 'other' : m.materialType, mediums, keywordKeys, placeKey, courtesyKey, entityKeys, sourceEntityKeys, personKeys, minedLinks }
  })

  const entities = raw.entities ?? []
  const people = raw.people ?? []
  const entityById = new Map(entities.map((e) => [e.id, e]))
  const personById = new Map(people.map((p) => [p.id, p]))
  const entityLinks = new Map<string, Backlinks>()
  const personLinks = new Map<string, Backlinks>()
  const slot = (map: Map<string, Backlinks>, id: string) => {
    let b = map.get(id)
    if (!b) map.set(id, (b = { materials: [], authors: [], events: [], entities: [] }))
    return b
  }
  const collect = <T extends { refs?: RawMaterial['refs'] }>(items: T[], key: keyof Backlinks) => {
    for (const item of items) {
      for (const ref of item.refs?.entities ?? []) (slot(entityLinks, ref.id)[key] as unknown as { item: T; ref: Ref }[]).push({ item, ref })
      for (const ref of item.refs?.people ?? []) (slot(personLinks, ref.id)[key] as unknown as { item: T; ref: Ref }[]).push({ item, ref })
    }
  }
  collect(materials, 'materials')
  collect(raw.authors, 'authors')
  collect(raw.events, 'events')
  collect(entities, 'entities')
  const entity = new Map<string, Term>(entities.map((e) => [e.id, { key: e.id, label: e.name }]))
  const person = new Map<string, Term>(people.filter((p) => !p.authorId).map((p) => [p.id, { key: p.id, label: p.name }]))

  const years = materials.map((m) => m.year).filter((y): y is number => y != null)

  const authorById = new Map(raw.authors.map((a) => [a.id, a]))
  const search = new MiniSearch({
    fields: ['title', 'creators', 'keywords', 'medium', 'description', 'place', 'extra'],
    storeFields: [],
    processTerm: (term) => norm(term),
    searchOptions: { boost: { title: 4, creators: 3, keywords: 2.5, medium: 1.5 }, prefix: true, fuzzy: 0.2, combineWith: 'AND' },
  })
  search.addAll(
    materials.map((m) => {
      const both = (v?: Bi) => `${v?.ru ?? ''} ${v?.en ?? ''}`
      return {
        id: m.id,
        title: `${both(m.title)} ${both(m.originalTitle)}`,
        creators: `${both(m.creators)} ${m.authorIds.map((id) => both(authorById.get(id)?.name)).join(' ')}`,
        keywords: [...(m.keywords.ru ?? []), ...(m.keywords.en ?? [])].join(' '),
        medium: both(m.medium),
        description: both(m.description),
        place: both(m.place),
        extra: [
          both(m.courtesy),
          both(m.publisher),
          both(m.artists),
          m.year ?? '',
          ...(m.refs?.entities ?? []).map((r) => both(raw.entities?.find((e) => e.id === r.id)?.name)),
          ...(m.refs?.people ?? []).map((r) => both(raw.people?.find((p) => p.id === r.id)?.name)),
        ].join(' '),
      }
    }),
  )

  return {
    raw,
    materials,
    byId: new Map(materials.map((m) => [m.id, m])),
    authors: raw.authors,
    authorById,
    terms: { medium, keyword, place, courtesy, country, libraryType, entity, person },
    entities,
    entityById,
    people,
    personById,
    entityLinks,
    personLinks,
    yearMin: Math.min(...years),
    yearMax: Math.max(...years),
    search,
    generatedAt: raw.generatedAt,
  }
}

interface Ctx {
  archive: Archive | null
  error: string | null
  lang: Lang
  setLang: (l: Lang) => void
  /** show data we derived from the archive's texts (not published as such by the original site) */
  enriched: boolean
  setEnriched: (v: boolean) => void
}

const ArchiveContext = createContext<Ctx>({ archive: null, error: null, lang: 'ru', setLang: () => {}, enriched: false, setEnriched: () => {} })

/** Added data is opt-in: off unless this visitor turned it on. */
function initialEnriched(): boolean {
  try {
    return localStorage.getItem('an-enriched') === 'on'
  } catch {
    return false
  }
}

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('an-lang')
    if (saved === 'ru' || saved === 'en') return saved
  } catch {
    /* storage unavailable */
  }
  return 'ru'
}

export function ArchiveProvider({ children }: { children: ReactNode }) {
  const [archive, setArchive] = useState<Archive | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lang, setLangState] = useState<Lang>(initialLang)
  const [enriched, setEnrichedState] = useState<boolean>(initialEnriched)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/archive.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((raw: RawArchive) => setArchive(build(raw)))
      .catch((e) => setError(String(e)))
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo<Ctx>(
    () => ({
      archive,
      error,
      lang,
      setLang: (l) => {
        setLangState(l)
        try {
          localStorage.setItem('an-lang', l)
        } catch {
          /* storage unavailable */
        }
      },
      enriched,
      setEnriched: (v) => {
        setEnrichedState(v)
        try {
          localStorage.setItem('an-enriched', v ? 'on' : 'off')
        } catch {
          /* storage unavailable */
        }
      },
    }),
    [archive, error, lang, enriched],
  )
  return <ArchiveContext.Provider value={value}>{children}</ArchiveContext.Provider>
}

export function useArchiveCtx() {
  return useContext(ArchiveContext)
}

/** For components rendered only after the archive has loaded. */
export function useArchive() {
  const ctx = useContext(ArchiveContext)
  if (!ctx.archive) throw new Error('archive not loaded')
  return { archive: ctx.archive, lang: ctx.lang, setLang: ctx.setLang, enriched: ctx.enriched, setEnriched: ctx.setEnriched }
}

/**
 * Provenance. Original = published by the source archive: its materials, authors, events,
 * its 3 institution pages and the links it shows between them (role "source").
 * Everything else in `refs`, the curated entities, people and author facts is ours.
 */
export function isOriginalRef(role: string) {
  return role === 'source'
}

export function visibleRefs<T extends { role: string }>(refs: T[] | undefined, enriched: boolean): T[] {
  return (refs ?? []).filter((r) => enriched || isOriginalRef(r.role))
}

export function materialPath(m: { type: string; slug: string }) {
  return `/item/${m.type}/${m.slug}`
}

export function personPath(p: Person) {
  return p.authorId ? `/authors/${p.authorId}` : `/people/${p.id}`
}

export function decadeOf(year: number) {
  return Math.floor(year / 10) * 10
}
