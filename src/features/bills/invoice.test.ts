import { describe, expect, test } from 'vitest'
import { toInvoiceModel } from './invoice'
import type { SavedBill } from './types'

const baseBill: SavedBill = {
  id: 'bill-1',
  billNumber: 'RSM-0001',
  billDate: '2026-10-10',
  customerName: null,
  customerAddress: null,
  grandTotal: '100.00',
  lines: [
    {
      lineNumber: 1,
      itemNumber: 'ITM-001',
      itemName: 'Machine service',
      itemDescription: null,
      itemType: 'service',
      quantity: 2,
      unitPrice: '50.00',
      lineAmount: '100.00',
    },
  ],
}

describe('toInvoiceModel', () => {
  test('uses a walk-in customer and null address when customer details are missing', () => {
    const invoice = toInvoiceModel(baseBill)

    expect(invoice.customerName).toBe('Walk-in Customer')
    expect(invoice.customerAddress).toBeNull()
  })

  test('keeps provided customer details trimmed', () => {
    const invoice = toInvoiceModel({
      ...baseBill,
      customerName: ' Asha ',
      customerAddress: ' 12 Main Road ',
    })

    expect(invoice.customerName).toBe('Asha')
    expect(invoice.customerAddress).toBe('12 Main Road')
  })

  test('turns a null description into an empty string', () => {
    expect(toInvoiceModel(baseBill).lines[0].itemDescription).toBe('')
  })

  test('preserves a 400-character description in full', () => {
    const description = 'd'.repeat(400)
    const invoice = toInvoiceModel({
      ...baseBill,
      lines: [{ ...baseBill.lines[0], itemDescription: description }],
    })

    expect(invoice.lines[0].itemDescription).toBe(description)
    expect(invoice.lines[0].itemDescription).toHaveLength(400)
  })

  test('formats money from the saved decimal strings', () => {
    const invoice = toInvoiceModel(baseBill)

    expect(invoice.lines[0].unitPrice).toContain('50.00')
    expect(invoice.lines[0].lineAmount).toContain('100.00')
    expect(invoice.grandTotal).toContain('100.00')
    expect(invoice.lines[0].quantity).toBe('2')
  })

  test('includes the thank-you message and business name', () => {
    const invoice = toInvoiceModel(baseBill)

    expect(invoice.thankYou).toBe('Thank you for choosing Riddhi Sewing Machine.')
    expect(invoice.businessName).toBe('Riddhi Sewing Machine')
  })

  test('formats the bill date label', () => {
    expect(toInvoiceModel(baseBill).billDateLabel).toBe('10 Oct 2026')
  })
})
