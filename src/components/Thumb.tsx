import { useState } from 'react'
import { pick } from '../i18n'
import type { Lang, Material } from '../types'
import { TypeGlyph } from './Icons'

/** Material image with a typographic fallback for items without a cover. */
export function Thumb({ m, lang, eager = false }: { m: Material; lang: Lang; eager?: boolean }) {
  const [failed, setFailed] = useState(false)
  if (!m.image || failed) {
    return (
      <div className={`thumb thumb--empty thumb--${m.type}`}>
        <TypeGlyph type={m.type} />
        <span className="thumb-empty-title">{pick(m.title, lang)}</span>
      </div>
    )
  }
  return (
    <div className={`thumb thumb--${m.type}`}>
      <img src={m.image} alt={pick(m.title, lang)} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />
      {m.video && <span className="thumb-play" aria-hidden="true" />}
    </div>
  )
}
