import type { ReactNode } from 'react'
import { SectionHead } from './ui'

const POINTS = [
  { t: 'Strictest verdict wins', b: 'The browser and the server both check. If they disagree, the stricter answer stands.' },
  { t: 'The judge only escalates', b: 'An AI judge reads intent and tone. It can raise a verdict, and a failure sends the case to a person.' },
  { t: 'Every verdict is logged', b: 'Each decision is appended to a hash‑chained audit log, so an edit to history shows.' },
]

const PATHS = [
  'M20 50 C 24 50, 24 24, 28 24',
  'M20 50 C 24 50, 24 76, 28 76',
  'M56 24 C 60 24, 60 50, 64 50',
  'M56 76 C 60 76, 60 50, 64 50',
  'M80 50 C 83 50, 83 33, 86 33',
  'M80 50 C 83 50, 83 70, 86 70',
]

function Node({ x, y, w, h, children, strong }: { x: number; y: number; w: number; h: number; children: ReactNode; strong?: boolean }) {
  return (
    <div
      className="absolute flex flex-col justify-center rounded-[16px] px-4 py-3"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${w}%`,
        height: `${h}%`,
        background: strong ? 'var(--ink)' : '#fff',
        color: strong ? '#fff' : 'var(--ink)',
        boxShadow: strong ? '0 12px 30px -14px rgb(0 0 0 / .5)' : 'var(--shadow-card), inset 0 0 0 1px var(--line)',
      }}
    >
      {children}
    </div>
  )
}

export function Architecture() {
  return (
    <section id="architecture" className="s-section" aria-labelledby="arch-h">
      <div className="s-wrap">
        <SectionHead title={<span id="arch-h">Two engines, one verdict</span>} lead="The same deterministic engine runs in the browser and on your server. The model advises from the side and never holds the key." />

        {/* desktop diagram */}
        <div className="relative mt-14 hidden md:block" style={{ height: 'clamp(340px, 42vh, 420px)' }} role="img" aria-label="The agent's proposed action goes to the browser engine and the server engine. Both feed a merge step where the strictest verdict wins. The verdict is returned and written to the audit log.">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            {PATHS.map((d) => (
              <g key={d}>
                <path d={d} fill="none" stroke="var(--line-2)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                <path d={d} fill="none" stroke="var(--ink)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" className="s-flow" />
              </g>
            ))}
          </svg>
          <Node x={0} y={38} w={20} h={24}>
            <span className="s-label">Agent</span>
            <span className="mt-1 text-[15.5px] font-medium leading-tight">Proposes one action</span>
          </Node>
          <Node x={28} y={6} w={28} h={36}>
            <span className="s-label">In the browser</span>
            <span className="mt-1 text-[15.5px] font-medium leading-tight">Sanitizer, five gates, your rules</span>
            <span className="s-mono mt-2 text-[var(--ink-3)]">app/src/prahari</span>
          </Node>
          <Node x={28} y={58} w={28} h={36}>
            <span className="s-label">On your server</span>
            <span className="mt-1 text-[15.5px] font-medium leading-tight">policy.yaml, rules, AI judge</span>
            <span className="s-mono mt-2 text-[var(--ink-3)]">backend · FastAPI</span>
          </Node>
          <Node x={64} y={38} w={16} h={24} strong>
            <span className="text-[12.5px] text-white/60">Merge</span>
            <span className="mt-1 text-[15.5px] font-medium leading-tight">Strictest wins</span>
          </Node>
          <Node x={86} y={22} w={14} h={22}>
            <span className="text-[15px] font-medium">Verdict</span>
            <span className="mt-0.5 text-[12.5px] text-[var(--ink-3)]">with a reason</span>
          </Node>
          <Node x={86} y={59} w={14} h={22}>
            <span className="text-[15px] font-medium">Audit log</span>
            <span className="mt-0.5 text-[12.5px] text-[var(--ink-3)]">hash‑chained</span>
          </Node>
        </div>

        {/* phone diagram */}
        <ol className="mt-10 flex flex-col md:hidden" aria-label="How a verdict is reached">
          {[
            ['Agent', 'Proposes one action'],
            ['In the browser and on your server', 'Sanitizer, five gates, rules and the AI judge'],
            ['Merge', 'Strictest verdict wins'],
            ['Verdict', 'Returned with a reason and logged'],
          ].map(([a, b], i, all) => (
            <li key={a} className="relative pb-6 pl-8 last:pb-0">
              {i < all.length - 1 && <span aria-hidden className="absolute bottom-0 left-[7px] top-5 w-px bg-[var(--line-2)]" />}
              <span aria-hidden className={`absolute left-0 top-1.5 size-[15px] rounded-full ${i === 2 ? 'bg-[var(--ink)]' : 'bg-white shadow-[inset_0_0_0_1.5px_var(--ink)]'}`} />
              <span className="s-label block">{a}</span>
              <span className="mt-0.5 block text-[16px] font-medium">{b}</span>
            </li>
          ))}
        </ol>

        <div className="mt-14 grid grid-cols-1 gap-8 border-t border-[var(--line)] pt-8 md:grid-cols-3 md:gap-6">
          {POINTS.map((p) => (
            <div key={p.t}>
              <h3 className="s-h3">{p.t}</h3>
              <p className="s-body mt-2 text-[15.5px]">{p.b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
