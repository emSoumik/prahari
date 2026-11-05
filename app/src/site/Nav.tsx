import clsx from 'clsx'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { GITHUB, NAV, PRIMARY } from './content'
import { Arrow, Button, EASE, Wordmark } from './ui'

/** Fixed bar. Desktop: links + primary action. Phone: wordmark, action, menu sheet. */
export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    for (const n of NAV) {
      const el = document.getElementById(n.id)
      if (el) io.observe(el)
    }
    const hero = document.getElementById('top')
    if (hero) io.observe(hero)
    return () => {
      window.removeEventListener('scroll', onScroll)
      io.disconnect()
    }
  }, [])

  return (
    <>
      <header
        className={clsx(
          'fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-300',
          scrolled || open ? 'bg-white shadow-[0_1px_0_var(--line)]' : 'bg-white/0',
        )}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="s-wrap flex h-[var(--nav)] items-center gap-8">
          <a href="#top" aria-label="Prahari, back to top" className="shrink-0">
            <Wordmark />
          </a>
          <nav aria-label="Sections" className="hidden items-center gap-7 text-[14.5px] text-[var(--ink-2)] lg:flex">
            {NAV.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                aria-current={active === n.id ? 'true' : undefined}
                className={clsx('s-link transition-colors hover:text-[var(--ink)]', active === n.id && 's-link--on text-[var(--ink)]')}
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-5 md:flex">
            <Link to="/app" className="s-link text-[14.5px] text-[var(--ink-2)] hover:text-[var(--ink)]">
              Open the app
            </Link>
            <a href={GITHUB} target="_blank" rel="noreferrer" className="s-link text-[14.5px] text-[var(--ink-2)] hover:text-[var(--ink)]">
              GitHub
            </a>
            <Button to={PRIMARY.to} size="sm">
              {PRIMARY.label}
              <Arrow size={13} />
            </Button>
          </div>
          <div className="ml-auto flex items-center gap-2 md:hidden">
            <Button to={PRIMARY.to} size="sm">Try the demo</Button>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              className="relative grid size-11 place-items-center rounded-full active:scale-[0.96]"
            >
              <span className={clsx('absolute h-[1.5px] w-[18px] bg-[var(--ink)] transition-transform duration-300', open ? 'rotate-45' : '-translate-y-[4px]')} />
              <span className={clsx('absolute h-[1.5px] w-[18px] bg-[var(--ink)] transition-transform duration-300', open ? '-rotate-45' : 'translate-y-[4px]')} />
            </button>
          </div>
        </div>
      </header>
      <MobileMenu open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduce = useReducedMotion()
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>('a, button')
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    panel.current?.querySelector<HTMLElement>('a')?.focus()
    const mq = window.matchMedia('(min-width: 768px)')
    const onWide = () => mq.matches && onClose()
    mq.addEventListener('change', onWide)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
      mq.removeEventListener('change', onWide)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id="site-menu"
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-40 flex flex-col bg-white px-6 md:hidden"
          style={{ paddingTop: 'calc(var(--nav) + env(safe-area-inset-top) + 24px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.18 } }}
          transition={{ duration: 0.2 }}
        >
          <nav aria-label="Sections" className="flex flex-col">
            {NAV.map((n, i) => (
              <motion.a
                key={n.id}
                href={`#${n.id}`}
                onClick={onClose}
                className="s-display flex items-center justify-between border-b border-[var(--line)] py-4 text-[34px]"
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE, delay: 0.04 + i * 0.035 }}
              >
                {n.label}
                <span className="text-[var(--ink-3)]"><Arrow size={18} /></span>
              </motion.a>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-3">
            <Button to="/app" variant="ghost" className="w-full" onClick={onClose}>Open the app</Button>
            <div className="flex justify-center gap-8 pt-2 text-[15px] text-[var(--ink-2)]">
              <a href={GITHUB} target="_blank" rel="noreferrer">GitHub</a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
