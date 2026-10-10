import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { LoginPage } from '../features/auth/LoginPage'
import { AuthProvider, RequireAuth, useAuth } from './auth'

function Billing() {
  return <p>Billing</p>
}

function Services() {
  return <p>Services</p>
}

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
              <Route path="/billing" element={<Billing />} />
              <Route path="/services" element={<Services />} />
              <Route path="/bills" element={<Bills />} />
              <Route path="/bills/:id" element={<Bill />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
