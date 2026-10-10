export const fieldClass =
  'w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-thread-ink'

export const lineFieldClass =
  'rounded-md border border-line bg-white px-2 py-1 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-thread-ink'

export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-thread-ink'

export const iconButtonClass = `inline-flex h-11 w-11 items-center justify-center rounded-md bg-transparent p-0 motion-safe:transition-opacity hover:opacity-70 sm:h-8 sm:w-8 ${focusRing}`

export const actionColors = {
  view: 'text-view',
  print: 'text-print',
  download: 'text-save',
  edit: 'text-edit',
  danger: 'text-danger',
  restore: 'text-thread-ink',
}
