import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import clsx from 'clsx'
import { Check, ChevronDown, Loader2, MoreHorizontal, Trash2, X } from 'lucide-react'
import { compile } from '../../prahari/guard'
import { evaluate } from '../../prahari/engine'
import { COMPILE_STAGES, EXAMPLES } from '../../prahari/compiler'
import { usePrahari } from '../../prahari/store'
import type { Domain, Rule, Scenario, Verdict } from '../../prahari/types'
import { scenarios as foodScenarios } from '../domains/food/scenarios'
import { scenarios as bankScenarios } from '../domains/bank/scenarios'
import { scenarios as hiringScenarios } from '../domains/hiring/scenarios'
import { DOMAINS, DomainLogo, EffectBadge, JsonView, OriginBadge, RuleChips, VerdictPill, gateLabel } from './parts'

export interface PolicyConsoleProps {
  /** 'page' fills the route; 'sheet' renders inside the demo's side sheet; 'slide' fills a deck slide. */
  variant?: 'page' | 'sheet' | 'slide'
  initialDomain?: Domain
  /** Called from "Open demo →" after publishing. */
  onOpenDemo?: (domain: Domain) => void
  onClose?: () => void
}

type Compiled = Awaited<ReturnType<typeof compile>>
type Phase = 'idle' | 'compiling' | 'review' | 'failed'

const SCENARIOS: Record<Domain, Scenario[]> = { food: foodScenarios, bank: bankScenarios, hiring: hiringScenarios }
const SPRING = { type: 'spring', bounce: 0, duration: 0.45 } as const

const card = 'rounded-[20px] border border-rule bg-card shadow-[0_1px_2px_rgb(0_0_0/.04),0_8px_24px_-12px_rgb(0_0_0/.10)]'
const btnBase =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold transition-transform active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100'

function verdictFor(s: Scenario, rules: Rule[]): Verdict {
  return evaluate({ domain: s.domain, message: s.prompt, proposed: s.proposed, facts: s.facts }, rules).verdict
}

