import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { TextArea } from '../../components/ui/TextArea'
import { TextField } from '../../components/ui/TextField'
import {
  formatInr,
  lineAmountPaise,
  paiseToRupeeString,
  parseRupeesToPaise,
} from '../../lib/currency'
import { todayIsoDate } from '../../lib/date'
import type { MasterItem } from '../services/api'
import { createBill, searchActiveItems } from './api'
import type { CreatedBill } from './api'
import {
  addItem,
  canSave,
  createDraft,
  grandTotalPaise,
  removeLine,
  setQuantity,
  setUnitPrice,
} from './draft'
import { ItemSearchDialog } from './ItemSearchDialog'
import { billHeaderSchema } from './schema'
import { clearDraft, loadDraft, saveDraft } from './storage'
import type { Draft } from './types'

type SearchResult = { query: string; items: MasterItem[]; failed: boolean }

const typeLabels = { service: 'Service', spare_part: 'Spare Part' }
const SEARCH_DEBOUNCE_MS = 300

function newDraft(): Draft {
  return createDraft(todayIsoDate(), crypto.randomUUID())
}

function loadOrCreateDraft(): Draft {
  const stored = loadDraft(sessionStorage)
  if (stored) return stored
  const created = newDraft()
  saveDraft(sessionStorage, created)
  return created
}

function isValidQuantityText(text: string): boolean {
  return /^\d+$/.test(text) && Number(text) >= 1 && Number(text) <= 9999
}

const cell =
  "flex justify-between gap-3 px-3 py-1 before:font-medium before:text-slate-600 before:content-[attr(data-label)] md:table-cell md:py-2 md:before:content-none"

