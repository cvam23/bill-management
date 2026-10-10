import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Eye, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingState } from '../../components/ui/LoadingState'
import { TextField } from '../../components/ui/TextField'
import { formatInr, parseRupeesToPaise } from '../../lib/currency'
import { formatBillDate } from '../../lib/date'
import { actionColors, iconButtonClass } from '../../styles/controls'
import { PAGE_SIZE, downloadBillPdf, getBill, listBills } from './api'
import type { BillQuery, BillSummary, BillsApi } from './api'
import { InvoiceSheet } from './InvoiceSheet'
import type { SavedBill } from './types'

type BillsPageProps = {
  api?: BillsApi
}

type LoadState = 'loading' | 'ready' | 'error'

type LoadResult = {
  api: BillsApi
  query: BillQuery
  reloadKey: number
  rows: BillSummary[]
  total: number
  failed: boolean
}

const initialQuery: BillQuery = {
  search: '',
  billDate: null,
  fromDate: null,
  toDate: null,
  sort: 'desc',
  page: 1,
}

const defaultApi: BillsApi = { listBills }

const mobileCell =
  'flex min-w-0 items-start justify-between gap-3 px-3 py-1.5 break-words before:shrink-0 before:font-mono before:text-[11px] before:tracking-[0.12em] before:text-muted before:uppercase before:content-[attr(data-label)] md:table-cell md:px-3 md:py-2.5 md:before:content-none'

const actionsCell =
  'flex items-center justify-start gap-2 px-3 py-1 before:shrink-0 before:font-mono before:text-[11px] before:tracking-[0.12em] before:text-muted before:uppercase before:content-[attr(data-label)] md:table-cell md:w-px md:whitespace-nowrap md:px-2 md:py-1 md:before:content-none'

