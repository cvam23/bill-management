type LoadingStateProps = {
  title?: string
}

export function LoadingState({ title = 'Loading…' }: LoadingStateProps) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 px-8 py-10 text-center">
      <span className="h-0.5 w-16 overflow-hidden bg-line" aria-hidden="true">
        <span className="block h-full w-1/2 bg-thread motion-safe:animate-pulse" />
      </span>
      <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">{title}</p>
    </div>
  )
}
