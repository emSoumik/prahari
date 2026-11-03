import { motion } from 'motion/react'
import { Bot, Briefcase, FileText, Headset, Landmark, MousePointerClick, Receipt, Send, Wallet, type LucideIcon } from 'lucide-react'
import { Build, Line, MARGIN, Paper, SHADOW, SPRING, useStill } from '../ui'

/* ------------------------------------------------------------------ */
/* Opening: three beats, one idea each. Shift · Act · Reveal.          */
/* ------------------------------------------------------------------ */

/** The Prahari mark: a shield holding a hull and its keel. */
export function KeelMark({ size = 200 }: { size?: number }) {
  return (
    <svg width={size * (100 / 120)} height={size} viewBox="0 0 100 120" aria-hidden>
      <path d="M50 4 L92 18 V58 C92 86 73 105 50 116 C27 105 8 86 8 58 V18 Z" fill="var(--color-leaf)" />
      <path d="M22 50 H78 L70 70 H30 Z" fill="var(--color-ink)" />
      <path d="M50 70 V92" stroke="var(--color-ink)" strokeWidth={7} strokeLinecap="round" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* 1 · Every company is moving its work to AI agents                   */
/* ------------------------------------------------------------------ */

const WORKFLOWS: { label: string; Icon: LucideIcon }[] = [
  { label: 'Refunds', Icon: Receipt },
  { label: 'Payments', Icon: Wallet },
  { label: 'Hiring', Icon: Briefcase },
  { label: 'Support', Icon: Headset },
  { label: 'Banking', Icon: Landmark },
]

/** One workflow. Step 0: a person clicks through a form. Step 1: an agent owns it. */
function WorkflowCard({ label, Icon, i, now }: { label: string; Icon: LucideIcon; i: number; now: boolean }) {
  const still = useStill()
  const swap = { ...SPRING, delay: now ? 0.12 + i * 0.1 : 0 }
  return (
    <Build show delay={0.35 + i * 0.07} className="relative h-[340px] rounded-[32px] bg-card p-[28px]" style={{ boxShadow: SHADOW }}>
      <div className="flex items-center gap-[14px] text-[32px] font-semibold leading-none">
        <Icon size={32} strokeWidth={1.75} aria-hidden />
        {label}
      </div>
      <div className="relative mx-auto mt-[36px] h-[148px] w-[148px]">
        <motion.div
          className="absolute inset-0 grid place-items-center rounded-[36px] bg-paper-2 text-ink-3"
          initial={false}
          animate={{ opacity: now ? 0 : 1, scale: now ? 0.86 : 1 }}
          transition={still ? { duration: 0 } : swap}
        >
          <MousePointerClick size={64} strokeWidth={1.5} aria-hidden />
        </motion.div>
        <motion.div
          className="absolute inset-0 grid place-items-center rounded-[36px] bg-leaf text-card"
          initial={false}
          animate={{ opacity: now ? 1 : 0, scale: now ? 1 : 0.86 }}
          transition={still ? { duration: 0 } : swap}
        >
          <Bot size={72} strokeWidth={1.5} aria-hidden />
        </motion.div>
      </div>
      <div className="relative mt-[28px] h-[28px] text-center font-mono text-[22px] leading-[28px]">
        <motion.span className="absolute inset-x-0 text-ink-3" initial={false} animate={{ opacity: now ? 0 : 1 }} transition={{ duration: 0.2, delay: now ? 0.12 + i * 0.1 : 0 }}>
          A person, a form
        </motion.span>
        <motion.span className="absolute inset-x-0 font-medium text-leaf" initial={false} animate={{ opacity: now ? 1 : 0 }} transition={{ duration: 0.2, delay: now ? 0.2 + i * 0.1 : 0 }}>
          An agent
        </motion.span>
      </div>
    </Build>
  )
}

export function ShiftSlide({ step }: { step: number }) {
  const now = step >= 1
  return (
    <Paper>
      <h1 className="absolute top-[120px] display text-[120px]" style={{ left: MARGIN, width: 1500 }}>
        <Line>Every company is moving</Line>
        <Line delay={0.06}>its work to AI agents.</Line>
      </h1>
      <div className="absolute top-[472px] flex items-center gap-[20px] font-mono text-[24px] font-medium uppercase tracking-[0.1em]" style={{ left: MARGIN }}>
        <span className="relative h-[32px] w-[90px]">
          <motion.span className="absolute left-0 text-ink-3" initial={false} animate={{ opacity: now ? 0 : 1 }} transition={{ duration: 0.2 }}>
            Then
          </motion.span>
          <motion.span className="absolute left-0 text-leaf" initial={false} animate={{ opacity: now ? 1 : 0 }} transition={{ duration: 0.2, delay: now ? 0.1 : 0 }}>
            Now
          </motion.span>
        </span>
      </div>
      <div className="absolute grid grid-cols-5 gap-[24px]" style={{ left: MARGIN, right: MARGIN, top: 540 }}>
        {WORKFLOWS.map((w, i) => (
          <WorkflowCard key={w.label} {...w} i={i} now={now} />
        ))}
      </div>
    </Paper>
  )
}

/* ------------------------------------------------------------------ */
/* 2 · Agents don't just answer. They act.                             */
/* ------------------------------------------------------------------ */

const ACTS: { label: string; call: string; Icon: LucideIcon }[] = [
  { label: 'Issue refunds', call: 'issue_refund ₹1,240', Icon: Receipt },
  { label: 'Move money', call: 'transfer ₹50,000', Icon: Send },
  { label: 'Shortlist people', call: 'shortlist_candidate', Icon: FileText },
]

export function ActSlide({ step }: { step: number }) {
  return (
    <Paper>
      <h1 className="absolute top-[130px] display text-[184px]" style={{ left: MARGIN }}>
        <Line>Agents don’t just</Line>
        <Line delay={0.05}>answer.</Line>
        <Line show={step >= 1} className="text-leaf">
          They act.
        </Line>
      </h1>
      <div className="absolute grid grid-cols-3 gap-[24px]" style={{ left: MARGIN, right: MARGIN, top: 806 }}>
        {ACTS.map(({ label, call, Icon }, i) => (
          <Build key={label} show={step >= 2} delay={i * 0.09} className="flex items-center gap-[24px] rounded-[28px] bg-card px-[32px] py-[24px]" style={{ boxShadow: SHADOW }}>
            <span className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-[20px] bg-paper-2">
              <Icon size={36} strokeWidth={1.6} aria-hidden />
            </span>
            <span>
              <span className="block text-[34px] font-semibold leading-[1.1]">{label}</span>
              <span className="mt-[4px] block font-mono text-[22px] text-ink-3 tabular">{call}</span>
            </span>
          </Build>
        ))}
      </div>
    </Paper>
  )
}

/* ------------------------------------------------------------------ */
/* 3 · So who checks the action? ... Prahari.                          */
/* ------------------------------------------------------------------ */

export function RevealSlide({ step }: { step: number }) {
  const named = step >= 1
  return (
    <div className="absolute inset-0 overflow-hidden bg-ink text-paper">
      <Build show={!named} y={12} className="absolute top-[250px]" style={{ left: MARGIN, width: 1400 }}>
        <h1 className="display text-[148px]">So who checks the action before it happens?</h1>
      </Build>
      <div className="absolute top-[300px] flex items-end gap-[56px]" style={{ left: MARGIN }}>
        <Build show={named} delay={0.1} y={0}>
          <KeelMark size={250} />
        </Build>
        <Build show={named} delay={0.05} y={16}>
          <div className="display text-[330px] leading-[0.8]">Prahari.</div>
        </Build>
      </div>
      <Build show={named} delay={0.5} className="absolute top-[640px] font-display text-[64px] font-medium tracking-[-0.02em] text-paper/70" style={{ left: MARGIN }}>
        The guard between AI and action.
      </Build>
    </div>
  )
}
