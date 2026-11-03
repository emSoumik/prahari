export type Domain = 'food' | 'bank' | 'hiring'

export type ActionType =
  | 'reply'
  | 'issue_refund'
  | 'grant_credit'
  | 'grant_membership'
  | 'escalate_to_human'
  | 'block_card'
  | 'raise_dispute'
  | 'transfer_funds'
  | 'change_limit'
  | 'reset_credentials'
  | 'change_registered_phone'
  | 'read_account'
  | 'rank_candidate'
  | 'shortlist_candidate'

export type FactValue = number | string | boolean

/** Everything the deterministic engine may read: the action's params merged with what Prahari knows. */
export type Facts = Record<string, FactValue>

export interface ProposedAction {
  type: ActionType
  /** Human label, e.g. "Refund ₹1,240 to UPI". */
  label: string
  params: Facts
  reversible: boolean
}

export type Gate = 'integrity' | 'authorization' | 'reversibility' | 'policy' | 'sensitivity'

export const GATES: { id: Gate; label: string; asks: string }[] = [
  { id: 'integrity', label: 'Integrity', asks: 'Is the input clean of injected instructions?' },
  { id: 'authorization', label: 'Authorization', asks: 'Is this caller allowed to do this, on this account?' },
  { id: 'reversibility', label: 'Reversibility', asks: 'Can this be undone if it is wrong?' },
  { id: 'policy', label: 'Policy', asks: 'Does it stay inside business limits?' },
  { id: 'sensitivity', label: 'Sensitivity', asks: 'Does the customer need a human?' },
]

export type Operator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'in' | 'is_true' | 'is_false'

export interface Condition {
  field: string
  op: Operator
  value?: FactValue | FactValue[]
}

export type Effect = 'block' | 'escalate' | 'require_otp' | 'require_approval'

export interface Rule {
  id: string
  domain: Domain
  /** The sentence an admin wrote (or the default's plain-English description). */
  text: string
  /** '*' applies to every action in the domain. */
  action: ActionType | '*'
  when: Condition[]
  effect: Effect
  gate: Gate
  /** Shown to the agent / customer-facing explanation. */
  reason: string
  enabled: boolean
  origin: 'default' | 'custom'
  createdAt: number
}

export type Verdict = 'allow' | 'block' | 'escalate' | 'verify'

export interface GateResult {
  gate: Gate
  status: 'pass' | 'fail' | 'warn'
  rules: Rule[]
  note: string
}

export interface SanitizerHit {
  pattern: string
  match: string
}

/** What the Ship-Of-Theseus backend added (rules on policy.yaml + an advisory LLM judge). */
export interface BackendLayer {
  verdict: 'ALLOW' | 'ALLOW_WITH_LIMITS' | 'ASK_HUMAN' | 'BLOCK'
  reasons: string[]
  decidedBy: string
  model: string
  mode: 'rules' | 'llm' | 'hybrid'
  signals: {
    intent?: string
    sensitivity?: string
    injection_suspected?: boolean
    pressure_tactics?: boolean
    abuse_likelihood?: string
    aligned?: boolean
    confidence?: number
    summary?: string
    latency_ms?: number
    judge_failed?: boolean
    model?: string
    /** One plain sentence from the AI judge on why it answered as it did. */
    reason?: string
  } | null
  handoff: { queue: string; summary: string; suggested_tone: string } | null
  customRules: string[]
  /** The AI judge errored or never answered, so only the rules decided. */
  judgeFailed?: boolean
  /** The backend call hit the client timeout; the local engine answered. */
  timedOut?: boolean
}

export interface Evaluation {
  verdict: Verdict
  reason: string
  gates: GateResult[]
  matched: Rule[]
  sanitizer: { hits: SanitizerHit[]; cleaned: string }
  facts: Facts
  backend?: BackendLayer
}

export interface Intent {
  name: string
  confidence: number
  sentiment: 'calm' | 'upset' | 'angry' | 'distressed' | 'neutral'
}

export interface Outcome {
  tone: 'loss' | 'ok' | 'warn' | 'neutral'
  title: string
  detail?: string
}

export interface Scenario {
  id: string
  domain: Domain
  /** Preset chip label. */
  label: string
  /** The message the customer / recruiter sends. */
  prompt: string
  /** Words that route free typing to this scenario. */
  keywords: string[]
  intent: Intent
  /** What Prahari's memory knows about this customer / case. */
  facts: Facts
  /** What the agent's LLM wants to do. */
  proposed: ProposedAction
  unguarded: { reply: string; outcome: Outcome | null }
  /** Guarded reply per verdict; missing verdicts fall back to the engine's reason. */
  guarded: Partial<Record<Verdict, { reply: string; outcome: Outcome | null }>>
  /** True for the case Prahari should let through, so the demo shows it is not a blanket "no". */
  genuine?: boolean
  /** Set on a scenario built on the fly from free text (not a preset). */
  free?: FreeInfo
}

/** What the agent model (or the local parser) made of a free-text message. */
export interface FreeInfo {
  source: 'llm' | 'local'
  /** Backend mode was on but the agent model failed, so the local parser answered. */
  unavailable?: boolean
  model?: string
  latencyMs?: number
  /** What the guarded agent says when Prahari stops the action. */
  safeReply: string
}

export interface TraceStep {
  id: string
  title: string
  status: 'pass' | 'fail' | 'warn' | 'info'
  detail: string
  rules?: Rule[]
}
