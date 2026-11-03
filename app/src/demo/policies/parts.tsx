import { ArrowRight, Briefcase } from 'lucide-react'
import clsx from 'clsx'
import { GATES, type Condition, type Domain, type Effect, type Gate, type Rule, type Verdict } from '../../prahari/types'
import { ruleJson } from '../../prahari/compiler'

export const DOMAINS: { id: Domain; name: string; brand: string }[] = [
  { id: 'food', name: 'Swiggy', brand: 'Swiggy' },
  { id: 'bank', name: 'HDFC Bank', brand: 'HDFC Bank' },
  { id: 'hiring', name: 'Hiring', brand: 'Hiring' },
]

export function DomainLogo({ domain, size = 20 }: { domain: Domain; size?: number }) {
  if (domain === 'food') {
    return (
      <span
        aria-hidden
        className="inline-block shrink-0"
        style={{
          width: size,
          height: size,
          backgroundColor: '#FC8019',
          WebkitMask: 'url(/logos/swiggy-glyph.svg) center / contain no-repeat',
          mask: 'url(/logos/swiggy-glyph.svg) center / contain no-repeat',
        }}
      />
    )
  }
  if (domain === 'bank') return <img src="/logos/hdfc.svg" alt="" width={size} height={size} className="shrink-0 object-contain" style={{ width: size, height: size }} />
  return <Briefcase aria-hidden size={size * 0.9} className="shrink-0 text-cobalt" strokeWidth={2} />
}

export const EFFECT_META: Record<Effect, { label: string; cls: string }> = {
  block: { label: 'Block', cls: 'bg-alarm-soft text-alarm' },
  escalate: { label: 'Escalate', cls: 'bg-amber-soft text-[#9A6410]' },
  require_approval: { label: 'Require approval', cls: 'bg-amber-soft text-[#9A6410]' },
  require_otp: { label: 'Require OTP', cls: 'bg-sky text-cobalt' },
}

export const VERDICT_META: Record<Verdict, { label: string; cls: string }> = {
  allow: { label: 'Allow', cls: 'bg-leaf-soft text-leaf' },
  block: { label: 'Block', cls: 'bg-alarm-soft text-alarm' },
  escalate: { label: 'Escalate', cls: 'bg-amber-soft text-[#9A6410]' },
  verify: { label: 'Verify', cls: 'bg-sky text-cobalt' },
}

const pill = 'inline-flex items-center rounded-full px-3 h-7 text-[13px] font-semibold leading-none whitespace-nowrap'

export function EffectBadge({ effect }: { effect: Effect }) {
  const m = EFFECT_META[effect]
  return <span className={clsx(pill, m.cls)}>{m.label}</span>
}

export function VerdictPill({ verdict }: { verdict: Verdict }) {
  const m = VERDICT_META[verdict]
  return <span className={clsx(pill, m.cls)}>{m.label}</span>
}

export function OriginBadge({ origin }: { origin: Rule['origin'] }) {
  return <span className={clsx(pill, origin === 'custom' ? 'bg-sky text-cobalt' : 'bg-paper-2 text-ink-2')}>{origin === 'custom' ? 'Custom' : 'Default'}</span>
}

export const gateLabel = (g: Gate) => `${GATES.find((x) => x.id === g)?.label ?? g} gate`

const OPS: Record<string, string> = { gt: '>', gte: '≥', lt: '<', lte: '≤', eq: '=', neq: '≠', in: 'in' }

function fmtValue(c: Condition) {
  const v = c.value
  if (Array.isArray(v)) return v.join(', ')
  if (typeof v === 'number') return c.field === 'amount' ? `₹${v.toLocaleString('en-IN')}` : v.toLocaleString('en-IN')
  return String(v)
}

export function conditionText(c: Condition) {
  if (c.op === 'is_true') return `${c.field} is true`
  if (c.op === 'is_false') return `${c.field} is false`
  return `${c.field} ${OPS[c.op] ?? c.op} ${fmtValue(c)}`
}

const chip = 'inline-flex items-center rounded-lg border border-rule bg-card px-2.5 h-8 text-[13px] font-mono tabular'

export function RuleChips({ rule }: { rule: Rule }) {
  const m = EFFECT_META[rule.effect]
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={clsx(chip, 'bg-paper font-medium')}>{rule.action === '*' ? 'any action' : rule.action}</span>
      {rule.when.map((c, i) => (
        <span key={i} className={chip}>{conditionText(c)}</span>
      ))}
      {rule.when.length === 0 && <span className={clsx(chip, 'text-ink-2')}>always</span>}
      <ArrowRight aria-hidden size={16} className="text-ink-3" />
      <span className={clsx('inline-flex items-center rounded-lg px-2.5 h-8 text-[13px] font-semibold', m.cls)}>{m.label}</span>
      <span className="text-[13px] text-ink-2">{gateLabel(rule.gate)}</span>
    </div>
  )
}

/** Syntax-tinted JSON. */
export function JsonView({ rule }: { rule: Rule }) {
  const text = JSON.stringify(ruleJson(rule), null, 2)
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g
  const out: React.ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1]) {
      out.push(
        m[2] ? (
          <span key={k++}><span className="text-cobalt">{m[1]}</span>{m[2]}</span>
        ) : (
          <span key={k++} className="text-leaf">{m[1]}</span>
        ),
      )
    } else if (m[3]) out.push(<span key={k++} className="text-bark">{m[3]}</span>)
    else out.push(<span key={k++} className="text-[#9A6410]">{m[4]}</span>)
    last = re.lastIndex
  }
  out.push(text.slice(last))
  return (
    <pre className="overflow-x-auto rounded-xl border border-rule bg-card p-3.5 font-mono text-[12.5px] leading-[1.6] text-ink tabular">{out}</pre>
  )
}
