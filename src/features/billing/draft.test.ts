import { describe, expect, test } from 'vitest'
import {
  addItem,
  canSave,
  createDraft,
  grandTotalPaise,
  lineTotalPaise,
  removeLine,
  setQuantity,
  setUnitPrice,
} from './draft'
import type { MasterPick } from './types'

const hemming: MasterPick = {
  id: 'svc-1',
  itemNumber: 'S-001',
  name: 'Hemming',
  description: 'Trouser hemming',
  itemType: 'service',
  defaultPrice: '300.00',
}

const zip: MasterPick = {
  id: 'svc-2',
  itemNumber: 'P-001',
  name: 'Zip',
  description: null,
  itemType: 'spare_part',
  defaultPrice: '50.00',
}

const button: MasterPick = {
  id: 'svc-3',
  itemNumber: 'P-002',
  name: 'Button',
  description: null,
  itemType: 'spare_part',
  defaultPrice: '10.50',
}

describe('billing draft', () => {
  test('createDraft sets date, key, empty customer fields, and no lines', () => {
    const draft = createDraft('2026-10-10', 'key-1')

    expect(draft.billDate).toBe('2026-10-10')
    expect(draft.idempotencyKey).toBe('key-1')
    expect(draft.customerName).toBe('')
    expect(draft.customerAddress).toBe('')
    expect(draft.lines).toEqual([])
  })

  test('addItem appends a line with quantity 1 and default price in paise', () => {
    const { draft, error } = addItem(createDraft('2026-10-10', 'key-1'), hemming)

    expect(error).toBeNull()
    expect(draft.lines).toHaveLength(1)
    expect(draft.lines[0]).toEqual({
      serviceId: 'svc-1',
      itemNumber: 'S-001',
      itemName: 'Hemming',
      itemDescription: 'Trouser hemming',
      itemType: 'service',
      quantity: 1,
      unitPricePaise: 30000,
    })
  })

  test('adding the same id again increments quantity and keeps an overridden price', () => {
    const first = addItem(createDraft('2026-10-10', 'key-1'), hemming).draft
    const overridden = setUnitPrice(first, 'svc-1', 25000)
    const { draft, error } = addItem(overridden, hemming)

    expect(error).toBeNull()
    expect(draft.lines).toHaveLength(1)
    expect(draft.lines[0].quantity).toBe(2)
    expect(draft.lines[0].unitPricePaise).toBe(25000)
  })

  test('adding at quantity 9999 returns the same draft with an error', () => {
    const first = addItem(createDraft('2026-10-10', 'key-1'), hemming).draft
    const maxed = setQuantity(first, 'svc-1', 9999)
    const result = addItem(maxed, hemming)

    expect(result.draft).toBe(maxed)
    expect(result.error).toBe('Quantity cannot exceed 9999.')
  })

  test('addItem rejects an invalid master price', () => {
    const start = createDraft('2026-10-10', 'key-1')
    const result = addItem(start, { ...hemming, defaultPrice: 'abc' })

    expect(result.draft).toBe(start)
    expect(result.error).toBe('The master price is invalid.')
  })

  test('removeLine drops the row, keeps order, and grand total sums quantity times price', () => {
    let draft = createDraft('2026-10-10', 'key-1')
    draft = addItem(draft, hemming).draft
    draft = addItem(draft, zip).draft
    draft = addItem(draft, button).draft
    draft = setQuantity(draft, 'svc-3', 3)

    expect(lineTotalPaise(draft.lines[2])).toBe(3150)
    expect(grandTotalPaise(draft)).toBe(30000 + 5000 + 3150)

    const removed = removeLine(draft, 'svc-2')

    expect(removed.lines.map((line) => line.serviceId)).toEqual(['svc-1', 'svc-3'])
    expect(grandTotalPaise(removed)).toBe(30000 + 3150)
  })

  test('canSave is false with no lines and true with one valid line', () => {
    const empty = createDraft('2026-10-10', 'key-1')

    expect(canSave(empty)).toBe(false)
    expect(canSave(addItem(empty, hemming).draft)).toBe(true)
  })

  test('setQuantity ignores values below 1, above 9999, and non-integers', () => {
    const draft = addItem(createDraft('2026-10-10', 'key-1'), hemming).draft

    expect(setQuantity(draft, 'svc-1', 0).lines[0].quantity).toBe(1)
    expect(setQuantity(draft, 'svc-1', -2).lines[0].quantity).toBe(1)
    expect(setQuantity(draft, 'svc-1', 10000).lines[0].quantity).toBe(1)
    expect(setQuantity(draft, 'svc-1', 2.5).lines[0].quantity).toBe(1)
    expect(setQuantity(draft, 'svc-1', Number.NaN).lines[0].quantity).toBe(1)
    expect(setQuantity(draft, 'svc-1', 9999).lines[0].quantity).toBe(9999)
  })

  test('setUnitPrice ignores negatives and non-integers', () => {
    const draft = addItem(createDraft('2026-10-10', 'key-1'), hemming).draft

    expect(setUnitPrice(draft, 'svc-1', -1).lines[0].unitPricePaise).toBe(30000)
    expect(setUnitPrice(draft, 'svc-1', 10.5).lines[0].unitPricePaise).toBe(30000)
    expect(setUnitPrice(draft, 'svc-1', 0).lines[0].unitPricePaise).toBe(0)
  })
})
