import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useArchive } from '../data'

/** Short explainer shown right after the "added data" switch is turned on. */
export function EnrichedInfo({ onClose }: { onClose: () => void }) {
  const { archive, lang, setEnriched } = useArchive()
  const ref = useRef<HTMLDivElement>(null)
  const okRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    okRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      // clicks on the switch itself are handled by the switch
      if (!ref.current?.contains(target) && !target.closest('.enriched-switch')) onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [onClose])

  const institutions = archive.entities.filter((e) => !e.source && e.kind !== 'program').length
  const events = archive.entities.filter((e) => e.kind === 'program').length
  const people = archive.people.filter((p) => !p.authorId).length
  const items = archive.materials.filter((m) => m.minedLinks > 0).length
  const ru = lang === 'ru'

  return (
    <div ref={ref} className="enriched-info" role="dialog" aria-modal="false" aria-labelledby="enriched-info-title">
      <p className="enriched-info-title" id="enriched-info-title">
        <span className="mined-mark" aria-hidden="true">
          ◇
        </span>{' '}
        {ru ? 'Дополнения включены' : 'Added data is on'}
      </p>
      <p>
        {ru
          ? 'Теперь сайт показывает не только исходный архив, но и то, что мы собрали по его же текстам: метаданным, биографиям, описаниям событий и 21 PDF-каталогу.'
          : 'The site now shows more than the original archive: also what we compiled from its own texts — metadata, biographies, event descriptions and 21 PDF catalogues.'}
      </p>
      <ul>
        <li>
          <Link to="/institutions" onClick={onClose}>
            {ru ? `Институции, группы и площадки — ${institutions}` : `Institutions, groups and venues — ${institutions}`}
          </Link>
        </li>
        <li>
          <Link to="/events" onClick={onClose}>
            {ru ? `Выставки и проекты в хронике событий — ${events}` : `Exhibitions and projects in the events chronicle — ${events}`}
          </Link>
        </li>
        <li>
          <Link to="/people" onClick={onClose}>
            {ru ? `Персоналии: участники, кураторы, редакторы — ${people}` : `People: participants, curators, editors — ${people}`}
          </Link>
        </li>
        <li>{ru ? `Найденные связи у материалов (${items}) и факты об авторах` : `Found links on items (${items}) and facts about authors`}</li>
      </ul>
      <p className="enriched-info-note">
        {ru
          ? 'Всё добавленное помечено знаком ◇ и ссылается на источник. Исходные данные архива не меняются. Выключить можно в любой момент тем же переключателем.'
          : 'Everything added is marked ◇ and points to its source. The original archive data is unchanged. Turn it off any time with the same switch.'}
      </p>
      <div className="enriched-info-actions">
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setEnriched(false)
            onClose()
          }}
        >
          {ru ? 'Выключить' : 'Turn off'}
        </button>
        <button ref={okRef} type="button" className="btn btn--primary" onClick={onClose}>
          {ru ? 'Понятно' : 'Got it'}
        </button>
      </div>
    </div>
  )
}
