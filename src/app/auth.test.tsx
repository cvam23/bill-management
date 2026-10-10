import { act, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { AuthProvider, useAuth } from './auth'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    rpc: mocks.rpc,
  },
}))

function Probe() {
  const { session, authorized, loading } = useAuth()
  return (
    <p data-testid="state">
      {loading ? 'loading' : `${session ? 'session' : 'none'}:${authorized ? 'authorized' : 'denied'}`}
    </p>
  )
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

type Listener = (event: string, session: unknown) => void

test('a newer auth event wins over a slower older authorization check', async () => {
  const session = { user: { id: 'u1' } }
  const slowCheck = deferred<{ data: boolean; error: null }>()
  let listener: Listener | undefined

  mocks.getSession.mockResolvedValue({ data: { session } })
  mocks.rpc.mockReturnValue(slowCheck.promise)
  mocks.onAuthStateChange.mockImplementation((cb: Listener) => {
    listener = cb
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  })

  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )

  // The initial authorization check is in flight.
  await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(1))
  expect(screen.getByTestId('state')).toHaveTextContent('loading')

  // A newer SIGNED_OUT event is handled first.
  act(() => listener!('SIGNED_OUT', null))
  await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('none:denied'))

  // The older check finishes late and must not restore the session.
  await act(async () => {
    slowCheck.resolve({ data: true, error: null })
    await slowCheck.promise
  })
  await new Promise((r) => setTimeout(r, 10))

  expect(screen.getByTestId('state')).toHaveTextContent('none:denied')
})
