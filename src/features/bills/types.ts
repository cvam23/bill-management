export type SavedBillLine = {
  lineNumber: number
  itemNumber: string
  itemName: string
  itemDescription: string | null
  itemType: 'service' | 'spare_part'
  quantity: number
  unitPrice: string
  lineAmount: string
}

export type SavedBill = {
  id: string
  billNumber: string
  billDate: string
  customerName: string | null
  customerAddress: string | null
  grandTotal: string
  lines: SavedBillLine[]
}

export type InvoiceLine = {
  itemNumber: string
  itemName: string
  itemDescription: string
  quantity: string
  unitPrice: string
  lineAmount: string
}

export type InvoiceModel = {
  businessName: 'Riddhi Sewing Machine'
  billNumber: string
  billDateLabel: string
  customerName: string
  customerAddress: string | null
  lines: InvoiceLine[]
  grandTotal: string
  thankYou: 'Thank you for choosing Riddhi Sewing Machine.'
}
