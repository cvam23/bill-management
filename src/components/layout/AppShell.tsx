import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LogOut, Menu } from 'lucide-react'
import { Logo } from './Logo'

type AppShellProps = {
  onSignOut?: () => void
}

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800'

const links = [
  { to: '/billing', label: 'Billing' },
  { to: '/services', label: 'Services & Parts' },
  { to: '/bills', label: 'Saved Bills' },
]

export function AppShell({ onSignOut }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:grid md:grid-cols-[16rem_1fr]">
      <aside className="no-print border-b border-slate-200 bg-white md:border-b-0 md:border-r">
        <header className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="font-semibold">Riddhi Sewing Machine</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls="main-nav"
              onClick={() => setMenuOpen((open) => !open)}
              className={`inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm md:hidden ${focusRing}`}
            >
              <Menu aria-hidden="true" className="h-4 w-4" />
              Menu
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className={`inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 ${focusRing}`}
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </header>
        <nav
          id="main-nav"
          aria-label="Main"
          className={`${menuOpen ? 'block' : 'hidden'} px-4 pb-4 md:block`}
        >
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2 text-sm font-medium ${focusRing} ${
                      isActive ? 'bg-teal-800 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  )
}