export function BillingPage() {
  const [draft, setDraft] = useState<Draft>(loadOrCreateDraft)
  const [saved, setSaved] = useState<CreatedBill | null>(null)
  const [saving, setSaving] = useState(false)
  const [qtyEdits, setQtyEdits] = useState<Record<string, string>>({})
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({})
  const [badPrices, setBadPrices] = useState<Record<string, true>>({})

  const [dialogOpen, setDialogOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null)

  useEffect(() => {
    if (!dialogOpen) return
    const timer = setTimeout(
      () => setDebouncedSearch(search),
      search === '' ? 0 : SEARCH_DEBOUNCE_MS,
    )
    return () => clearTimeout(timer)
  }, [dialogOpen, search])

  useEffect(() => {
    if (!dialogOpen) return
    let cancelled = false
    searchActiveItems(debouncedSearch)
      .then((items) => {
        if (!cancelled) setResult({ query: debouncedSearch, items, failed: false })
      })
      .catch(() => {
        if (!cancelled) setResult({ query: debouncedSearch, items: [], failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [dialogOpen, debouncedSearch])

  function commit(next: Draft) {
    setDraft(next)
    saveDraft(sessionStorage, next)
  }

  function openDialog() {
    setSearch('')
    setDebouncedSearch('')
    setResult(null)
    setRowError(null)
    setDialogOpen(true)
  }

  function selectItem(item: MasterItem) {
    const { draft: next, error } = addItem(draft, {
      id: item.id,
      itemNumber: item.itemNumber,
      name: item.name,
      description: item.description,
      itemType: item.itemType,
      defaultPrice: item.defaultPrice,
    })

    if (error) {
      setRowError({ id: item.id, message: error })
      return
    }

    commit(next)
    setDialogOpen(false)
  }

  function changeQuantity(serviceId: string, text: string) {
    setQtyEdits((edits) => ({ ...edits, [serviceId]: text }))
    if (isValidQuantityText(text)) commit(setQuantity(draft, serviceId, Number(text)))
  }

  function dropEdit<T>(edits: Record<string, T>, serviceId: string): Record<string, T> {
    const { [serviceId]: _dropped, ...rest } = edits
    return rest
  }

  function commitPrice(serviceId: string) {
    const text = priceEdits[serviceId]
    if (text === undefined) return
    const paise = parseRupeesToPaise(text)

    if (paise === null) {
      setBadPrices((bad) => ({ ...bad, [serviceId]: true }))
      return
    }

    commit(setUnitPrice(draft, serviceId, paise))
    setPriceEdits((edits) => dropEdit(edits, serviceId))
  }

  function remove(serviceId: string) {
    commit(removeLine(draft, serviceId))
    setQtyEdits((edits) => dropEdit(edits, serviceId))
    setPriceEdits((edits) => dropEdit(edits, serviceId))
    setBadPrices((bad) => dropEdit(bad, serviceId))
  }

  const header = billHeaderSchema.safeParse({
    billDate: draft.billDate,
    customerName: draft.customerName,
    customerAddress: draft.customerAddress,
  })
  const headerErrors = header.success ? {} : header.error.flatten().fieldErrors
  const hasBadPrice = Object.keys(badPrices).length > 0
  const badQuantities = Object.entries(qtyEdits).filter(([, text]) => !isValidQuantityText(text))
  const hasBadQuantity = badQuantities.length > 0

  async function save() {
    if (!header.success || hasBadPrice || hasBadQuantity) return
    setSaving(true)
    try {
      const created = await createBill(draft)
      toast.success('Bill saved.')
      clearDraft(sessionStorage)
      setSaved(created)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the bill.')
    } finally {
      setSaving(false)
    }
  }

  function startNewBill() {
    commit(newDraft())
    setSaved(null)
    setQtyEdits({})
    setPriceEdits({})
    setBadPrices({})
  }

  if (saved) {
    return (
      <section className="space-y-4 p-4 md:p-6">
        <h1 className="text-xl font-semibold text-slate-900">Bill saved</h1>
        <div className="space-y-1 rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <p>Bill number: {saved.billNumber}</p>
          <p>Grand total: {formatInr(parseRupeesToPaise(saved.grandTotal) ?? 0)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/bills/${saved.id}`}
            className="inline-flex items-center justify-center rounded-md border border-teal-800 bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
          >
            View Bill
          </Link>
          <Button onClick={startNewBill}>Create New Bill</Button>
        </div>
      </section>
    )
  }

  const searchLoading =
    result === null || result.query !== debouncedSearch || search !== debouncedSearch

  return (
    <section className="space-y-4 p-4 md:p-6">
      <h1 className="text-xl font-semibold text-slate-900">New Bill</h1>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <span className="block text-sm font-medium text-slate-700">Bill Number</span>
          <p className="py-2 text-sm text-slate-900">Generated on save</p>
        </div>
        <TextField
          id="bill-date"
          label="Bill Date"
          type="date"
          value={draft.billDate}
          error={headerErrors.billDate ? 'Enter a valid bill date.' : undefined}
          onChange={(event) => commit({ ...draft, billDate: event.target.value })}
        />
        <TextField
          id="customer-name"
          label="Customer Name"
          value={draft.customerName}
          error={
            headerErrors.customerName ? 'Customer name must be 120 characters or fewer.' : undefined
          }
          onChange={(event) => commit({ ...draft, customerName: event.target.value })}
        />
        <TextArea
          id="customer-address"
          label="Customer Address"
          rows={2}
          value={draft.customerAddress}
          error={
            headerErrors.customerAddress
              ? 'Customer address must be 500 characters or fewer.'
              : undefined
          }
          onChange={(event) => commit({ ...draft, customerAddress: event.target.value })}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Items</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/services" className="text-sm text-teal-800 underline">
            Add a missing item
          </Link>
          <Button variant="primary" onClick={openDialog}>
            Add Item
          </Button>
        </div>
      </div>

      {draft.lines.length === 0 ? (
        <EmptyState title="No items added yet" />
      ) : (
        <table className="block w-full rounded-lg border-slate-200 text-left text-sm md:table md:border md:bg-white">
          <thead className="hidden bg-slate-50 text-slate-700 md:table-header-group">
            <tr>
              <th className="px-3 py-2 font-medium">Sr. No.</th>
              <th className="px-3 py-2 font-medium">Item Number</th>
              <th className="px-3 py-2 font-medium">Item Name</th>
              <th className="px-3 py-2 font-medium">Item Description</th>
              <th className="px-3 py-2 font-medium">Item Type</th>
              <th className="px-3 py-2 font-medium">Quantity</th>
              <th className="px-3 py-2 font-medium">Unit Price</th>
              <th className="px-3 py-2 text-right font-medium">Line Amount</th>
              <th className="px-3 py-2 font-medium">Remove</th>
            </tr>
          </thead>
          <tbody className="block space-y-3 md:table-row-group md:space-y-0">
            {draft.lines.map((line, index) => (
              <tr
                key={line.serviceId}
                className="block rounded-lg border border-slate-200 bg-white py-2 md:table-row md:rounded-none md:border-0 md:border-t md:py-0"
              >
                <td data-label="Sr. No." className={cell}>
                  {index + 1}
                </td>
                <td data-label="Item Number" className={cell}>
                  {line.itemNumber}
                </td>
                <td data-label="Item Name" className={cell}>
                  {line.itemName}
                </td>
                <td data-label="Item Description" className={cell}>
                  {line.itemDescription ?? 'â€”'}
                </td>
                <td data-label="Item Type" className={cell}>
                  {typeLabels[line.itemType]}
                </td>
                <td data-label="Quantity" className={cell}>
                  <div>
                    <input
                      type="number"
                      inputMode="numeric"
                      step={1}
                      min={1}
                      max={9999}
                      aria-label={`Quantity for ${line.itemName}`}
                      value={qtyEdits[line.serviceId] ?? String(line.quantity)}
                      onChange={(event) => changeQuantity(line.serviceId, event.target.value)}
                      onBlur={() => {
                        if (isValidQuantityText(qtyEdits[line.serviceId] ?? '1')) {
                          setQtyEdits((edits) => dropEdit(edits, line.serviceId))
                        }
                      }}
                      className="w-24 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-800"
                    />
                    {qtyEdits[line.serviceId] !== undefined &&
                    !isValidQuantityText(qtyEdits[line.serviceId]) ? (
                      <p role="alert" className="text-sm text-red-700">
                        Quantity must be a whole number from 1 to 9999.
                      </p>
                    ) : null}
                  </div>
                </td>
                <td data-label="Unit Price" className={cell}>
                  <div>
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label={`Unit price for ${line.itemName}`}
                      aria-invalid={badPrices[line.serviceId] ? true : undefined}
                      value={priceEdits[line.serviceId] ?? paiseToRupeeString(line.unitPricePaise)}
                      onChange={(event) => {
                        const text = event.target.value
                        setPriceEdits((edits) => ({ ...edits, [line.serviceId]: text }))
                        setBadPrices((bad) => dropEdit(bad, line.serviceId))
                      }}
                      onBlur={() => commitPrice(line.serviceId)}
                      className="w-28 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-800"
                    />
                    {badPrices[line.serviceId] ? (
                      <p role="alert" className="text-sm text-red-700">
                        Enter a valid price.
                      </p>
                    ) : null}
                  </div>
                </td>
                <td data-label="Line Amount" className={`${cell} md:text-right`}>
                  {formatInr(lineAmountPaise(line.quantity, line.unitPricePaise))}
                </td>
                <td data-label="Remove" className={cell}>
                  <Button
                    aria-label={`Remove ${line.itemName}`}
                    onClick={() => remove(line.serviceId)}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <p className="text-lg font-semibold text-slate-900">
          Grand Total: {formatInr(grandTotalPaise(draft))}
        </p>
        <Button
          variant="primary"
          disabled={!canSave(draft) || saving || hasBadPrice || hasBadQuantity || !header.success}
          onClick={() => void save()}
        >
          Save Bill
        </Button>
      </div>

      {dialogOpen ? (
        <ItemSearchDialog
          search={search}
          items={result?.items ?? []}
          loading={searchLoading}
          error={result?.failed ? 'Could not load items.' : null}
          rowError={rowError}
          onSearchChange={(value) => {
            setRowError(null)
            setSearch(value)
          }}
          onSelect={selectItem}
          onClose={() => setDialogOpen(false)}
        />
      ) : null}
    </section>
  )
}
