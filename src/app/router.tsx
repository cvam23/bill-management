import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { LoginPage } from '../features/auth/LoginPage'
import { BillDetailPage } from '../features/bills/BillDetailPage'
import { BillsPage } from '../features/bills/BillsPage'
import { BillingPage } from '../features/billing/BillingPage'
import { ServicesPage } from '../features/services/ServicesPage'
import { AuthProvider, RequireAuth, useAuth } from './auth'

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
              <Route path="/bills" element={<BillsPage />} />
              <Route path="/bills/:id" element={<BillDetailPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
