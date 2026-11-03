import { sanitize } from './sanitizer'
import {
  GATES,
  type Condition,
  type Domain,
  type Evaluation,
  type Facts,
  type FactValue,
  type GateResult,
  type ProposedAction,
  type Rule,
  type Verdict,
} from './types'

export interface EvaluateInput {
  domain: Domain
  message: string
  proposed: ProposedAction
  facts: Facts
}

function test(c: Condition, facts: Facts): boolean {
  const v = facts[c.field]
  switch (c.op) {
    case 'is_true': return v === true
    case 'is_false': return v === false || v === undefined
    case 'eq': return v === c.value
    case 'neq': return v !== c.value
    case 'in': return Array.isArray(c.value) && c.value.includes(v as FactValue)
    case 'gt': return typeof v === 'number' && v > Number(c.value)
    case 'gte': return typeof v === 'number' && v >= Number(c.value)
    case 'lt': return typeof v === 'number' && v < Number(c.value)
    case 'lte': return typeof v === 'number' && v <= Number(c.value)
  }
}

const RANK: Record<Verdict, number> = { allow: 0, verify: 1, escalate: 2, block: 3 }

function verdictFor(rule: Rule, facts: Facts): Verdict | null {
  switch (rule.effect) {
    case 'block': return 'block'
    case 'escalate': return 'escalate'
    case 'require_approval': return facts.approval_granted === true ? null : 'escalate'
    case 'require_otp': return facts.otp_verified === true ? null : 'verify'
  }
}

/**
 * The pre-execution check. Pure and deterministic: the same action, facts and rules
 * always give the same verdict, however the request was worded.
 */
export function evaluate({ domain, message, proposed, facts: known }: EvaluateInput, rules: Rule[]): Evaluation {
  const sanitizer = sanitize(message)
  const facts: Facts = {
    ...known,
    ...proposed.params,
    action: proposed.type,
    reversible: proposed.reversible,
    injection_detected: known.injection_detected === true || sanitizer.hits.length > 0,
  }

  const matched = rules.filter(
    (r) => r.enabled && r.domain === domain && (r.action === '*' || r.action === proposed.type) && r.when.every((c) => test(c, facts)),
  )

  let verdict: Verdict = 'allow'
  let decisive: Rule | null = null
  const firing = new Map<Rule, Verdict>()
  for (const rule of matched) {
    const v = verdictFor(rule, facts)
    if (!v) continue
    firing.set(rule, v)
    if (RANK[v] > RANK[verdict]) {
      verdict = v
      decisive = rule
    }
  }

  const gates: GateResult[] = GATES.map(({ id }) => {
    const hit = matched.filter((r) => r.gate === id)
    const live = hit.filter((r) => firing.has(r))
    if (live.length === 0) {
      return { gate: id, status: 'pass', rules: hit, note: hit.length ? 'Requirement satisfied' : 'No rule triggered' }
    }
    const worst = live.reduce((a, b) => (RANK[firing.get(b)!] > RANK[firing.get(a)!] ? b : a))
    return { gate: id, status: firing.get(worst) === 'block' ? 'fail' : 'warn', rules: live, note: worst.reason }
  })

  const reason = decisive?.reason ?? 'Inside policy. Safe to execute.'
  return { verdict, reason, gates, matched, sanitizer, facts }
}
