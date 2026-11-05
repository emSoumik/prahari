import { lazy, Suspense, useRef } from 'react'
import { Link } from 'react-router'
import { DOMAINS, DOMAIN_ORDER } from '../demo/registry'
import { Arrow, SectionHead, useInView, usePhone } from './ui'

const DemoShell = lazy(() => import('../demo/shell/DemoShell').then((m) => ({ default: m.DemoShell })))

const BLURB = {
  food: { name: 'Swiggy', line: 'Refund requests, angry customers and “admin mode” tricks.' },
  bank: { name: 'HDFC Bank', line: 'Card blocks, transfers and OTP step‑up on the right account.' },
  hiring: { name: 'Shortlist', line: 'Résumé screening with hidden text and fake instructions.' },
} as const

/** The real side-by-side demo shell, embedded. Phones get links into the phone layout instead. */
export function LiveDemo() {
  const phone = usePhone()
  const frame = useRef<HTMLDivElement>(null)
  const near = useInView(frame, '600px')

  return (
    <section id="demo" className="s-section" aria-labelledby="demo-h">
      <div className="s-wrap">
        <SectionHead
          title={<span id="demo-h">The same agent, with and without Prahari</span>}
          lead={phone ? 'Three products to try. Each shows the agent with no checks and behind Prahari.' : 'Left: no checks. Right: behind Prahari, with its reasoning. Pick a prompt or write your own, and try to break it.'}
        />

        {phone ? (
          <ul className="mt-10 flex flex-col gap-3">
            {DOMAIN_ORDER.map((id) => (
              <li key={id}>
                <Link to={`/app/demo/${id}`} className="s-card flex items-center gap-4 p-5">
                  <span className="flex h-9 w-16 shrink-0 items-center">{DOMAINS[id].logo}</span>
                  <span className="min-w-0 flex-1">
                    <span className="s-h3 block">{BLURB[id].name}</span>
                    <span className="mt-1 block text-[14.5px] leading-snug text-[var(--ink-2)]">{BLURB[id].line}</span>
                  </span>
                  <span className="text-[var(--ink-3)]"><Arrow size={18} /></span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div ref={frame} className="s-frame mt-10">
            <div className="flex h-11 items-center gap-2 border-b border-[var(--line)] bg-[var(--tint)] px-4">
              <span className="size-2.5 rounded-full bg-[#e2e2e2]" />
              <span className="size-2.5 rounded-full bg-[#e2e2e2]" />
              <span className="size-2.5 rounded-full bg-[#e2e2e2]" />
              <span className="s-mono mx-auto rounded-full bg-white px-4 py-1 text-[12.5px] text-[var(--ink-3)] shadow-[inset_0_0_0_1px_var(--line)]">
                prahari / app / demo
              </span>
              <span className="w-[52px]" aria-hidden />
            </div>
            <div className="relative" style={{ height: 'clamp(520px, calc(100svh - 300px), 720px)' }}>
              {near ? (
                <Suspense fallback={<Placeholder />}>
                  <DemoShell domain="food" variant="slide" />
                </Suspense>
              ) : (
                <Placeholder />
              )}
            </div>
          </div>
        )}
        <p className="mt-5 text-[13px] text-[var(--ink-3)]">Concept demos, not affiliated with Swiggy or HDFC Bank.</p>
      </div>
    </section>
  )
}

function Placeholder() {
  return <div className="grid h-full place-items-center text-[14px] text-[var(--ink-3)]">Loading the demo</div>
}
