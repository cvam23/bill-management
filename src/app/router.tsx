import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'

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

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/billing" replace />} />
        <Route element={<AppShell />}>
          <Route path="/billing" element={<Billing />} />
          <Route path="/services" element={<Services />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/bills/:id" element={<Bill />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
