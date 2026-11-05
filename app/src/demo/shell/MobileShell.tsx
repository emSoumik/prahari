import clsx from 'clsx'
import { BookText, Check, ChevronDown, ChevronLeft, ChevronUp, Ellipsis, RotateCcw } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { Link } from 'react-router'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { DevButton } from '../dev/DevPanel'
import type { Domain } from '../../prahari/types'
import { DOMAINS, DOMAIN_ORDER } from '../registry'
import { BottomSheet } from './BottomSheet'
import { Composer } from './Composer'
import { HeaderVerdict } from './HeaderVerdict'
import { PolicySheet } from './PolicySheet'
import { PrahariPanel } from './PrahariPanel'
import { isBusy, resetRuns, sendMessage, useRuns, verifyRun } from './runs'
import { MOBILE_VARS, PrahariGlyph, ShellSizeContext, TYPE_VARS } from './ui'

type Side = 'off' | 'on'

/** The domain apps are drawn for ~600px panes; a small zoom lifts their hard-coded 14px text to 15px+ on a phone. */
const APP_ZOOM = 1.1

/** Phone layout of the demo: one pane at a time, reasoning in a bottom sheet, composer pinned below. */
export function MobileShell({ domain, onDomain }: { domain: Domain; onDomain: (d: Domain) => void }) {
  return <MobileBody key={domain} domain={domain} onDomain={onDomain} />
}

