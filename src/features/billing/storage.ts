import type { Draft } from './types'

const DRAFT_STORAGE_KEY = 'riddhi.billing.draft'

export function loadDraft(storage: Storage): Draft | null {
  try {
    const raw = storage.getItem(DRAFT_STORAGE_KEY)

    if (raw === null) {
      return null
    }

    const value: unknown = JSON.parse(raw)

    if (typeof value !== 'object' || value === null) {
      return null
    }

    const candidate = value as Record<string, unknown>

    if (
      typeof candidate.idempotencyKey !== 'string' ||
      typeof candidate.billDate !== 'string' ||
      typeof candidate.customerName !== 'string' ||
      typeof candidate.customerAddress !== 'string' ||
      !Array.isArray(candidate.lines)
    ) {
      return null
    }

    return value as Draft
  } catch {
    return null
  }
}

export function saveDraft(storage: Storage, draft: Draft): void {
  storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
}

export function clearDraft(storage: Storage): void {
  storage.removeItem(DRAFT_STORAGE_KEY)
}
