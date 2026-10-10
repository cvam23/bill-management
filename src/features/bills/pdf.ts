import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { notoSansBold, notoSansRegular } from './fonts/notoSansSubset'
import { toInvoiceModel } from './invoice'
import type { SavedBill } from './types'

const MARGIN = 14
const FONT = 'NotoSans'
const INK: [number, number, number] = [28, 36, 44]
const MUTED: [number, number, number] = [82, 97, 112]
const HOUSING: [number, number, number] = [22, 28, 34]
const THREAD: [number, number, number] = [194, 65, 45]
const BENCH: [number, number, number] = [238, 242, 245]

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

  doc.setFillColor(...THREAD)
  doc.rect(0, 0, pageWidth, 3.2, 'F')

  doc.setTextColor(...INK)
  doc.setFont(FONT, 'bold')
  doc.setFontSize(20)
  doc.text(invoice.businessName, MARGIN, 16)

  doc.setFont(FONT, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('Service and spare parts', MARGIN, 21)

  doc.setTextColor(...INK)
  doc.setFont(FONT, 'bold')
  doc.setFontSize(16)
  doc.text(invoice.billNumber, pageWidth - MARGIN, 15, { align: 'right' })
  doc.setFont(FONT, 'normal')
  doc.setFontSize(10)
  doc.text(invoice.billDateLabel, pageWidth - MARGIN, 21, { align: 'right' })

  let y = 28
  doc.setDrawColor(...INK)
  doc.setLineWidth(0.4)
  doc.line(MARGIN, y, pageWidth - MARGIN, y)

  y += 6
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('Customer', MARGIN, y)
  y += 5
  doc.setFont(FONT, 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...INK)
  doc.text(invoice.customerName, MARGIN, y)
  if (invoice.customerAddress) {
    const addressLines = doc.splitTextToSize(
      invoice.customerAddress,
      pageWidth - MARGIN * 2,
    ) as string[]
    doc.setFont(FONT, 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...MUTED)
    y += 5
    doc.text(addressLines, MARGIN, y)
    y += (addressLines.length - 1) * 4.5
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
    styles: {
      font: FONT,
      fontSize: 9,
      textColor: INK,
      overflow: 'linebreak',
      cellPadding: 2.4,
      valign: 'top',
    },
    headStyles: {
      fillColor: HOUSING,
      textColor: [255, 255, 255],
      font: FONT,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: BENCH },
    columnStyles: {
      2: { cellWidth: 55 },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
  })

  const table = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
  y = (table?.finalY ?? y) + 8
  if (y > pageHeight - 42) {
    doc.addPage()
    y = 18
  }

  const plateWidth = 68
  const plateHeight = 18
  const plateX = pageWidth - MARGIN - plateWidth
  doc.setFillColor(...THREAD)
  doc.rect(plateX, y, plateWidth, plateHeight, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont(FONT, 'normal')
  doc.setFontSize(8)
  doc.text('Grand Total', plateX + plateWidth - 4, y + 6, { align: 'right' })
  doc.setFont(FONT, 'bold')
  doc.setFontSize(14)
  doc.text(invoice.grandTotal, plateX + plateWidth - 4, y + 13, { align: 'right' })

  doc.setTextColor(...INK)
  doc.setFont(FONT, 'normal')
  doc.setFontSize(10)
  doc.text(invoice.thankYou, MARGIN, y + plateHeight + 8)

  doc.save(`${bill.billNumber}.pdf`)
}
