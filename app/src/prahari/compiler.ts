import type { ActionType, Condition, Domain, Effect, Gate, Rule } from './types'

/**
 * Config-time translation: plain English → a rigid JSON rule.
 * In production an LLM does this once, when the admin writes the rule; the live
 * check never calls a model. Here a pattern library stands in for that LLM,
 * behind the same async signature the backend will expose.
 */

export interface CompileStage {
  id: 'read' | 'map' | 'validate' | 'conflicts'
  label: string
}

export const COMPILE_STAGES: CompileStage[] = [
  { id: 'read', label: 'Reading the sentence' },
  { id: 'map', label: 'Mapping to the rule schema' },
  { id: 'validate', label: 'Validating fields and types' },
  { id: 'conflicts', label: 'Checking against live rules' },
]

export type CompileResult =
  | { ok: true; rule: Rule; checks: string[]; conflicts: Rule[]; corrections?: string[]; model?: string; latencyMs?: number }
  | { ok: false; message: string; suggestions: string[] }

export const EXAMPLES: Record<Domain, string[]> = {
  food: [
    'Refunds over ₹300 need manager approval.',
    'Block refunds over ₹500.',
    'Escalate to a human when the customer is angry.',
  ],
  bank: [
    'Escalate any card action above ₹10,000 to a human.',
    'Block card actions unless OTP is verified.',
    'Escalate any request above ₹10,000 to a human.',
  ],
  hiring: [
    'Flag any resume with hidden text.',
    'Never shortlist a candidate scoring below 90.',
    'A recruiter must approve every candidate summary.',
  ],
}

const money = (s: string) => Number(s.replace(/[,\s]/g, '').replace(/k$/i, '000'))

