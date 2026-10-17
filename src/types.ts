export type Lang = 'ru' | 'en'
export type Bi = Partial<Record<Lang, string>>
export type BiList = Partial<Record<Lang, string[]>>

export type MaterialType = 'artifact' | 'library' | 'multimedia'

export interface Ref {
  id: string
  /** e.g. "courtesy", "venue", "mention", "credit:Монтаж", "fact:education" */
  role: string
  snippet?: string
}

export interface Refs {
  entities?: Ref[]
  people?: Ref[]
}

export type EntityKind = 'institution' | 'group' | 'program' | 'venue' | 'education'

export interface Entity {
  id: string
  kind: EntityKind
  /** has its own page on the source site */
  source: boolean
  url?: string
  name: Bi
  type?: Bi
  location?: Bi
  city?: Bi
  country: string | null
  year?: number
  description?: Bi
  descriptionHtml?: boolean
  address?: Bi
  logo?: string
  phones?: string[]
  emails?: string[]
  refs?: Refs
  sources?: Source[]
}

/** Where a curated entity or person is named in a material's PDF */
export interface Source {
  material: string
  page: number | string
  note?: string
}

export interface Person {
  id: string
  name: Bi
  authorId?: string
  sources?: Source[]
}

export interface Fact {
  k: string
  v: Bi
  ref?: string
}

export interface RawMaterial {
  id: string
  type: MaterialType
  slug: string
  url: string
  title: Bi
  originalTitle?: Bi
  creators?: Bi
  medium?: Bi
  dimensions?: Bi
  yearText?: Bi
  place?: Bi
  courtesy?: Bi
  description?: Bi
  editors?: Bi
  languages?: Bi
  artists?: Bi
  publicationCountry?: Bi
  publisher?: Bi
  cover?: Bi
  pages?: string
  printRun?: string
  keywords: BiList
  image?: string
  imageLarge?: string
  video?: string
  pdf?: string
  pdfSize?: number
  readable: boolean
  authorIds: string[]
  institutionIds: string[]
  year: number | null
  country: string | null
  materialType?: string
  credits?: Partial<Record<Lang, [string, string][]>>
  refs?: Refs
}

export interface Author {
  id: string
  slug: string
  url: string
  name: Bi
  bio: Bi
  about: Bi
  location: Bi
  photo?: string
  country: string | null
  facts?: Fact[]
  refs?: Refs
}

export interface Institution {
  id: string
  slug: string
  url: string
  name: Bi
  description: Bi
  address?: Bi
  location: Bi
  logo?: string
  phones: string[]
  emails: string[]
  country: string | null
}

export interface ArchiveEvent {
  id: string
  slug: string
  url: string
  title: Bi
  lead: Bi
  description: Bi
  location: Bi
  dateText: Bi
  labels: BiList
  image?: string
  eventType?: string
  start?: string
  end?: string
  authorIds: string[]
  institutionIds: string[]
  country: string | null
  refs?: Refs
}

export interface RawArchive {
  generatedAt: string
  source: string
  authors: Author[]
  institutions: Institution[]
  materials: RawMaterial[]
  events: ArchiveEvent[]
  entities: Entity[]
  people: Person[]
  facets: {
    countries: Record<string, Bi>
    libraryTypes: Record<string, Bi>
  }
}

/** A facet value: stable key + bilingual label. */
export interface Term {
  key: string
  label: Bi
}

export interface Material extends RawMaterial {
  mediums: string[]
  /** entities linked by something stronger than a passing mention */
  entityKeys: string[]
  /** entities the original site itself links to this item */
  sourceEntityKeys: string[]
  keywordKeys: string[]
  placeKey?: string
  courtesyKey?: string
}
