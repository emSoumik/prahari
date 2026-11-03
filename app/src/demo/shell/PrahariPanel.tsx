import clsx from 'clsx'
import { Check, ChevronDown, ShieldAlert, ShieldCheck, UserRound, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useDev } from '../../prahari/backend'
import type { GuardResult } from '../../prahari/guard'
import { GATES, type Rule, type TraceStep, type Verdict } from '../../prahari/types'
import type { Run } from './types'
import { EASE_OUT, PrahariGlyph, SPRING, TypingDots, VERDICT_META, useStickToBottom } from './ui'

/**
 * The streamed reasoning for the latest run on the guarded pane.
 * The timeline scrolls; the verdict is pinned to the bottom so the audience
 * always knows where to look for the answer.
 */
export function PrahariPanel({ run, width }: { run: Run | undefined; width: number }) {
  const { scrollRef, contentRef } = useStickToBottom()
  const fu = run?.on.followUps.at(-1)
  const result = fu?.result ?? run?.on.result

  // What the pinned slot shows: the newest verdict once its trace has fully streamed.
  const head = fu ?? run?.on
  const streamed = !!head && head.trace.length > 0 && head.revealed >= head.trace.length
  const verdict: Verdict | null | undefined = !run ? undefined : streamed ? (head.result?.verdict ?? null) : undefined
  const gates = head?.trace.filter((s) => s.id.startsWith('gate-')).length ?? 0
  // Set by runs.ts while guard() waits on the backend; clears when the result lands.
  const pend = fu ?? run
  const waitingSince = head && !head.result && pend?.pendingSource === 'backend' ? pend.pendingSince : undefined
  const gatesDone = head?.trace.slice(0, head.revealed).filter((s) => s.id.startsWith('gate-')).length ?? 0

  return (
    <div className="flex h-full flex-col bg-paper" style={{ width }}>
      <div className="flex h-(--pane-head) shrink-0 items-center justify-between gap-3 border-b border-rule px-(--s-inset)">
        <span className="inline-flex items-center gap-2 text-(length:--t-label) font-semibold text-ink">
          <PrahariGlyph size={15} />
          Pre-execution check
        </span>
        <SourceBadge result={result} pending={!!run && !result} />
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [mask-image:linear-gradient(to_bottom,transparent,#000_14px,#000_calc(100%-28px),transparent)]">
        <div ref={contentRef} className="px-(--s-inset) pt-5 pb-4">
          {!run ? (
            <EmptyState />
          ) : (
            <div key={run.id}>
              <Timeline steps={run.on.trace} revealed={run.on.revealed} />
              {run.on.followUps.map((f) => (
                <div key={f.id} className="mt-2">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="h-px flex-1 bg-rule" />
                    <span className="text-(length:--t-small) font-semibold text-leaf">{f.label}</span>
                    <span className="h-px flex-1 bg-rule" />
                  </div>
                  <Timeline steps={f.trace} revealed={f.revealed} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 px-(--s-inset) pb-(--s-inset)">
        <AnimatePresence mode="popLayout" initial={false}>
          {verdict !== undefined ? (
            <VerdictCard
              key={`v-${head && 'label' in head ? head.label : run?.id}`}
              verdict={verdict}
              reason={head?.result?.reason ?? 'Reply only. No action to check.'}
              rules={head?.result?.matched ?? []}
              result={head?.result}
            />
          ) : run ? (
            <Checking key={`c-${run.id}`} done={gatesDone} total={gates || GATES.length} stage={fu ? undefined : run.on.stage} waiting={!head?.result} since={waitingSince} />
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}

/** True when the AI judge was asked for but never gave an answer, so the rules decided alone. */
const judgeUnavailable = (r: GuardResult | undefined) => !!r && (r.backend?.judgeFailed === true || r.backend?.timedOut === true)

/** The backend judge shaped this verdict, so "same answer every time" would overstate it. */
const judgeInvolved = (r: GuardResult | undefined) => !!r && r.source === 'backend' && !!r.backend && r.backend.mode !== 'rules' && !judgeUnavailable(r)

function SourceBadge({ result, pending }: { result: GuardResult | undefined; pending: boolean }) {
  const base = 'inline-flex h-[1.9em] items-center gap-1.5 rounded-full px-[0.8em] text-(length:--t-meta) font-medium tabular whitespace-nowrap'
  if (!result) {
    return <span className={clsx(base, 'text-ink-3')}>{pending ? 'Checking' : 'Idle'}</span>
  }
  if (result.fallbackReason) {
    return (
      <span title={result.fallbackReason} className={clsx(base, 'bg-amber-soft text-[#8A5A10]')}>
        {result.backend?.timedOut ? 'Backend timed out · ran locally' : 'Backend down · ran locally'}
      </span>
    )
  }
  return (
    <span className={clsx(base, 'bg-card text-ink-2 ring-1 ring-inset ring-rule')}>
      <span className={clsx('size-1.5 rounded-full', result.source === 'backend' ? 'bg-cobalt' : 'bg-leaf')} />
      {result.source === 'backend' ? `${judgeUnavailable(result) ? 'Backend rules' : 'Backend'} · ${Math.round(result.latencyMs)} ms` : 'Local engine'}
    </span>
  )
}

/* ----------------------------------------------------------------- timeline */

function Timeline({ steps, revealed }: { steps: TraceStep[]; revealed: number }) {
  const visible = steps.slice(0, revealed).filter((s) => s.id !== 'verdict')
  return (
    <ol>
      {visible.map((s, i) => (
        <Step key={s.id} step={s} last={i === visible.length - 1} />
      ))}
    </ol>
  )
}

const DOT: Record<TraceStep['status'], string> = {
  pass: 'bg-leaf text-white',
  fail: 'bg-alarm text-white',
  warn: 'bg-amber text-ink',
  info: 'bg-paper-2 text-ink-3 ring-1 ring-inset ring-rule',
}

const sentence = (s: string) => {
  const m = s.match(/^.+?[.!?](?=\s|$)/)
  return m ? m[0] : s
}

/** The key phrase shown by default, and the full text behind "More" when it is longer. */
function summarize(step: TraceStep): { short: string; full: string } {
  const full = step.detail
  if (step.id.startsWith('gate-') && step.status === 'pass') return { short: '', full: '' }
  if (step.id === 'sanitizer' && step.status === 'pass') return { short: full, full }
  if (step.id === 'intent') {
    const [name, ...rest] = full.split(' · ')
    const s = [name.replace(/_/g, ' '), ...rest].join(' · ')
    return { short: s, full: s }
  }
  if (step.id === 'memory' || step.id === 'recheck' || step.id === 'backend-judge') {
    const parts = full.split(' · ')
    return { short: parts.slice(0, 2).join(' · '), full: parts.join(' · ') }
  }
  if (step.id === 'action') return { short: full, full }
  const short = sentence(full)
  return { short, full }
}

function Step({ step, last }: { step: TraceStep; last: boolean }) {
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const { short, full } = summarize(step)
  const more = full.length > short.length + 2
  const gate = step.id.startsWith('gate-')
  const loud = step.status === 'fail' || step.status === 'warn'

  return (
    <motion.li
      className="relative grid grid-cols-[1.5em_minmax(0,1fr)] gap-x-3 pb-[0.95em] text-(length:--t-label)"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, duration: 0.4 }}
    >
      {!last && <span aria-hidden className="absolute top-[1.6em] bottom-[0.1em] left-[0.75em] w-px -translate-x-1/2 bg-rule" />}
      <motion.span
        className={clsx('relative mt-[0.05em] grid size-[1.5em] place-items-center rounded-full', DOT[step.status])}
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.35, delay: reduce ? 0 : 0.12 }}
      >
        {step.status === 'pass' && <Check className="size-[0.75em]" strokeWidth={3.25} />}
        {step.status === 'fail' && <X className="size-[0.75em]" strokeWidth={3.25} />}
        {step.status === 'warn' && <span className="text-[0.75em] leading-none font-bold">!</span>}
        {step.status === 'info' && <span className="size-[0.3em] rounded-full bg-current" />}
      </motion.span>

      <div className="min-w-0">
        <p className={clsx('leading-[1.5em] font-semibold', gate || loud ? 'text-ink' : 'text-ink-2')}>{step.title}</p>
        {short && (
          <p className={clsx('mt-0.5 text-(length:--t-ui) leading-[1.4] break-words', loud ? 'text-ink' : 'text-ink-2')}>
            {open ? full : short}
            {more && (
              <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                className="ml-1.5 inline-flex items-center gap-0.5 rounded-sm align-baseline text-(length:--t-small) font-medium text-ink-3 [@media(hover:hover)]:hover:text-ink"
              >
                {open ? 'Less' : 'More'}
                <ChevronDown className={clsx('size-[1em] transition-transform duration-200', open && 'rotate-180')} />
              </button>
            )}
          </p>
        )}
        {step.rules && step.rules.length > 0 && (
          <div className="mt-2 flex flex-col items-start gap-1.5">
            {step.rules.map((r) => (
              <RuleChip key={r.id} rule={r} />
            ))}
          </div>
        )}
      </div>
    </motion.li>
  )
}

export function RuleChip({ rule }: { rule: Rule }) {
  return (
    <span
      title={rule.text}
      className="inline-flex min-h-[1.9em] max-w-full items-center gap-1.5 rounded-[8px] bg-card px-[0.6em] py-[0.2em] text-(length:--t-small) leading-[1.3] text-ink-2 ring-1 ring-inset ring-rule"
    >
      <span className="line-clamp-2">{rule.text}</span>
      {rule.origin === 'custom' && (
        <span className="shrink-0 rounded-[4px] bg-cobalt/10 px-1 text-[0.8em] leading-[1.5] font-semibold text-cobalt">Custom</span>
      )}
    </span>
  )
}

/* ------------------------------------------------------------------ verdict */

const CARD: Record<Verdict, { box: string; sub: string; icon: typeof ShieldCheck }> = {
  allow: { box: 'bg-leaf text-white', sub: 'text-white/85', icon: ShieldCheck },
  block: { box: 'bg-ink text-paper', sub: 'text-paper/80', icon: ShieldAlert },
  escalate: { box: 'bg-amber text-ink', sub: 'text-ink/75', icon: UserRound },
  verify: { box: 'bg-amber text-ink', sub: 'text-ink/75', icon: ShieldCheck },
}

function VerdictCard({ verdict, reason, rules, result }: { verdict: Verdict | null; reason: string; rules: Rule[]; result: GuardResult | undefined }) {
  const reduce = useReducedMotion()
  // Custom rules that fired (the browser engine's and the server's), named so the audience sees their sentence.
  const customs = [...new Map((result?.gates ?? []).filter((g) => g.status !== 'pass').flatMap((g) => g.rules).filter((r) => r.origin === 'custom').map((r) => [r.id, r])).values()]
  const signals = judgeInvolved(result) ? result?.backend?.signals : null
  const c = verdict ? CARD[verdict] : { box: 'bg-card text-ink ring-1 ring-inset ring-rule', sub: 'text-ink-2', icon: Check }
  const Icon = c.icon
  return (
    <motion.div
      className={clsx('rounded-[20px] p-[calc(var(--s-inset)*1.25)]', c.box)}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', bounce: 0, duration: 0.55 }}
      style={{ transformOrigin: '50% 100%' }}
    >
      <div className="flex items-center gap-3">
        <motion.span
          className="grid shrink-0 place-items-center"
          initial={reduce ? false : { opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.45, delay: 0.12 }}
        >
          <Icon className="size-[calc(var(--t-verdict)*0.85)]" strokeWidth={2.25} />
        </motion.span>
        <p className="display text-(length:--t-verdict) leading-none">{verdict ? VERDICT_META[verdict].label : 'No action'}</p>
      </div>
      <p className={clsx('mt-3 text-(length:--t-label) leading-[1.4]', c.sub)}>{reason}</p>
      {verdict && (
        <p className={clsx('mt-2.5 text-(length:--t-meta) font-medium tabular opacity-75', c.sub)}>
          {rules.length ? `${rules.length} rule${rules.length > 1 ? 's' : ''} matched` : 'No rule matched'}
          {!judgeInvolved(result) && !judgeUnavailable(result) && ' · same answer every time'}
        </p>
      )}
      {verdict && customs.length > 0 && (
        <p className={clsx('mt-1.5 text-(length:--t-meta) leading-[1.35] font-semibold', c.sub)}>
          Custom rule · {customs.map((r) => r.text).join(' · ')}
        </p>
      )}
      {verdict && signals && typeof signals.confidence === 'number' && (
        <p className={clsx('mt-1.5 text-(length:--t-meta) leading-[1.35] font-medium tabular', c.sub)}>
          AI judge · {Math.round(signals.confidence * 100)}% confident
          {signals.injection_suspected ? ' · injection suspected' : signals.aligned === false ? ' · not aligned' : ''}
        </p>
      )}
      {judgeUnavailable(result) && (
        <p className={clsx('mt-1.5 text-(length:--t-meta) font-medium', c.sub)}>AI judge unavailable · local rules decided</p>
      )}
    </motion.div>
  )
}

/** Whole seconds since `since`, ticking. */
function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(t)
  }, [])
  return <span className="font-medium text-ink-3 tabular">{Math.max(0, Math.floor((now - since) / 1000))}s</span>
}

/** Stands in for the verdict while the gates run: five segments that fill as each gate reports. */
function Checking({ done, total, stage, waiting, since }: { done: number; total: number; stage?: 'intent' | 'rules'; waiting: boolean; since?: number }) {
  const reduce = useReducedMotion()
  const judge = useDev((s) => s.judge)
  return (
    <motion.div
      className="rounded-[20px] bg-card p-[calc(var(--s-inset)*1.25)] ring-1 ring-inset ring-rule"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: 0.2 }}
    >
      <p className="flex items-center gap-2.5 text-(length:--t-label) font-semibold text-ink-2">
        <span className="text-ink-3">
          <TypingDots />
        </span>
        {stage === 'intent' ? (
          'Reading intent…'
        ) : stage === 'rules' ? (
          <>
            Checking rules…
            {since !== undefined && (
              <>
                <span className="font-medium text-ink-3">{judge === 'rules' ? 'backend' : 'AI judge'}</span>
                <Elapsed since={since} />
              </>
            )}
          </>
        ) : since !== undefined ? (
          <>
            {judge === 'rules' ? 'Waiting on backend…' : 'Waiting on AI judge…'}
            <Elapsed since={since} />
          </>
        ) : waiting ? (
          'Reading the proposed action'
        ) : (
          `Checking gates · ${done} of ${total}`
        )}
      </p>
      <div className="mt-3 flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2">
            <motion.span
              className="absolute inset-0 origin-left rounded-full bg-ink"
              initial={false}
              animate={{ scaleX: i < done ? 1 : 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.3, ease: EASE_OUT }}
            />
          </span>
        ))}
      </div>
    </motion.div>
  )
}

function EmptyState() {
  return (
    <div>
      <p className="text-(length:--t-label) leading-[1.45] text-ink-2">
        Every action the agent proposes stops here first. Send a message to watch the check.
      </p>
      <ol className="mt-6 space-y-4">
        {GATES.map((g, i) => (
          <li key={g.id} className="grid grid-cols-[1.75em_minmax(0,1fr)] items-baseline gap-x-2 text-(length:--t-label)">
            <span className="text-(length:--t-meta) font-medium text-ink-3 tabular">{String(i + 1).padStart(2, '0')}</span>
            <span className="min-w-0">
              <span className="block font-semibold text-ink">{g.label}</span>
              <span className="block text-(length:--t-ui) leading-[1.4] text-ink-3">{g.asks}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
