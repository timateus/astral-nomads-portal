import { Link } from 'react-router-dom'
import { personPath, useArchive } from '../data'
import { pick } from '../i18n'
import { KIND_LABELS, roleLabel } from '../roles'
import type { Entity, Lang, Person, Ref } from '../types'

export function entityPath(e: Entity) {
  return `/institutions/${e.id}`
}

export function EntityChip({ e, role, lang }: { e: Entity; role?: string; lang: Lang }) {
  return (
    <Link to={entityPath(e)} className={`chip-link chip-link--${e.kind}`}>
      {e.logo ? <img src={e.logo} alt="" /> : <span className="chip-link-dot" aria-hidden="true" />}
      <span>
        <strong>{pick(e.name, lang)}</strong>
        <small>{role ? roleLabel(role, lang) : pick(e.type, lang) || KIND_LABELS[e.kind].one[lang]}</small>
      </span>
    </Link>
  )
}

export function PersonChip({ p, role, lang }: { p: Person; role?: string; lang: Lang }) {
  const { archive } = useArchive()
  const author = p.authorId ? archive.authorById.get(p.authorId) : undefined
  return (
    <Link to={personPath(p)} className={`chip-link chip-link--person${author ? ' is-author' : ''}`}>
      {author?.photo ? <img src={author.photo} alt="" /> : <span className="chip-link-initial" aria-hidden="true">{pick(p.name, lang).charAt(0)}</span>}
      <span>
        <strong>{pick(p.name, lang)}</strong>
        {role && <small>{roleLabel(role, lang)}</small>}
      </span>
    </Link>
  )
}

/** Entities and people referenced by an object, grouped into one wrap of chips. */
export function RefChips({ refs, lang, skipMentions = false }: { refs?: { entities?: Ref[]; people?: Ref[] }; lang: Lang; skipMentions?: boolean }) {
  const { archive } = useArchive()
  const ents = (refs?.entities ?? []).filter((r) => !skipMentions || r.role !== 'mention')
  const ppl = (refs?.people ?? []).filter((r) => !skipMentions || r.role !== 'mention')
  if (!ents.length && !ppl.length) return null
  return (
    <div className="chip-links">
      {ents.map((r) => {
        const e = archive.entityById.get(r.id)
        return e ? <EntityChip key={`e:${r.id}`} e={e} role={r.role} lang={lang} /> : null
      })}
      {ppl.map((r) => {
        const p = archive.personById.get(r.id)
        return p ? <PersonChip key={`p:${r.id}`} p={p} role={r.role} lang={lang} /> : null
      })}
    </div>
  )
}

/** "Mentioned in texts": quoted sentences with a link to where they come from. */
export function Snippets({ items, lang }: { items: { to: string; title: string; snippet?: string; role: string }[]; lang: Lang }) {
  if (!items.length) return null
  return (
    <ul className="snippets">
      {items.map((s, i) => (
        <li key={i}>
          {s.snippet && <blockquote>{s.snippet}</blockquote>}
          <Link to={s.to} className="text-link">
            {s.title}
          </Link>
          <span className="muted"> · {roleLabel(s.role, lang)}</span>
        </li>
      ))}
    </ul>
  )
}
