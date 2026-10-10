import { useEffect, useId } from 'react'
import type { ReactNode } from 'react'

type DialogProps = {
  title: string
  onClose: () => void
  children?: ReactNode
  className?: string
}

export function Dialog({ title, onClose, children, className = '' }: DialogProps) {
  const titleId = useId()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-housing/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`rise max-h-[min(85dvh,40rem)] w-full space-y-4 overflow-y-auto rounded-md border border-line bg-white p-4 sm:p-6 ${className || 'max-w-md'}`}
      >
        <h2
          id={titleId}
          className="border-b border-line pb-3 font-display text-[1.7rem] leading-none font-semibold tracking-wide text-ink uppercase"
        >
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}
