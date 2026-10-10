import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  children?: ReactNode
}

export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className="rounded-md border border-dashed border-line bg-white px-8 py-12 text-center">
      <p className="font-display text-3xl tracking-wide text-ink">{title}</p>
      {children ? <div className="mt-3 text-sm text-muted">{children}</div> : null}
    </div>
  )
}
