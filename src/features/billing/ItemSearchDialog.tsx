import { useId, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { LoadingState } from '../../components/ui/LoadingState'
import { formatInr, parseRupeesToPaise } from '../../lib/currency'
import { fieldClass } from '../../styles/controls'
import type { MasterItem } from '../services/api'

type ItemSearchDialogProps = {
  search: string
  items: MasterItem[]
  loading: boolean
  error: string | null
  rowError: { id: string; message: string } | null
  onSearchChange: (search: string) => void
  onSelect: (item: MasterItem) => void
  onClose: () => void
}

const typeLabels = { service: 'Service', spare_part: 'Spare Part' }

export function ItemSearchDialog({
  search,
  items,
  loading,
  error,
  rowError,
  onSearchChange,
  onSelect,
  onClose,
}: ItemSearchDialogProps) {
  const baseId = useId()
  const listboxId = `${baseId}-listbox`
  const [activeIndex, setActiveIndex] = useState(0)
  const active = items.length === 0 ? -1 : Math.min(activeIndex, items.length - 1)

  function optionId(index: number) {
    return `${baseId}-option-${index}`
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (items.length > 0) setActiveIndex(Math.min(active + 1, items.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (items.length > 0) setActiveIndex(Math.max(active - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (active >= 0) onSelect(items[active])
    }
  }

  function changeSearch(value: string) {
    setActiveIndex(0)
    onSearchChange(value)
  }

  return (
    <Dialog title="Add Item" onClose={onClose} className="max-w-lg">
      <div className="space-y-3">
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <label htmlFor={`${baseId}-search`} className="block text-sm font-semibold text-ink">
              Search items
            </label>
            <input
              id={`${baseId}-search`}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listboxId}
              aria-activedescendant={active >= 0 ? optionId(active) : undefined}
              autoFocus
              placeholder="Item number, name or description"
              value={search}
              onChange={(event) => changeSearch(event.target.value)}
              onKeyDown={onKeyDown}
              className={fieldClass}
            />
          </div>
          <Button onClick={() => changeSearch('')}>Clear search</Button>
        </div>

        {loading ? <LoadingState title="Searching…" /> : null}
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        {!loading && !error && items.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted">No matching items</p>
        ) : null}

        <ul
          id={listboxId}
          role="listbox"
          aria-label="Matching items"
          className="max-h-80 divide-y divide-line overflow-y-auto rounded-md border border-line"
        >
          {items.map((item, index) => (
            <li
              key={item.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              onClick={() => onSelect(item)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`cursor-pointer space-y-1 px-3 py-2.5 text-sm ${
                index === active ? 'bg-bench' : 'bg-white'
              }`}
            >
              <div className="flex justify-between gap-2">
                <span className="font-mono font-medium text-ink">{item.itemNumber}</span>
                <span className="font-mono">{formatInr(parseRupeesToPaise(item.defaultPrice) ?? 0)}</span>
              </div>
              <div className="font-medium text-ink">{item.name}</div>
              <div className="text-muted">{item.description ?? '—'}</div>
              <div className="text-muted">{typeLabels[item.itemType]}</div>
              {rowError?.id === item.id ? (
                <p role="alert" className="text-danger">
                  {rowError.message}
                </p>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Dialog>
  )
}
