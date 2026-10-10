import { format } from 'date-fns'

export function todayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function formatBillDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)

  return format(new Date(year, month - 1, day), 'd MMM yyyy')
}
