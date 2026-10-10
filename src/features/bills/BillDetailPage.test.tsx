import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import { BillDetailPage } from './BillDetailPage'
import * as api from './api'
import type { SavedBill } from './types'

vi.mock('./api')

const bill: SavedBill = {
  id: 'bill-1',
  billNumber: 'RS-0001',
  billDate: '2026-10-10',
  customerName: null,
  customerAddress: '12 Main Road',
  grandTotal: '600.00',
  lines: [
    {
      lineNumber: 1,
      itemNumber: '1001',
      itemName: 'Machine Service',
      itemDescription: null,
      itemType: 'service',
      quantity: 2,
      unitPrice: '300.00',
      lineAmount: '600.00',
    },
  ],
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/bills/bill-1']}>
      <Routes>
        <Route path="/bills/:id" element={<BillDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

test('shows Bill not found when the bill does not exist', async () => {
  vi.mocked(api.getBill).mockResolvedValue(null)
  renderPage()

  expect(await screen.findByText('Bill not found')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Print' })).not.toBeInTheDocument()
})

test('renders the invoice sheet with Print and Download PDF, and no Edit or Delete', async () => {
  vi.mocked(api.getBill).mockResolvedValue(bill)
  const print = vi.spyOn(window, 'print').mockImplementation(() => {})
  const user = userEvent.setup()
  renderPage()

  const sheet = await screen.findByRole('article', { name: 'Invoice RS-0001' })
  expect(sheet).toHaveTextContent('Riddhi Sewing Machine')
  expect(sheet).toHaveTextContent('Walk-in Customer')
  expect(sheet).toHaveTextContent('12 Main Road')
  expect(sheet).toHaveTextContent('10 Oct 2026')
  expect(sheet).toHaveTextContent('Thank you for choosing Riddhi Sewing Machine.')
  expect(screen.queryByRole('button', { name: /Edit|Delete/ })).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Print' }))
  expect(print).toHaveBeenCalledTimes(1)
  await user.click(screen.getByRole('button', { name: 'Download PDF' }))
  expect(api.downloadBillPdf).toHaveBeenCalledWith(bill)

  expect(screen.getByRole('button', { name: 'Print' }).parentElement).toHaveClass('no-print')
})

test('shows an error with Try again when the bill cannot be loaded', async () => {
  vi.mocked(api.getBill).mockRejectedValueOnce(new Error('boom')).mockResolvedValue(bill)
  const user = userEvent.setup()
  renderPage()

  expect(await screen.findByText('Could not load the bill.')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Try again' }))

  expect(await screen.findByRole('article', { name: 'Invoice RS-0001' })).toBeInTheDocument()
})
