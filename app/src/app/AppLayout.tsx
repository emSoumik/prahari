import { motion } from 'motion/react'
import { BookText, FlaskConical, KeyRound, LayoutGrid } from 'lucide-react'
import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import clsx from 'clsx'
import { useDev } from '../prahari/backend'
import { useLlm } from '../prahari/llm'
import { PrahariWordmark, SPRING } from '../demo/shell/ui'

const NAV = [
  { to: '/app', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/app/demo/food', label: 'Demos', icon: FlaskConical, end: false },
  { to: '/app/policies', label: 'Policies', icon: BookText, end: false },
  { to: '/app/settings', label: 'Model', icon: KeyRound, end: false },
]

/** Engine and model state, shared by the header pill and the mobile dot. */
export function useEngineStatus() {
  const mode = useDev((s) => s.mode)
  const health = useDev((s) => s.health)
  const model = useLlm((s) => s.model)
  const connected = mode === 'backend' && health?.ok === true && health.llmKey
  const tone: 'ok' | 'idle' | 'down' = mode === 'local' ? 'idle' : health?.ok ? 'ok' : 'down'
  const label = mode === 'local' ? 'Local engine' : connected ? health?.llm?.model || model || 'Backend' : health?.ok ? 'Backend · no model' : 'Backend offline'
  return { tone, label, connected }
}

const dotClass = (tone: 'ok' | 'idle' | 'down') => (tone === 'ok' ? 'bg-leaf' : tone === 'down' ? 'bg-alarm' : 'bg-ink-3')

function isActive(pathname: string, item: (typeof NAV)[number]) {
  if (item.end) return pathname === item.to
  if (item.label === 'Demos') return pathname.startsWith('/app/demo')
  return pathname.startsWith(item.to)
}

export default function AppLayout() {
  const checkHealth = useDev((s) => s.checkHealth)
  const { pathname } = useLocation()
  const status = useEngineStatus()

  useEffect(() => {
    void checkHealth()
  }, [checkHealth])

  return (
    <div className="min-h-dvh bg-paper text-ink">
      {/* desktop top bar */}
      <header className="sticky top-0 z-30 hidden h-16 border-b border-rule bg-paper md:block">
        <div className="mx-auto flex h-full w-full max-w-[1120px] items-center gap-8 px-8">
          <Link to="/" aria-label="Prahari home" className="rounded-md active:scale-[0.97]">
            <PrahariWordmark />
          </Link>
          <nav aria-label="App" className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = isActive(pathname, item)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={clsx(
                    'relative inline-flex h-9 items-center rounded-full px-4 text-[14px] font-medium transition-colors duration-150 active:scale-[0.97]',
                    active ? 'text-ink' : 'text-ink-2 [@media(hover:hover)]:hover:text-ink',
                  )}
                >
                  {active && <motion.span layoutId="app-nav-desktop" transition={SPRING} className="absolute inset-0 rounded-full bg-card ring-1 ring-rule" />}
                  <span className="relative">{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
          <Link
            to="/app/settings"
            className="ml-auto inline-flex h-9 max-w-[260px] items-center gap-2 rounded-full bg-card px-3.5 text-[13px] font-medium ring-1 ring-rule transition-transform duration-150 active:scale-[0.97] [@media(hover:hover)]:hover:ring-ink/25"
          >
            <span className={clsx('size-2 shrink-0 rounded-full', dotClass(status.tone))} />
            <span className="truncate">{status.label}</span>
          </Link>
        </div>
      </header>

      {/* mobile header */}
      <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-rule bg-paper px-4 pt-[env(safe-area-inset-top)] box-content md:hidden">
        <Link to="/" aria-label="Prahari home" className="active:scale-[0.97]">
          <PrahariWordmark />
        </Link>
        <Link to="/app/settings" aria-label={`Engine: ${status.label}`} className="-mr-3 grid size-11 place-items-center">
          <span className={clsx('size-2.5 rounded-full', dotClass(status.tone))} />
        </Link>
      </header>

      <main className="pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-16">
        <Outlet />
      </main>

      {/* mobile bottom tab bar */}
      <nav aria-label="App" className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-paper pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid grid-cols-4">
          {NAV.map((item) => {
            const active = isActive(pathname, item)
            const Icon = item.icon
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={clsx('relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors duration-150 active:scale-[0.97]', active ? 'text-ink' : 'text-ink-3')}
                >
                  {active && <motion.span layoutId="app-nav-mobile" transition={SPRING} className="absolute inset-x-3 top-1 bottom-1 rounded-[14px] bg-ink/[0.06]" />}
                  <Icon size={21} strokeWidth={active ? 2.2 : 1.8} className="relative" />
                  <span className="relative">{item.label}</span>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
