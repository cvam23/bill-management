import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { toast } from 'sonner'
import { ServicesPage } from './ServicesPage'
import type { MasterItem } from './api'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function makeApi(rows: MasterItem[]) {
  return {
    listMasterItems: vi.fn().mockResolvedValue({ rows, total: rows.length }),
    createMasterItem: vi.fn(),
    updateMasterItem: vi.fn(),
    setMasterItemActive: vi.fn(),
  }
}

test('shows the empty catalog state and an Add Item button', async () => {
  render(<ServicesPage api={makeApi([])} />)

  expect(await screen.findByText('No items yet')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument()
})

test('renders an inactive spare part row', async () => {
  const api = makeApi([
    {
      id: 'item-1',
      itemNumber: '1001',
      name: 'Needle Set',
      description: null,
      itemType: 'spare_part',
      defaultPrice: '1250.00',
      isActive: false,
    },
  ])

  render(<ServicesPage api={api} />)

  const row = (await screen.findByText('Needle Set')).closest('tr') as HTMLElement
  expect(within(row).getByText('1001')).toBeInTheDocument()
  expect(within(row).getByText('Spare Part')).toBeInTheDocument()
  expect(within(row).getByText(/1,250\.00/)).toBeInTheDocument()
  expect(within(row).getByText('Inactive')).toBeInTheDocument()
  expect(within(row).getByText('—')).toBeInTheDocument()
})

const activeItem: MasterItem = {
  id: 'item-1',
  itemNumber: '1001',
  name: 'Needle Set',
  description: 'Pack of 10',
  itemType: 'spare_part',
  defaultPrice: '1250.00',
  isActive: true,
}

test('confirms deactivation with the item number and name', async () => {
  const api = makeApi([activeItem])
  api.setMasterItemActive.mockResolvedValue({ ...activeItem, isActive: false })
  const user = userEvent.setup()
  render(<ServicesPage api={api} />)

  await user.click(await screen.findByRole('button', { name: 'Deactivate' }))
  expect(screen.getByRole('dialog', { name: 'Deactivate 1001, Needle Set?' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Confirm' }))

  expect(api.setMasterItemActive).toHaveBeenCalledWith('item-1', false)
  await vi.waitFor(() => expect(toast.success).toHaveBeenCalled())
  expect(api.listMasterItems).toHaveBeenCalledTimes(2)
})

test('shows a retry when the list fails to load', async () => {
  const api = makeApi([])
  api.listMasterItems.mockRejectedValueOnce(new Error('boom'))
  const user = userEvent.setup()
  render(<ServicesPage api={api} />)

  expect(await screen.findByText('Could not load items.')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByText('No items yet')).toBeInTheDocument()
})

test('add shows the new item number and maps duplicate_name to the name field', async () => {
  const api = makeApi([])
  const { MasterItemError } = await import('./api')
  api.createMasterItem
    .mockRejectedValueOnce(
      new MasterItemError('An item with this name already exists for this type.', 'duplicate_name'),
    )
    .mockResolvedValueOnce({ ...activeItem, name: 'Belt' })
  const user = userEvent.setup()
  render(<ServicesPage api={api} />)

  await user.click(await screen.findByRole('button', { name: 'Add Item' }))
  expect(screen.queryByText(/Item number/)).not.toBeInTheDocument()
  await user.type(screen.getByLabelText('Item Name'), 'Belt')
  await user.type(screen.getByLabelText('Default Price (₹)'), '50')
  await user.click(screen.getByRole('button', { name: 'Save' }))

  expect(
    await screen.findByText('An item with this name already exists for this type.'),
  ).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Save' }))

  expect(await screen.findByText('Item number 1001')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
})
