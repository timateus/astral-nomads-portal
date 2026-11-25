import type { Author, RawArchive, RawMaterial } from '../types'
import darningArea from './saule-duisenbina/darning-area.jpg'
import etik from './saule-duisenbina/etik.jpg'
import portrait from './saule-duisenbina/portrait.jpg'
import selfPortrait from './saule-duisenbina/self-portrait.jpg'
import shapan from './saule-duisenbina/shapan.jpg'
import collection from './saule-duisenbina/records.json'

function asset(name: string) {
  return `${import.meta.env.BASE_URL}media/saule-duisenbina/${name}`
}

const id = 'saule-duisenbina'
const author: Author = {
  id,
  slug: id,
  url: 'https://en.sauledyussenbina.com/bio-contact',
  name: { ru: 'Сауле Дюсенбина', en: 'Saule Dyussenbina' },
  location: { ru: 'Алматы, Казахстан', en: 'Almaty, Kazakhstan' },
  country: 'KZ',
  photo: portrait,
  bio: {
    ru: 'Сауле Дюсенбина родилась в 1971 году в Караганде. С 1986 года живёт и работает в Алматы. В 1997 году окончила отделение живописи Государственной академии искусств в Алматы.',
    en: 'Saule Dyussenbina was born in Karaganda in 1971. She has lived and worked in Almaty since 1986. She graduated from the painting department of the State Art Academy in Almaty in 1997.',
  },
  about: {},
}

type ArchiveFile = { name: string; url: string; image?: string; pdf?: string; localFile?: string }

function attachments(files: ArchiveFile[]) {
  return files.map(({ name, url, image, pdf, localFile }) => ({
    name,
    url: localFile ? `${import.meta.env.BASE_URL}media/source-archive/${localFile}` : pdf ? asset(pdf) : url,
    image: image ? asset(image) : undefined,
  }))
}

const works: RawMaterial[] = [
  {
    ...work('saule-duisenbina-etik', 'https://drive.google.com/file/d/195aXbl3uJ3Occrwz-yekQ0o-xdmCckRp/view', etik, 2020),
    title: { ru: 'Етік', en: 'Etik' },
    medium: { ru: 'Рисунок тушью', en: 'Ink drawing' },
    description: { ru: 'Из серии Black oil pump.', en: 'From the Black oil pump series.' },
  },
  {
    ...work('saule-duisenbina-shapan', 'https://drive.google.com/file/d/1Abjn8ImZISivqj_LWv-Uuc4M_FhmGU3L/view', shapan, 2020),
    title: { ru: 'Шапан', en: 'Shapan' },
    medium: { ru: 'Рисунок тушью', en: 'Ink drawing' },
    description: { ru: 'Из серии Black oil pump.', en: 'From the Black oil pump series.' },
  },
  {
    ...work('saule-duisenbina-self-portrait', 'https://drive.google.com/file/d/1MlXA5uRqeIElU9tTGO2h0QRxdr_FXAf4/view', selfPortrait, null),
    title: { ru: 'Автопортрет', en: 'Self-Portrait' },
    yearText: { ru: '2010–2011 (серия)', en: '2010–2011 (series)' },
    description: { ru: 'Из серии Memory Card.', en: 'From the Memory Card series.' },
  },
  {
    ...work('saule-duisenbina-darning-area', 'https://drive.google.com/file/d/1P047zoAmLSHuLBmhfawpU77MsXptRZEF/view', darningArea, 2015),
    title: { ru: 'Darning area', en: 'Darning area' },
    medium: { ru: 'Инсталляция', en: 'Installation' },
    place: { ru: 'Бишкек, Кыргызстан', en: 'Bishkek, Kyrgyzstan' },
    country: 'KG',
    attachments: attachments(collection.darningArea).filter((file) => !file.url.includes('/1P047zoAmLSHuLBmhfawpU77MsXptRZEF/')),
    description: {
      ru: 'Вид инсталляции в Американском университете в Центральной Азии (АУЦА).',
      en: 'Installation view at the American University of Central Asia (AUCA).',
    },
  },
  ...collection.records.map((record): RawMaterial => {
    const slug = `${id}-${record.slug}`
    const type = record.type === 'library' ? 'library' : 'artifact'
    const image = record.image ? asset(record.image) : undefined
    return {
      ...work(slug, record.url, image, record.year),
      id: `${type}:${slug}`,
      type,
      title: record.title,
      yearText: record.yearText ? { ru: record.yearText, en: record.yearText } : undefined,
      description: record.description,
      attachments: record.attachments ? attachments(record.attachments) : undefined,
      pdf: record.pdf ? asset(record.pdf) : undefined,
      readable: type === 'library' && !record.pdf,
    }
  }),
]

function work(slug: string, url: string, image: string | undefined, year: number | null) {
  return {
    id: `artifact:${slug}`,
    slug,
    type: 'artifact' as const,
    url,
    image,
    year,
    country: null,
    creators: author.name,
    courtesy: { ru: 'Архив художницы', en: 'Artist’s archive' },
    authorIds: [id],
    institutionIds: [],
    keywords: {},
    readable: false,
  }
}

export function withSauleDyussenbina(raw: RawArchive): RawArchive {
  const existing = raw.authors.find((entry) => entry.id === id)
  const materialIds = new Set(raw.materials.map((entry) => entry.id))
  return {
    ...raw,
    authors: existing ? raw.authors : [...raw.authors, author],
    materials: [...raw.materials, ...works.filter((entry) => !materialIds.has(entry.id))],
    people: raw.people.map((person) => person.id === id ? { ...person, authorId: id } : person),
  }
}
