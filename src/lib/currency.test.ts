import { describe, expect, test } from 'vitest'
import { formatInr, lineAmountPaise, parseRupeesToPaise, paiseToRupeeString, sumPaise } from './currency'

describe('currency', () => {
  test('parses rupees into paise', () => {
    expect(parseRupeesToPaise('300')).toBe(30000)
    expect(parseRupeesToPaise('300.5')).toBe(30050)
    expect(parseRupeesToPaise('300.50')).toBe(30050)
    expect(parseRupeesToPaise('0')).toBe(0)
  })

  test('rejects negative, extra fraction digits, and blank values', () => {
    expect(parseRupeesToPaise('-1')).toBeNull()
    expect(parseRupeesToPaise('1.234')).toBeNull()
    expect(parseRupeesToPaise('')).toBeNull()
    expect(parseRupeesToPaise('abc')).toBeNull()
  })

  test('multiplies quantity by unit price in paise', () => {
    expect(lineAmountPaise(2, 30050)).toBe(60100)
    expect(sumPaise([30000, 5000, 10000])).toBe(45000)
  })

  test('formats INR and a two-decimal string', () => {
    expect(paiseToRupeeString(30050)).toBe('300.50')
    expect(formatInr(45000)).toMatch(/450\.00/)
    expect(formatInr(45000)).toMatch(/₹/)
  })
})
