import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingState } from '../../components/ui/LoadingState'
import { downloadBillPdf, getBill } from './api'
import { InvoiceSheet } from './InvoiceSheet'
import type { SavedBill } from './types'

type Loaded = { id: string; bill: SavedBill | null; failed: boolean }

export function BillDetailPage() {
  const { id = '' } = useParams()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    getBill(id)
      .then((bill) => {
        if (!cancelled) setLoaded({ id, bill, failed: false })
      })
      .catch(() => {
        if (!cancelled) setLoaded({ id, bill: null, failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [id, reloadKey])

  const current = loaded?.id === id ? loaded : null
  const bill = current?.bill ?? null

  return (
    <section className="space-y-4 p-4 md:p-6">
      <div className="no-print">
        <Link to="/bills" className="text-sm text-teal-800 underline">
          Back to Saved Bills
        </Link>
      </div>

      {!current ? <LoadingState title="Loading bill…" /> : null}

      {current?.failed ? (
        <div className="no-print">
          <EmptyState title="Could not load the bill.">
            <Button onClick={() => setReloadKey((key) => key + 1)}>Try again</Button>
          </EmptyState>
        </div>
      ) : null}

      {current && !current.failed && !current.bill ? (
        <div className="no-print">
          <EmptyState title="Bill not found" />
        </div>
      ) : null}

      {bill ? (
        <>
          <div className="no-print flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => window.print()}>
              Print
            </Button>
            <Button onClick={() => downloadBillPdf(bill)}>Download PDF</Button>
          </div>
          <InvoiceSheet bill={bill} />
        </>
      ) : null}
    </section>
  )
}
