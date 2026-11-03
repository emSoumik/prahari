import { ListChecks } from 'lucide-react'
import { Build, Figure, Line, Logo, MARGIN, SHADOW, SectionField } from '../ui'

const GATE_W = 1040

/* 5 · – 02 · What's missing? A guard. AI can propose. Only Prahari approves. */
export function ApproveSection({ step }: { step: number }) {
  return (
    <SectionField tone="leaf" marker="– 02">
      <div className="absolute top-[200px] w-[860px]" style={{ left: MARGIN }}>
        <Line className="font-display text-[44px] font-medium tracking-[-0.02em] text-butter">What’s missing? A guard.</Line>
        <div className="mt-[44px] display text-[112px]">
          <Line delay={0.12}>AI can</Line>
          <Line delay={0.17}>propose.</Line>
          <div className="mt-[56px]">
            <Line show={step >= 1}>Only Prahari</Line>
            <Line show={step >= 1} delay={0.05}>
              approves.
            </Line>
          </div>
        </div>
      </div>
      {/* The gate drawing is wide and short: crop its 5:4 plate inside the card
          so the gate, not the empty plate, fills the window. */}
      <div className="absolute right-[120px] top-[230px] h-[620px] w-[880px] overflow-hidden rounded-[40px] bg-paper">
        <Figure
          src="/figures/gate.html?play=1"
          title="An isometric checkpoint gate"
          className="absolute"
          style={{ left: (880 - GATE_W) / 2, top: (620 - GATE_W * 0.8) / 2, width: GATE_W, height: GATE_W * 0.8 }}
        />
      </div>
    </SectionField>
  )
}

/* 12 · – 03 · Let's try to break it. Three places an agent acts. */
const DEMOS = [
  { name: 'Swiggy', domain: 'Food delivery', logo: <Logo name="swiggy" h={64} /> },
  { name: 'HDFC Bank', domain: 'Banking', logo: <Logo name="hdfc" h={40} /> },
  {
    name: 'Shortlist',
    domain: 'Hiring',
    logo: (
      <span className="grid h-[64px] w-[64px] place-items-center rounded-[18px] bg-ink text-paper">
        <ListChecks size={36} strokeWidth={2.2} aria-hidden />
      </span>
    ),
  },
]

export function BreakSection() {
  return (
    <SectionField tone="sky" marker="– 03" framed>
      <div className="absolute left-[56px] top-[116px] display text-[168px]">
        <Line>Let’s try to</Line>
        <Line delay={0.05}>break it.</Line>
      </div>
      <div className="absolute grid grid-cols-3 gap-[24px]" style={{ left: 56, right: 56, top: 560 }}>
        {DEMOS.map((d, i) => (
          <Build key={d.name} show delay={0.3 + i * 0.09} className="flex h-[260px] flex-col justify-between rounded-[32px] bg-paper p-[36px] text-ink" style={{ boxShadow: SHADOW }}>
            <div className="flex h-[64px] items-center">{d.logo}</div>
            <div>
              <div className="display text-[56px]">{d.name}</div>
              <div className="mt-[6px] font-mono text-[24px] text-ink-3">{d.domain}</div>
            </div>
          </Build>
        ))}
      </div>
    </SectionField>
  )
}
