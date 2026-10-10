import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { BillsPage } from './BillsPage'
import type { BillSummary } from './api'

function makeBill(overrides: Partial<BillSummary> = {}): BillSummary {
  return {
    id: 'bill-1',
    billNumber: 'B-1001',
    billDate: '2026-10-10',
    customerName: null,
    grandTotal: '450.00',
    ...overrides,
  }
}

function makeApi(rows: BillSummary[], total = rows.length) {
  return { listBills: vi.fn().mockResolvedValue({ rows, total }) }
}

function renderPage(api: ReturnType<typeof makeApi>) {
  return render(
    <MemoryRouter>
      <BillsPage api={api} />
    </MemoryRouter>,
  )
}

test('shows a saved bill row with a walk-in customer, date, total, and a View link', async () => {
  renderPage(makeApi([makeBill()]))

  const row = (await screen.findByText('B-1001')).closest('tr') as HTMLElement
  expect(row).toHaveTextContent('10 Oct 2026')
  expect(row).toHaveTextContent('Walk-in Customer')
  expect(row).toHaveTextContent(/450\.00/)
  expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute('href', '/bills/bill-1')
  expect(screen.getByRole('heading', { name: 'Saved Bills' })).toBeInTheDocument()
})

test('does not offer Edit or Delete on a saved bill', async () => {
  renderPage(makeApi([makeBill({ customerName: 'Asha' })]))

  expect(await screen.findByText('Asha')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
})

test('shows No bills yet when nothing is filtered and there are no rows', async () => {
  renderPage(makeApi([]))

  expect(await screen.findByText('No bills yet')).toBeInTheDocument()
})

test('shows No matching bills when a search finds nothing', async () => {
  const api = makeApi([])
  const user = userEvent.setup()
  renderPage(api)
  await screen.findByText('No bills yet')

  await user.type(screen.getByLabelText('Search'), 'zzz')

  expect(await screen.findByText('No matching bills')).toBeInTheDocument()
  expect(api.listBills).toHaveBeenLastCalledWith(
    expect.objectContaining({ search: 'zzz', page: 1 }),
  )
})

test('shows a loading state, then an error with Try again that reloads', async () => {
  const api = makeApi([])
  api.listBills.mockRejectedValueOnce(new Error('boom'))
  const user = userEvent.setup()
  renderPage(api)

  expect(screen.getByText('Loading bills…')).toBeInTheDocument()
  expect(await screen.findByText('Could not load bills.')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Try again' }))

  expect(await screen.findByText('No bills yet')).toBeInTheDocument()
  expect(api.listBills).toHaveBeenCalledTimes(2)
})

test('shows Loading bills… and hides the previous rows while a new request is pending', async () => {
  const api = makeApi([makeBill()])
  const user = userEvent.setup()
  renderPage(api)
  expect(await screen.findByText('B-1001')).toBeInTheDocument()

  let finish: (value: { rows: BillSummary[]; total: number }) => void = () => {}
  api.listBills.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)))
  await user.type(screen.getByLabelText('Search'), 'zzz')

  expect(await screen.findByText('Loading bills…')).toBeInTheDocument()
  expect(screen.queryByText('B-1001')).not.toBeInTheDocument()
  expect(screen.queryByText('No matching bills')).not.toBeInTheDocument()

  finish({ rows: [makeBill({ id: 'bill-2', billNumber: 'B-2002' })], total: 1 })

  expect(await screen.findByText('B-2002')).toBeInTheDocument()
  expect(screen.queryByText('Loading bills…')).not.toBeInTheDocument()
})

test('starts as Newest first and toggles to Oldest first', async () => {
  const api = makeApi([makeBill()])
  const user = userEvent.setup()
  renderPage(api)
  await screen.findByText('B-1001')
  expect(api.listBills).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'desc' }))

  await user.click(screen.getByRole('button', { name: 'Newest first' }))

  expect(screen.getByRole('button', { name: 'Oldest first' })).toBeInTheDocument()
  expect(api.listBills).toHaveBeenLastCalledWith(
    expect.objectContaining({ sort: 'asc', page: 1 }),
  )
})

test('disables the range inputs when a single date is set and the date when a range is set', async () => {
  const user = userEvent.setup()
  renderPage(makeApi([makeBill()]))
  await screen.findByText('B-1001')

  await user.type(screen.getByLabelText('Bill date'), '2026-10-10')
  expect(screen.getByLabelText('From date')).toBeDisabled()
  expect(screen.getByLabelText('To date')).toBeDisabled()

  await user.clear(screen.getByLabelText('Bill date'))
  expect(screen.getByLabelText('From date')).toBeEnabled()

  await user.type(screen.getByLabelText('From date'), '2026-10-01')
  expect(screen.getByLabelText('Bill date')).toBeDisabled()
})

test('passes a single date, ignoring the range', async () => {
  const api = makeApi([makeBill()])
  const user = userEvent.setup()
  renderPage(api)
  await screen.findByText('B-1001')

  await user.type(screen.getByLabelText('Bill date'), '2026-10-10')

  await vi.waitFor(() =>
    expect(api.listBills).toHaveBeenLastCalledWith(
      expect.objectContaining({ billDate: '2026-10-10', fromDate: null, toDate: null, page: 1 }),
    ),
  )
})

test('rejects a reversed date range without calling listBills', async () => {
  const api = makeApi([makeBill()])
  const user = userEvent.setup()
  renderPage(api)
  await screen.findByText('B-1001')
  api.listBills.mockClear()

  await user.type(screen.getByLabelText('From date'), '2026-10-10')
  await user.type(screen.getByLabelText('To date'), '2026-10-01')

  expect(
    screen.getByText('The start date must be on or before the end date.'),
  ).toBeInTheDocument()
  expect(api.listBills).not.toHaveBeenCalledWith(
    expect.objectContaining({ fromDate: '2026-10-10', toDate: '2026-10-01' }),
  )
})

test('clamps an out-of-range page back to the last page that has rows', async () => {
  const api = makeApi([])
  api.listBills.mockImplementation(async ({ page }: { page: number }) =>
    page === 1
      ? { rows: [makeBill({ billNumber: 'P-1' })], total: 25 }
      : { rows: [], total: 20 },
  )
  const user = userEvent.setup()
  renderPage(api)
  await screen.findByText('P-1')

  await user.click(screen.getByRole('button', { name: 'Next' }))

  await vi.waitFor(() =>
    expect(api.listBills).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })),
  )
  expect(await screen.findByText('P-1')).toBeInTheDocument()
  expect(screen.queryByText('No matching bills')).not.toBeInTheDocument()
  expect(screen.queryByText('No bills yet')).not.toBeInTheDocument()
})