import type { EntityKind, Lang } from './types'

type L = Record<Lang, string>

const ROLES: Record<string, L> = {
  source: { ru: 'Связано', en: 'Linked' },
  organizer: { ru: 'Организатор', en: 'Organiser' },
  venue: { ru: 'Площадка', en: 'Venue' },
  program: { ru: 'В рамках', en: 'Part of' },
  curator: { ru: 'Куратор', en: 'Curator' },
  commissioner: { ru: 'Комиссар', en: 'Commissioner' },
  'artistic director': { ru: 'Художественный руководитель', en: 'Artistic director' },
  participant: { ru: 'Участник', en: 'Participant' },
  courtesy: { ru: 'Предоставил', en: 'Provided by' },
  publisher: { ru: 'Издатель', en: 'Publisher' },
  creator: { ru: 'Автор', en: 'Author' },
  artist: { ru: 'Участник издания', en: 'In the publication' },
  editor: { ru: 'Редактор', en: 'Editor' },
  place: { ru: 'Место создания', en: 'Place' },
  mention: { ru: 'Упоминание', en: 'Mentioned' },
  'fact:education': { ru: 'Образование', en: 'Education' },
  'fact:member': { ru: 'Членство', en: 'Membership' },
  'fact:founded': { ru: 'Основатель', en: 'Founder' },
  'fact:group': { ru: 'Участник группы', en: 'Group member' },
  'fact:teacher': { ru: 'Учитель', en: 'Teacher' },
  'fact:family': { ru: 'Семья', en: 'Family' },
  'fact:essay': { ru: 'Автор текста', en: 'Essay author' },
  'fact:work': { ru: 'Работа', en: 'Work' },
  'fact:exhibited': { ru: 'Выставки', en: 'Exhibitions' },
}

/** Human label for a link role. Credits carry their own label ("credit:Монтаж"). */
export function roleLabel(role: string, lang: Lang): string {
  if (role.startsWith('credit:')) return role.slice(7)
  return ROLES[role]?.[lang] ?? ROLES[role.split(':')[0]]?.[lang] ?? role
}

/** Mentions are weaker than every other role; pages list them separately. */
export function isMention(role: string) {
  return role === 'mention'
}

export const FACT_LABELS: Record<string, L> = {
  born: { ru: 'Родился', en: 'Born' },
  died: { ru: 'Ушёл из жизни', en: 'Died' },
  origin: { ru: 'Родом из', en: 'From' },
  alias: { ru: 'Псевдоним', en: 'Nickname' },
  role: { ru: 'Деятельность', en: 'Practice' },
  education: { ru: 'Образование', en: 'Education' },
  member: { ru: 'Членство', en: 'Membership' },
  lived: { ru: 'Жил', en: 'Lived in' },
  family: { ru: 'Семья', en: 'Family' },
  teacher: { ru: 'Учитель', en: 'Teacher' },
  founded: { ru: 'Основал', en: 'Founded' },
  group: { ru: 'Группа', en: 'Group' },
  collaborators: { ru: 'Соавторы', en: 'Collaborators' },
  exhibited: { ru: 'Выставки', en: 'Exhibitions' },
  work: { ru: 'Работа', en: 'Work' },
  essay: { ru: 'Текст об авторе', en: 'Essay' },
}

export const KIND_ORDER: EntityKind[] = ['institution', 'group', 'program', 'venue', 'education']

export const KIND_LABELS: Record<EntityKind, { one: L; many: L }> = {
  institution: { one: { ru: 'Институция', en: 'Institution' }, many: { ru: 'Институции', en: 'Institutions' } },
  group: { one: { ru: 'Группа', en: 'Group' }, many: { ru: 'Группы', en: 'Groups' } },
  program: { one: { ru: 'Проект / выставка', en: 'Project / exhibition' }, many: { ru: 'Проекты и выставки', en: 'Projects & exhibitions' } },
  venue: { one: { ru: 'Площадка', en: 'Venue' }, many: { ru: 'Площадки', en: 'Venues' } },
  education: { one: { ru: 'Учебное заведение', en: 'School' }, many: { ru: 'Образование', en: 'Schools' } },
}
