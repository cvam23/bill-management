import { toInvoiceModel } from './invoice'
import type { SavedBill } from './types'

type InvoiceSheetProps = {
  bill: SavedBill
}

export function InvoiceSheet({ bill }: InvoiceSheetProps) {
  const invoice = toInvoiceModel(bill)

  return (
    <article
      aria-label={`Invoice ${invoice.billNumber}`}
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-900 print:border-0 print:p-0"
    >
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">{invoice.businessName}</h2>
        <p>Bill Number: {invoice.billNumber}</p>
        <p>Date: {invoice.billDateLabel}</p>
        <p>Customer: {invoice.customerName}</p>
        {invoice.customerAddress ? (
          <p className="whitespace-pre-line">Address: {invoice.customerAddress}</p>
        ) : null}
      </header>

      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full text-left">
          <thead className="table-header-group bg-slate-50 text-slate-700 print:bg-transparent">
            <tr className="break-inside-avoid">
              <th className="px-2 py-2 font-medium">Item Number</th>
              <th className="px-2 py-2 font-medium">Item Name</th>
              <th className="px-2 py-2 font-medium">Item Description</th>
              <th className="px-2 py-2 text-right font-medium">Quantity</th>
              <th className="px-2 py-2 text-right font-medium">Unit Price</th>
              <th className="px-2 py-2 text-right font-medium">Line Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line, index) => (
              <tr key={index} className="break-inside-avoid border-t border-slate-200 align-top">
                <td className="px-2 py-2">{line.itemNumber}</td>
                <td className="px-2 py-2">{line.itemName}</td>
                <td className="px-2 py-2 break-words whitespace-pre-wrap">
                  {line.itemDescription}
                </td>
                <td className="px-2 py-2 text-right">{line.quantity}</td>
                <td className="px-2 py-2 text-right">{line.unitPrice}</td>
                <td className="px-2 py-2 text-right">{line.lineAmount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-right text-lg font-semibold">Grand Total: {invoice.grandTotal}</p>
      <p>{invoice.thankYou}</p>
    </article>
  )
}
