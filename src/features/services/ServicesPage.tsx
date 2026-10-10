import { useEffect, useState } from 'react'
import { Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingState } from '../../components/ui/LoadingState'
import { SelectField } from '../../components/ui/SelectField'
import { TextField } from '../../components/ui/TextField'
import { formatInr, parseRupeesToPaise } from '../../lib/currency'
import { actionColors } from '../../styles/controls'
import { PAGE_SIZE, servicesApi } from './api'
import type { MasterItem, MasterItemQuery, ServicesApi } from './api'
import { ServiceFormDialog } from './ServiceFormDialog'

type ServicesPageProps = {
  api?: ServicesApi
}

type LoadState = 'loading' | 'ready' | 'error'

type LoadResult = {
  api: ServicesApi
  query: MasterItemQuery
  reloadKey: number
  rows: MasterItem[]
  total: number
  failed: boolean
}

const typeLabels = { service: 'Service', spare_part: 'Spare Part' }

const mobileCell =
  'flex min-w-0 items-start justify-between gap-3 px-3 py-1.5 break-words before:shrink-0 before:font-mono before:text-[11px] before:tracking-[0.12em] before:text-muted before:uppercase before:content-[attr(data-label)] md:table-cell md:px-3 md:py-2.5 md:before:content-none'

const actionsCell =
  'flex items-center justify-start gap-2 px-3 py-1 before:shrink-0 before:font-mono before:text-[11px] before:tracking-[0.12em] before:text-muted before:uppercase before:content-[attr(data-label)] md:table-cell md:w-px md:whitespace-nowrap md:px-2 md:py-1 md:before:content-none'

const initialQuery: MasterItemQuery = {
  search: '',
  itemType: 'all',
  status: 'all',
  page: 1,
}

