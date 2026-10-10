import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from './AppShell'

test('shows the business name and the three modules', () => {
  render(
    <MemoryRouter>
      <AppShell />
    </MemoryRouter>,
  )
  expect(screen.getByText('Riddhi Sewing Machine')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Billing' })).toHaveAttribute('href', '/billing')
  expect(screen.getByRole('link', { name: 'Services & Parts' })).toHaveAttribute('href', '/services')
  expect(screen.getByRole('link', { name: 'Saved Bills' })).toHaveAttribute('href', '/bills')
})
