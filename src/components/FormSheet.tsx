import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'

interface AddIconButtonProps {
  label: string
  onClick: () => void
}

export function AddIconButton({ label, onClick }: AddIconButtonProps) {
  return (
    <button
      type="button"
      className="btn btn--add"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <span aria-hidden="true">+</span>
    </button>
  )
}

interface FormSheetProps {
  open: boolean
  title: string
  description: string
  onClose: () => void
  children: ReactNode
}

export function FormSheet({
  open,
  title,
  description,
  onClose,
  children,
}: FormSheetProps) {
  const titleId = useRef(`sheet-title-${Math.random().toString(36).slice(2, 8)}`)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="sheet" role="presentation" onClick={onClose}>
      <div
        className="sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId.current}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sheet__head">
          <div>
            <h3 id={titleId.current}>{title}</h3>
            <p>{description}</p>
          </div>
          <button
            type="button"
            className="btn btn--icon"
            aria-label="Cerrar"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}
