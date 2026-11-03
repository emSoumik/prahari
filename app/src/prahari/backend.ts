import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CompileStage } from './compiler'
import { evaluate, type EvaluateInput } from './engine'
import { registerBackend, setGuardMode, type GuardMode } from './guard'
import type { AgentAnswer, ChatContext } from './intent'
import { usePrahari } from './store'
import type { ActionType, BackendLayer, Domain, Evaluation, GateResult, Rule, Verdict } from './types'

/**
 * Adapter for the Ship-Of-Theseus FastAPI backend (proxied at /api by Vite).
 * The browser's deterministic engine always runs too; the final verdict is the stricter of
 * the two, so turning the backend on can only add protection, never remove it.
 */

type JudgeMode = 'rules' | 'hybrid'

interface Exchange {
  at: number
  path: string
  request: unknown
  response: unknown
  ms: number
  ok: boolean
}

interface DevState {
  mode: GuardMode
  judge: JudgeMode
  health: { ok: boolean; llmKey: boolean; checkedAt: number } | null
  log: Exchange[]
  setMode: (m: GuardMode) => void
  setJudge: (j: JudgeMode) => void
  checkHealth: () => Promise<void>
  record: (e: Exchange) => void
  clearLog: () => void
}

export const useDev = create<DevState>()(
  persist(
    (set, get) => ({
      mode: 'local',
      judge: 'hybrid',
      health: null,
      log: [],
      setMode: (mode) => {
        setGuardMode(mode)
        set({ mode })
        if (mode === 'backend') void syncRules(usePrahari.getState().rules)
      },
      setJudge: (judge) => set({ judge }),
      checkHealth: async () => {
        const wasOk = get().health?.ok === true
        let ok = false
        try {
          const r = await fetch('/api/health', { signal: AbortSignal.timeout(2500) })
          const j = await r.json()
          ok = r.ok && !!j.ok
          set({ health: { ok, llmKey: !!j.llm_key_set, checkedAt: Date.now() } })
        } catch {
          set({ health: { ok: false, llmKey: false, checkedAt: Date.now() } })
        }
        // the server came (back) up: it may have restarted and lost the published rules
        if (ok && !wasOk && get().mode === 'backend') void syncRules(usePrahari.getState().rules)
      },
      record: (e) => set((s) => ({ log: [e, ...s.log].slice(0, 20) })),
      clearLog: () => set({ log: [] }),
    }),
    { name: 'prahari-dev-v1', partialize: (s) => ({ mode: s.mode, judge: s.judge }) },
  ),
)

