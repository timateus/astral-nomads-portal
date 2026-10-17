import type { Bi, Lang } from './types'

const strings = {
  archive: { ru: 'Архив', en: 'Archive' },
  explore: { ru: 'Обзор архива', en: 'Explore' },
  authors: { ru: 'Авторы', en: 'Authors' },
  events: { ru: 'События', en: 'Events' },
  institutions: { ru: 'Институции', en: 'Institutions' },
  timeline: { ru: 'Хронология', en: 'Timeline' },
  tagline: {
    ru: 'Цифровой архив и библиотека современного искусства Центральной Азии',
    en: 'A digital archive and library of contemporary art from Central Asia',
  },
  searchPlaceholder: { ru: 'Искать по названию, автору, теме, технике…', en: 'Search titles, authors, themes, techniques…' },
  searchShort: { ru: 'Поиск', en: 'Search' },
  type: { ru: 'Раздел', en: 'Section' },
  artifact: { ru: 'Артефакты', en: 'Artifacts' },
  library: { ru: 'Библиотека', en: 'Library' },
  multimedia: { ru: 'Мультимедиа', en: 'Multimedia' },
  artifactOne: { ru: 'Артефакт', en: 'Artifact' },
  libraryOne: { ru: 'Библиотека', en: 'Library' },
  multimediaOne: { ru: 'Видео', en: 'Video' },
  author: { ru: 'Автор', en: 'Author' },
  country: { ru: 'Страна', en: 'Country' },
  year: { ru: 'Год', en: 'Year' },
  medium: { ru: 'Техника', en: 'Medium' },
  keywords: { ru: 'Темы', en: 'Themes' },
  place: { ru: 'Место создания', en: 'Place' },
  courtesy: { ru: 'Предоставлено', en: 'Courtesy' },
  libraryType: { ru: 'Тип издания', en: 'Publication type' },
  format: { ru: 'Формат', en: 'Format' },
  hasPdf: { ru: 'Есть PDF', en: 'Has PDF' },
  hasVideo: { ru: 'Есть видео', en: 'Has video' },
  hasImage: { ru: 'С изображением', en: 'With image' },
  results: { ru: 'материалов', en: 'items' },
  clearAll: { ru: 'Сбросить всё', en: 'Clear all' },
  filters: { ru: 'Фильтры', en: 'Filters' },
  showResults: { ru: 'Показать', en: 'Show' },
  sortRelevance: { ru: 'По релевантности', en: 'Relevance' },
  sortYearAsc: { ru: 'Сначала старые', en: 'Oldest first' },
  sortYearDesc: { ru: 'Сначала новые', en: 'Newest first' },
  sortTitle: { ru: 'По алфавиту', en: 'A–Z' },
  sortRandom: { ru: 'Случайно', en: 'Shuffle' },
  viewGrid: { ru: 'Сетка', en: 'Grid' },
  viewList: { ru: 'Список', en: 'List' },
  viewTimeline: { ru: 'По годам', en: 'By year' },
  showMore: { ru: 'Показать ещё', en: 'Show more' },
  showLess: { ru: 'Свернуть', en: 'Show less' },
  loadMore: { ru: 'Загрузить ещё', en: 'Load more' },
  noResults: { ru: 'Ничего не найдено', en: 'Nothing found' },
  noResultsHint: {
    ru: 'Попробуйте убрать один из фильтров или изменить запрос.',
    en: 'Try removing a filter or rephrasing the search.',
  },
  originalTitle: { ru: 'Название на языке оригинала', en: 'Original title' },
  creators: { ru: 'Автор(ы)', en: 'Author(s)' },
  dimensions: { ru: 'Размер / длительность', en: 'Dimensions / length' },
  yearCreated: { ru: 'Год создания', en: 'Year' },
  editors: { ru: 'Редакторы', en: 'Editors' },
  languages: { ru: 'Языки', en: 'Languages' },
  artists: { ru: 'Художники', en: 'Artists' },
  publisher: { ru: 'Издатель', en: 'Publisher' },
  pages: { ru: 'Страниц', en: 'Pages' },
  printRun: { ru: 'Тираж', en: 'Print run' },
  cover: { ru: 'Обложка', en: 'Cover' },
  download: { ru: 'Скачать PDF', en: 'Download PDF' },
  readOnline: { ru: 'Листать на сайте архива', en: 'Read on the archive site' },
  watch: { ru: 'Смотреть', en: 'Watch' },
  zoom: { ru: 'Увеличить', en: 'Zoom' },
  close: { ru: 'Закрыть', en: 'Close' },
  prev: { ru: 'Предыдущий', en: 'Previous' },
  next: { ru: 'Следующий', en: 'Next' },
  moreByAuthor: { ru: 'Ещё у автора', en: 'More by this author' },
  similar: { ru: 'Похожие материалы', en: 'Related items' },
  sameYear: { ru: 'В том же году', en: 'From the same year' },
  viewAll: { ru: 'Смотреть все', en: 'View all' },
  originalPage: { ru: 'Страница в исходном архиве', en: 'Page in the source archive' },
  aboutAuthor: { ru: 'Об авторе', en: 'About' },
  readMore: { ru: 'Читать полностью', en: 'Read in full' },
  works: { ru: 'Работы в архиве', en: 'Works in the archive' },
  worksCount: { ru: 'работ', en: 'works' },
  activeYears: { ru: 'Годы в архиве', en: 'Years in archive' },
  random: { ru: 'Случайный материал', en: 'Random item' },
  surprise: { ru: 'Удивите меня', en: 'Surprise me' },
  browseByDecade: { ru: 'Пять десятилетий', en: 'Five decades' },
  browseByTheme: { ru: 'Темы и мотивы', en: 'Themes & motifs' },
  browseByMedium: { ru: 'Техники', en: 'Mediums' },
  fromTheArchive: { ru: 'Из архива', en: 'From the archive' },
  upcoming: { ru: 'Скоро', en: 'Upcoming' },
  now: { ru: 'Сейчас', en: 'Now on' },
  past: { ru: 'Прошло', en: 'Past' },
  participants: { ru: 'Участники', en: 'Participants' },
  contacts: { ru: 'Контакты', en: 'Contacts' },
  address: { ru: 'Адрес', en: 'Address' },
  items: { ru: 'материалов', en: 'items' },
  decade: { ru: 'е', en: 's' },
  quickJump: { ru: 'Быстрый переход', en: 'Quick jump' },
  typeToSearch: { ru: 'Начните вводить…', en: 'Start typing…' },
  pressEnter: { ru: 'Enter — все результаты в обзоре', en: 'Enter — see all results in Explore' },
  searchIn: { ru: 'Искать', en: 'Search' },
  dataNote: {
    ru: 'Данные и изображения — astralnomads.panther.kz. Снимок от',
    en: 'Data and images from astralnomads.panther.kz. Snapshot of',
  },
  home: { ru: 'Главная', en: 'Home' },
  untitled: { ru: 'Без названия', en: 'Untitled' },
  other: { ru: 'Другое', en: 'Other' },
  minus: { ru: 'Исключить', en: 'Exclude' },
  yearsAll: { ru: 'Все годы', en: 'All years' },
  dragToSelect: { ru: 'Проведите по шкале, чтобы выбрать период', en: 'Drag across the bars to pick a range' },
} satisfies Record<string, Record<Lang, string>>

export type StringKey = keyof typeof strings

export function t(key: StringKey, lang: Lang): string {
  return strings[key][lang]
}

/** Pick a bilingual value, falling back to the other language. */
export function pick(v: Bi | undefined, lang: Lang): string {
  if (!v) return ''
  return v[lang] || v[lang === 'ru' ? 'en' : 'ru'] || ''
}

export function plural(n: number, lang: Lang, forms: { ru: [string, string, string]; en: [string, string] }) {
  if (lang === 'en') return `${n} ${n === 1 ? forms.en[0] : forms.en[1]}`
  const m10 = n % 10
  const m100 = n % 100
  const f = m10 === 1 && m100 !== 11 ? 0 : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 1 : 2
  return `${n} ${forms.ru[f]}`
}

export const itemsForms = { ru: ['материал', 'материала', 'материалов'] as [string, string, string], en: ['item', 'items'] as [string, string] }
export const worksForms = { ru: ['работа', 'работы', 'работ'] as [string, string, string], en: ['work', 'works'] as [string, string] }
