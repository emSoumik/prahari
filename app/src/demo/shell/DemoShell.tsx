import clsx from 'clsx'
import { ArrowLeft, ArrowRight, BookText, PanelRightClose, PanelRightOpen, RotateCcw } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router'
import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react'
import { DevButton } from '../dev/DevPanel'
import type { Domain } from '../../prahari/types'
import { DOMAINS, DOMAIN_ORDER } from '../registry'
import { PolicySheet } from './PolicySheet'
import { Composer } from './Composer'
import { HeaderVerdict } from './HeaderVerdict'
import { MobileShell } from './MobileShell'
import { PHONE_QUERY, useMediaQuery } from './useMedia'
import { PrahariPanel } from './PrahariPanel'
import { isBusy, resetRuns, sendMessage, useRuns, verifyRun } from './runs'
import type { Run } from './types'
import { PrahariWordmark, SPRING, ShellSizeContext, TYPE_VARS, type ShellSize } from './ui'

export interface DemoShellProps {
  domain: Domain
  /** 'page' fills the viewport; 'slide' fills its parent (the deck's 1920×1080 stage). */
  variant?: 'page' | 'slide'
  /** Controlled tab switching. Without it the shell switches tabs on its own. */
  onDomainChange?: (d: Domain) => void
}

const PANEL_W: Record<ShellSize, number> = { lg: 400, md: 340 }
/** Below this app width the reasoning panel overlays the chat instead of taking a column. */
const MIN_APP_W: Record<ShellSize, number> = { lg: 440, md: 420 }
/** The domain apps are drawn at laptop scale; on a projector they are zoomed up so their small text stays readable. */
const APP_ZOOM: Record<ShellSize, number> = { lg: 1.15, md: 1 }
/** Shell width from which the projector scale applies (the deck stage is 1920 wide). */
const LG_FROM = 1700

export function DemoShell(props: DemoShellProps) {
  const phone = useMediaQuery(PHONE_QUERY)
  if (phone && (props.variant ?? 'page') === 'page') return <PhoneShell {...props} />
  return <DesktopShell {...props} />
}

/** Owns the domain (controlled or local) for the phone layout. */
function PhoneShell({ domain: domainProp, onDomainChange }: DemoShellProps) {
  const [local, setLocal] = useState(domainProp)
  const domain = onDomainChange ? domainProp : local
  return <MobileShell domain={domain} onDomain={onDomainChange ?? setLocal} />
}

