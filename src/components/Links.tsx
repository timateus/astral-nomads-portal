import { Link } from 'react-router-dom'
import { materialPath, personPath, useArchive, visibleRefs } from '../data'
import { pick } from '../i18n'
import { KIND_LABELS, roleLabel } from '../roles'
import type { Entity, Lang, Person, Ref, Source } from '../types'

const MINED_TITLE: Record<Lang, string> = {
  ru: 'Дополнено нами по текстам архива: на исходном сайте этих данных в таком виде нет',
  en: 'Added by us from the archive’s own texts; the original site does not publish this as such',
}

/** Marks data we derived from the archive's texts rather than data the original site publishes. */
export function MinedMark({ lang, iconOnly = false }: { lang: Lang; iconOnly?: boolean }) {
  return (
    <span className={`mined-mark${iconOnly ? ' mined-mark--icon' : ''}`} title={MINED_TITLE[lang]}>
      <span aria-hidden="true">◇</span>
      {iconOnly ? <span className="sr-only">{lang === 'ru' ? 'дополнено' : 'added'}</span> : lang === 'ru' ? ' дополнено' : ' added'}
    </span>
  )
}

/** Shown in place of mined content while the "added data" switch is off. */
export function MinedHidden({ lang, what }: { lang: Lang; what?: string }) {
  const { setEnriched } = useArchive()
  return (
    <div className="mined-hidden">
      <MinedMark lang={lang} />
      <p>
        {what ?? (lang === 'ru' ? 'Этот раздел собран нами по текстам архива.' : 'This section was compiled by us from the archive’s texts.')}{' '}
        {lang === 'ru' ? 'Сейчас показаны только данные исходного архива.' : 'Only the original archive’s data is shown right now.'}
      </p>
      <button type="button" className="btn" onClick={() => setEnriched(true)}>
        {lang === 'ru' ? 'Показать дополнения' : 'Show added data'}
      </button>
    </div>
  )
}

export function entityPath(e: Entity) {
  return e.kind === 'program' ? `/events/${e.id}` : `/institutions/${e.id}`
}

export function EntityChip({ e, role, lang }: { e: Entity; role?: string; lang: Lang }) {
  return (
    <Link to={entityPath(e)} className={`chip-link chip-link--${e.kind}${e.source ? '' : ' is-mined'}`} title={e.source ? undefined : MINED_TITLE[lang]}>
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
    <Link to={personPath(p)} className={`chip-link chip-link--person${author ? ' is-author' : ' is-mined'}`} title={author ? undefined : MINED_TITLE[lang]}>
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
  const { archive, enriched } = useArchive()
  const ents = visibleRefs(refs?.entities, enriched).filter((r) => !skipMentions || r.role !== 'mention')
  const ppl = visibleRefs(refs?.people, enriched).filter((r) => !skipMentions || r.role !== 'mention')
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

/** Where in the archive's PDFs a curated entity or person is named (page references). */
export function PdfSources({ sources, lang }: { sources?: Source[]; lang: Lang }) {
  const { archive } = useArchive()
  if (!sources?.length) return null
  return (
    <section>
      <div className="section-head">
        <h2>
          {lang === 'ru' ? 'Источники в PDF' : 'Sources in PDFs'} <MinedMark lang={lang} />
        </h2>
      </div>
      <ul className="pdf-sources">
        {sources.map((s, i) => {
          const m = archive.byId.get(s.material)
          return (
            <li key={i}>
              {m ? (
                <Link to={materialPath(m)} className="text-link">
                  {pick(m.title, lang)}
                </Link>
              ) : (
                <span>{s.material}</span>
              )}
              <span className="pdf-page">{lang === 'ru' ? `с. ${s.page}` : `p. ${s.page}`}</span>
              {m?.pdf && (
                <a href={m.pdf} rel="nofollow" className="muted">
                  PDF ↓
                </a>
              )}
              {s.note && <span className="pdf-note">{typeof s.note === 'string' ? s.note : pick(s.note, lang)}</span>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
