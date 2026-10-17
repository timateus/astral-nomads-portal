import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n'
import type { Lang } from '../types'
import { Icon } from './Icons'

/** Full-screen image viewer. Click toggles 2.5× zoom; the zoomed image follows the pointer. */
export function Lightbox({ src, alt, onClose, lang }: { src: string; alt: string; onClose: () => void; lang: Lang }) {
  const [zoom, setZoom] = useState(false)
  const [origin, setOrigin] = useState('50% 50%')
  const [loaded, setLoaded] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = ''
      prev?.focus()
    }
  }, [onClose])

  const track = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`)
  }

  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={alt} onClick={onClose}>
      <button ref={closeRef} type="button" className="icon-btn lightbox-close" onClick={onClose} aria-label={t('close', lang)}>
        <Icon name="close" size={22} />
      </button>
      {!loaded && <div className="lightbox-loading" aria-hidden="true" />}
      <div className={`lightbox-stage${zoom ? ' is-zoomed' : ''}`} onClick={(e) => e.stopPropagation()} onPointerMove={zoom ? track : undefined}>
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          style={{ transformOrigin: origin, opacity: loaded ? 1 : 0 }}
          onClick={(e) => {
            track(e as unknown as React.PointerEvent)
            setZoom(!zoom)
          }}
        />
      </div>
    </div>,
    document.body,
  )
}
