import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'

const tickets = [
  {
    to: '/services',
    code: 'List',
    title: 'Master list',
    detail: 'Services and spare parts, with their prices.',
    tone: 'ink',
  },
  {
    to: '/bills',
    code: 'Saved',
    title: 'Bills',
    detail: 'Find a saved bill to view, print, or download.',
    tone: 'ink',
  },
  {
    to: '/billing',
    code: 'New',
    title: 'New bill',
    detail: 'Start a bill for the job on the counter.',
    tone: 'thread',
  },
] as const

export function HomePage() {
  return (
    <section className="space-y-5">
      <PageHeader kicker="Counter" title="Home" />
      <ul className="grid gap-3 md:grid-cols-3">
        {tickets.map((ticket, index) => (
          <li
            key={ticket.to}
            className="rise"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <Link
              to={ticket.to}
              aria-label={`${ticket.title}. ${ticket.detail}`}
              className="group flex h-full min-h-44 flex-col overflow-hidden rounded-md border border-line bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-thread-ink motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:-translate-y-0.5"
            >
              <span
                aria-hidden="true"
                className={`flex h-12 items-end border-b border-dashed px-4 pb-2 font-mono text-[11px] font-medium tracking-[0.18em] uppercase ${
                  ticket.tone === 'thread'
                    ? 'border-white/35 bg-thread text-white'
                    : 'border-white/15 bg-housing text-white/75'
                }`}
              >
                {ticket.code}
              </span>
              <span className="flex min-w-0 flex-1 flex-col px-4 py-4">
                <span className="font-display text-[2rem] leading-none font-semibold tracking-wide text-ink uppercase">
                  {ticket.title}
                </span>
                <span className="mt-3 text-sm leading-snug text-balance text-muted">
                  {ticket.detail}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
