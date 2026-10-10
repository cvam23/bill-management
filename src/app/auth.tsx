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

    async function apply(next: Session | null) {
      const ok = next ? await checkAuthorized().catch(() => false) : false
      if (!active) return
      setSession(next)
      setAuthorized(ok)
      setLoading(false)
    }

    supabase.auth
      .getSession()
      .then(({ data }) => apply(data.session))
      .catch(() => apply(null))

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      // Defer to avoid calling supabase inside the auth callback.
      setTimeout(() => void apply(next), 0)
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
    return <LoadingState title="Checking your session…" />
  }

  return session && authorized ? <Outlet /> : <Navigate to="/login" replace />
}