function DesktopShell({ domain: domainProp, variant = 'page', onDomainChange }: DemoShellProps) {
  const [localDomain, setLocalDomain] = useState(domainProp)
  const [prevProp, setPrevProp] = useState(domainProp)
  if (prevProp !== domainProp) {
    setPrevProp(domainProp)
    setLocalDomain(domainProp)
  }
  const domain = onDomainChange ? domainProp : localDomain
  const config = DOMAINS[domain]

  const setDomain = useCallback(
    (d: Domain) => {
      if (onDomainChange) onDomainChange(d)
      else setLocalDomain(d)
    },
    [onDomainChange],
  )

  const runs = useRuns((s) => s.runs[domain])
  const busy = isBusy(runs)
  const latest = runs.at(-1)

  const [policiesOpen, setPoliciesOpen] = useState(false)
  const closePolicies = useCallback(() => setPoliciesOpen(false), [])
  const openDemo = useCallback(
    (d: Domain) => {
      setPoliciesOpen(false)
      setDomain(d)
    },
    [setDomain],
  )

  // Reasoning panel: a column when the guarded pane is wide enough, an overlay drawer otherwise.
  const rootRef = useRef<HTMLDivElement>(null)
  const paneRef = useRef<HTMLDivElement>(null)
  const [paneW, setPaneW] = useState(0)
  const [size, setSize] = useState<ShellSize>('md')
  useLayoutEffect(() => {
    const el = paneRef.current
    const root = rootRef.current
    if (!el || !root) return
    const ro = new ResizeObserver(() => {
      setPaneW(el.clientWidth)
      setSize(root.clientWidth >= LG_FROM ? 'lg' : 'md')
    })
    ro.observe(el)
    ro.observe(root)
    return () => ro.disconnect()
  }, [])
  const panelW = PANEL_W[size]
  const fits = paneW === 0 || paneW - panelW >= MIN_APP_W[size] * APP_ZOOM[size]
  const [reasoningPref, setReasoningPref] = useState<boolean | null>(null)
  const reasoning = reasoningPref ?? fits

  const onVerify = useCallback((runId: string) => verifyRun(config, runId), [config])
  const App = config.App

  return (
    <ShellSizeContext.Provider value={size}>
    <div
      ref={rootRef}
      style={{ ...TYPE_VARS[size], '--pane-head': size === 'lg' ? '56px' : '48px' } as CSSProperties}
      className={clsx(
        'relative flex flex-col overflow-hidden bg-paper text-ink',
        variant === 'page' ? 'h-dvh w-full' : 'h-full w-full',
      )}
    >
      <TopBar
        domain={domain}
        onDomain={setDomain}
        onPolicies={() => setPoliciesOpen(true)}
        onReset={() => resetRuns(domain)}
        canReset={runs.length > 0}
        variant={variant}
      />

      <main className="grid min-h-0 flex-1 grid-cols-2 gap-5 px-5 pt-5">
        <Pane tone="off" header={<span className="text-(length:--t-small) text-ink-3">Same agent, no checks</span>}>
          <AppFrame size={size}>
            <App key={`${domain}-off`} side="off" runs={runs} onVerify={onVerify} variant={variant} />
          </AppFrame>
        </Pane>

        <Pane
          tone="on"
          paneRef={paneRef}
          header={
            <div className="flex items-center gap-2">
              {!reasoning && <HeaderVerdict run={latest} />}
              <button
                type="button"
                onClick={() => setReasoningPref(!reasoning)}
                aria-pressed={reasoning}
                className={clsx(
                  'inline-flex h-[2.1em] items-center gap-1.5 rounded-full px-[0.9em] text-(length:--t-ui) font-medium ring-1 ring-inset transition-[transform,background-color] duration-150 active:scale-[0.97]',
                  reasoning ? 'bg-ink text-paper ring-ink' : 'bg-card text-ink ring-rule [@media(hover:hover)]:hover:ring-ink/25',
                )}
              >
                {reasoning ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
                Reasoning
              </button>
            </div>
          }
        >
          <div className="relative flex h-full min-h-0">
            <div className="relative min-w-0 flex-1">
              <AppFrame size={size}>
                <App key={`${domain}-on`} side="on" runs={runs} onVerify={onVerify} variant={variant} />
              </AppFrame>
            </div>
            <ReasoningColumn open={reasoning} overlay={!fits} run={latest} width={panelW} />
          </div>
        </Pane>
      </main>

      <Composer
        key={domain}
        scenarios={config.scenarios}
        busy={busy}
        placeholder={`Message ${config.name === 'Hiring' ? 'the screening agent' : `${config.name} support`}, or try to break it`}
        onSend={(t) => sendMessage(config, t)}
      />

      <PolicySheet open={policiesOpen} domain={domain} onClose={closePolicies} onOpenDemo={openDemo} />
    </div>
    </ShellSizeContext.Provider>
  )
}

/** Draws a domain app at laptop scale, zoomed up on a projector. Its type vars are the laptop set, so they zoom with it. */
function AppFrame({ size, children }: { size: ShellSize; children: ReactNode }) {
  return (
    <div className="h-full" style={{ ...TYPE_VARS.md, zoom: APP_ZOOM[size] } as CSSProperties}>
      {children}
    </div>
  )
}

function TopBar({
  domain,
  onDomain,
  onPolicies,
  onReset,
  canReset,
  variant,
}: {
  domain: Domain
  onDomain: (d: Domain) => void
  onPolicies: () => void
  onReset: () => void
  canReset: boolean
  variant: 'page' | 'slide'
}) {
  return (
    <header className="flex h-(--pane-head) shrink-0 items-center gap-5 border-b border-rule px-5 pt-0 text-(length:--t-ui)">
      <PrahariWordmark />
      {variant === 'page' && (
        <Link to="/app" className="inline-flex items-center gap-1 text-(length:--t-small) text-ink-3 transition-colors [@media(hover:hover)]:hover:text-ink">
          <ArrowLeft size={13} />
          App
        </Link>
      )}
      <span className="h-5 w-px bg-rule" />
      <nav aria-label="Demo" className="flex items-center gap-0.5 rounded-full bg-paper-2 p-1">
        {DOMAIN_ORDER.map((id) => {
          const d = DOMAINS[id]
          const active = id === domain
          return (
            <button
              key={id}
              type="button"
              onClick={() => onDomain(id)}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'relative inline-flex h-[2.3em] items-center gap-2 rounded-full px-[1em] text-(length:--t-ui) font-medium transition-[color,transform] duration-150 active:scale-[0.97]',
                active ? 'text-ink' : 'text-ink-2 [@media(hover:hover)]:hover:text-ink',
              )}
            >
              {active && (
                <motion.span
                  layoutId="demo-tab"
                  className="absolute inset-0 rounded-full bg-card shadow-[0_1px_2px_rgb(0_0_0/.08),0_2px_8px_-2px_rgb(0_0_0/.08)]"
                  transition={SPRING}
                />
              )}
              <span className="relative flex items-center">{d.logo}</span>
              <span className="relative">{d.tab}</span>
            </button>
          )
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <BarButton onClick={onPolicies}>
          <BookText size={15} />
          Policies
        </BarButton>
        <BarButton onClick={onReset} disabled={!canReset}>
          <RotateCcw size={14} />
          Reset
        </BarButton>
        <DevButton />
        {variant === 'slide' && (
          <Link to={`/app/demo/${domain}`} className="ml-1 inline-flex items-center gap-1 text-(length:--t-ui) text-ink-3 transition-colors [@media(hover:hover)]:hover:text-ink">
            Open full demo
            <ArrowRight size={13} />
          </Link>
        )}
      </div>
    </header>
  )
}

function BarButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-[2.3em] items-center gap-1.5 rounded-full bg-card px-[1em] text-(length:--t-ui) font-medium text-ink ring-1 ring-inset ring-rule transition-[transform,opacity] duration-150 active:scale-[0.97] disabled:opacity-40 [@media(hover:hover)]:hover:ring-ink/25"
    >
      {children}
    </button>
  )
}

