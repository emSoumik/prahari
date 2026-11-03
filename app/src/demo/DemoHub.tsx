import { ArrowLeft, ArrowRight, BookText } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { DOMAINS, DOMAIN_ORDER } from './registry'

const BLURB: Record<string, string> = {
  food: 'Refund and order support. An agent that wants to hand out money.',
  bank: 'Transfers and account help. Money moves only after the checks pass.',
  hiring: 'Candidate screening. Decisions about people, with a human in the loop.',
}

/** Route `/demo`: pick a product to try, or open the policy console. Kept apart from the presentation, one click away. */
export default function DemoHub() {
  return (
    <main className="min-h-dvh bg-paper text-ink">
      <div className="mx-auto w-full max-w-[1040px] px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-[14px] text-ink-3 transition-colors [@media(hover:hover)]:hover:text-ink">
          <ArrowLeft size={14} />
          Back to the presentation
        </Link>
        <h1 className="display mt-8 text-[48px]">Live demo</h1>
        <p className="mt-3 max-w-[56ch] text-[17px] text-ink-2">
          Three products, each with the same agent twice: once with no checks, once behind Prahari. Pick one and try to break it.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {DOMAIN_ORDER.map((id) => {
            const d = DOMAINS[id]
            return (
              <Card key={id} to={`/demo/${id}`} title={id === 'hiring' ? 'Shortlist' : d.name} body={BLURB[id]} icon={d.logo} />
            )
          })}
        </div>

        <div className="mt-5">
          <Card
            to="/policies"
            title="Policies"
            body="Write a rule in plain English, see it compiled, then watch the demos enforce it."
            icon={<BookText size={22} />}
            wide
          />
        </div>
      </div>
    </main>
  )
}

function Card({ to, title, body, icon, wide }: { to: string; title: string; body: string; icon: ReactNode; wide?: boolean }) {
  return (
    <Link
      to={to}
      className={
        'group flex flex-col gap-4 rounded-[20px] bg-card p-6 ring-1 ring-rule shadow-[0_1px_2px_rgb(0_0_0/.06),0_8px_24px_-8px_rgb(0_0_0/.12)] transition-transform duration-150 active:scale-[0.99] [@media(hover:hover)]:hover:ring-ink/25 ' +
        (wide ? 'sm:flex-row sm:items-center' : '')
      }
    >
      <span className="flex h-10 items-center">{icon}</span>
      <span className="flex-1">
        <span className="display block text-[26px]">{title}</span>
        <span className="mt-1.5 block text-[15px] text-ink-2">{body}</span>
      </span>
      <span className="inline-flex items-center gap-1 text-[14px] font-medium">
        Open
        <ArrowRight size={14} className="transition-transform [@media(hover:hover)]:group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}
