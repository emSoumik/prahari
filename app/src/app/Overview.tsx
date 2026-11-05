import { ArrowRight, BookText, ChevronRight, KeyRound } from 'lucide-react'
import { Link } from 'react-router'
import clsx from 'clsx'
import { useDev } from '../prahari/backend'
import { hostOf, useLlm } from '../prahari/llm'
import { usePrahari, type ActivityEntry } from '../prahari/store'
import { DOMAINS, DOMAIN_ORDER } from '../demo/registry'
import { VerdictPill } from '../demo/shell/ui'
import { useTitle } from './useTitle'

const CARD = 'rounded-[20px] bg-card ring-1 ring-rule shadow-[0_1px_2px_rgb(0_0_0/.06),0_8px_24px_-8px_rgb(0_0_0/.12)]'
const BTN_PRIMARY =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[15px] font-medium text-paper transition-transform duration-150 active:scale-[0.97] md:h-10 md:text-[14px]'
const BTN_QUIET =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-card px-5 text-[15px] font-medium ring-1 ring-rule transition-transform duration-150 active:scale-[0.97] md:h-10 md:text-[14px] [@media(hover:hover)]:hover:ring-ink/25'

const BLURB: Record<string, string> = {
  food: 'Refunds and order support. An agent that wants to hand out money.',
  bank: 'Transfers and account help. Money moves only after the checks pass.',
  hiring: 'Candidate screening. Decisions about people, with a human in the loop.',
}

function ago(at: number): string {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000))
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  return `${Math.round(h / 24)} d ago`
}

const domainName = (d: ActivityEntry['domain']) => (d === 'hiring' ? 'Shortlist' : DOMAINS[d].name)

