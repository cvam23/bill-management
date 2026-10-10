import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { toInvoiceModel } from './invoice'
import type { SavedBill } from './types'

const MARGIN = 14

// The built-in PDF fonts have no rupee glyph, so amounts are printed as "Rs.".
function pdfMoney(value: string): string {
  return value.replaceAll('\u20B9', 'Rs. ')
}

export function downloadBillPdf(bill: SavedBill): void {
  const invoice = toInvoiceModel(bill)
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let y = 20

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(invoice.businessName, MARGIN, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  y += 10
  doc.text(`Bill Number: ${invoice.billNumber}`, MARGIN, y)
  y += 6
  doc.text(`Date: ${invoice.billDateLabel}`, MARGIN, y)
  y += 6
  doc.text(`Customer: ${invoice.customerName}`, MARGIN, y)
  if (invoice.customerAddress) {
    const addressLines = doc.splitTextToSize(
      `Address: ${invoice.customerAddress}`,
      pageWidth - MARGIN * 2,
    ) as string[]
    y += 6
    doc.text(addressLines, MARGIN, y)
    y += (addressLines.length - 1) * 5
  }

  autoTable(doc, {
    startY: y + 8,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Item Number', 'Item Name', 'Description', 'Qty', 'Unit Price', 'Amount']],
    body: invoice.lines.map((line) => [
      line.itemNumber,
      line.itemName,
      line.itemDescription,
      line.quantity,
      pdfMoney(line.unitPrice),
      pdfMoney(line.lineAmount),
    ]),
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    styles: { fontSize: 9, overflow: 'linebreak', cellPadding: 2, valign: 'top' },
    headStyles: { fillColor: [15, 118, 110] },
    columnStyles: {
      2: { cellWidth: 55 },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
  })

  const table = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
  y = (table?.finalY ?? y) + 10
  if (y > pageHeight - 30) {
    doc.addPage()
    y = 20
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(`Grand Total: ${pdfMoney(invoice.grandTotal)}`, pageWidth - MARGIN, y, {
    align: 'right',
  })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(invoice.thankYou, MARGIN, y + 10)

  doc.save(`${bill.billNumber}.pdf`)
}