export default function PolicyConsole({ variant = 'page', initialDomain = 'food', onOpenDemo, onClose }: PolicyConsoleProps) {
  const reduced = useReducedMotion()
  const spring = reduced ? { duration: 0 } : SPRING
  const segId = useId()
  const tabId = useId()

  const { rules, addRule, toggleRule, removeRule, resetRules, activity, clearActivity } = usePrahari()
  const [domain, setDomain] = useState<Domain>(initialDomain)
  const [tab, setTab] = useState<'rules' | 'activity'>('rules')
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [stage, setStage] = useState(0)
  const [result, setResult] = useState<Compiled | null>(null)
  const [highlight, setHighlight] = useState<string | null>(null)
  const [toast, setToast] = useState<Domain | null>(null)
  const run = useRef(0)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  const domainRules = useMemo(
    () => rules.filter((r) => r.domain === domain).sort((a, b) => Number(b.origin === 'custom') - Number(a.origin === 'custom')),
    [rules, domain],
  )
  const liveCount = domainRules.filter((r) => r.enabled).length
  const name = DOMAINS.find((d) => d.id === domain)!.name

  const reset = useCallback(() => {
    run.current++
    setPhase('idle')
    setResult(null)
  }, [])

  const changeDomain = (d: Domain) => {
    if (d === domain) return
    reset()
    setDomain(d)
  }

  const doCompile = async () => {
    const sentence = text.trim()
    if (!sentence || phase === 'compiling') return
    const id = ++run.current
    setPhase('compiling')
    setResult(null)
    setStage(0)
    const res = await compile(sentence, domain, rules, (s) => {
      if (run.current === id) setStage(COMPILE_STAGES.findIndex((x) => x.id === s))
    })
    if (run.current !== id) return
    setResult(res)
    setPhase(res.ok ? 'review' : 'failed')
  }

  const publish = () => {
    if (!result || !result.ok || phase !== 'review') return
    const rule = result.rule
    addRule(rule)
    setHighlight(rule.id)
    setToast(rule.domain)
    setText('')
    reset()
    later(() => setHighlight((h) => (h === rule.id ? null : h)), 4500)
    later(() => setToast(null), 9000)
  }

  const compact = variant === 'sheet'
  const root = clsx(
    'relative font-sans text-ink',
    variant === 'page' && 'mx-auto w-full max-w-[1120px] px-6 py-10',
    variant === 'sheet' && 'w-full px-5 py-5',
    variant === 'slide' && 'w-full px-16 pt-9 pb-20',
  )

  return (
    // The slide variant scrolls inside its own area and fades out at the bottom edge, so no row is ever cut mid-text.
    <div className={variant === 'slide' ? 'h-full w-full overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,#000_calc(100%-56px),transparent)]' : 'contents'}>
    <div
      className={root}
      style={variant === 'slide' ? ({ zoom: 1.333 } as React.CSSProperties) : undefined}
    >
      {/* Header */}
      <header className={clsx('flex flex-wrap items-center gap-x-5 gap-y-3', compact ? 'mb-5' : variant === 'slide' ? 'mb-6' : 'mb-8')}>
        <h1 className={clsx('display mr-auto', compact ? 'text-[30px]' : 'text-[44px]')}>Policies</h1>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close policies"
            className="order-last -mr-2 flex size-11 items-center justify-center rounded-full text-ink-2 transition-transform hover:bg-paper-2 active:scale-95"
          >
            <X size={20} />
          </button>
        )}
        <div
          role="radiogroup"
          aria-label="Domain"
          className="flex rounded-xl border border-rule bg-paper-2/70 p-1"
          onKeyDown={(e) => {
            const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
            if (!step) return
            // keep arrows out of the deck's clicker handler
            e.preventDefault()
            e.stopPropagation()
            const i = DOMAINS.findIndex((d) => d.id === domain)
            const nextId = DOMAINS[(i + step + DOMAINS.length) % DOMAINS.length].id
            changeDomain(nextId)
            e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[DOMAINS.findIndex((d) => d.id === nextId)]?.focus()
          }}
        >
          {DOMAINS.map((d) => {
            const on = d.id === domain
            return (
              <button
                key={d.id}
                role="radio"
                aria-checked={on}
                tabIndex={on ? 0 : -1}
                onClick={() => changeDomain(d.id)}
                className={clsx('relative flex min-h-11 items-center gap-2 rounded-[9px] px-3.5 text-[14px] font-medium', on ? 'text-ink' : 'text-ink-2')}
              >
                {on && (
                  <motion.span
                    layoutId={`seg-${segId}`}
                    transition={spring}
                    className="absolute inset-0 rounded-[9px] bg-card shadow-[0_1px_2px_rgb(0_0_0/.08),0_0_0_1px_rgb(0_0_0/.06)]"
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <DomainLogo domain={d.id} size={18} />
                  {(!compact || on) && d.name}
                </span>
              </button>
            )
          })}
        </div>
        <span className="flex items-center gap-2 text-[14px] text-ink-2 tabular">
          <span className="size-2 rounded-full bg-leaf" aria-hidden />
          {liveCount} rule{liveCount === 1 ? '' : 's'} live
        </span>
      </header>

      {/* Composer */}
      <section className={clsx(card, 'p-3')} aria-label="Write a rule">
        <textarea
          data-deck-ignore-keys
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              doCompile()
            }
          }}
          readOnly={phase === 'compiling'}
          rows={compact ? 3 : variant === 'slide' ? 1 : 2}
          placeholder="Describe a rule in plain English…"
          aria-label="Describe a rule in plain English"
          className="block w-full resize-none rounded-xl bg-transparent px-3 py-2.5 text-[18px] leading-[1.45] outline-none placeholder:text-ink-3"
        />
        <div className="flex flex-wrap items-center gap-2 px-1.5 pb-1 pt-1">
          {EXAMPLES[domain].map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setText(ex)
                if (phase !== 'compiling') reset()
              }}
              disabled={phase === 'compiling'}
              className="min-h-11 max-w-full rounded-full border border-rule bg-paper px-3.5 text-left text-[14px] leading-tight text-ink-2 transition-transform hover:bg-paper-2 active:scale-[0.97] disabled:opacity-50"
            >
              <span className="line-clamp-2">{ex}</span>
            </button>
          ))}
        </div>
        <div className="mt-1 border-t border-rule px-1.5 pt-3 pb-1">
          {phase === 'compiling' ? (
            <ol className="grid gap-1.5 py-1" aria-live="polite">
              {COMPILE_STAGES.map((s, i) => {
                const done = i < stage
                const active = i === stage
                return (
                  <motion.li
                    key={s.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: i <= stage ? 1 : 0.35, y: 0 }}
                    transition={spring}
                    className="flex items-center gap-2.5 text-[14px]"
                  >
                    <span className="flex size-5 items-center justify-center">
                      {done ? <Check size={16} className="text-leaf" strokeWidth={3} /> : active ? <Loader2 size={16} className="animate-spin text-cobalt" /> : <span className="size-1.5 rounded-full bg-ink-3" />}
                    </span>
                    <span className={active ? 'font-medium text-ink' : 'text-ink-2'}>{s.label}</span>
                  </motion.li>
                )
              })}
            </ol>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span className="hidden text-[13px] text-ink-3 sm:inline">The model writes the rule once. Rules are checked by code.</span>
              <button
                onClick={doCompile}
                disabled={!text.trim()}
                className={clsx(btnBase, 'ml-auto bg-ink text-paper')}
              >
                Compile
                <kbd className="rounded-md bg-white/15 px-1.5 py-0.5 font-sans text-[12px] font-medium">⌘↵</kbd>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Review / failure */}
      <AnimatePresence mode="popLayout" initial={false}>
        {phase === 'review' && result?.ok && (
          <motion.div
            key="review"
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16, scale: 0.97, pointerEvents: 'none' }}
            transition={spring}
            className="mt-4"
          >
            <ReviewCard
              result={result}
              compact={compact}
              allRules={rules}
              domainName={name}
              onPublish={publish}
              onDiscard={reset}
              spring={spring}
            />
          </motion.div>
        )}
        {phase === 'failed' && result && !result.ok && (
          <motion.div
            key="failed"
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={spring}
            className="mt-4 rounded-2xl border border-amber/40 bg-amber-soft p-5"
          >
            <p className="text-[16px] font-semibold text-[#7A4E0B]">{result.message}</p>
            <p className="mt-1 text-[13px] text-[#7A4E0B]/80">Try one of these.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {result.suggestions.slice(0, 3).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setText(s)
                    reset()
                  }}
                  className="min-h-11 rounded-full border border-amber/40 bg-card px-3.5 text-left text-[13px] leading-tight text-ink transition-transform active:scale-[0.97]"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className={clsx('flex items-center gap-1 border-b border-rule', compact ? 'mt-6' : 'mt-9')} role="tablist">
        {(['rules', 'activity'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={clsx('relative min-h-11 px-3 text-[15px] font-medium', tab === t ? 'text-ink' : 'text-ink-2')}
          >
            {t === 'rules' ? 'Rules' : 'Activity'}
            <span className="ml-1.5 text-[13px] text-ink-3 tabular">{t === 'rules' ? domainRules.length : activity.length}</span>
            {tab === t && <motion.span layoutId={`tab-${tabId}`} transition={spring} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ink" />}
          </button>
        ))}
      </div>

      {tab === 'rules' ? (
        <div className="mt-4">
          <motion.ul layout className="grid gap-2.5">
            <AnimatePresence initial={false}>
              {domainRules.map((r) => (
                <RuleRow
                  key={r.id}
                  rule={r}
                  highlighted={highlight === r.id}
                  onToggle={() => toggleRule(r.id)}
                  onDelete={() => removeRule(r.id)}
                  spring={spring}
                />
              ))}
            </AnimatePresence>
          </motion.ul>
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => {
                reset()
                resetRules()
              }}
              className="min-h-11 px-3 text-[13px] text-ink-3 underline-offset-4 hover:text-ink-2 hover:underline"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      ) : (
        <ActivityList activity={activity} onClear={clearActivity} />
      )}

      {/* Toast */}
      <div className="pointer-events-none sticky bottom-5 z-10 h-0">
        <AnimatePresence>
          {toast && (
            <motion.div
              key="toast"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={spring}
              role="status"
              className="pointer-events-auto absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-2xl bg-ink py-2 pl-4 pr-2 text-[14px] text-paper shadow-[0_8px_30px_-6px_rgb(0_0_0/.4)]"
            >
              <span className="size-2 rounded-full bg-leaf" aria-hidden />
              <span className="font-medium">Live · enforced on {DOMAINS.find((d) => d.id === toast)!.name}</span>
              {onOpenDemo && (
                <button
                  onClick={() => onOpenDemo(toast)}
                  className="min-h-11 rounded-xl bg-white/10 px-3.5 font-semibold transition-transform active:scale-[0.97]"
                >
                  Open demo →
                </button>
              )}
              <button onClick={() => setToast(null)} aria-label="Dismiss" className="flex size-11 items-center justify-center rounded-xl text-paper/60">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </div>
  )
}

/* ---------------------------------------------------------------- review card */

function ReviewCard({
  result,
  compact,
  allRules,
  domainName,
  onPublish,
  onDiscard,
  spring,
}: {
  result: Extract<Compiled, { ok: true }>
  compact: boolean
  allRules: Rule[]
  domainName: string
  onPublish: () => void
  onDiscard: () => void
  spring: object
}) {
  const { rule, checks, conflicts, source } = result
  const [showJson, setShowJson] = useState(false)
  const [published, setPublished] = useState(false)
  const list = SCENARIOS[rule.domain]
  const rows = useMemo(() => {
    const withDraft = [...allRules, rule]
    return list.map((s) => ({ s, before: verdictFor(s, allRules), after: verdictFor(s, withDraft) }))
  }, [list, allRules, rule])
  const [pick, setPick] = useState(() => Math.max(0, rows.findIndex((r) => r.before !== r.after)))
  const row = rows[pick]

  return (
    <div className={clsx(card, 'overflow-hidden')}>
      <div className={clsx('grid gap-5 p-5', !compact && 'grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8 p-6')}>
        <blockquote className="font-display text-[22px] font-semibold leading-[1.2] tracking-[-0.02em] text-ink">
          “{rule.text}”
        </blockquote>
        <div className="grid content-start gap-4">
          <RuleChips rule={rule} />
          <div>
            <button
              onClick={() => setShowJson((v) => !v)}
              aria-expanded={showJson}
              className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-cobalt"
            >
              <ChevronDown size={16} className={clsx('transition-transform', showJson && 'rotate-180')} />
              View JSON
            </button>
            <AnimatePresence initial={false}>
              {showJson && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={spring}
                  className="overflow-hidden"
                >
                  <JsonView rule={rule} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <ul className="grid gap-1.5">
            {checks.map((c) => (
              <li key={c} className="flex items-start gap-2 text-[14px] leading-snug text-ink-2">
                <Check size={16} className="mt-0.5 shrink-0 text-leaf" strokeWidth={3} />
                {c}
              </li>
            ))}
          </ul>
          {conflicts.length > 0 && (
            <div className="rounded-xl bg-amber-soft px-3.5 py-2.5 text-[13px] leading-snug text-[#7A4E0B]">
              Overlaps with: {conflicts.map((c) => c.text).join(' · ')}
            </div>
          )}
        </div>
      </div>

      {/* Try it */}
      <div className="border-t border-rule bg-paper/60 px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[13px] font-semibold text-ink">Try it</span>
          {rows.length === 0 ? (
            <span className="text-[13px] text-ink-3">Sample scenarios for {domainName} are not loaded yet.</span>
          ) : (
            <>
              <label className="relative min-w-0 flex-1 basis-56">
                <span className="sr-only">Scenario</span>
                <select
                  value={pick}
                  onChange={(e) => setPick(Number(e.target.value))}
                  className="min-h-11 w-full appearance-none truncate rounded-xl border border-rule bg-card pl-3.5 pr-9 text-[14px] outline-none"
                >
                  {rows.map((r, i) => (
                    <option key={r.s.id} value={i}>{r.s.label}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" />
              </label>
              <div className="flex items-center gap-2" aria-live="polite">
                <VerdictPill verdict={row.before} />
                <span aria-hidden className="text-ink-3">→</span>
                <VerdictPill verdict={row.after} />
                <span className="text-[13px] text-ink-2">{row.before === row.after ? 'No change' : 'Changed by this rule'}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-rule px-5 py-4">
        <button
          onClick={() => {
            if (published) return
            setPublished(true)
            onPublish()
          }}
          disabled={published}
          className={clsx(btnBase, 'bg-leaf text-white')}
        >
          Publish rule
        </button>
        <button onClick={onDiscard} disabled={published} className={clsx(btnBase, 'text-ink-2 hover:bg-paper-2')}>Discard</button>
        <span className="ml-auto text-[13px] text-ink-3">{source === 'backend' ? 'Compiled by backend LLM' : 'Compiled by local translator'}</span>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- rule row */

function RuleRow({
  rule,
  highlighted,
  onToggle,
  onDelete,
  spring,
}: {
  rule: Rule
  highlighted: boolean
  onToggle: () => void
  onDelete: () => void
  spring: object
}) {
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const bodyId = useId()

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={spring}
      className={clsx(card, 'relative overflow-hidden transition-[box-shadow] duration-500', highlighted && 'shadow-[0_1px_2px_rgb(0_0_0/.04),0_8px_24px_-12px_rgb(62_142_46/.45)]')}
    >
      <span
        aria-hidden
        className={clsx('absolute inset-y-0 left-0 w-1 bg-leaf transition-opacity duration-700', highlighted ? 'opacity-100' : 'opacity-0')}
      />
      <div className="flex items-center gap-3 py-2 pl-4 pr-2">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex min-h-11 min-w-0 flex-1 flex-col items-start gap-1.5 rounded-lg py-1.5 text-left"
        >
          <span className={clsx('text-[15px] leading-snug', rule.enabled ? 'text-ink' : 'text-ink-3')}>{rule.text}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <EffectBadge effect={rule.effect} />
            <span className="text-[13px] text-ink-2">{gateLabel(rule.gate)}</span>
            <OriginBadge origin={rule.origin} />
          </span>
        </button>
        <button
          role="switch"
          aria-checked={rule.enabled}
          aria-label={rule.enabled ? 'Turn rule off' : 'Turn rule on'}
          onClick={onToggle}
          className="flex size-11 shrink-0 items-center justify-center"
        >
          <span className={clsx('relative h-[26px] w-[44px] rounded-full transition-colors duration-200', rule.enabled ? 'bg-leaf' : 'bg-ink/20')}>
            <span
              className={clsx(
                'absolute left-[2px] top-[2px] size-[22px] rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/.3)] transition-transform duration-200',
                rule.enabled && 'translate-x-[18px]',
              )}
            />
          </span>
        </button>
        {rule.origin === 'custom' ? (
          <div className="relative" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setMenu(false)}>
            <button
              onClick={() => setMenu((v) => !v)}
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={menu}
              className="flex size-11 items-center justify-center rounded-full text-ink-2 hover:bg-paper-2"
            >
              <MoreHorizontal size={18} />
            </button>
            <AnimatePresence>
              {menu && (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={spring}
                  style={{ transformOrigin: 'top right' }}
                  className="absolute right-0 top-12 z-20 rounded-xl border border-rule bg-card p-1 shadow-[0_8px_30px_-6px_rgb(0_0_0/.2)]"
                >
                  <button
                    role="menuitem"
                    autoFocus
                    onClick={onDelete}
                    className="flex min-h-11 w-36 items-center gap-2 rounded-lg px-3 text-[14px] font-medium text-alarm hover:bg-alarm-soft"
                  >
                    <Trash2 size={16} /> Delete rule
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <span className="w-2" />
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={bodyId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <div className="grid gap-3 border-t border-rule px-4 py-3.5">
              <RuleChips rule={rule} />
              <JsonView rule={rule} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}

/* ---------------------------------------------------------------- activity */

function ActivityList({ activity, onClear }: { activity: ReturnType<typeof usePrahari.getState>['activity']; onClear: () => void }) {
  if (activity.length === 0) {
    return <p className="mt-10 mb-6 text-center text-[15px] text-ink-2">Run a demo and verdicts show up here.</p>
  }
  return (
    <div className="mt-4">
      <ul className={clsx(card, 'divide-y divide-rule overflow-hidden')}>
        {activity.map((a) => (
          <li key={a.id} className="flex items-start gap-3 px-4 py-3">
            <div className="mt-0.5"><DomainLogo domain={a.domain} size={20} /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px]">{a.message}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-ink-2">
                <span className="font-mono">{a.action}</span>
                {a.ruleIds.length > 0 && <span className="font-mono text-ink-3">{a.ruleIds.join(', ')}</span>}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <VerdictPill verdict={a.verdict} />
              <time className="text-[13px] text-ink-3 tabular">{new Date(a.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</time>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-center">
        <button onClick={onClear} className="min-h-11 px-3 text-[13px] text-ink-3 underline-offset-4 hover:text-ink-2 hover:underline">
          Clear activity
        </button>
      </div>
    </div>
  )
}
