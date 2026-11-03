import clsx from 'clsx'
import { Build, Figure, MARGIN, Paper } from '../ui'

/* ------------------------------------------------------------------ */
/* Classifiers vs Prahari: two drawings, side by side                  */
/* ------------------------------------------------------------------ */

const COL_W = 810
const FIG_H = 470

const CLASSIFIER_STEPS = ['Reads the prompt text', 'Labels it safe or unsafe', 'Whatever the agent does next, runs']
const PRAHARI_STEPS = ['Lets the agent propose an action', 'Checks the action against facts and rules', 'Allow, block, verify or send to a person']

function Compare({ figW, x, title, accent, src, figTitle, steps, delay }: { figW: number; x: number; title: string; accent?: boolean; src: string; figTitle: string; steps: string[]; delay: number }) {
  return (
    <Build show delay={delay} className="absolute top-[84px]" style={{ left: x, width: COL_W }}>
      <div className={clsx('text-[34px] font-semibold leading-none', accent && 'text-leaf')}>{title}</div>
      <div className="relative mt-[24px] overflow-hidden" style={{ height: FIG_H }}>
        <Figure
          src={src}
          title={figTitle}
          className="absolute"
          style={{ left: (COL_W - figW) / 2, top: (FIG_H - figW * 0.8) / 2, width: figW, height: figW * 0.8, pointerEvents: 'none' }}
        />
      </div>
      <ol className="mt-[24px] space-y-[8px]">
        {steps.map((t, i) => (
          <li key={t} className="flex items-baseline gap-[16px] text-[28px] leading-[1.25] text-ink-2">
            <span className={clsx('w-[32px] shrink-0 font-mono text-[24px] font-medium tabular', accent ? 'text-leaf' : 'text-ink-3')}>{i + 1}</span>
            {t}
          </li>
        ))}
      </ol>
    </Build>
  )
}

export function DifferenceSlide() {
  return (
    <Paper>
      <Compare
        figW={800}
        x={MARGIN}
        title="How a prompt classifier works"
        src="/figures/classifier.html?play=1"
        figTitle="A scanner reads incoming prompts on a conveyor; a disguised one passes and the action fires anyway"
        steps={CLASSIFIER_STEPS}
        delay={0}
      />
      <Compare
        figW={960}
        x={MARGIN + COL_W + 60}
        title="How Prahari works"
        accent
        src="/figures/gate.html?play=1"
        figTitle="An isometric checkpoint gate that checks each proposed action"
        steps={PRAHARI_STEPS}
        delay={0.12}
      />
      <Build show delay={0.4} className="absolute top-[900px] display text-[52px]" style={{ left: MARGIN }}>
        Detecting risk is not the same as <span className="text-leaf">controlling action.</span>
      </Build>
    </Paper>
  )
}

/* ------------------------------------------------------------------ */
/* 11b · Two engines                                                   */
/* ------------------------------------------------------------------ */

const BOX_TOP = 250
const BOX_H = 420
const MID = BOX_TOP + BOX_H / 2
const INTEL = { x: 120, w: 460 }
const AUTH = { x: 740, w: 460 }
const GATE = { x: 1360, w: 220, h: 200 }
const API = { x: 1700, w: 100, h: 100 }
const DETOUR_Y = 780

function EngineBox({
  x,
  w,
  title,
  tag,
  items,
  accent,
}: {
  x: number
  w: number
  title: string
  tag: string
  items: string[]
  accent?: boolean
}) {
  return (
    <div
      className={clsx('absolute rounded-[28px] border-2 bg-paper px-[36px] py-[32px]', accent ? 'border-leaf' : 'border-ink')}
      style={{ left: x, top: BOX_TOP, width: w, height: BOX_H }}
    >
      <div className="display text-[44px] leading-[1]">{title}</div>
      <div className={clsx('mt-[14px] font-mono text-[22px] font-medium uppercase tracking-[0.08em]', accent ? 'text-leaf' : 'text-ink-3')}>{tag}</div>
      <ul className="mt-[28px] space-y-[8px] text-[28px] leading-[1.3] text-ink-2">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  )
}

function ArrowLabel({ x1, x2, label, color = '#141414' }: { x1: number; x2: number; label: string; color?: string }) {
  return (
    <>
      <svg className="absolute left-0 top-0 overflow-visible" width={1} height={1} aria-hidden>
        <g stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={`M${x1 + 14} ${MID} H${x2 - 16}`} />
          <path d={`M${x2 - 28} ${MID - 11} L${x2 - 16} ${MID} L${x2 - 28} ${MID + 11}`} />
        </g>
      </svg>
      <div className="absolute -translate-x-1/2 font-mono text-[24px] text-ink-2" style={{ left: (x1 + x2) / 2, top: MID - 52 }}>
        {label}
      </div>
    </>
  )
}

