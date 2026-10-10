import type { ReactNode } from 'react'

type PageHeaderProps = {
  kicker: string
  title: string
  actions?: ReactNode
}

export function PageHeader({ kicker, title, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="font-mono text-[11px] font-medium tracking-[0.18em] text-muted uppercase">
          {kicker}
        </p>
        <h1 className="font-display text-[1.7rem] leading-[0.95] font-semibold tracking-wide text-ink uppercase sm:text-[2.35rem]">
          {title}
        </h1>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  )
}