export default function Overview() {
  useTitle('Overview')
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pt-6 md:px-8 md:pt-12">
      <h1 className="display text-[40px] md:text-[56px]">Your guard</h1>
      <p className="mt-3 max-w-[52ch] text-[16px] leading-snug text-ink-2 md:text-[17px]">
        Try the demos, write a rule in plain English, and connect the model that powers the agent and the AI judge.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 md:mt-10 md:grid-cols-12 md:gap-6">
        <ModelCard className="md:col-span-5" />
        <Activity className="md:col-span-7 md:row-span-2" />
        <PoliciesCard className="md:col-span-5" />
      </div>

      <section className="mt-10 md:mt-14" aria-labelledby="demos-h">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="demos-h" className="display text-[26px] md:text-[32px]">Demos</h2>
          <p className="font-mono text-[11px] text-ink-3">Concept demo · not affiliated</p>
        </div>
        <ul className="mt-4 grid grid-cols-1 gap-3 md:mt-5 md:grid-cols-3 md:gap-5">
          {DOMAIN_ORDER.map((id) => (
            <li key={id}>
              <Link
                to={`/app/demo/${id}`}
                className={clsx(CARD, 'group flex min-h-[72px] items-center gap-4 p-4 transition-transform duration-150 active:scale-[0.98] md:min-h-[200px] md:flex-col md:items-stretch md:gap-4 md:p-6 [@media(hover:hover)]:hover:ring-ink/25')}
              >
                <span className="flex h-10 w-12 shrink-0 items-center md:w-auto">{DOMAINS[id].logo}</span>
                <span className="min-w-0 flex-1">
                  <span className="display block text-[22px] md:text-[26px]">{id === 'hiring' ? 'Shortlist' : DOMAINS[id].name}</span>
                  <span className="mt-0.5 block text-[13.5px] leading-snug text-ink-2 md:mt-1 md:text-[15px]">{BLURB[id]}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[14px] font-medium">
                  <span className="hidden md:inline">Open</span>
                  <ArrowRight size={14} className="hidden transition-transform md:block [@media(hover:hover)]:group-hover:translate-x-0.5" />
                  <ChevronRight size={18} className="text-ink-3 md:hidden" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function ModelCard({ className }: { className?: string }) {
  const mode = useDev((s) => s.mode)
  const health = useDev((s) => s.health)
  const model = useLlm((s) => s.model)
  const baseUrl = useLlm((s) => s.baseUrl)
  const hasKey = useLlm((s) => s.apiKey.trim() !== '')
  const serverModel = health?.ok ? health.llm : null
  const connected = health?.ok === true && health.llmKey
  const name = serverModel?.model || model.trim()
  const host = serverModel?.baseHost || hostOf(baseUrl)

  if (!connected) {
    return (
      <section className={clsx(CARD, 'flex flex-col p-5 md:p-6', className)}>
        <span className="grid size-10 place-items-center rounded-full bg-paper-2 text-ink-2">
          <KeyRound size={18} />
        </span>
        <h2 className="display mt-4 text-[26px]">Connect a model</h2>
        <p className="mt-2 text-[15px] leading-snug text-ink-2">
          {health && !health.ok
            ? 'The Prahari backend is not running, so the demos use the local engine. '
            : hasKey
              ? 'Your key is saved here. Run a connection test to switch it on. '
              : 'The demos already work on the local engine. '}
          A model adds the agent&rsquo;s free chat, the AI judge and rule compiling.
        </p>
        <Link to="/app/settings" className={clsx(BTN_PRIMARY, 'mt-5 self-start')}>
          Connect a model
          <ArrowRight size={14} />
        </Link>
      </section>
    )
  }
  return (
    <section className={clsx(CARD, 'flex flex-col p-5 md:p-6', className)}>
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">Model</p>
      <h2 className="display mt-3 break-words text-[26px] leading-[1.05]">{name || 'Connected'}</h2>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-[14px]">
        <dt className="text-ink-3">Host</dt>
        <dd className="min-w-0 truncate font-mono text-[13px]">{host || 'not set'}</dd>
        <dt className="text-ink-3">Engine</dt>
        <dd>{mode === 'backend' ? 'Backend + AI judge' : 'Local engine'}</dd>
      </dl>
      <Link to="/app/settings" className={clsx(BTN_QUIET, 'mt-5 self-start')}>
        Change
      </Link>
    </section>
  )
}

function PoliciesCard({ className }: { className?: string }) {
  const rules = usePrahari((s) => s.rules)
  const lastId = usePrahari((s) => s.lastPublished)
  const custom = rules.filter((r) => r.origin === 'custom')
  const defaults = rules.filter((r) => r.origin === 'default' && r.enabled).length
  const last = rules.find((r) => r.id === lastId) ?? custom[0]
  return (
    <section className={clsx(CARD, 'flex flex-col p-5 md:p-6', className)}>
      <span className="grid size-10 place-items-center rounded-full bg-paper-2 text-ink-2">
        <BookText size={18} />
      </span>
      <h2 className="display mt-4 text-[26px]">Policies</h2>
      <p className="mt-2 text-[15px] text-ink-2">
        <span className="tabular font-medium text-ink">{custom.length}</span> custom {custom.length === 1 ? 'rule' : 'rules'} ·{' '}
        <span className="tabular font-medium text-ink">{defaults}</span> default rules on
      </p>
      {last ? (
        <p className="mt-3 rounded-[12px] bg-paper px-3.5 py-3 text-[14px] leading-snug text-ink-2">
          <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">Last published</span>
          <span className="line-clamp-3">&ldquo;{last.text}&rdquo;</span>
        </p>
      ) : (
        <p className="mt-3 text-[14px] leading-snug text-ink-3">No custom rules yet. Write one in plain English and the demos will enforce it.</p>
      )}
      <Link to="/app/policies" className={clsx(BTN_QUIET, 'mt-5 self-start')}>
        Open policies
      </Link>
    </section>
  )
}

function Activity({ className }: { className?: string }) {
  const activity = usePrahari((s) => s.activity)
  const rows = activity.slice(0, 8)
  return (
    <section className={clsx(CARD, 'p-5 md:p-6', className)} aria-labelledby="activity-h">
      <h2 id="activity-h" className="display text-[26px]">Recent activity</h2>
      {rows.length === 0 ? (
        <div className="mt-4 rounded-[14px] bg-paper px-5 py-10 text-center">
          <p className="text-[15px] font-medium">Nothing has been checked yet</p>
          <p className="mx-auto mt-1 max-w-[34ch] text-[14px] leading-snug text-ink-3">Send a message in any demo and every verdict lands here.</p>
          <Link to="/app/demo/food" className={clsx(BTN_PRIMARY, 'mt-5')}>
            Try a demo
          </Link>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-rule">
          {rows.map((a) => (
            <li key={a.id} className="flex min-h-14 items-center gap-3 py-3">
              <VerdictPill verdict={a.verdict} className="[--t-ui:12px]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px]">{a.message || a.action}</span>
                <span className="block text-[12.5px] text-ink-3">{domainName(a.domain)}</span>
              </span>
              <time className="shrink-0 font-mono text-[11.5px] text-ink-3" dateTime={new Date(a.at).toISOString()}>
                {ago(a.at)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

