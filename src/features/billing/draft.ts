import { lineAmountPaise, parseRupeesToPaise, sumPaise } from '../../lib/currency'
import type { Draft, DraftLine, MasterPick } from './types'

const MAX_QUANTITY = 9999

export function createDraft(billDate: string, idempotencyKey: string = crypto.randomUUID()): Draft {
  return {
    idempotencyKey,
    billDate,
    customerName: '',
    customerAddress: '',
    lines: [],
  }
}

export function addItem(draft: Draft, item: MasterPick): { draft: Draft; error: string | null } {
  const existing = draft.lines.find((line) => line.serviceId === item.id)

  if (existing) {
    if (existing.quantity >= MAX_QUANTITY) {
      return { draft, error: `Quantity cannot exceed ${MAX_QUANTITY}.` }
    }

    return {
      draft: replaceLine(draft, item.id, { ...existing, quantity: existing.quantity + 1 }),
      error: null,
    }
  }

  const unitPricePaise = parseRupeesToPaise(item.defaultPrice)

  if (unitPricePaise === null) {
    return { draft, error: 'The master price is invalid.' }
  }

  const line: DraftLine = {
    serviceId: item.id,
    itemNumber: item.itemNumber,
    itemName: item.name,
    itemDescription: item.description,
    itemType: item.itemType,
    quantity: 1,
    unitPricePaise,
  }

  return { draft: { ...draft, lines: [...draft.lines, line] }, error: null }
}

export function setQuantity(draft: Draft, serviceId: string, quantity: number): Draft {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return draft
  }

  return updateLine(draft, serviceId, (line) => ({ ...line, quantity }))
}

export function setUnitPrice(draft: Draft, serviceId: string, unitPricePaise: number): Draft {
  if (!Number.isInteger(unitPricePaise) || unitPricePaise < 0) {
    return draft
  }

  return updateLine(draft, serviceId, (line) => ({ ...line, unitPricePaise }))
}

export function removeLine(draft: Draft, serviceId: string): Draft {
  return { ...draft, lines: draft.lines.filter((line) => line.serviceId !== serviceId) }
}

export function lineTotalPaise(line: DraftLine): number {
  return lineAmountPaise(line.quantity, line.unitPricePaise)
}

export function grandTotalPaise(draft: Draft): number {
  return sumPaise(draft.lines.map(lineTotalPaise))
}

export function canSave(draft: Draft): boolean {
  return (
    draft.lines.length > 0 &&
    draft.lines.every(
      (line) =>
        Number.isInteger(line.quantity) &&
        line.quantity >= 1 &&
        line.quantity <= MAX_QUANTITY &&
        Number.isInteger(line.unitPricePaise) &&
        line.unitPricePaise >= 0,
    )
  )
}

function replaceLine(draft: Draft, serviceId: string, next: DraftLine): Draft {
  return { ...draft, lines: draft.lines.map((line) => (line.serviceId === serviceId ? next : line)) }
}

function updateLine(draft: Draft, serviceId: string, update: (line: DraftLine) => DraftLine): Draft {
  return { ...draft, lines: draft.lines.map((line) => (line.serviceId === serviceId ? update(line) : line)) }
}
