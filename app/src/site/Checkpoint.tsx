import clsx from 'clsx'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { evaluate } from '../prahari/engine'
import { buildFreeScenario, parseIntent } from '../prahari/intent'
import { DEFAULT_RULES } from '../prahari/rules'
import { sanitize } from '../prahari/sanitizer'
import { GATES, type GateResult } from '../prahari/types'
import { HERO_CASES, STAMP, type Case } from './content'
import { EASE, useInView } from './ui'

const FOOD_FACTS = { refunds_7d: 0, sentiment: 'calm', persistence: 0, order_verified: true, photo_evidence: true }
const HOLD_MS = 5600
/** message, ticket, gates (one by one), stamp */
const T = { ticket: 650, gates: 1100, gateStep: 170, stamp: 2100 }

function freeCase(message: string): Case {
  const hits = sanitize(message).hits
  const a = parseIntent('food', message, 'Happy to help with your order.')
  const scenario = buildFreeScenario('food', Date.now().toString(36), message, a, FOOD_FACTS, hits.length > 0)
  const ev = evaluate({ domain: 'food', message, proposed: scenario.proposed, facts: scenario.facts }, DEFAULT_RULES)
  return { scenario, ev, product: 'Swiggy support' }
}

/** The customer's words, with anything the sanitizer caught struck through. */
function Marked({ text }: { text: string }) {
  const parts = useMemo(() => {
    const hits = sanitize(text).hits.map((h) => h.match).filter(Boolean)
    if (!hits.length) return [{ t: text, hit: false }]
    const re = new RegExp(`(${hits.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
    return text.split(re).filter(Boolean).map((t) => ({ t, hit: hits.some((h) => h.toLowerCase() === t.toLowerCase()) }))
  }, [text])
  return (
    <>
      {parts.map((p, i) =>
        p.hit ? (
          <mark key={i} className="rounded-[4px] bg-[var(--stop-soft)] px-0.5 text-[var(--stop)] line-through decoration-[1.5px]">
            {p.t}
          </mark>
        ) : (
          <span key={i}>{p.t}</span>
        ),
      )}
    </>
  )
}

function GateLamp({ gate, result, lit, compact }: { gate: (typeof GATES)[number]; result: GateResult | undefined; lit: boolean; compact?: boolean }) {
  const status = result?.status ?? 'pass'
  const color = status === 'pass' ? 'var(--go)' : status === 'fail' ? 'var(--stop)' : 'var(--wait)'
  return (
    <li className="flex min-w-0 flex-col items-center gap-2">
      <span
        className="relative grid size-9 place-items-center rounded-full transition-[background-color,box-shadow,color] duration-300"
        style={{
          background: lit ? color : '#fff',
          color: lit ? '#fff' : 'var(--ink-3)',
          boxShadow: lit ? `0 0 0 4px color-mix(in oklch, ${color} 16%, transparent)` : 'inset 0 0 0 1px var(--line-2)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          {!lit ? (
            <circle cx="7" cy="7" r="2" fill="currentColor" />
          ) : status === 'pass' ? (
            <path d="m3 7.3 2.6 2.5L11 4.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          ) : status === 'fail' ? (
            <path d="m4 4 6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          ) : (
            <path d="M7 3.5v4.2M7 10.3v.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          )}
        </svg>
      </span>
      <span className={clsx('max-w-full truncate text-center text-[12px] leading-none', lit ? 'text-[var(--ink)]' : 'text-[var(--ink-3)]', compact && 'text-[11px]')}>
        {gate.label}
      </span>
    </li>
  )
}

/**
 * The hero's signature: proposed actions arrive at a checkpoint, five gates light up, and a
 * stamp lands. Every verdict comes from the real engine. Visitors can write their own message.
 */
export function Checkpoint({ compact = false }: { compact?: boolean }) {
  const reduce = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const visible = useInView(root, '120px')
  const [idx, setIdx] = useState(0)
  const [custom, setCustom] = useState<Case | null>(null)
  const [paused, setPaused] = useState(false)
  const [phase, setPhase] = useState(0) // 0 msg, 1 ticket, 2 gates, 3 stamp
  const [lit, setLit] = useState(0)
  const [runKey, setRunKey] = useState(0)
  const [draft, setDraft] = useState('')

  const c = custom ?? HERO_CASES[idx]
  const s = c.scenario
  const stamp = STAMP[c.ev.verdict]

  // one run of the timeline per case
  useEffect(() => {
    if (reduce) {
      setPhase(3)
      setLit(5)
      return
    }
    setPhase(0)
    setLit(0)
    const ts: number[] = []
    ts.push(window.setTimeout(() => setPhase(1), T.ticket))
    ts.push(window.setTimeout(() => setPhase(2), T.gates))
    for (let i = 1; i <= 5; i++) ts.push(window.setTimeout(() => setLit(i), T.gates + i * T.gateStep))
    ts.push(window.setTimeout(() => setPhase(3), T.stamp))
    return () => ts.forEach(clearTimeout)
  }, [runKey, reduce])

  const go = useCallback((next: number) => {
    setCustom(null)
    setIdx((next + HERO_CASES.length) % HERO_CASES.length)
    setRunKey((k) => k + 1)
  }, [])

  // autoplay while visible, not paused, not showing the visitor's own message
  useEffect(() => {
    if (paused || !visible || custom || reduce) return
    const t = window.setTimeout(() => go(idx + 1), HOLD_MS)
    return () => clearTimeout(t)
  }, [idx, paused, visible, custom, reduce, go, runKey])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    setCustom(freeCase(text))
    setRunKey((k) => k + 1)
    setDraft('')
  }

  const failing = c.ev.gates.find((g) => g.status === 'fail') ?? c.ev.gates.find((g) => g.status === 'warn')

  return (
    <div
      ref={root}
      className="s-frame relative flex w-full flex-col"
      onPointerEnter={() => !compact && setPaused(true)}
      onPointerLeave={() => !compact && setPaused(false)}
    >
      {/* bar */}
      <div className="flex h-12 items-center gap-3 border-b border-[var(--line)] px-4">
        <span className="s-dot s-live bg-[var(--go)]" aria-hidden />
        <span className="text-[13.5px] font-medium">Checkpoint</span>
        <span className="truncate text-[13px] text-[var(--ink-3)]">{custom ? 'Your message · Swiggy support' : c.product}</span>
        <div className="ml-auto flex items-center gap-1">
          {HERO_CASES.map((h, i) => (
            <button
              key={h.scenario.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Play example ${i + 1}: ${h.scenario.label}`}
              aria-current={!custom && i === idx ? 'true' : undefined}
              className="grid h-6 w-5 place-items-center"
            >
              <span className={clsx('block h-1.5 rounded-full transition-all duration-300', !custom && i === idx ? 'w-4 bg-[var(--ink)]' : 'w-1.5 bg-[var(--line-2)]')} />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Play examples' : 'Pause examples'}
            className="ml-1 grid size-7 place-items-center rounded-full text-[var(--ink-2)] hover:bg-[var(--tint)]"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
              {paused ? <path d="M3 1.8v8.4L10 6 3 1.8Z" /> : <path d="M2.5 1.5h2.4v9H2.5zM7.1 1.5h2.4v9H7.1z" />}
            </svg>
          </button>
        </div>
      </div>

      <div className={clsx('relative flex flex-col', compact ? 'gap-3 p-4' : 'gap-4 p-5')}>
        {/* message */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`m-${runKey}`}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.18 } }}
            transition={{ duration: 0.45, ease: EASE }}
            className="flex items-start gap-3"
          >
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[var(--tint)] text-[12px] font-medium text-[var(--ink-2)] shadow-[inset_0_0_0_1px_var(--line)]">
              {s.domain === 'hiring' ? 'CV' : 'C'}
            </span>
            <p className={clsx('rounded-[16px] rounded-tl-[6px] bg-[var(--tint)] px-4 py-2.5 text-[var(--ink)] shadow-[inset_0_0_0_1px_var(--line)]', compact ? 'text-[14.5px] leading-snug' : 'text-[15.5px] leading-snug')}>
              <Marked text={s.prompt} />
            </p>
          </motion.div>
        </AnimatePresence>

        {/* ticket */}
        <div className="relative">
          <Ticket show={phase >= 1} runKey={runKey} reduce={!!reduce} compact={compact}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="s-label">Agent proposes</span>
              <span className="s-mono text-[var(--ink-3)]">{s.proposed.type}</span>
            </div>
            <p className={clsx('s-display mt-1.5', compact ? 'text-[20px]' : 'text-[24px]')} style={{ letterSpacing: '-0.025em', lineHeight: 1.1 }}>
              {s.proposed.label}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Tag tone={s.proposed.reversible ? 'plain' : 'stop'}>{s.proposed.reversible ? 'Reversible' : 'Irreversible'}</Tag>
              {s.facts.injection_detected === true && <Tag tone="stop">Injection found</Tag>}
              {s.facts.hidden_text_detected === true && <Tag tone="stop">Hidden text</Tag>}
              {s.facts.otp_verified === false && <Tag tone="plain">No OTP yet</Tag>}
              {s.genuine && <Tag tone="go">Genuine case</Tag>}
            </div>
          </Ticket>

          {/* stamp */}
          <AnimatePresence>
            {phase >= 3 && (
              <motion.div
                key={`s-${runKey}`}
                className="pointer-events-none absolute -bottom-3 right-5 z-10"
                initial={reduce ? false : { opacity: 0, scale: 1.7, rotate: -14 }}
                animate={{ opacity: 1, scale: 1, rotate: -7 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', bounce: 0, duration: 0.32 }}
              >
                <span className={clsx('s-stamp block', compact ? 'text-[24px]' : 'text-[30px]')} style={{ color: stamp.color }}>
                  {stamp.word}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* gates */}
        <ol aria-label="Five gates" className={clsx('grid grid-cols-5 gap-1', compact ? 'pt-0' : 'pt-1')}>
          {GATES.map((g, i) => (
            <GateLamp key={g.id} gate={g} result={c.ev.gates.find((r) => r.gate === g.id)} lit={phase >= 2 && lit > i} compact={compact} />
          ))}
        </ol>

        {/* reason */}
        <div className={clsx('relative overflow-hidden', compact ? 'min-h-[44px]' : 'min-h-[50px]')} aria-live="polite">
          <AnimatePresence mode="wait">
            {phase >= 3 && (
              <motion.p
                key={`r-${runKey}`}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className={clsx('text-[var(--ink-2)]', compact ? 'text-[13.5px] leading-snug' : 'text-[14.5px] leading-snug')}
              >
                <span className="font-medium" style={{ color: stamp.color }}>
                  {failing ? `${GATES.find((x) => x.id === failing.gate)?.label} gate. ` : 'All five gates passed. '}
                </span>
                {c.ev.reason}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {!compact && (
        <form onSubmit={submit} className="flex items-center gap-2 border-t border-[var(--line)] p-3">
          <label htmlFor="cp-input" className="sr-only">
            Write a message to Swiggy support
          </label>
          <input
            id="cp-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setPaused(true)}
            placeholder="Try to talk the agent into a refund"
            autoComplete="off"
            className="h-11 min-w-0 flex-1 rounded-full bg-[var(--tint)] px-4 text-[15px] outline-none shadow-[inset_0_0_0_1px_var(--line)] placeholder:text-[var(--ink-3)] focus:shadow-[inset_0_0_0_1.5px_var(--ink)]"
          />
          <button type="submit" disabled={!draft.trim()} className="s-btn s-btn--solid !h-11 !px-4 disabled:opacity-35" aria-label="Check this message">
            Check
          </button>
        </form>
      )}
    </div>
  )
}

function Ticket({ show, runKey, reduce, compact, children }: { show: boolean; runKey: number; reduce: boolean; compact?: boolean; children: ReactNode }) {
  return (
    <div className={clsx('relative', compact ? 'min-h-[118px]' : 'min-h-[132px]')}>
      <div
        aria-hidden={show}
        className={clsx(
          'absolute inset-0 grid place-items-center rounded-[14px] border border-dashed border-[var(--line-2)] text-[13px] text-[var(--ink-3)] transition-opacity duration-200',
          show ? 'opacity-0' : 'opacity-100',
        )}
      >
        Agent is reading
      </div>
      <AnimatePresence initial={false}>
        {show && (
          <motion.div
            key={`t-${runKey}`}
            initial={reduce ? false : { opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 28, position: 'absolute', inset: 0, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
            className={clsx('relative rounded-[14px] bg-white shadow-[0_1px_2px_rgb(0_0_0/0.05),0_10px_28px_-14px_rgb(0_0_0/0.25),inset_0_0_0_1px_var(--line)]', compact ? 'p-3.5' : 'p-4')}
          >
            {/* perforation */}
            <span aria-hidden className="absolute -left-[7px] top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-white shadow-[inset_-1px_0_0_var(--line)]" />
            <span aria-hidden className="absolute -right-[7px] top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-white shadow-[inset_1px_0_0_var(--line)]" />
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Tag({ tone, children }: { tone: 'plain' | 'stop' | 'go'; children: ReactNode }) {
  return (
    <span
      className="inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-medium"
      style={{
        background: tone === 'stop' ? 'var(--stop-soft)' : tone === 'go' ? 'var(--go-soft)' : 'var(--tint)',
        color: tone === 'stop' ? 'var(--stop)' : tone === 'go' ? 'var(--go)' : 'var(--ink-2)',
        boxShadow: tone === 'plain' ? 'inset 0 0 0 1px var(--line)' : undefined,
      }}
    >
      {children}
    </span>
  )
}
