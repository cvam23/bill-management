import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from './HomePage'

test('offers the master list, saved bills, and a new bill', () => {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )

  expect(
    screen.getByRole('link', {
      name: 'Master list. Services and spare parts, with their prices.',
    }),
  ).toHaveAttribute('href', '/services')
  expect(
    screen.getByRole('link', {
      name: 'Bills. Find a saved bill to view, print, or download.',
    }),
  ).toHaveAttribute('href', '/bills')
  expect(
    screen.getByRole('link', { name: 'New bill. Start a bill for the job on the counter.' }),
  ).toHaveAttribute('href', '/billing')
})