function MobileBody({ domain, onDomain }: { domain: Domain; onDomain: (d: Domain) => void }) {
  const config = DOMAINS[domain]
  const runs = useRuns((s) => s.runs[domain])
  const busy = isBusy(runs)
  const latest = runs.at(-1)
  const reduce = useReducedMotion()
  const App = config.App
  const onVerify = useCallback((runId: string) => verifyRun(config, runId), [config])

  const [picker, setPicker] = useState(false)
  const [menu, setMenu] = useState(false)
  const [policies, setPolicies] = useState(false)
  const [reasoning, setReasoning] = useState(false)
  const closePicker = useCallback(() => setPicker(false), [])
  const closeMenu = useCallback(() => setMenu(false), [])
  const closePolicies = useCallback(() => setPolicies(false), [])
  const closeReasoning = useCallback(() => setReasoning(false), [])

  // Two full-width panes in a scroll-snap row. The segment control mirrors the scroll position.
  const scroller = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<Side>('off')
  const select = (side: Side) => {
    const el = scroller.current
    if (!el) return
    el.scrollTo({ left: side === 'on' ? el.clientWidth : 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  // A dot on the hidden segment when a run finished there and has not been looked at.
  const counts = {
    off: runs.filter((r) => r.off.phase === 'done').length,
    on: runs.reduce((n, r) => n + (r.on.phase === 'done' ? 1 : 0) + r.on.followUps.filter((f) => f.phase === 'done').length, 0),
  }
  const [seen, setSeen] = useState(counts)
  useEffect(() => {
    setSeen((s) => {
      const next = { off: Math.min(s.off, counts.off), on: Math.min(s.on, counts.on) }
      next[active] = counts[active]
      return next.off === s.off && next.on === s.on ? s : next
    })
  }, [active, counts.off, counts.on]) // eslint-disable-line react-hooks/exhaustive-deps
  const dot = (side: Side) => side !== active && counts[side] > seen[side]

  // Panel width follows the sheet, which is the full viewport width.
  const [sheetW, setSheetW] = useState(() => window.innerWidth)
  useEffect(() => {
    const on = () => setSheetW(window.innerWidth)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  return (
    <ShellSizeContext.Provider value="md">
      <div
        style={{ ...MOBILE_VARS, '--pane-head': '52px' } as CSSProperties}
        className="relative flex h-dvh w-full flex-col overflow-hidden bg-paper text-ink"
      >
        <header className="flex shrink-0 items-center gap-1 border-b border-rule pt-[env(safe-area-inset-top)] pr-2 pl-1">
          <div className="flex h-13 w-full items-center gap-1">
            <Link
              to="/app"
              aria-label="Back to the Prahari app"
              className="grid size-11 shrink-0 place-items-center rounded-full text-ink-2 transition-transform duration-150 active:scale-[0.95]"
            >
              <ChevronLeft size={22} />
            </Link>
            <button
              type="button"
              onClick={() => setPicker(true)}
              aria-haspopup="dialog"
              className="inline-flex h-11 min-w-0 items-center gap-2 rounded-full px-3 text-(length:--t-label) font-semibold transition-transform duration-150 active:scale-[0.97]"
            >
              <span className="flex shrink-0 items-center">{config.logo}</span>
              {/* The HDFC logo is the full wordmark, so it needs no name beside it. */}
              {domain !== 'bank' && <span className="truncate">{config.name}</span>}
              <ChevronDown size={15} className="shrink-0 text-ink-3" />
            </button>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              {/* The popover is a 380px card for desktop; on a phone it spans the screen under the bar. */}
              <div className="[&_.z-50]:fixed [&_.z-50]:inset-x-3 [&_.z-50]:top-[calc(env(safe-area-inset-top)+56px)] [&_.z-50]:w-auto [&_.z-50]:max-h-[calc(100dvh-80px)] [&_.z-50]:overflow-y-auto">
                <DevButton />
              </div>
              <button
                type="button"
                onClick={() => setMenu(true)}
                aria-label="More"
                aria-haspopup="dialog"
                className="grid size-11 place-items-center rounded-full text-ink transition-transform duration-150 active:scale-[0.95]"
              >
                <Ellipsis size={20} />
              </button>
            </div>
          </div>
        </header>

        <div role="tablist" aria-label="Which agent" className="grid shrink-0 grid-cols-2 gap-1 px-3 pt-3 pb-2">
          <SegButton side="off" active={active === 'off'} dot={dot('off')} onClick={() => select('off')} />
          <SegButton side="on" active={active === 'on'} dot={dot('on')} onClick={() => select('on')} />
        </div>

        <main
          ref={scroller}
          onScroll={(e) => {
            const el = e.currentTarget
            const next: Side = el.scrollLeft > el.clientWidth / 2 ? 'on' : 'off'
            setActive((a) => (a === next ? a : next))
          }}
          className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <section role="tabpanel" aria-label="Without guardrail" className="relative h-full w-full shrink-0 snap-start snap-always">
            <div className="h-full" style={{ ...TYPE_VARS.md, zoom: APP_ZOOM } as CSSProperties}>
              <App key={`${domain}-off`} side="off" runs={runs} onVerify={onVerify} variant="page" />
            </div>
          </section>
          <section role="tabpanel" aria-label="With Prahari" className="relative flex h-full w-full shrink-0 snap-start snap-always flex-col">
            <button
              type="button"
              onClick={() => setReasoning(true)}
              aria-haspopup="dialog"
              className="flex h-12 shrink-0 items-center gap-2 border-b border-rule bg-paper-2 px-3.5 text-(length:--t-ui) transition-colors duration-150 active:bg-paper-2/60"
            >
              <PrahariGlyph size={15} />
              <span className="font-semibold">Reasoning</span>
              <HeaderVerdict run={latest} />
              <ChevronUp size={16} className="ml-auto text-ink-3" />
            </button>
            <div className="min-h-0 flex-1" style={{ ...TYPE_VARS.md, zoom: APP_ZOOM } as CSSProperties}>
              <App key={`${domain}-on`} side="on" runs={runs} onVerify={onVerify} variant="page" />
            </div>
          </section>
        </main>

        <Composer
          key={domain}
          mobile
          scenarios={config.scenarios}
          busy={busy}
          placeholder="Message, or try to break it"
          onSend={(t) => sendMessage(config, t)}
        />

        <BottomSheet open={picker} onClose={closePicker} label="Choose a demo">
          <ul className="px-3 pt-1 pb-3">
            {DOMAIN_ORDER.map((id) => (
              <li key={id}>
                <SheetRow
                  onClick={() => {
                    setPicker(false)
                    if (id !== domain) onDomain(id)
                  }}
                  trailing={id === domain ? <Check size={18} className="text-leaf" /> : null}
                >
                  <span className="grid min-w-6 place-items-center">{DOMAINS[id].logo}</span>
                  {DOMAINS[id].name}
                </SheetRow>
              </li>
            ))}
          </ul>
        </BottomSheet>

        <BottomSheet open={menu} onClose={closeMenu} label="More">
          <ul className="px-3 pt-1 pb-3">
            <li>
              <SheetRow
                onClick={() => {
                  setMenu(false)
                  setPolicies(true)
                }}
              >
                <BookText size={18} className="text-ink-2" />
                Policies
              </SheetRow>
            </li>
            <li>
              <SheetRow
                disabled={runs.length === 0}
                onClick={() => {
                  setMenu(false)
                  resetRuns(domain)
                }}
              >
                <RotateCcw size={18} className="text-ink-2" />
                Reset conversation
              </SheetRow>
            </li>
          </ul>
        </BottomSheet>

        <BottomSheet
          open={reasoning}
          onClose={closeReasoning}
          label="Pre-execution check"
          height="85dvh"
        >
          <PrahariPanel run={latest} width={sheetW} />
        </BottomSheet>

        <PolicySheet
          open={policies}
          domain={domain}
          onClose={closePolicies}
          onOpenDemo={(d) => {
            setPolicies(false)
            onDomain(d)
          }}
        />
      </div>
    </ShellSizeContext.Provider>
  )
}

function SegButton({ side, active, dot, onClick }: { side: Side; active: boolean; dot: boolean; onClick: () => void }) {
  const off = side === 'off'
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={clsx(
        'relative inline-flex h-11 items-center justify-center gap-2 rounded-full text-(length:--t-label) font-semibold ring-1 ring-inset transition-[background-color,color,box-shadow,transform] duration-200 active:scale-[0.97]',
        active ? (off ? 'bg-alarm-soft text-alarm ring-alarm/20' : 'bg-leaf-soft text-leaf ring-leaf/25') : 'bg-transparent text-ink-2 ring-rule',
      )}
    >
      <span className={clsx('size-1.5 rounded-full', off ? 'bg-alarm' : 'bg-leaf', !active && 'opacity-50')} />
      {off ? 'Without guardrail' : 'With Prahari'}
      <span
        aria-label={dot ? 'New result' : undefined}
        className={clsx(
          'absolute top-2 right-3.5 size-2 rounded-full ring-2 ring-paper transition-[transform,opacity] duration-200',
          off ? 'bg-alarm' : 'bg-leaf',
          dot ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
        )}
      />
    </button>
  )
}

function SheetRow({ children, onClick, trailing, disabled }: { children: ReactNode; onClick: () => void; trailing?: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 text-left text-(length:--t-body) font-medium transition-[background-color,opacity] duration-150 active:bg-paper-2 disabled:opacity-40"
    >
      {children}
      {trailing && <span className="ml-auto">{trailing}</span>}
    </button>
  )
}
