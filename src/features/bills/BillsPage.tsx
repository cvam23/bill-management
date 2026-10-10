import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingState } from '../../components/ui/LoadingState'
import { TextField } from '../../components/ui/TextField'
import { formatInr, parseRupeesToPaise } from '../../lib/currency'
import { formatBillDate } from '../../lib/date'
import { PAGE_SIZE, listBills } from './api'
import type { BillQuery, BillSummary, BillsApi } from './api'

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

export function BillsPage({ api = defaultApi }: BillsPageProps) {
  const [query, setQuery] = useState<BillQuery>(initialQuery)
  const [searchInput, setSearchInput] = useState('')
  const [result, setResult] = useState<LoadResult | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

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

  const rows = result?.rows ?? []
  const total = result?.total ?? 0
  const current = result?.api === api && result.query === query && result.reloadKey === reloadKey
  const loadState: LoadState = !result || !current ? 'loading' : result.failed ? 'error' : 'ready'

  const reload = () => setReloadKey((key) => key + 1)
  const filtered =
    query.search.trim() !== '' ||
    query.billDate !== null ||
    query.fromDate !== null ||
    query.toDate !== null
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const showResults = !rangeInvalid

  return (
    <section className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Saved Bills</h1>
        <Button
          onClick={() =>
            setQuery({ ...query, sort: query.sort === 'desc' ? 'asc' : 'desc', page: 1 })
          }
        >
          {query.sort === 'desc' ? 'Newest first' : 'Oldest first'}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
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

      {showResults && loadState === 'loading' && rows.length === 0 ? (
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

      {showResults && loadState !== 'error' && rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-medium">Bill Number</th>
                <th className="px-3 py-2 font-medium">Bill Date</th>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 text-right font-medium">Grand Total</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">{row.billNumber}</td>
                  <td className="px-3 py-2">{formatBillDate(row.billDate)}</td>
                  <td className="px-3 py-2">{row.customerName?.trim() || 'Walk-in Customer'}</td>
                  <td className="px-3 py-2 text-right">
                    {formatInr(parseRupeesToPaise(row.grandTotal) ?? 0)}
                  </td>
                  <td className="px-3 py-2">
                    <Link to={`/bills/${row.id}`} className="text-teal-800 underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {showResults && (total > PAGE_SIZE || query.page > 1) ? (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button
            disabled={query.page <= 1}
            onClick={() => setQuery({ ...query, page: query.page - 1 })}
          >
            Previous
          </Button>
          <span>
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
  )
}
