import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { LoginPage } from '../features/auth/LoginPage'
import { BillingPage } from '../features/billing/BillingPage'
import { ServicesPage } from '../features/services/ServicesPage'
import { AuthProvider, RequireAuth, useAuth } from './auth'

function Bills() {
  return <p>Bills</p>
}

function Bill() {
  return <p>Bill</p>
}

function AuthenticatedShell() {
  const { signOut } = useAuth()
  return <AppShell onSignOut={() => void signOut()} />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/billing" replace />} />
          <Route element={<RequireAuth />}>
            <Route element={<AuthenticatedShell />}>
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/bills" element={<Bills />} />
              <Route path="/bills/:id" element={<Bill />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