export function TwoEngines({ step }: { step: number }) {
  const intelBottom = BOX_TOP + BOX_H
  const apiMidX = API.x + API.w / 2
  const cutX = (AUTH.x + AUTH.w / 2 + GATE.x) / 2
  return (
    <Paper>
      <Build show>
        <EngineBox x={INTEL.x} w={INTEL.w} title="Intelligence engine" tag="probabilistic" items={['Intent', 'Injection', 'History', 'Sensitivity', 'Persistence']} />
      </Build>

      <Build show={step >= 1}>
        <ArrowLabel x1={INTEL.x + INTEL.w} x2={AUTH.x} label="suggests" />
        <EngineBox
          x={AUTH.x}
          w={AUTH.w}
          title="Authorization engine"
          tag="deterministic"
          accent
          items={['Authenticated?', 'Permitted?', 'Within policy?', 'Needs a human?']}
        />
      </Build>

      <Build show={step >= 2}>
        <ArrowLabel x1={AUTH.x + AUTH.w} x2={GATE.x} label="decides" color="var(--color-leaf)" />
        <div
          className="absolute flex items-center rounded-[24px] border-2 border-ink bg-paper px-[28px] display text-[34px] leading-[1.05]"
          style={{ left: GATE.x, top: MID - GATE.h / 2, width: GATE.w, height: GATE.h }}
        >
          Execution gateway
        </div>
        <svg className="absolute left-0 top-0 overflow-visible" width={1} height={1} aria-hidden>
          {/* the only path to the APIs */}
          <path d={`M${GATE.x + GATE.w} ${MID} H${API.x}`} stroke="var(--color-leaf)" strokeWidth={4} strokeLinecap="round" />
          {/* the direct path, cut */}
          <path
            d={`M${INTEL.x + INTEL.w / 2} ${intelBottom} V${DETOUR_Y - 24} Q${INTEL.x + INTEL.w / 2} ${DETOUR_Y} ${INTEL.x + INTEL.w / 2 + 24} ${DETOUR_Y} H${apiMidX - 24} Q${apiMidX} ${DETOUR_Y} ${apiMidX} ${DETOUR_Y - 24} V${MID + API.h / 2}`}
            stroke="var(--color-alarm)"
            strokeWidth={2}
            strokeDasharray="10 10"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx={cutX} cy={DETOUR_Y} r={30} fill="var(--color-paper)" />
          <g stroke="var(--color-alarm)" strokeWidth={4} strokeLinecap="round">
            <path d={`M${cutX - 14} ${DETOUR_Y - 14} L${cutX + 14} ${DETOUR_Y + 14}`} />
            <path d={`M${cutX + 14} ${DETOUR_Y - 14} L${cutX - 14} ${DETOUR_Y + 14}`} />
          </g>
        </svg>
        <div
          className="absolute grid place-items-center rounded-full border-2 border-ink bg-paper font-mono text-[26px] font-semibold"
          style={{ left: API.x, top: MID - API.h / 2, width: API.w, height: API.h }}
        >
          APIs
        </div>
      </Build>

      <Build show={step >= 3} className="absolute top-[880px] display text-[60px]" style={{ left: MARGIN }}>
        Intelligence can suggest. <span className="text-leaf">Authority must be earned.</span>
      </Build>
    </Paper>
  )
}

/* ------------------------------------------------------------------ */
/* Architecture · Under the hood                                       */
/* ------------------------------------------------------------------ */

const LAYERS: { name: string; tech: string }[] = [
  { name: 'Agent / channel', tech: 'Swiggy · HDFC · recruiter agents propose an action' },
  { name: 'Ingest filter', tech: 'strips hidden text · flags injected instructions' },
  { name: 'Intelligence engine', tech: 'LLM judge · Llama-3.1-8B on Qualcomm Cloud AI · intent, sensitivity, injection' },
  { name: 'Decision', tech: 'AI advises, code decides · AI can only escalate' },
  { name: 'Authorization engine', tech: 'policy.yaml + JSON rules compiled from plain English' },
  { name: 'Execution gateway', tech: 'only approved actions reach the APIs · human queue · safe-alternative swap' },
  { name: 'Audit ledger', tech: 'hash-chained, tamper-evident' },
]

const STACK_FIG = { x: 593, y: -80, w: 1391 }

export function Architecture() {
  return (
    <Paper>
      <div className="absolute top-[96px] display text-[44px]" style={{ left: MARGIN }}>
        Under the hood
      </div>
      <ol className="absolute top-[200px] w-[740px]" style={{ left: MARGIN }}>
        {LAYERS.map((l, i) => (
          <Build key={l.name} as="div" show delay={i * 0.05} className="border-t border-rule py-[12px]">
            <div className="flex items-baseline gap-[16px] text-[28px] font-semibold leading-[1.2]">
              <span className="font-mono text-[20px] font-medium text-ink-3 tabular">{String(i + 1).padStart(2, '0')}</span>
              {l.name}
            </div>
            <div className="mt-[4px] pl-[42px] text-[22px] leading-[1.3] text-ink-3">{l.tech}</div>
          </Build>
        ))}
      </ol>
      {/* The stack is tall and narrow inside its 5:4 plate: oversize the plate
          so the stack runs nearly full height, centred in the right half. */}
      <Figure
        src="/figures/stack.html"
        title="The seven layers of Prahari, as an exploded stack"
        className="absolute"
        style={{ left: STACK_FIG.x, top: STACK_FIG.y, width: STACK_FIG.w, height: STACK_FIG.w * 0.8, pointerEvents: 'none' }}
      />
      <Build show delay={0.45} className="absolute top-[968px] font-mono text-[20px] text-ink-2" style={{ left: MARGIN }}>
        FastAPI · React · runs fully local with a scripted fallback
      </Build>
    </Paper>
  )
}