async function call<T>(path: string, init: RequestInit & { body?: string }, timeoutMs = 30000): Promise<T> {
  const t0 = performance.now()
  const request = init.body ? JSON.parse(init.body) : null
  try {
    const r = await fetch(path, {
      ...init,
      headers: { 'content-type': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    })
    const response = await r.json().catch(() => null)
    useDev.getState().record({ at: Date.now(), path, request, response, ms: performance.now() - t0, ok: r.ok })
    if (!r.ok) throw new Error((response as { detail?: string })?.detail ?? `HTTP ${r.status}`)
    return response as T
  } catch (e) {
    if (!(e instanceof Error && e.message.startsWith('HTTP'))) {
      useDev.getState().record({ at: Date.now(), path, request, response: String(e), ms: performance.now() - t0, ok: false })
    }
    throw e
  }
}

// `reply` is read-only: db.read is allowed for every role in policy.yaml (message.send is not allowed for support).
const TOOLS: Record<ActionType, { tool: string; role: string }> = {
  reply: { tool: 'db.read', role: 'support' },
  issue_refund: { tool: 'refund.issue', role: 'support' },
  grant_credit: { tool: 'wallet.credit', role: 'support' },
  grant_membership: { tool: 'membership.grant', role: 'support' },
  escalate_to_human: { tool: 'ticket.create', role: 'support' },
  block_card: { tool: 'card.block', role: 'banking' },
  raise_dispute: { tool: 'dispute.raise', role: 'banking' },
  transfer_funds: { tool: 'payment.transfer', role: 'banking' },
  change_limit: { tool: 'account.change_limit', role: 'banking' },
  reset_credentials: { tool: 'account.reset_credentials', role: 'banking' },
  change_registered_phone: { tool: 'account.update_phone', role: 'banking' },
  read_account: { tool: 'db.read', role: 'banking' },
  rank_candidate: { tool: 'candidate.rank', role: 'recruiter' },
  shortlist_candidate: { tool: 'candidate.shortlist', role: 'recruiter' },
}

const ROLES: Record<Domain, string> = { food: 'support', bank: 'banking', hiring: 'recruiter' }

const GOALS: Record<Domain, string> = {
  food: "Handle this customer's support request for their Swiggy order.",
  bank: 'Help the signed-in customer with their own HDFC Bank account.',
  hiring: 'Screen applicants for the Senior Frontend Engineer role and rank them on merit.',
}

function toBackendAction({ domain, message, proposed, facts }: EvaluateInput) {
  const map = TOOLS[proposed.type]
  const tool = proposed.type === 'read_account' && facts.account_scope !== 'primary' ? 'account.read_other' : map.tool
  return {
    tool,
    role: proposed.type === 'reply' ? ROLES[domain] : map.role,
    params: proposed.params,
    user_goal: GOALS[domain],
    instruction_source: 'user',
    customer_message: message,
    customer: { id: `${domain}-demo`, refunds_7d: facts.refunds_7d ?? 0, refused_attempts: facts.persistence ?? 0, account_age_days: 400 },
    auth: { step_up_verified: facts.otp_verified === true },
    // read by custom_rules.apply on the backend
    domain,
    frontend_action: proposed.type,
    facts,
  }
}

const RANK: Record<Verdict, number> = { allow: 0, verify: 1, escalate: 2, block: 3 }
const FROM_BACKEND: Record<BackendLayer['verdict'], Verdict> = { ALLOW: 'allow', ALLOW_WITH_LIMITS: 'allow', ASK_HUMAN: 'escalate', BLOCK: 'block' }

interface BackendEval {
  verdict: BackendLayer['verdict']
  reasons: string[]
  decided_by: string
  signals: BackendLayer['signals']
  handoff: BackendLayer['handoff']
  custom_rules?: string[]
  model?: string
}

/** Judge-originated reason strings (the failure reason is unprefixed, e.g. "judge unavailable: Timeout"). */
const isJudgeReason = (r: string) => r.startsWith('AI ') || r.startsWith('judge unavailable') || r === 'no API key set'

const BACKEND_TIMEOUT_MS = 20000

async function backendEvaluate(input: EvaluateInput, rules: Rule[]): Promise<Evaluation> {
  const local = evaluate(input, rules)
  const judge = useDev.getState().judge
  let res: BackendEval
  try {
    res = await call<BackendEval>('/api/evaluate', { method: 'POST', body: JSON.stringify({ mode: judge, action: toBackendAction(input) }) }, BACKEND_TIMEOUT_MS)
  } catch (e) {
    if (e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
      // the local verdict stands; the panel can say the AI judge never answered
      const backend: BackendLayer = {
        verdict: 'ALLOW',
        reasons: [],
        decidedBy: 'timeout',
        model: 'Llama-3.1-8B',
        mode: judge,
        signals: null,
        handoff: null,
        customRules: [],
        judgeFailed: true,
        timedOut: true,
      }
      return { ...local, backend }
    }
    throw e
  }
  const judgeFailed = res.signals?.judge_failed === true
  // Custom rules the server fired by id. The local engine usually matched the same ones; when it did not
  // (the server saw the rule first), they are added so the trace, the verdict card and the outcome name them.
  const hitRules = (res.custom_rules ?? []).map((id) => rules.find((r) => r.id === id)).filter((r): r is Rule => !!r)
  const extra = hitRules.filter((r) => !local.matched.some((m) => m.id === r.id))
  const firingLocal = new Set(local.gates.flatMap((g) => (g.status === 'pass' ? [] : g.rules.map((r) => r.id))))
  const unseen = hitRules.filter((r) => !firingLocal.has(r.id))
  if (unseen.length) {
    local.matched = [...local.matched, ...extra]
    local.gates = local.gates.map((g): GateResult => {
      const mine = unseen.filter((r) => r.gate === g.gate)
      if (!mine.length) return g
      const blocks = mine.some((r) => r.effect === 'block')
      return { ...g, status: blocks ? 'fail' : g.status === 'fail' ? 'fail' : 'warn', rules: [...g.rules.filter((r) => !mine.some((m) => m.id === r.id)), ...mine], note: mine[0].reason }
    })
  }
  const backend: BackendLayer = {
    verdict: res.verdict,
    reasons: res.reasons,
    decidedBy: res.decided_by,
    model: res.model ?? res.signals?.model ?? 'Llama-3.1-8B',
    mode: judge,
    signals: res.signals,
    handoff: res.handoff,
    customRules: res.custom_rules ?? [],
    judgeFailed,
  }
  // An escalation that only the AI judge produced (or the fail-closed default when it was down)
  // is advisory: it must not hide a local verdict, and a local verify keeps its OTP flow.
  const judgeOnly = res.decided_by === 'llm' || res.decided_by === 'fail_closed'
  let remote = FROM_BACKEND[res.verdict]
  // A verified OTP is the customer's explicit permission, which is what the judge escalates for.
  const stepUpDone = input.facts?.otp_verified === true
  if (res.decided_by === 'fail_closed' || (judgeOnly && (local.verdict === 'verify' || stepUpDone))) remote = 'allow'
  if (RANK[remote] > RANK[local.verdict]) {
    const custom = unseen.find((r) => r.effect === 'block') ?? unseen[0]
    const why = custom?.reason ?? res.reasons.find((r) => r !== 'no rule triggered' && !isJudgeReason(r)) ?? res.reasons.find((r) => r !== 'no rule triggered') ?? res.reasons[0] ?? local.reason
    return { ...local, verdict: remote, reason: why.replace(/^AI judge: /, ''), backend }
  }
  return { ...local, backend }
}

interface ChatRes {
  reply: string
  action: ActionType
  amount: number | null
  target: string | null
  intent: string
  sentiment: AgentAnswer['sentiment']
  confidence: number
  safe_reply: string
  latency_ms: number
  model: string
}

/**
 * The domain's agent model (Llama-3.1-8B, deliberately gullible) reads free text and proposes one action.
 * Throws on any failure; the caller falls back to the local parser.
 */
export async function backendChat(domain: Domain, message: string, history: { role: 'user' | 'agent'; text: string }[], context: ChatContext): Promise<AgentAnswer> {
  const res = await call<ChatRes>('/api/chat', { method: 'POST', body: JSON.stringify({ domain, message, history: history.slice(-6), context }) }, 30000)
  return {
    reply: res.reply,
    safeReply: res.safe_reply,
    action: res.action,
    amount: res.amount,
    target: res.target,
    intent: res.intent,
    sentiment: res.sentiment,
    confidence: res.confidence,
    source: 'llm',
    model: res.model,
    latencyMs: res.latency_ms,
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function backendCompile(text: string, domain: Domain, rules: Rule[], onStage?: (s: CompileStage['id']) => void) {
  onStage?.('read')
  await wait(200)
  onStage?.('map')
  const res = await call<{ rule: Omit<Rule, 'id' | 'enabled' | 'origin' | 'createdAt'>; latency_ms: number; model: string; corrections: string[] }>(
    '/api/rules/compile',
    { method: 'POST', body: JSON.stringify({ text, domain }) },
  )
  onStage?.('validate')
  await wait(250)
  onStage?.('conflicts')
  await wait(250)
  const rule: Rule = { ...res.rule, id: `custom-${domain}-${Date.now().toString(36)}`, enabled: true, origin: 'custom', createdAt: Date.now() }
  const conflicts = rules.filter(
    (r) => r.enabled && r.domain === domain && r.action === rule.action && JSON.stringify(r.when.map((c) => c.field)) === JSON.stringify(rule.when.map((c) => c.field)),
  )
  const checks = [
    `Translated by ${res.model} in ${(res.latency_ms / 1000).toFixed(1)} s`,
    `Validated against the ${domain} schema on the server`,
    ...(res.corrections.length ? [] : ['Numbers and operators match the sentence']),
  ]
  return {
    ok: true as const,
    rule,
    checks,
    conflicts,
    corrections: res.corrections,
    model: res.model,
    latencyMs: res.latency_ms,
  }
}

let pendingRules: Rule[] | null = null
let syncChain: Promise<void> = Promise.resolve()

/**
 * Publishes every custom rule to the backend, so the server enforces them too.
 * PUTs are serialized, and each one sends the newest rules, so a slow earlier request can't land last.
 */
export function syncRules(rules: Rule[]): Promise<void> {
  pendingRules = rules
  syncChain = syncChain.then(async () => {
    const latest = pendingRules
    if (!latest) return
    pendingRules = null
    const custom = latest
      .filter((r) => r.origin === 'custom')
      .map(({ id, domain, text, action, when, effect, gate, reason, enabled }) => ({ id, domain, text, action, when, effect, gate, reason, enabled }))
    try {
      await call('/api/rules', { method: 'PUT', body: JSON.stringify(custom) }, 5000)
    } catch {
      // backend offline: the browser engine still enforces every rule
    }
  })
  return syncChain
}

registerBackend({ evaluate: backendEvaluate, compile: backendCompile })
setGuardMode(useDev.getState().mode)
// A reload in backend mode must re-send rules published earlier (or while the server was down).
if (useDev.getState().mode === 'backend') void syncRules(usePrahari.getState().rules)

// Keep the server's rule set in step with the console whenever backend mode is on.
usePrahari.subscribe((s, prev) => {
  if (s.rules !== prev.rules && useDev.getState().mode === 'backend') void syncRules(s.rules)
})
