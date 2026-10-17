import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { MaterialCard } from '../components/Cards'
import { EntityChip, Snippets } from '../components/Links'
import { personPath, useArchive, type Backlinks } from '../data'
import { pick, t } from '../i18n'
import { roleLabel } from '../roles'
import type { Lang, Person } from '../types'
import { EventCard } from './Events'
import { NotFound } from './NotFound'

type RoleGroup = 'author' | 'curator' | 'artist' | 'credits' | 'participant' | 'mention'

const GROUP_LABELS: Record<RoleGroup, Record<Lang, string>> = {
  author: { ru: 'Авторы архива', en: 'Archive authors' },
  curator: { ru: 'Кураторы', en: 'Curators' },
  artist: { ru: 'Художники в изданиях', en: 'Artists in publications' },
  credits: { ru: 'Редакторы и выходные данные', en: 'Editors & credits' },
  participant: { ru: 'Участники событий', en: 'Event participants' },
  mention: { ru: 'Упоминаются в текстах', en: 'Mentioned in texts' },
}

function allRefs(b?: Backlinks) {
  return b ? [...b.materials, ...b.authors, ...b.events, ...b.entities].map((x) => x.ref.role) : []
}

function groupsOf(p: Person, b?: Backlinks): RoleGroup[] {
  const roles = allRefs(b)
  const g = new Set<RoleGroup>()
  if (p.authorId) g.add('author')
  for (const r of roles) {
    if (r === 'curator' || r === 'commissioner' || r === 'artistic director' || /куратор|curator/i.test(r)) g.add('curator')
    else if (r === 'artist' || r === 'creator') g.add('artist')
    else if (r === 'editor' || r.startsWith('credit:') || r === 'fact:essay') g.add('credits')
    else if (r === 'participant') g.add('participant')
    else g.add('mention')
  }
  return [...g]
}

function surname(name: string) {
  const parts = name.split(/\s+/)
  return parts[parts.length - 1]
}

