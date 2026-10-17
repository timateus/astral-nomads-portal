export type Lang = 'ru' | 'en'
export type Bi = Partial<Record<Lang, string>>
export type BiList = Partial<Record<Lang, string[]>>

export type MaterialType = 'artifact' | 'library' | 'multimedia'

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
}

export interface RawArchive {
  generatedAt: string
  source: string
  authors: Author[]
  institutions: Institution[]
  materials: RawMaterial[]
  events: ArchiveEvent[]
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
  keywordKeys: string[]
  placeKey?: string
  courtesyKey?: string
}
