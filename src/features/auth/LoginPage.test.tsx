import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { LoginPage } from './LoginPage'

vi.mock('../../app/auth', () => ({
  useAuth: () => ({
    session: null,
    authorized: false,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}))

test('shows email, password and sign in without any registration control', () => {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )

  expect(screen.getByLabelText('Email')).toBeInTheDocument()
  expect(screen.getByLabelText('Password')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /create account|sign up/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /create account|sign up/i })).not.toBeInTheDocument()
})
