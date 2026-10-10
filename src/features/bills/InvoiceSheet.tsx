import { Logo } from '../../components/layout/Logo'
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
      className="invoice-sheet flex flex-col gap-5 rounded-md border border-line bg-white p-4 text-sm text-ink sm:p-6 print:w-full print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:text-[12px] print:text-black"
    >
      <header className="border-b-2 border-ink pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4 print:flex-nowrap print:gap-6">
          <div className="flex min-w-0 items-center gap-3">
            <Logo className="bill-ink h-12 w-12 shrink-0 print:h-14 print:w-14" />
            <div className="min-w-0">
              <h2 className="font-display text-3xl leading-none font-semibold tracking-wide uppercase sm:text-4xl print:text-[26pt] print:text-black">
                {invoice.businessName}
              </h2>
              <p className="mt-1 font-mono text-[11px] tracking-[0.16em] text-muted uppercase">
                Service and spare parts
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right print:shrink-0 print:text-right">
            <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Bill</p>
            <p className="font-display text-3xl leading-none font-semibold tracking-wide">
              {invoice.billNumber}
            </p>
            <p className="mt-1 font-mono text-xs">{invoice.billDateLabel}</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Customer</p>
          <p className="mt-1 font-semibold">{invoice.customerName}</p>
          {invoice.customerAddress ? (
            <p className="mt-1 whitespace-pre-line text-muted">{invoice.customerAddress}</p>
          ) : null}
        </div>
      </header>

      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full border-collapse text-left print:table-fixed">
          <thead className="bill-ink table-header-group bg-housing font-mono text-[11px] tracking-[0.14em] text-white uppercase">
            <tr className="break-inside-avoid">
              <th className="w-[14%] px-2 py-2 font-medium whitespace-nowrap">Item Number</th>
              <th className="w-[18%] px-2 py-2 font-medium">Item Name</th>
              <th className="px-2 py-2 font-medium">Description</th>
              <th className="w-[10%] px-2 py-2 text-right font-medium whitespace-nowrap">Qty</th>
              <th className="w-[14%] px-2 py-2 text-right font-medium whitespace-nowrap">Unit Price</th>
              <th className="w-[14%] px-2 py-2 text-right font-medium whitespace-nowrap">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line, index) => (
              <tr
                key={index}
                className="bill-ink break-inside-avoid border-b border-line align-top even:bg-bench"
              >
                <td className="px-2 py-2 font-mono">{line.itemNumber}</td>
                <td className="px-2 py-2">{line.itemName}</td>
                <td className="px-2 py-2 break-words whitespace-pre-wrap">{line.itemDescription}</td>
                <td className="px-2 py-2 text-right font-mono whitespace-nowrap">{line.quantity}</td>
                <td className="px-2 py-2 text-right font-mono whitespace-nowrap">{line.unitPrice}</td>
                <td className="px-2 py-2 text-right font-mono whitespace-nowrap">{line.lineAmount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="invoice-close mt-auto flex flex-col gap-4">
        <div className="flex justify-end">
          <div className="bill-ink bg-thread px-4 py-3 text-right text-white">
            <p className="font-mono text-[11px] tracking-[0.16em] uppercase">Grand Total</p>
            <p className="mt-1 font-display text-4xl leading-none font-semibold tracking-wide">
              {invoice.grandTotal}
            </p>
          </div>
        </div>
        <p className="border-t border-line pt-4">{invoice.thankYou}</p>
      </footer>
    </article>
  )
}