export function People() {
  const { archive, lang } = useArchive()
  const [group, setGroup] = useState<RoleGroup | null>(null)
  const [q, setQ] = useState('')

  const rows = useMemo(
    () =>
      archive.people.map((p) => {
        const b = archive.personLinks.get(p.id)
        const works = p.authorId ? archive.materials.filter((m) => m.authorIds.includes(p.authorId!)).length : 0
        return { p, b, groups: groupsOf(p, b), count: allRefs(b).length + works }
      }),
    [archive],
  )
  const needle = q.trim().toLowerCase()
  const list = rows
    .filter((r) => !group || r.groups.includes(group))
    .filter((r) => !needle || `${r.p.name.ru ?? ''} ${r.p.name.en ?? ''}`.toLowerCase().includes(needle))
    .sort((a, b) => surname(pick(a.p.name, lang)).localeCompare(surname(pick(b.p.name, lang)), lang))

  // alphabetical sections by surname initial
  const sections = new Map<string, typeof list>()
  for (const r of list) {
    const letter = surname(pick(r.p.name, lang)).charAt(0).toUpperCase()
    if (!sections.has(letter)) sections.set(letter, [])
    sections.get(letter)!.push(r)
  }

  return (
    <div className="page">
      <h1 className="page-title">{lang === 'ru' ? 'Персоналии' : 'People'}</h1>
      <p className="lead page-lead">
        {lang === 'ru'
          ? `Все, кто назван в архиве: авторы, художники в каталогах, кураторы, редакторы, участники событий и герои биографических текстов — ${archive.people.length}.`
          : `Everyone named in the archive: authors, artists in catalogues, curators, editors, event participants and people in the biographical essays — ${archive.people.length}.`}
      </p>
      <div className="entity-filters">
        <div className="chips">
          <button type="button" className={`chip${!group ? ' is-on' : ''}`} onClick={() => setGroup(null)}>
            {lang === 'ru' ? 'Все' : 'All'} · {rows.length}
          </button>
          {(Object.keys(GROUP_LABELS) as RoleGroup[]).map((g) => {
            const n = rows.filter((r) => r.groups.includes(g)).length
            return n ? (
              <button key={g} type="button" className={`chip${group === g ? ' is-on' : ''}`} onClick={() => setGroup(group === g ? null : g)}>
                {GROUP_LABELS[g][lang]} · {n}
              </button>
            ) : null
          })}
        </div>
        <div className="entity-filters-row">
          <input className="inline-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchShort', lang) + '…'} aria-label={t('searchShort', lang)} />
        </div>
      </div>
      <div className="people-index">
        {[...sections].map(([letter, rs]) => (
          <section key={letter} className="people-letter">
            <h2>{letter}</h2>
            <ul>
              {rs.map(({ p, groups, count }) => {
                const other = pick(p.name, lang === 'ru' ? 'en' : 'ru')
                return (
                  <li key={p.id}>
                    <Link to={personPath(p)} className={p.authorId ? 'is-author' : ''}>
                      <span className="people-name">
                        {pick(p.name, lang)}
                        {p.authorId && <span className="entity-source" title={GROUP_LABELS.author[lang]}> ✶</span>}
                      </span>
                      {other && other !== pick(p.name, lang) && <span className="people-alt">{other}</span>}
                      <span className="people-roles">
                        {groups.map((g) => GROUP_LABELS[g][lang]).join(' · ')}
                        {count > 1 ? ` · ${count}` : ''}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

export function PersonPage() {
  const { id } = useParams()
  const { archive, lang } = useArchive()
  const p = id ? archive.personById.get(id) : undefined
  if (!p) return <NotFound />
  if (p.authorId) return <Navigate to={`/authors/${p.authorId}`} replace />
  const b = archive.personLinks.get(p.id)
  const materials = b?.materials ?? []
  const events = b?.events ?? []
  const mentions = [
    ...(b?.authors ?? []).map(({ item, ref }) => ({ to: `/authors/${item.slug}`, title: pick(item.name, lang), snippet: ref.snippet, role: ref.role })),
    ...(b?.entities ?? []).map(({ item, ref }) => ({ to: `/institutions/${item.id}`, title: pick(item.name, lang), snippet: undefined, role: ref.role })),
  ]
  // entities this person is connected to through the items they appear in
  const viaEntities = new Map<string, number>()
  for (const { item } of materials) for (const r of item.refs?.entities ?? []) if (r.role !== 'mention') viaEntities.set(r.id, (viaEntities.get(r.id) ?? 0) + 1)
  for (const { item } of events) for (const r of item.refs?.entities ?? []) viaEntities.set(r.id, (viaEntities.get(r.id) ?? 0) + 1)
  const other = pick(p.name, lang === 'ru' ? 'en' : 'ru')
  const roles = [...new Set([...materials, ...events].map((x) => roleLabel(x.ref.role, lang)))]

  return (
    <div className="page">
      <nav className="crumbs" aria-label="Breadcrumbs">
        <Link to="/people">{lang === 'ru' ? 'Персоналии' : 'People'}</Link>
      </nav>
      <header className="person-hero">
        <div className="entity-mark entity-mark--person" aria-hidden="true">
          {pick(p.name, lang).charAt(0)}
        </div>
        <div>
          {roles.length > 0 && <p className="kicker">{roles.join(' · ')}</p>}
          <h1 className="page-title">{pick(p.name, lang)}</h1>
          {other && other !== pick(p.name, lang) && <p className="lead">{other}</p>}
          <p className="provenance">
            {lang === 'ru'
              ? 'Страница собрана по упоминаниям в архиве: выходным данным изданий, описаниям событий и биографическим текстам.'
              : 'Compiled from mentions in the archive: publication credits, event descriptions and biographical essays.'}
          </p>
        </div>
      </header>

      {materials.length > 0 && (
        <section>
          <div className="section-head">
            <h2>{lang === 'ru' ? 'В материалах архива' : 'In archive items'}</h2>
          </div>
          <div className="grid">
            {materials.map(({ item, ref }) => (
              <div key={item.id} className="card-with-role">
                <span className="role-tag">{roleLabel(ref.role, lang)}</span>
                <MaterialCard m={item} trail={materials.map((x) => x.item.id)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section>
          <div className="section-head">
            <h2>{t('events', lang)}</h2>
          </div>
          <div className="event-grid">
            {events.map(({ item, ref }) => (
              <div key={item.id} className="event-with-role">
                <span className="role-tag">{roleLabel(ref.role, lang)}</span>
                <EventCard e={item} />
              </div>
            ))}
          </div>
        </section>
      )}

      {mentions.length > 0 && (
        <section>
          <div className="section-head">
            <h2>{lang === 'ru' ? 'В текстах архива' : 'In the archive’s texts'}</h2>
          </div>
          <Snippets items={mentions} lang={lang} />
        </section>
      )}

      {viaEntities.size > 0 && (
        <section>
          <div className="section-head">
            <h2>{lang === 'ru' ? 'Связанные институции и проекты' : 'Related institutions & projects'}</h2>
          </div>
          <div className="chip-links">
            {[...viaEntities]
              .sort((a, b2) => b2[1] - a[1])
              .map(([eid]) => {
                const e = archive.entityById.get(eid)
                return e ? <EntityChip key={eid} e={e} lang={lang} /> : null
              })}
          </div>
        </section>
      )}
    </div>
  )
}
