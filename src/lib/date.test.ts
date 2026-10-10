import { expect, test } from 'vitest'
import { formatBillDate, todayIsoDate } from './date'

test('formats a stored date for display', () => {
  expect(formatBillDate('2026-10-10')).toBe('10 Oct 2026')
})

test('uses the local calendar date', () => {
  expect(todayIsoDate(new Date(2026, 9, 10, 23, 30))).toBe('2026-10-10')
})
