import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import type { MasterItem } from '../services/api'
import { ItemSearchDialog } from './ItemSearchDialog'

const machineService: MasterItem = {
  id: 'item-1',
  itemNumber: '1001',
  name: 'Machine Service',
  description: 'General machine servicing',
  itemType: 'service',
  defaultPrice: '300.00',
  isActive: true,
}

function renderDialog(overrides: Partial<Parameters<typeof ItemSearchDialog>[0]> = {}) {
  const props = {
    search: '',
    items: [] as MasterItem[],
    loading: false,
    error: null,
    rowError: null,
    onSearchChange: vi.fn(),
    onSelect: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
  render(<ItemSearchDialog {...props} />)
  return props
}

test('shows an empty result message when nothing matches', () => {
  renderDialog({ search: 'zzzz' })

  expect(screen.getByText('No matching items')).toBeInTheDocument()
})

test('shows the item number, name, description, type and price', () => {
  renderDialog({ items: [machineService] })

  expect(screen.getByText('1001')).toBeInTheDocument()
  expect(screen.getByText('Machine Service')).toBeInTheDocument()
  expect(screen.getByText('General machine servicing')).toBeInTheDocument()
  expect(screen.getByText('Service')).toBeInTheDocument()
  expect(screen.getByText(/300\.00/)).toBeInTheDocument()
})

test('shows a dash for a missing description', () => {
  renderDialog({ items: [{ ...machineService, description: null }] })

  expect(screen.getByText('—')).toBeInTheDocument()
})

test('has Clear search and Close buttons', async () => {
  const user = userEvent.setup()
  const props = renderDialog({ search: 'mach' })

  await user.click(screen.getByRole('button', { name: 'Clear search' }))
  expect(props.onSearchChange).toHaveBeenCalledWith('')

  await user.click(screen.getByRole('button', { name: 'Close' }))
  expect(props.onClose).toHaveBeenCalled()
})

test('moves the active option with arrow keys and selects with Enter', async () => {
  const user = userEvent.setup()
  const second: MasterItem = { ...machineService, id: 'item-2', itemNumber: '1002', name: 'Belt' }
  const props = renderDialog({ items: [machineService, second] })
  const input = screen.getByRole('combobox')

  await user.click(input)
  await user.keyboard('{ArrowDown}')
  expect(input).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[1].id)

  await user.keyboard('{Enter}')
  expect(props.onSelect).toHaveBeenCalledWith(second)
})

test('shows the row error on the existing item', () => {
  renderDialog({
    items: [machineService],
    rowError: { id: 'item-1', message: 'Quantity cannot exceed 9999.' },
  })

  expect(screen.getByText('Quantity cannot exceed 9999.')).toBeInTheDocument()
})