export function ServicesPage({ api = servicesApi }: ServicesPageProps) {
  const [query, setQuery] = useState<MasterItemQuery>(initialQuery)
  const [searchInput, setSearchInput] = useState('')
  const [result, setResult] = useState<LoadResult | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [formItem, setFormItem] = useState<MasterItem | null | undefined>(undefined)
  const [toggleItem, setToggleItem] = useState<MasterItem | null>(null)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery((current) =>
        current.search === searchInput ? current : { ...current, search: searchInput, page: 1 },
      )
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false
    api
      .listMasterItems(query)
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
        if (!cancelled)
          setResult({
            api,
            query,
            reloadKey,
            rows: [],
            total: 0,
            failed: true,
          })
      })
    return () => {
      cancelled = true
    }
  }, [api, query, reloadKey])

  const rows = result?.rows ?? []
  const total = result?.total ?? 0
  const current = result?.api === api && result.query === query && result.reloadKey === reloadKey
  const loadState: LoadState = !result || !current ? 'loading' : result.failed ? 'error' : 'ready'

  const reload = () => setReloadKey((key) => key + 1)
  const filtered = query.search.trim() !== '' || query.itemType !== 'all' || query.status !== 'all'
  const resetFilters = () => {
    setSearchInput('')
    setQuery(initialQuery)
  }
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))

  async function confirmToggle() {
    if (!toggleItem) return
    const activating = !toggleItem.isActive
    setToggling(true)
    try {
      await api.setMasterItemActive(toggleItem.id, activating)
      toast.success(activating ? 'Item reactivated.' : 'Item deactivated.')
      setToggleItem(null)
      reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update the item.')
    } finally {
      setToggling(false)
    }
  }

  async function submitForm(input: Parameters<ServicesApi['createMasterItem']>[0]) {
    const saved = formItem
      ? await api.updateMasterItem(formItem.id, input)
      : await api.createMasterItem(input)
    toast.success(formItem ? 'Item updated.' : 'Item added.')
    reload()
    return saved
  }

  return (
    <section className="space-y-5">
      <PageHeader
        kicker="Catalog"
        title="Services & Parts"
        actions={
          <>
            <Button variant="reset" onClick={resetFilters} disabled={!filtered}>
              Reset
            </Button>
            <Button variant="primary" onClick={() => setFormItem(null)}>
              Add Item
            </Button>
          </>
        }
      />

      <div className="grid gap-4 rounded-md border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
        <TextField
          id="item-search"
          label="Search"
          type="search"
          placeholder="Item number, name or description"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <SelectField
          id="item-type-filter"
          label="Type"
          value={query.itemType}
          onChange={(event) =>
            setQuery({
              ...query,
              itemType: event.target.value as MasterItemQuery['itemType'],
              page: 1,
            })
          }
        >
          <option value="all">All</option>
          <option value="service">Service</option>
          <option value="spare_part">Spare Part</option>
        </SelectField>
        <SelectField
          id="item-status-filter"
          label="Status"
          value={query.status}
          onChange={(event) =>
            setQuery({
              ...query,
              status: event.target.value as MasterItemQuery['status'],
              page: 1,
            })
          }
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </SelectField>
      </div>

      {loadState === 'loading' && rows.length === 0 ? (
        <LoadingState title="Loading items…" />
      ) : null}

      {loadState === 'error' ? (
        <EmptyState title="Could not load items.">
          <Button onClick={reload}>Try again</Button>
        </EmptyState>
      ) : null}

      {loadState === 'ready' && rows.length === 0 ? (
        <EmptyState title={filtered ? 'No matching items' : 'No items yet'} />
      ) : null}

      {loadState !== 'error' && rows.length > 0 ? (
        <div className="md:overflow-x-auto md:rounded-md md:border md:border-line md:bg-white">
          <table className="block w-full text-left text-sm md:table">
            <thead className="hidden bg-housing/4 font-mono text-[11px] tracking-[0.12em] text-muted uppercase md:table-header-group">
              <tr>
                <th className="px-3 py-2.5 font-medium">Item Number</th>
                <th className="px-3 py-2.5 font-medium">Item Name</th>
                <th className="px-3 py-2.5 font-medium">Description</th>
                <th className="px-3 py-2.5 font-medium">Item Type</th>
                <th className="px-3 py-2.5 text-right font-medium">Default Price</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="w-px px-2 py-2.5 font-medium whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="block space-y-3 md:table-row-group md:space-y-0">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="block rounded-md border border-line bg-white py-2 md:table-row md:rounded-none md:border-0 md:border-t md:border-line md:py-0"
                >
                  <td data-label="Item Number" className={`${mobileCell} font-mono`}>
                    {row.itemNumber}
                  </td>
                  <td data-label="Item Name" className={`${mobileCell} font-medium`}>
                    {row.name}
                  </td>
                  <td data-label="Description" className={`${mobileCell} text-muted`}>
                    {row.description ?? '—'}
                  </td>
                  <td data-label="Item Type" className={mobileCell}>
                    {typeLabels[row.itemType]}
                  </td>
                  <td data-label="Default Price" className={`${mobileCell} font-mono md:text-right`}>
                    {formatInr(parseRupeesToPaise(row.defaultPrice) ?? 0)}
                  </td>
                  <td data-label="Status" className={mobileCell}>
                    <span className="inline-flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 rounded-full ${row.isActive ? 'bg-thread' : 'bg-line'}`}
                      />
                      {row.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td data-label="Actions" className={actionsCell}>
                    <div className="flex gap-0.5">
                      <Button
                        icon
                        className={actionColors.edit}
                        aria-label="Edit"
                        title="Edit"
                        onClick={() => setFormItem(row)}
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      </Button>
                      {row.isActive ? (
                        <Button
                          icon
                          className={actionColors.danger}
                          aria-label="Deactivate"
                          title="Deactivate"
                          onClick={() => setToggleItem(row)}
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          icon
                          className={actionColors.restore}
                          aria-label="Reactivate"
                          title="Reactivate"
                          onClick={() => setToggleItem(row)}
                        >
                          <RotateCcw aria-hidden="true" className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {total > PAGE_SIZE || query.page > 1 ? (
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

      {formItem !== undefined ? (
        <ServiceFormDialog
          key={formItem?.id ?? 'new'}
          item={formItem}
          onSubmit={submitForm}
          onClose={() => setFormItem(undefined)}
        />
      ) : null}

      {toggleItem ? (
        <ConfirmDialog
          title={`${toggleItem.isActive ? 'Deactivate' : 'Reactivate'} ${toggleItem.itemNumber}, ${toggleItem.name}?`}
          busy={toggling}
          onCancel={() => setToggleItem(null)}
          onConfirm={() => void confirmToggle()}
        />
      ) : null}
    </section>
  )
}