function effectOf(text: string, fallback: Effect): Effect {
  if (/\b(manager|approval|approve|sign[- ]?off)\b/i.test(text)) return 'require_approval'
  if (/\b(otp|verif|2fa)\b/i.test(text)) return 'require_otp'
  if (/\b(escalate|human|agent|hand (?:off|over))\b/i.test(text)) return 'escalate'
  if (/\b(block|never|do not|don't|deny|stop|reject|flag|strip)\b/i.test(text)) return 'block'
  return fallback
}

interface Draft {
  action: ActionType | '*'
  when: Condition[]
  effect: Effect
  gate: Gate
  reason: string
}

function draft(text: string, domain: Domain): Draft | null {
  const s = text.toLowerCase()
  const amount = s.match(/(?:over|above|more than|exceed(?:ing|s)?|greater than|>)\s*(?:rs\.?|inr|₹)?\s*([\d,]+k?)/i)
  const below = s.match(/(?:below|under|less than|<)\s*(?:rs\.?|inr|₹)?\s*([\d,]+)/i)
  const count = s.match(/(\d+)\s*(?:or more\s*)?refunds?/i)

  if (domain === 'food') {
    if (/refund/.test(s) && count) {
      const n = Number(count[1])
      return { action: 'issue_refund', when: [{ field: 'refunds_7d', op: 'gte', value: n }], effect: effectOf(s, 'block'), gate: 'policy', reason: `Refund limit reached: ${n} or more in 7 days.` }
    }
    if (/refund/.test(s) && amount) {
      const n = money(amount[1])
      return { action: 'issue_refund', when: [{ field: 'amount', op: 'gt', value: n }], effect: effectOf(s, 'block'), gate: 'policy', reason: `Refunds over ₹${n.toLocaleString('en-IN')} need ${effectOf(s, 'block') === 'require_approval' ? 'a manager' : 'review'}.` }
    }
    if (/(credit|coupon|voucher|wallet)/.test(s)) {
      return { action: 'grant_credit', when: amount ? [{ field: 'amount', op: 'gt', value: money(amount[1]) }] : [], effect: effectOf(s, 'block'), gate: 'authorization', reason: 'Wallet credit is outside what the agent may do.' }
    }
    if (/(membership|swiggy one|free deliver)/.test(s)) {
      return { action: 'grant_membership', when: [], effect: effectOf(s, 'block'), gate: 'authorization', reason: 'Memberships cannot be granted by support.' }
    }
    if (/(angry|upset|frustrat|persist|abusive)/.test(s)) {
      return { action: '*', when: [{ field: 'sentiment', op: 'eq', value: 'angry' }], effect: 'escalate', gate: 'sensitivity', reason: 'Customer is upset. A human should take over.' }
    }
  }

  if (domain === 'bank') {
    if (/(transfer|send money|wire|payment)/.test(s)) {
      return { action: 'transfer_funds', when: amount ? [{ field: 'amount', op: 'gt', value: money(amount[1]) }] : [], effect: effectOf(s, 'block'), gate: 'reversibility', reason: amount ? `Transfers above ₹${money(amount[1]).toLocaleString('en-IN')} are blocked.` : 'The assistant cannot move money.' }
    }
    if (/(phone|mobile) (number)?/.test(s) && /(change|update|registered)/.test(s)) {
      return { action: 'change_registered_phone', when: [], effect: effectOf(s, 'escalate'), gate: 'authorization', reason: 'Changing the registered mobile needs a person to verify identity.' }
    }
    if (/(password|credential|login|reset)/.test(s)) {
      return { action: 'reset_credentials', when: [], effect: effectOf(s, 'block'), gate: 'authorization', reason: 'Credential resets need verified identity.' }
    }
    if (/\bcard\b/.test(s) && amount) {
      const n = money(amount[1])
      return { action: 'block_card', when: [{ field: 'amount', op: 'gt', value: n }], effect: effectOf(s, 'escalate'), gate: 'policy', reason: `Card actions above ₹${n.toLocaleString('en-IN')} need a person to review.` }
    }
    if (/\bcard\b/.test(s) && /(otp|verif)/.test(s)) {
      return { action: 'block_card', when: [{ field: 'otp_verified', op: 'is_false' }], effect: 'require_otp', gate: 'authorization', reason: 'Card actions need a verified OTP.' }
    }
    if (amount && /(request|any|every|all)/.test(s) && !/(card|transfer|account)/.test(s)) {
      const n = money(amount[1])
      return { action: '*', when: [{ field: 'amount', op: 'gt', value: n }], effect: effectOf(s, 'escalate'), gate: 'policy', reason: `Requests above ₹${n.toLocaleString('en-IN')} need a person to review.` }
    }
    if (/(other|someone else|family|another) .*account/.test(s)) {
      return { action: '*', when: [{ field: 'account_scope', op: 'neq', value: 'primary' }], effect: 'block', gate: 'authorization', reason: 'Only the primary account is in scope.' }
    }
  }

  if (domain === 'hiring') {
    if (/(hidden|white|invisible)/.test(s)) {
      return { action: '*', when: [{ field: 'hidden_text_detected', op: 'is_true' }], effect: 'block', gate: 'integrity', reason: 'Hidden text found in the resume.' }
    }
    if (/(inject|instruction|prompt)/.test(s)) {
      return { action: '*', when: [{ field: 'injection_detected', op: 'is_true' }], effect: 'block', gate: 'integrity', reason: 'Instructions to the screener found in the application.' }
    }
    if (/(summar|profile)/.test(s) && /(recruiter|human|approv)/.test(s)) {
      return { action: 'reply', when: [], effect: 'require_approval', gate: 'sensitivity', reason: 'A recruiter approves every candidate summary.' }
    }
    if (/shortlist/.test(s) && below) {
      const n = Number(below[1])
      return { action: 'shortlist_candidate', when: [{ field: 'score_visible', op: 'lt', value: n }], effect: 'block', gate: 'policy', reason: `Visible score is below ${n}.` }
    }
    if (/(recruiter|human|approve)/.test(s) && /shortlist/.test(s)) {
      return { action: 'shortlist_candidate', when: [], effect: 'require_approval', gate: 'sensitivity', reason: 'A recruiter approves every shortlist.' }
    }
  }
  return null
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function compileRule(
  text: string,
  domain: Domain,
  live: Rule[],
  onStage?: (stage: CompileStage['id']) => void,
): Promise<CompileResult> {
  for (const stage of COMPILE_STAGES) {
    onStage?.(stage.id)
    await wait(stage.id === 'map' ? 520 : 300)
  }
  const d = draft(text.trim(), domain)
  if (!d) {
    return {
      ok: false,
      message: "Couldn't turn that into a rule yet. Name the action and the limit.",
      suggestions: EXAMPLES[domain],
    }
  }
  const rule: Rule = {
    id: `custom-${domain}-${Date.now().toString(36)}`,
    domain,
    text: text.trim(),
    enabled: true,
    origin: 'custom',
    createdAt: Date.now(),
    ...d,
  }
  const conflicts = live.filter(
    (r) => r.enabled && r.domain === domain && r.action === rule.action && JSON.stringify(r.when.map((c) => c.field)) === JSON.stringify(rule.when.map((c) => c.field)),
  )
  const checks = [
    `Action "${rule.action}" exists in the ${domain} toolset`,
    rule.when.length ? `${rule.when.length} condition${rule.when.length > 1 ? 's' : ''} on known fields` : 'Applies to every call of this action',
    `Effect "${rule.effect}" maps to the ${rule.gate} gate`,
  ]
  return { ok: true, rule, checks, conflicts }
}

/** The JSON that would be stored, without UI-only fields. */
export function ruleJson(rule: Rule) {
  return { action: rule.action, conditions: rule.when, effect: rule.effect, gate: rule.gate }
}
