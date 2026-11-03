import { ArrowRight } from 'lucide-react'
import clsx from 'clsx'
import { Build, MARGIN, Paper, SHADOW } from '../ui'

/* 10 · Rules in plain English, in detail. Everything lands together. */

const LIFECYCLE: { title: string; body: string }[] = [
  { title: 'Write it', body: 'One sentence, plain English' },
  { title: 'Compile once', body: 'Llama-3.1-8B, on the server' },
  { title: 'Validate', body: 'Schema and numbers checked' },
  { title: 'Preview', body: 'Conflicts + try-it preview' },
  { title: 'Publish', body: 'Enforced by code, every action' },
]

type EffectKey = 'block' | 'escalate' | 'otp' | 'approval'

const EFFECTS: Record<EffectKey, { label: string; cls: string }> = {
  block: { label: 'Block', cls: 'bg-alarm-soft text-[#B4232A]' },
  escalate: { label: 'Escalate', cls: 'bg-amber-soft text-[#9A5A00]' },
  otp: { label: 'Require OTP', cls: 'bg-sky text-cobalt' },
  approval: { label: 'Require approval', cls: 'bg-butter/40 text-[#6B4E00]' },
}

const EXAMPLES: { sentence: string; action: string; cond: string; effect: EffectKey }[] = [
  { sentence: 'Refunds over ₹300 need manager approval', action: 'issue_refund', cond: 'amount > 300', effect: 'approval' },
  { sentence: 'Block card actions unless OTP is verified', action: 'block_card', cond: 'otp_verified = false', effect: 'otp' },
  { sentence: 'Never shortlist a candidate scoring below 90', action: 'shortlist_candidate', cond: 'score < 90', effect: 'block' },
  { sentence: 'Escalate to a human when the customer is angry', action: '*', cond: 'sentiment = angry', effect: 'escalate' },
]

function EffectPill({ effect }: { effect: EffectKey }) {
  const e = EFFECTS[effect]
  return <span className={clsx('whitespace-nowrap rounded-full px-[20px] py-[4px] text-[24px] font-semibold leading-[1.4]', e.cls)}>{e.label}</span>
}

const chip = 'rounded-[10px] bg-paper-2 px-[12px] py-[4px] font-mono text-[24px] leading-[1.3] tabular'

export function RulesSlide() {
  return (
    <Paper>
      <Build show className="absolute top-[72px] display text-[56px]" style={{ left: MARGIN }}>
        Rules in plain English
      </Build>

      {/* lifecycle */}
      <div className="absolute grid grid-cols-5 gap-[20px]" style={{ left: MARGIN, right: MARGIN, top: 176 }}>
        {LIFECYCLE.map((l, i) => (
          <Build key={l.title} show delay={0.1 + i * 0.07} className="relative h-[236px] rounded-[24px] bg-card px-[24px] pb-[20px] pt-[22px]" style={{ boxShadow: SHADOW }}>
            <div className={clsx('font-mono text-[24px] font-medium tabular', i === 4 ? 'text-leaf' : 'text-ink-3')}>{String(i + 1).padStart(2, '0')}</div>
            <div className="mt-[10px] text-[30px] font-semibold leading-[1.15]">{l.title}</div>
            <div className="mt-[10px] text-[24px] leading-[1.3] text-ink-2">{l.body}</div>
          </Build>
        ))}
      </div>

      {/* examples */}
      <div className="absolute" style={{ left: MARGIN, right: MARGIN, top: 430 }}>
        {EXAMPLES.map((x, i) => (
          <Build key={x.sentence} show delay={0.5 + i * 0.08} className="flex h-[100px] items-center border-t border-rule">
            <span className="w-[740px] pr-[24px] text-[30px] font-medium leading-[1.2]">“{x.sentence}”</span>
            <ArrowRight size={28} strokeWidth={1.75} className="mr-[28px] shrink-0 text-ink-3" aria-hidden />
            <span className="flex items-center gap-[12px]">
              <span className={chip}>{x.action}</span>
              <span className={chip}>{x.cond}</span>
              <ArrowRight size={22} strokeWidth={1.75} className="shrink-0 text-ink-3" aria-hidden />
              <EffectPill effect={x.effect} />
            </span>
          </Build>
        ))}
      </div>

      {/* legend + safety */}
      <Build show delay={0.95} className="absolute flex items-center justify-between border-t border-ink pt-[22px]" style={{ left: MARGIN, right: MARGIN, top: 862 }}>
        <span className="flex items-center gap-[12px]">
          {(Object.keys(EFFECTS) as EffectKey[]).map((k) => (
            <EffectPill key={k} effect={k} />
          ))}
        </span>
        <span className="display text-[44px] leading-none">
          Rules can only make a verdict <span className="text-leaf">stricter.</span>
        </span>
      </Build>
    </Paper>
  )
}
