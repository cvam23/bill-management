import { describe, expect, test } from 'vitest'
import { masterItemSchema } from './schema'

const validItem = {
  name: ' Needle Set ',
  description: '',
  itemType: 'spare_part',
  defaultPrice: '100',
}

describe('masterItemSchema', () => {
  test('trims the name and accepts a valid item', () => {
    const result = masterItemSchema.safeParse(validItem)

    expect(result.success).toBe(true)
    expect(result.success && result.data.name).toBe('Needle Set')
  })

  test('rejects an empty name', () => {
    expect(masterItemSchema.safeParse({ ...validItem, name: '' }).success).toBe(false)
  })

  test('rejects a 101-character name', () => {
    expect(masterItemSchema.safeParse({ ...validItem, name: 'a'.repeat(101) }).success).toBe(false)
  })

  test('rejects a 501-character description', () => {
    expect(
      masterItemSchema.safeParse({ ...validItem, description: 'a'.repeat(501) }).success,
    ).toBe(false)
  })

  test('rejects an unknown item type', () => {
    expect(masterItemSchema.safeParse({ ...validItem, itemType: 'labor' }).success).toBe(false)
  })

  test('rejects negative and three-decimal prices', () => {
    expect(masterItemSchema.safeParse({ ...validItem, defaultPrice: '-1' }).success).toBe(false)
    expect(masterItemSchema.safeParse({ ...validItem, defaultPrice: '1.234' }).success).toBe(false)
  })

  test('accepts a zero price', () => {
    expect(masterItemSchema.safeParse({ ...validItem, defaultPrice: '0' }).success).toBe(true)
  })
})
