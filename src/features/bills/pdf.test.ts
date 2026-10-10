import type { jsPDF } from 'jspdf'
import { vi } from 'vitest'
import { downloadBillPdf } from './pdf'
import type { SavedBill } from './types'

const docs = vi.hoisted(() => [] as unknown[])

vi.mock('jspdf', async (importOriginal) => {
  const original = await importOriginal<typeof import('jspdf')>()

  class SpyDoc extends original.jsPDF {
    constructor(...args: ConstructorParameters<typeof original.jsPDF>) {
      super(...args)
      const doc: jsPDF = this
      vi.spyOn(doc, 'save').mockImplementation(() => doc)
      vi.spyOn(doc, 'text')
      vi.spyOn(doc, 'setFont')
      docs.push(doc)
    }
  }

  return { ...original, jsPDF: SpyDoc }
})
const bill: SavedBill = {
  id: 'bill-1',
  billNumber: 'RS-0001',
  billDate: '2026-10-10',
  customerName: 'Asha',
  customerAddress: '12 Main Road',
  grandTotal: '30000.00',
  lines: Array.from({ length: 60 }, (_, index) => ({
    lineNumber: index + 1,
    itemNumber: String(1000 + index),
    itemName: `Item ${index + 1}`,
    itemDescription: 'A long description that must wrap inside its cell. '.repeat(4),
    itemType: 'service' as const,
    quantity: 1,
    unitPrice: '500.00',
    lineAmount: '500.00',
  })),
}

test('writes the invoice, adds pages when the table overflows, and saves as the bill number', () => {
  downloadBillPdf(bill)

  const doc = docs[0] as jsPDF
  expect(doc.save).toHaveBeenCalledWith('RS-0001.pdf')
  const written = vi
    .mocked(doc.text)
    .mock.calls.flatMap(([value]) => (Array.isArray(value) ? value : [value]))
  expect(written).toContain('Riddhi Sewing Machine')
  expect(written).toContain('RS-0001')
  expect(written).toContain('10 Oct 2026')
  expect(written).toContain('Asha')
  expect(written).toContain('12 Main Road')
  expect(written).toContain('Grand Total')
  expect(written).toContain('₹30,000.00')
  expect(written).toContain('Thank you for choosing Riddhi Sewing Machine.')
  expect(Object.keys(doc.getFontList())).toContain('NotoSans')
  expect(vi.mocked(doc.setFont).mock.calls.every(([name]) => name === 'NotoSans')).toBe(true)
  expect(doc.getFont().fontName).toBe('NotoSans')
  expect(doc.getNumberOfPages()).toBeGreaterThan(1)
})