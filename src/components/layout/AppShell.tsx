import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Archive, ClipboardList, House, LogOut, Menu, Wrench } from 'lucide-react'
import { Logo } from './Logo'

type AppShellProps = {
  onSignOut?: () => void
}

const links = [
  { to: '/', label: 'Home', icon: House },
  { to: '/billing', label: 'Billing', icon: ClipboardList },
  { to: '/services', label: 'Services & Parts', icon: Wrench },
  { to: '/bills', label: 'Saved Bills', icon: Archive },
]

export function AppShell({ onSignOut }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="app-shell min-h-screen overflow-x-clip bg-bench text-ink md:grid md:grid-cols-[16.5rem_1fr]">
      <aside className="no-print flex flex-col bg-housing text-white md:sticky md:top-0 md:h-screen">
        <header className="flex items-center justify-between gap-2 px-3 py-3 md:gap-3 md:px-5 md:pt-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <Logo className="h-9 w-9 md:h-10 md:w-10" />
            <p className="min-w-0 leading-none">
              <span className="sr-only">Riddhi Sewing Machine</span>
              <span
                aria-hidden="true"
                className="block truncate font-display text-2xl font-semibold tracking-[0.06em] uppercase md:text-[1.7rem]"
              >
                Riddhi
              </span>
              <span
                aria-hidden="true"
                className="mt-1 hidden font-mono text-[10px] font-medium tracking-[0.18em] text-white/55 uppercase sm:block"
              >
                Sewing Machine
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 md:hidden">
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls="main-nav"
              aria-label="Menu"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-white/80 hover:bg-white/[0.07] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Menu aria-hidden="true" className="h-5 w-5" />
            </button>
            <SignOutButton onSignOut={onSignOut} />
          </div>
        </header>
        <nav
          id="main-nav"
          aria-label="Main"
          className={`${menuOpen ? 'block' : 'hidden'} px-3 pb-4 md:block md:px-3`}
        >
          <ul className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon
              return (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.to === '/'}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-md px-3 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:py-2.5 ${
                        isActive
                          ? 'bg-white/10 text-white shadow-[inset_3px_0_0_0_#C2412D]'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                    {link.label}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="mt-auto hidden border-t border-white/10 px-3 py-3 md:block">
          <SignOutButton onSignOut={onSignOut} full />
        </div>
      </aside>
      <main className="min-w-0 p-4 md:px-8 md:py-7">
        <Outlet />
      </main>
    </div>
  )
}

function SignOutButton({ onSignOut, full = false }: { onSignOut?: () => void; full?: boolean }) {
  return (
    <button
      type="button"
      onClick={onSignOut}
      aria-label="Sign out"
      title="Sign out"
      className={`group inline-flex items-center justify-center rounded-md text-sm font-medium text-white/70 hover:bg-white/[0.07] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
        full ? 'w-full gap-2.5 px-3 py-2.5' : 'h-11 w-11'
      }`}
    >
      <LogOut
        aria-hidden="true"
        className="h-4 w-4 text-white/45 motion-safe:transition-colors group-hover:text-thread"
      />
      {full ? 'Sign out' : null}
    </button>
  )
}
