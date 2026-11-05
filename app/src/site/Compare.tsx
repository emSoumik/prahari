import clsx from 'clsx'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { sanitize } from '../prahari/sanitizer'
import { COMPARE_CASES, STAMP, type Case } from './content'
import { EASE, SectionHead } from './ui'

type Lane = 'none' | 'legacy' | 'prahari'

/** The old guard: scan incoming text, refuse the whole session on any finding, otherwise let everything run. */
const legacyFlags = (c: Case) =>
  sanitize(c.scenario.prompt).hits.length > 0 || c.scenario.facts.injection_detected === true || c.scenario.facts.hidden_text_detected === true

function laneResult(lane: Lane, c: Case): { ran: boolean; title: string; detail: string; tone: 'loss' | 'ok' | 'wait' | 'flat' | 'stop' } {
  const s = c.scenario
  const harm = s.unguarded.outcome?.title
  if (lane === 'none') {
    return { ran: true, title: `Ran: ${s.proposed.label}`, detail: harm ?? 'The agent did what it was asked.', tone: s.genuine ? 'ok' : 'loss' }
  }
  if (lane === 'legacy') {
    if (legacyFlags(c)) {
      return {
        ran: false,
        title: 'Session refused',
        detail: s.genuine ? 'A real customer was turned away.' : 'Nothing runs. The customer gets no help at all.',
        tone: s.genuine ? 'loss' : 'flat',
      }
    }
    return {
      ran: true,
      title: `Ran: ${s.proposed.label}`,
      detail: s.genuine ? 'No injection found, so it ran.' : `No injection found, so it ran. ${harm ?? ''}`.trim(),
      tone: s.genuine ? 'ok' : 'loss',
    }
  }
  const v = c.ev.verdict
  return {
    ran: v === 'allow',
    title: v === 'allow' ? `Ran: ${s.proposed.label}` : STAMP[v].word,
    detail: c.ev.reason,
    tone: v === 'allow' ? 'ok' : v === 'block' ? 'stop' : 'wait',
  }
}

function score(lane: Lane) {
  let stopped = 0
  let harmful = 0
  let served = 0
  let genuine = 0
  for (const c of COMPARE_CASES) {
    const r = laneResult(lane, c)
    if (c.scenario.genuine) {
      genuine++
      if (r.ran) served++
    } else {
      harmful++
      if (!r.ran) stopped++
    }
  }
  return { stopped, harmful, served, genuine }
}

const LANES: { id: Lane; title: string; sub: string; bar: string }[] = [
  { id: 'none', title: 'Without guardrail', sub: 'The agent acts on whatever it reads.', bar: 'var(--stop)' },
  { id: 'legacy', title: 'Legacy refuse‑all guard', sub: 'Scans the message for injection. Any hit ends the session.', bar: '#a3a3a3' },
  { id: 'prahari', title: 'With Prahari', sub: 'Checks the action itself, then decides.', bar: 'var(--go)' },
]

export function Compare() {
  const [i, setI] = useState(1)
  const c = COMPARE_CASES[i]
  const reduce = useReducedMotion()

  return (
    <section id="compare" className="s-section" aria-labelledby="compare-h">
      <div className="s-wrap">
        <SectionHead
          title={<span id="compare-h">Three guards, one message</span>}
          lead="A filter reads the words. Prahari reads the action, the account and the amount. Pick a message and watch what each guard lets through."
        />

        <div role="tablist" aria-label="Messages" className="s-noscroll -mx-[var(--gut)] mt-10 flex gap-2 overflow-x-auto px-[var(--gut)] md:mx-0 md:flex-wrap md:px-0">
          {COMPARE_CASES.map((x, j) => (
            <button key={x.scenario.id} type="button" role="tab" aria-selected={i === j} aria-pressed={i === j} onClick={() => setI(j)} className="s-chip">
              {x.scenario.genuine && <span className="s-dot bg-[var(--go)]" />}
              {x.product.split(' ')[0]} · {x.scenario.label}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-[16px] bg-[var(--tint)] px-5 py-4 shadow-[inset_0_0_0_1px_var(--line)]">
          <span className="s-label">{c.product} receives</span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={c.scenario.id}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
              transition={{ duration: 0.35, ease: EASE }}
              className="mt-1 text-[17px] leading-snug"
            >
              “{c.scenario.prompt}”
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {LANES.map((l, k) => {
            const r = laneResult(l.id, c)
            const sc = score(l.id)
            return (
              <article key={l.id} className="s-card relative flex flex-col overflow-hidden p-5 md:min-h-[300px]">
                <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: l.bar }} />
                <h3 className="s-h3">{l.title}</h3>
                <p className="mt-1 text-[14px] leading-snug text-[var(--ink-3)]">{l.sub}</p>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${c.scenario.id}-${l.id}`}
                    className="mt-5 flex-1"
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                    transition={{ duration: 0.45, ease: EASE, delay: reduce ? 0 : 0.08 * k }}
                  >
                    <Outcome tone={r.tone}>{r.title}</Outcome>
                    <p className="mt-3 text-[14.5px] leading-snug text-[var(--ink-2)]">{r.detail}</p>
                  </motion.div>
                </AnimatePresence>
                <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--line)] pt-4">
                  <div>
                    <dt className="text-[12.5px] text-[var(--ink-3)]">Attacks stopped</dt>
                    <dd className="s-display s-tab mt-0.5 text-[26px]">{sc.stopped}/{sc.harmful}</dd>
                  </div>
                  <div>
                    <dt className="text-[12.5px] text-[var(--ink-3)]">Real customers helped</dt>
                    <dd className="s-display s-tab mt-0.5 text-[26px]">{sc.served}/{sc.genuine}</dd>
                  </div>
                </dl>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Outcome({ tone, children }: { tone: 'loss' | 'ok' | 'wait' | 'flat' | 'stop'; children: ReactNode }) {
  const map = {
    loss: ['var(--stop-soft)', 'var(--stop)'],
    ok: ['var(--go-soft)', 'var(--go)'],
    wait: ['var(--wait-soft)', 'var(--wait)'],
    stop: ['var(--ink)', '#fff'],
    flat: ['#f2f2f2', 'var(--ink-2)'],
  }[tone]
  return (
    <p className={clsx('inline-flex max-w-full items-center gap-2 rounded-[10px] px-3 py-2 text-[15px] font-medium leading-snug')} style={{ background: map[0], color: map[1] }}>
      {children}
    </p>
  )
}
