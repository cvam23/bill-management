import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { toast } from 'sonner'
import { BillingPage } from './BillingPage'
import * as billsApi from '../bills/api'
import type { SavedBill } from '../bills/types'
import * as api from './api'
import { loadDraft, saveDraft } from './storage'
import type { Draft } from './types'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('./api')
vi.mock('../bills/api')

const storedDraft: Draft = {
  idempotencyKey: 'key-1',
  billDate: '2026-10-10',
  customerName: 'Asha',
  customerAddress: '',
  lines: [
    {
      serviceId: 'item-1',
      itemNumber: '1001',
      itemName: 'Machine Service',
      itemDescription: 'General machine servicing',
      itemType: 'service',
      quantity: 2,
      unitPricePaise: 30000,
    },
  ],
}

function renderPage() {
  return render(
    <MemoryRouter>
      <BillingPage />
    </MemoryRouter>,
  )
}

function stored(): Draft {
  const draft = loadDraft(sessionStorage)
  if (!draft) throw new Error('No stored draft')
  return draft
}

beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
  vi.mocked(api.searchActiveItems).mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
})

test('restores a stored draft', () => {
  saveDraft(sessionStorage, storedDraft)
  renderPage()

  expect(screen.getByLabelText('Customer Name')).toHaveValue('Asha')
  expect(screen.getByText('Machine Service')).toBeInTheDocument()
  expect(screen.getByLabelText('Quantity for Machine Service')).toHaveValue(2)
  expect(screen.getByText('Generated on save')).toBeInTheDocument()
})

test('persists a new draft immediately and keeps its key across reloads', () => {
  const first = renderPage()
  const key = stored().idempotencyKey
  first.unmount()

  renderPage()

  expect(stored().idempotencyKey).toBe(key)
})

test('persists header edits', async () => {
  const user = userEvent.setup()
  renderPage()

  await user.type(screen.getByLabelText('Customer Name'), 'Ravi')

  expect(stored().customerName).toBe('Ravi')
})

test('debounces item search by 300ms', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  renderPage()

  await user.click(screen.getByRole('button', { name: 'Add Item' }))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10)
  })
  expect(api.searchActiveItems).toHaveBeenLastCalledWith('')

  vi.mocked(api.searchActiveItems).mockClear()
  await user.type(screen.getByRole('combobox'), 'mach')
  await act(async () => {
    await vi.advanceTimersByTimeAsync(250)
  })
  expect(api.searchActiveItems).not.toHaveBeenCalled()

  await act(async () => {
    await vi.advanceTimersByTimeAsync(100)
  })
  expect(api.searchActiveItems).toHaveBeenCalledTimes(1)
  expect(api.searchActiveItems).toHaveBeenCalledWith('mach')
})

test('adds a searched item as a line', async () => {
  const user = userEvent.setup()
  vi.mocked(api.searchActiveItems).mockResolvedValue([
    {
      id: 'item-1',
      itemNumber: '1001',
      name: 'Machine Service',
      description: null,
      itemType: 'service',
      defaultPrice: '300.00',
      isActive: true,
    },
  ])
  renderPage()

  await user.click(screen.getByRole('button', { name: 'Add Item' }))
  await user.click(await screen.findByRole('option'))

  expect(screen.getByLabelText('Quantity for Machine Service')).toHaveValue(1)
  expect(stored().lines).toHaveLength(1)
  expect(stored().lines[0].unitPricePaise).toBe(30000)
})

test('commits quantity and unit price edits', async () => {
  const user = userEvent.setup()
  saveDraft(sessionStorage, storedDraft)
  renderPage()

  const quantity = screen.getByLabelText('Quantity for Machine Service')
  await user.clear(quantity)
  await user.type(quantity, '3')
  expect(stored().lines[0].quantity).toBe(3)

  const price = screen.getByLabelText('Unit price for Machine Service')
  await user.clear(price)
  await user.type(price, '250.50')
  await user.tab()

  expect(stored().lines[0].unitPricePaise).toBe(25050)
  expect(screen.getAllByText(/751\.50/).length).toBeGreaterThan(0)
})

