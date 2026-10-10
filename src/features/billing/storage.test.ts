import { describe, expect, test } from 'vitest'
import { addItem, createDraft } from './draft'
import { clearDraft, loadDraft, saveDraft } from './storage'

class MemoryStorage {
  private values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

function asStorage(storage: MemoryStorage): Storage {
  return storage as unknown as Storage
}

describe('billing draft storage', () => {
  test('saveDraft then loadDraft returns the same draft', () => {
    const storage = new MemoryStorage()
    const draft = addItem(createDraft('2026-10-10', 'key-1'), {
      id: 'svc-1',
      itemNumber: 'S-001',
      name: 'Hemming',
      description: null,
      itemType: 'service',
      defaultPrice: '300.00',
    }).draft

    saveDraft(asStorage(storage), draft)

    expect(storage.getItem('riddhi.billing.draft')).not.toBeNull()
    expect(loadDraft(asStorage(storage))).toEqual(draft)
  })

  test('loadDraft returns null when nothing is stored', () => {
    expect(loadDraft(asStorage(new MemoryStorage()))).toBeNull()
  })

  test('loadDraft returns null for invalid JSON', () => {
    const storage = new MemoryStorage()
    storage.setItem('riddhi.billing.draft', 'not-json')

    expect(loadDraft(asStorage(storage))).toBeNull()
  })

  test('loadDraft returns null for an object missing lines', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      'riddhi.billing.draft',
      JSON.stringify({
        idempotencyKey: 'key-1',
        billDate: '2026-10-10',
        customerName: '',
        customerAddress: '',
      }),
    )

    expect(loadDraft(asStorage(storage))).toBeNull()
  })

  test('clearDraft makes the next load return null', () => {
    const storage = new MemoryStorage()
    saveDraft(asStorage(storage), createDraft('2026-10-10', 'key-1'))

    clearDraft(asStorage(storage))

    expect(loadDraft(asStorage(storage))).toBeNull()
  })
})
