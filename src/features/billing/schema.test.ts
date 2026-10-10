import { describe, expect, test } from 'vitest'
import { billHeaderSchema } from './schema'

const validHeader = { billDate: '2026-10-10', customerName: '', customerAddress: '' }

describe('billHeaderSchema', () => {
  test('accepts a valid header', () => {
    expect(billHeaderSchema.safeParse(validHeader).success).toBe(true)
  })

  test('rejects an empty bill date', () => {
    expect(billHeaderSchema.safeParse({ ...validHeader, billDate: '' }).success).toBe(false)
  })

  test('rejects a bill date that is not ISO formatted', () => {
    expect(billHeaderSchema.safeParse({ ...validHeader, billDate: '10/10/2026' }).success).toBe(false)
  })

  test('rejects a 121-character customer name', () => {
    expect(billHeaderSchema.safeParse({ ...validHeader, customerName: 'a'.repeat(121) }).success).toBe(false)
  })

  test('rejects a 501-character customer address', () => {
    expect(billHeaderSchema.safeParse({ ...validHeader, customerAddress: 'a'.repeat(501) }).success).toBe(false)
  })

  test('accepts a 120-character name and a 500-character address', () => {
    const result = billHeaderSchema.safeParse({
      ...validHeader,
      customerName: 'a'.repeat(120),
      customerAddress: 'a'.repeat(500),
    })

    expect(result.success).toBe(true)
  })
})
