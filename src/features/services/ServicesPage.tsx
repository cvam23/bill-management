import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingState } from '../../components/ui/LoadingState'
import { SelectField } from '../../components/ui/SelectField'
import { TextField } from '../../components/ui/TextField'
import { formatInr, parseRupeesToPaise } from '../../lib/currency'
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
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))

  async function confirmToggle() {
    if (!toggleItem) return
    const activating = !toggleItem.isActive
    setToggling(true)
    try {
      await api.setMasterItemActive(toggleItem.id, activating)
      toast.success(activating ? 'Item activated.' : 'Item deactivated.')
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
    <section className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Services &amp; Parts</h1>
        <Button variant="primary" onClick={() => setFormItem(null)}>
          Add Item
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
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
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-medium">Item Number</th>
                <th className="px-3 py-2 font-medium">Item Name</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium">Item Type</th>
                <th className="px-3 py-2 text-right font-medium">Default Price</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">{row.itemNumber}</td>
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2">{row.description ?? '—'}</td>
                  <td className="px-3 py-2">{typeLabels[row.itemType]}</td>
                  <td className="px-3 py-2 text-right">
                    {formatInr(parseRupeesToPaise(row.defaultPrice) ?? 0)}
                  </td>
                  <td className="px-3 py-2">{row.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Button onClick={() => setFormItem(row)}>Edit</Button>
                      <Button onClick={() => setToggleItem(row)}>
                        {row.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {total > PAGE_SIZE || query.page > 1 ? (
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
          title={`${toggleItem.isActive ? 'Deactivate' : 'Activate'} ${toggleItem.itemNumber}, ${toggleItem.name}?`}
          busy={toggling}
          onCancel={() => setToggleItem(null)}
          onConfirm={() => void confirmToggle()}
        />
      ) : null}
    </section>
  )
}