test.each(['0', '10000', ''])('blocks saving while the quantity edit is %j', async (text) => {
  const user = userEvent.setup()
  saveDraft(sessionStorage, storedDraft)
  renderPage()

  const quantity = screen.getByLabelText('Quantity for Machine Service')
  await user.clear(quantity)
  if (text) await user.type(quantity, text)

  expect(screen.getByRole('alert')).toHaveTextContent('Quantity must be a whole number')
  expect(screen.getByRole('button', { name: 'Save Bill' })).toBeDisabled()

  await user.tab()
  expect(screen.getByLabelText('Quantity for Machine Service')).toHaveValue(
    text ? Number(text) : null,
  )
  expect(screen.getByRole('button', { name: 'Save Bill' })).toBeDisabled()
  expect(api.createBill).not.toHaveBeenCalled()

  await user.clear(quantity)
  await user.type(quantity, '4')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Save Bill' })).toBeEnabled()
  expect(stored().lines[0].quantity).toBe(4)
})

test('keeps the draft in place when saving fails', async () => {
  const user = userEvent.setup()
  saveDraft(sessionStorage, storedDraft)
  vi.mocked(api.createBill).mockRejectedValue(new Error('Item is no longer active.'))
  renderPage()

  await user.click(screen.getByRole('button', { name: 'Save Bill' }))

  expect(api.createBill).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: 'key-1' }))
  expect(toast.error).toHaveBeenCalledWith('Item is no longer active.')
  expect(stored()).toEqual(storedDraft)
  expect(screen.getByRole('button', { name: 'Save Bill' })).toBeEnabled()
})

const createdBill = {
  id: 'bill-1',
  billNumber: 'RS-0001',
  billDate: '2026-10-10',
  grandTotal: '600.00',
}

const savedBill: SavedBill = {
  id: 'bill-1',
  billNumber: 'RS-0001',
  billDate: '2026-10-10',
  customerName: 'Asha',
  customerAddress: null,
  grandTotal: '600.00',
  lines: [
    {
      lineNumber: 1,
      itemNumber: '1001',
      itemName: 'Machine Service',
      itemDescription: 'General machine servicing',
      itemType: 'service',
      quantity: 2,
      unitPrice: '300.00',
      lineAmount: '600.00',
    },
  ],
}

test('shows View Bill, Create New Bill, Print and Download PDF after saving, then persists a new draft', async () => {
  const user = userEvent.setup()
  saveDraft(sessionStorage, storedDraft)
  vi.mocked(api.createBill).mockResolvedValue(createdBill)
  vi.mocked(billsApi.getBill).mockResolvedValue(savedBill)
  const print = vi.spyOn(window, 'print').mockImplementation(() => {})
  renderPage()

  await user.click(screen.getByRole('button', { name: 'Save Bill' }))

  expect(toast.success).toHaveBeenCalledWith('Bill saved.')
  expect(billsApi.getBill).toHaveBeenCalledWith('bill-1')
  expect(screen.getByRole('link', { name: 'View Bill' })).toHaveAttribute('href', '/bills/bill-1')
  expect(screen.getByRole('button', { name: 'Create New Bill' })).toBeInTheDocument()
  expect(await screen.findByRole('button', { name: 'Print' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument()
  expect(screen.getByRole('article', { name: 'Invoice RS-0001' })).toHaveTextContent(
    'Thank you for choosing Riddhi Sewing Machine.',
  )
  expect(screen.getAllByText(/RS-0001/).length).toBeGreaterThan(0)
  expect(loadDraft(sessionStorage)).toBeNull()

  await user.click(screen.getByRole('button', { name: 'Print' }))
  expect(print).toHaveBeenCalledTimes(1)

  await user.click(screen.getByRole('button', { name: 'Download PDF' }))
  expect(billsApi.downloadBillPdf).toHaveBeenCalledWith(savedBill)

  await user.click(screen.getByRole('button', { name: 'Create New Bill' }))

  expect(screen.getByText('Generated on save')).toBeInTheDocument()
  expect(stored().lines).toEqual([])
  expect(stored().idempotencyKey).not.toBe('key-1')
})

test('keeps View Bill and Create New Bill when the saved bill cannot be loaded', async () => {
  const user = userEvent.setup()
  saveDraft(sessionStorage, storedDraft)
  vi.mocked(api.createBill).mockResolvedValue(createdBill)
  vi.mocked(billsApi.getBill).mockRejectedValue(new Error('network'))
  renderPage()

  await user.click(screen.getByRole('button', { name: 'Save Bill' }))

  await vi.waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith('Could not load the saved bill for printing.'),
  )
  expect(screen.getByRole('link', { name: 'View Bill' })).toHaveAttribute('href', '/bills/bill-1')
  expect(screen.getByRole('button', { name: 'Create New Bill' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Print' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Download PDF' })).not.toBeInTheDocument()
})

