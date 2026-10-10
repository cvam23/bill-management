import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { notoSansBold, notoSansRegular } from './fonts/notoSansSubset'
import { toInvoiceModel } from './invoice'
import type { SavedBill } from './types'

const MARGIN = 14
const FONT = 'NotoSans'

// The built-in PDF fonts have no rupee glyph, so embed a Noto Sans subset that includes U+20B9.
function registerFonts(doc: jsPDF): void {
  doc.addFileToVFS('NotoSans-Regular.ttf', notoSansRegular)
  doc.addFont('NotoSans-Regular.ttf', FONT, 'normal')
  doc.addFileToVFS('NotoSans-Bold.ttf', notoSansBold)
  doc.addFont('NotoSans-Bold.ttf', FONT, 'bold')
}

export function downloadBillPdf(bill: SavedBill): void {
  const invoice = toInvoiceModel(bill)
  const doc = new jsPDF()
  registerFonts(doc)
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let y = 20

  doc.setFont(FONT, 'bold')
  doc.setFontSize(18)
  doc.text(invoice.businessName, MARGIN, y)

  doc.setFont(FONT, 'normal')
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
      line.unitPrice,
      line.lineAmount,
    ]),
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    styles: { font: FONT, fontSize: 9, overflow: 'linebreak', cellPadding: 2, valign: 'top' },
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

  doc.setFont(FONT, 'bold')
  doc.setFontSize(12)
  doc.text(`Grand Total: ${invoice.grandTotal}`, pageWidth - MARGIN, y, {
    align: 'right',
  })
  doc.setFont(FONT, 'normal')
  doc.setFontSize(11)
  doc.text(invoice.thankYou, MARGIN, y + 10)

  doc.save(`${bill.billNumber}.pdf`)
}