function Pane({
  tone,
  header,
  children,
  paneRef,
}: {
  tone: 'off' | 'on'
  header: ReactNode
  children: ReactNode
  paneRef?: Ref<HTMLDivElement>
}) {
  const off = tone === 'off'
  return (
    <section
      ref={paneRef}
      className="relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[20px] bg-card ring-1 ring-rule shadow-[0_1px_2px_rgb(0_0_0/.06),0_8px_24px_-8px_rgb(0_0_0/.12)]"
    >
      <span aria-hidden className={clsx('absolute inset-x-0 top-0 z-10 h-[3px]', off ? 'bg-alarm' : 'bg-leaf')} />
      <div className="flex h-(--pane-head) shrink-0 items-center justify-between gap-3 border-b border-rule px-4 pt-[3px] text-(length:--t-ui)">
        <span
          className={clsx(
            'inline-flex h-[2.1em] items-center gap-2 rounded-full px-[0.9em] text-(length:--t-ui) font-semibold',
            off ? 'bg-alarm-soft text-alarm' : 'bg-leaf-soft text-leaf',
          )}
        >
          <span className={clsx('size-1.5 rounded-full', off ? 'bg-alarm' : 'bg-leaf')} />
          {off ? 'Without guardrail' : 'With Prahari'}
        </span>
        {header}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}

function ReasoningColumn({ open, overlay, run, width }: { open: boolean; overlay: boolean; run: Run | undefined; width: number }) {
  const reduce = useReducedMotion()
  if (overlay) {
    return (
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="drawer"
            className="absolute top-0 right-0 bottom-0 z-20 border-l border-rule shadow-[-16px_0_40px_-16px_rgb(0_0_0/.22)]"
            initial={reduce ? { opacity: 0 } : { x: width }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: width }}
            transition={SPRING}
          >
            <PrahariPanel run={run} width={width} />
          </motion.div>
        )}
      </AnimatePresence>
    )
  }
  return (
    <motion.div
      className="relative h-full shrink-0 overflow-hidden border-l border-rule"
      initial={false}
      animate={{ width: open ? width : 0, borderLeftWidth: open ? 1 : 0 }}
      transition={reduce ? { duration: 0 } : SPRING}
    >
      <div className="absolute inset-y-0 left-0">
        <PrahariPanel run={run} width={width} />
      </div>
    </motion.div>
  )
}
