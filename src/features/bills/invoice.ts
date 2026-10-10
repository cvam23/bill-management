import { formatInr, parseRupeesToPaise } from '../../lib/currency'
import { formatBillDate } from '../../lib/date'
import type { InvoiceModel, SavedBill } from './types'

function formatMoney(value: string): string {
  return formatInr(parseRupeesToPaise(value) ?? 0)
}

export function toInvoiceModel(bill: SavedBill): InvoiceModel {
  return {
    businessName: 'Riddhi Sewing Machine',
    billNumber: bill.billNumber,
    billDateLabel: formatBillDate(bill.billDate),
    customerName: bill.customerName?.trim() ? bill.customerName.trim() : 'Walk-in Customer',
    customerAddress: bill.customerAddress?.trim() ? bill.customerAddress.trim() : null,
    lines: bill.lines.map((line) => ({
      itemNumber: line.itemNumber,
      itemName: line.itemName,
      itemDescription: line.itemDescription ?? '',
      quantity: String(line.quantity),
      unitPrice: formatMoney(line.unitPrice),
      lineAmount: formatMoney(line.lineAmount),
    })),
    grandTotal: formatMoney(bill.grandTotal),
    thankYou: 'Thank you for choosing Riddhi Sewing Machine.',
  }
}
