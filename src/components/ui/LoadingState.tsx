type LoadingStateProps = {
  title?: string
}

export function LoadingState({ title = 'Loading…' }: LoadingStateProps) {
  return (
    <div role="status" className="p-8 text-center text-sm text-slate-600">
      {title}
    </div>
  )
}
