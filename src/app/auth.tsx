import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Navigate, Outlet } from 'react-router-dom'
import { LoadingState } from '../components/ui/LoadingState'
import { supabase } from '../lib/supabase'

type AuthContextValue = {
  session: Session | null
  authorized: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function checkAuthorized(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_authorized')
  return !error && data === true
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    // Each auth input (initial getSession or an auth event) takes a version when
    // it starts. Only the latest version may commit, so slow authorization
    // checks from older inputs can never overwrite newer state.
    let latest = 0

    async function apply(next: Session | null, version: number) {
      const ok = next ? await checkAuthorized().catch(() => false) : false
      if (!active || version !== latest) return
      setSession(next)
      setAuthorized(ok)
      setLoading(false)
    }

    const initialVersion = ++latest
    supabase.auth
      .getSession()
      .then(({ data }) => apply(data.session, initialVersion))
      .catch(() => apply(null, initialVersion))

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      const version = ++latest
      // Defer to avoid calling supabase inside the auth callback.
      setTimeout(() => void apply(next, version), 0)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      throw error
    }
    if (!(await checkAuthorized())) {
      await supabase.auth.signOut()
      throw new Error('This account is not authorized.')
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = useMemo(
    () => ({ session, authorized, loading, signIn, signOut }),
    [session, authorized, loading, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }
  return value
}

export function RequireAuth() {
  const { session, authorized, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bench">
        <LoadingState title="Checking your session…" />
      </div>
    )
  }

  return session && authorized ? <Outlet /> : <Navigate to="/login" replace />
}