export function BillsPage({ api = defaultApi }: BillsPageProps) {
  const [query, setQuery] = useState<BillQuery>(initialQuery)
  const [searchInput, setSearchInput] = useState('')
  const [result, setResult] = useState<LoadResult | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [printBill, setPrintBill] = useState<SavedBill | null>(null)

  const rangeInvalid = Boolean(query.fromDate && query.toDate && query.fromDate > query.toDate)

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery((current) =>
        current.search === searchInput ? current : { ...current, search: searchInput, page: 1 },
      )
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (rangeInvalid) return
    let cancelled = false
    api
      .listBills(query)
      .then((loaded) => {
        if (cancelled) return
        const clampedPage =
          loaded.total >= 1 ? Math.min(query.page, Math.ceil(loaded.total / PAGE_SIZE)) : 1
        if (clampedPage !== query.page) {
          setQuery({ ...query, page: clampedPage })
          return
        }
        setResult({ api, query, reloadKey, ...loaded, failed: false })
      })
      .catch(() => {
        if (!cancelled) setResult({ api, query, reloadKey, rows: [], total: 0, failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [api, query, reloadKey, rangeInvalid])

  useEffect(() => {
    if (!printBill) return
    const frame = requestAnimationFrame(() => window.print())
    return () => cancelAnimationFrame(frame)
  }, [printBill])

  const rows = result?.rows ?? []
  const total = result?.total ?? 0
  const current = result?.api === api && result.query === query && result.reloadKey === reloadKey
  const loadState: LoadState = !result || !current ? 'loading' : result.failed ? 'error' : 'ready'

  const reload = () => setReloadKey((key) => key + 1)

  async function loadBill(id: string): Promise<SavedBill | null> {
    try {
      const bill = await getBill(id)
      if (!bill) toast.error('Bill not found')
      return bill
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load the bill.')
      return null
    }
  }

  async function printRow(id: string) {
    setPendingId(id)
    try {
      const bill = await loadBill(id)
      if (bill) setPrintBill(bill)
    } finally {
      setPendingId(null)
    }
  }

  async function downloadRow(id: string) {
    setPendingId(id)
    try {
      const bill = await loadBill(id)
      if (bill) downloadBillPdf(bill)
    } finally {
      setPendingId(null)
    }
  }

  const filtered =
    query.search.trim() !== '' ||
    query.billDate !== null ||
    query.fromDate !== null ||
    query.toDate !== null
  const resetFilters = () => {
    setSearchInput('')
    setQuery((current) => ({ ...initialQuery, sort: current.sort }))
  }
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const showResults = !rangeInvalid

  return (
    <>
    <section className="space-y-5 print:hidden">
      <PageHeader
        kicker="Ledger"
        title="Saved Bills"
        actions={
          <>
            <Button variant="reset" onClick={resetFilters} disabled={!filtered}>
              Reset
            </Button>
            <Button
              onClick={() =>
                setQuery({ ...query, sort: query.sort === 'desc' ? 'asc' : 'desc', page: 1 })
              }
            >
              {query.sort === 'desc' ? 'Newest first' : 'Oldest first'}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 rounded-md border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <TextField
          id="bill-search"
          label="Search"
          type="search"
          placeholder="Bill number or customer"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <TextField
          id="bill-date-filter"
          label="Bill date"
          type="date"
          value={query.billDate ?? ''}
          disabled={query.fromDate !== null || query.toDate !== null}
          onChange={(event) =>
            setQuery({ ...query, billDate: event.target.value || null, page: 1 })
          }
        />
        <TextField
          id="bill-from-date"
          label="From date"
          type="date"
          value={query.fromDate ?? ''}
          disabled={query.billDate !== null}
          onChange={(event) =>
            setQuery({ ...query, fromDate: event.target.value || null, page: 1 })
          }
        />
        <TextField
          id="bill-to-date"
          label="To date"
          type="date"
          value={query.toDate ?? ''}
          disabled={query.billDate !== null}
          error={rangeInvalid ? 'The start date must be on or before the end date.' : undefined}
          onChange={(event) => setQuery({ ...query, toDate: event.target.value || null, page: 1 })}
        />
      </div>

      {showResults && loadState === 'loading' ? (
        <LoadingState title="Loading bills…" />
      ) : null}

      {showResults && loadState === 'error' ? (
        <EmptyState title="Could not load bills.">
          <Button onClick={reload}>Try again</Button>
        </EmptyState>
      ) : null}

      {showResults && loadState === 'ready' && rows.length === 0 ? (
        <EmptyState title={filtered ? 'No matching bills' : 'No bills yet'} />
      ) : null}

      {showResults && loadState === 'ready' && rows.length > 0 ? (
        <div className="md:overflow-x-auto md:rounded-md md:border md:border-line md:bg-white">
          <table className="block w-full text-left text-sm md:table">
            <thead className="hidden bg-housing/4 font-mono text-[11px] tracking-[0.12em] text-muted uppercase md:table-header-group">
              <tr>
                <th className="px-3 py-2.5 font-medium">Bill Number</th>
                <th className="px-3 py-2.5 font-medium">Bill Date</th>
                <th className="px-3 py-2.5 font-medium">Customer</th>
                <th className="px-3 py-2.5 text-right font-medium">Grand Total</th>
                <th className="w-px px-2 py-2.5 font-medium whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="block space-y-3 md:table-row-group md:space-y-0">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="block rounded-md border border-line bg-white py-2 md:table-row md:rounded-none md:border-0 md:border-t md:border-line md:py-0"
                >
                  <td data-label="Bill Number" className={`${mobileCell} font-mono`}>
                    {row.billNumber}
                  </td>
                  <td data-label="Bill Date" className={mobileCell}>
                    {formatBillDate(row.billDate)}
                  </td>
                  <td data-label="Customer" className={mobileCell}>
                    {row.customerName?.trim() || 'Walk-in Customer'}
                  </td>
                  <td data-label="Grand Total" className={`${mobileCell} font-mono md:text-right`}>
                    {formatInr(parseRupeesToPaise(row.grandTotal) ?? 0)}
                  </td>
                  <td data-label="Actions" className={actionsCell}>
                    <div className="flex gap-0.5">
                      <Link
                        to={`/bills/${row.id}`}
                        aria-label="View"
                        title="View"
                        className={`${iconButtonClass} ${actionColors.view}`}
                      >
                        <Eye aria-hidden="true" className="h-4 w-4" />
                      </Link>
                      <Button
                        icon
                        className={actionColors.print}
                        aria-label={`Print ${row.billNumber}`}
                        title="Print"
                        disabled={pendingId === row.id}
                        onClick={() => void printRow(row.id)}
                      >
                        <Printer aria-hidden="true" className="h-4 w-4" />
                      </Button>
                      <Button
                        icon
                        className={actionColors.download}
                        aria-label={`Download PDF ${row.billNumber}`}
                        title="Download PDF"
                        disabled={pendingId === row.id}
                        onClick={() => void downloadRow(row.id)}
                      >
                        <Download aria-hidden="true" className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {showResults && loadState === 'ready' && (total > PAGE_SIZE || query.page > 1) ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm sm:justify-end">
          <Button
            disabled={query.page <= 1}
            onClick={() => setQuery({ ...query, page: query.page - 1 })}
          >
            Previous
          </Button>
          <span className="font-mono text-xs tracking-wide text-muted">
            Page {query.page} of {lastPage}
          </span>
          <Button
            disabled={query.page >= lastPage}
            onClick={() => setQuery({ ...query, page: query.page + 1 })}
          >
            Next
          </Button>
        </div>
      ) : null}
    </section>
    {printBill ? (
      <div className="invoice-print">
        <InvoiceSheet bill={printBill} />
      </div>
    ) : null}
    </>
  )
}
