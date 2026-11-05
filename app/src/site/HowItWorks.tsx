import clsx from 'clsx'
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import { useRef, useState, type ReactNode } from 'react'
import { scenarios as food } from '../demo/domains/food/scenarios'
import { evaluate } from '../prahari/engine'
import { DEFAULT_RULES } from '../prahari/rules'
import { sanitize } from '../prahari/sanitizer'
import { GATES } from '../prahari/types'
import { STAMP, STEPS } from './content'
import { EASE, usePhone } from './ui'

const EX = food.find((s) => s.id === 'abuse-ignore-policy')!
const EV = evaluate({ domain: EX.domain, message: EX.prompt, proposed: EX.proposed, facts: EX.facts }, DEFAULT_RULES)
const HITS = sanitize(EX.prompt).hits
const LADDER = ['allow', 'verify', 'escalate', 'block'] as const

/** "How a check runs": a two-screen section whose stage follows the scroll, one step at a time. */
export function HowItWorks() {
  const phone = usePhone()
  const ref = useRef<HTMLElement>(null)
  const [step, setStep] = useState(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  useMotionValueEvent(scrollYProgress, 'change', (p) => setStep(Math.min(STEPS.length - 1, Math.max(0, Math.floor(p * STEPS.length * 0.999)))))

  const jump = (i: number) => {
    const el = ref.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    const span = el.offsetHeight - window.innerHeight
    window.scrollTo({ top: top + span * ((i + 0.5) / STEPS.length), behavior: 'smooth' })
  }

  if (phone) {
    return (
      <section id="how" className="s-section" aria-labelledby="how-h">
        <div className="s-wrap">
          <h2 id="how-h" className="s-display s-h2">How a check runs</h2>
          <p className="s-lead mt-4">One real message, from the customer to the verdict.</p>
          <ol className="mt-10 flex flex-col gap-9">
            {STEPS.map((s, i) => (
              <li key={s.id} className="grid grid-cols-[28px_1fr] gap-x-3">
                <span className="s-mono s-tab pt-1 text-[var(--ink-3)]">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="s-h3">{s.title}</h3>
                  <p className="s-body mt-1.5 text-[15.5px]">{s.body}</p>
                  <div className="mt-4">
                    <StageBlock id={s.id} active />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    )
  }

  return (
    <section id="how" ref={ref} className="relative" style={{ height: '220svh' }} aria-labelledby="how-h">
      <div className="sticky top-0 flex h-[100svh] flex-col" style={{ paddingTop: 'calc(var(--nav) + clamp(32px, 6vh, 64px))', paddingBottom: 'clamp(28px, 5vh, 56px)' }}>
        <div className="s-wrap s-grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-y-8">
          <div className="col-span-5">
            <h2 id="how-h" className="s-display s-h2">How a check runs</h2>
            <p className="s-lead mt-4 text-[18px]">One real message, from the customer to the verdict. Scroll to step through it.</p>
          </div>
          <ol className="col-span-5 row-start-2 flex flex-col justify-center gap-1 self-stretch">
            {STEPS.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => jump(i)}
                  aria-current={step === i ? 'step' : undefined}
                  className="group grid w-full grid-cols-[34px_1fr] gap-x-3 rounded-[14px] py-2.5 text-left"
                >
                  <span className={clsx('s-mono s-tab pt-[3px] transition-colors duration-300', step === i ? 'text-[var(--ink)]' : 'text-[var(--ink-3)]')}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <span className={clsx('s-h3 block transition-colors duration-300', step === i ? 'text-[var(--ink)]' : 'text-[#b5b5b5] group-hover:text-[var(--ink-2)]')}>
                      {s.title}
                    </span>
                    <motion.span
                      className="block overflow-hidden"
                      initial={false}
                      animate={{ height: step === i ? 'auto' : 0, opacity: step === i ? 1 : 0 }}
                      transition={{ duration: 0.45, ease: EASE }}
                    >
                      <span className="s-body block max-w-[30em] pt-1.5 text-[15.5px]">{s.body}</span>
                    </motion.span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="col-span-7 col-start-6 row-span-2 row-start-1 flex min-h-0 items-center">
            <div className="s-frame w-full">
              <div className="flex h-11 items-center gap-2 border-b border-[var(--line)] px-4 text-[13px] text-[var(--ink-3)]">
                <span className="size-2.5 rounded-full bg-[#ececec]" />
                <span className="size-2.5 rounded-full bg-[#ececec]" />
                <span className="size-2.5 rounded-full bg-[#ececec]" />
                <span className="ml-3">Trace · Swiggy support</span>
                <span className="s-mono ml-auto">step {step + 1} of 6</span>
              </div>
              <div className="flex flex-col gap-3 p-5">
                {STEPS.map((s, i) => (
                  <Reveal key={s.id} on={step >= i} active={step === i}>
                    <StageBlock id={s.id} active={step === i} />
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Reveal({ on, active, children }: { on: boolean; active: boolean; children: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={false}
      animate={{ opacity: on ? (active ? 1 : 0.45) : 0.08, y: on || reduce ? 0 : 6, filter: on ? 'blur(0px)' : 'blur(2px)' }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

function Row({ label, children, active }: { label: string; children: ReactNode; active?: boolean }) {
  return (
    <div className={clsx('grid grid-cols-1 items-start gap-1.5 rounded-[12px] px-3 py-2.5 sm:grid-cols-[92px_1fr] sm:gap-3 transition-[background-color,box-shadow] duration-300', active && 'bg-[var(--tint)] shadow-[inset_0_0_0_1px_var(--line)]')}>
      <span className="s-label pt-[3px]">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function StageBlock({ id, active }: { id: (typeof STEPS)[number]['id']; active: boolean }) {
  const stamp = STAMP[EV.verdict]
  switch (id) {
    case 'message':
      return (
        <Row label="Customer" active={active}>
          <p className="text-[15px] leading-snug">{EX.prompt}</p>
        </Row>
      )
    case 'sanitize': {
      const hit = HITS[0]?.match ?? ''
      const [before, after] = EX.prompt.split(new RegExp(hit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
      return (
        <Row label="Sanitizer" active={active}>
          <p className="text-[15px] leading-snug text-[var(--ink-2)]">
            {before}
            <mark className="rounded-[4px] bg-[var(--stop-soft)] px-0.5 text-[var(--stop)] line-through decoration-[1.5px]">{hit}</mark>
            {after}
          </p>
          <p className="mt-1.5 text-[13px] text-[var(--stop)]">{HITS.length} injected instruction removed</p>
        </Row>
      )
    }
    case 'propose':
      return (
        <Row label="Agent" active={active}>
          <p className="s-display text-[19px]" style={{ letterSpacing: '-0.02em', lineHeight: 1.15 }}>{EX.proposed.label}</p>
          <p className="mt-1 text-[13px] text-[var(--ink-3)]">issue_refund · {EX.proposed.reversible ? 'reversible' : 'irreversible'} · not run yet</p>
        </Row>
      )
    case 'gates':
      return (
        <Row label="Gates" active={active}>
          <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {GATES.map((g) => {
              const r = EV.gates.find((x) => x.gate === g.id)
              const st = r?.status ?? 'pass'
              const c = st === 'pass' ? 'var(--go)' : st === 'fail' ? 'var(--stop)' : 'var(--wait)'
              return (
                <li key={g.id} className="rounded-[10px] bg-white px-2 py-2 shadow-[inset_0_0_0_1px_var(--line)]">
                  <span className="s-dot" style={{ background: c }} />
                  <span className="mt-1.5 block truncate text-[12.5px] font-medium">{g.label}</span>
                  <span className="block text-[11.5px]" style={{ color: c }}>{st === 'pass' ? 'Pass' : st === 'fail' ? 'Fail' : 'Warn'}</span>
                </li>
              )
            })}
          </ul>
        </Row>
      )
    case 'judge':
      return (
        <Row label="AI judge" active={active}>
          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:items-center">
            {LADDER.map((v) => (
              <span
                key={v}
                className={clsx('inline-flex h-7 flex-1 items-center whitespace-nowrap px-2 justify-center rounded-full text-[12.5px] font-medium', v === EV.verdict ? 'text-white' : 'text-[var(--ink-3)] shadow-[inset_0_0_0_1px_var(--line)]')}
                style={v === EV.verdict ? { background: STAMP[v].color } : undefined}
              >
                {STAMP[v].word}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-[var(--ink-2)]">Advisory. It may move the verdict right, never left.</p>
        </Row>
      )
    case 'verdict':
      return (
        <Row label="Verdict" active={active}>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
            <span className="s-stamp -rotate-6 text-[22px]" style={{ color: stamp.color }}>{stamp.word}</span>
            <p className="text-[14px] leading-snug text-[var(--ink-2)]">{EV.reason}</p>
          </div>
        </Row>
      )
  }
}
