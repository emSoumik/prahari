import { create } from 'zustand'
import { backendChat, useDev } from '../../prahari/backend'
import { evaluate, type EvaluateInput } from '../../prahari/engine'
import { guard, type GuardResult } from '../../prahari/guard'
import { buildFreeScenario, parseIntent, type AgentAnswer } from '../../prahari/intent'
import { sanitize } from '../../prahari/sanitizer'
import { usePrahari } from '../../prahari/store'
import { buildTrace } from '../../prahari/trace'
import type { Domain, Facts, Outcome, Rule, Scenario, TraceStep } from '../../prahari/types'
import type { DomainConfig, FollowUp, Run } from './types'

/** Timing of a run, in ms. */
export const TIMING = {
  offTyping: 900,
  firstStep: 220,
  step: 260,
  onTyping: 520,
} as const

interface RunsState {
  runs: Record<Domain, Run[]>
}

/** Runs per domain. Not persisted; lives for the tab so switching domains keeps state. */
export const useRuns = create<RunsState>(() => ({ runs: { food: [], bank: [], hiring: [] } }))

const uid = () => Math.random().toString(36).slice(2, 10)
const timers: Record<Domain, Set<number>> = { food: new Set(), bank: new Set(), hiring: new Set() }

function later(domain: Domain, ms: number, fn: () => void) {
  const id = window.setTimeout(() => {
    timers[domain].delete(id)
    fn()
  }, ms)
  timers[domain].add(id)
}

const exists = (domain: Domain, id: string) => useRuns.getState().runs[domain].some((r) => r.id === id)

function patch(domain: Domain, id: string, fn: (r: Run) => Run) {
  useRuns.setState((s) => ({ runs: { ...s.runs, [domain]: s.runs[domain].map((r) => (r.id === id ? fn(r) : r)) } }))
}

function patchOn(domain: Domain, id: string, next: Partial<Run['on']>) {
  patch(domain, id, (r) => ({ ...r, on: { ...r.on, ...next } }))
}

function patchFollowUp(domain: Domain, id: string, fuId: string, next: Partial<FollowUp>) {
  patch(domain, id, (r) => ({
    ...r,
    on: { ...r.on, followUps: r.on.followUps.map((f) => (f.id === fuId ? { ...f, ...next } : f)) },
  }))
}

export function isBusy(runs: Run[]): boolean {
  return runs.some(
    (r) => r.off.phase !== 'done' || r.on.phase !== 'done' || r.on.followUps.some((f) => f.phase !== 'done'),
  )
}

export function resetRuns(domain: Domain) {
  for (const t of timers[domain]) window.clearTimeout(t)
  timers[domain].clear()
  useRuns.setState((s) => ({ runs: { ...s.runs, [domain]: [] } }))
}

/** guard() that can never leave a run stuck on "checking": any failure falls back to the local engine. */
function safeGuard(input: EvaluateInput, rules: Rule[]): Promise<GuardResult> {
  return guard(input, rules).catch((e) => {
    const t0 = performance.now()
    return { ...evaluate(input, rules), source: 'local' as const, fallbackReason: String(e), latencyMs: performance.now() - t0 }
  })
}

const backendOn = () => useDev.getState().mode === 'backend'

/** Custom rules that actually fired (not just matched), from the gates, so backend-only hits count too. */
function firingCustom(result: GuardResult): Rule[] {
  const seen = new Map<string, Rule>()
  for (const g of result.gates) {
    if (g.status === 'pass') continue
    for (const r of g.rules) if (r.origin === 'custom') seen.set(r.id, r)
  }
  return [...seen.values()]
}

/**
 * The reply and outcome the guarded agent gives for a verdict.
 * The reason (which may come from the backend) goes in the outcome detail, never in the chat reply.
 * A custom rule that fired is named in the outcome detail.
 */
function guardedResponse(scenario: Scenario, result: GuardResult): { reply: string; outcome: Outcome | null } {
  const resp = baseResponse(scenario, result)
  const customs = result.verdict === 'allow' ? [] : firingCustom(result)
  if (!customs.length || !resp.outcome) return resp
  const named = `Custom rule: ${customs.map((r) => r.text).join('; ')}`
  const detail = resp.outcome.detail && !resp.outcome.detail.includes(named) ? `${resp.outcome.detail} · ${named}` : named
  return { ...resp, outcome: { ...resp.outcome, detail } }
}

function baseResponse(scenario: Scenario, result: GuardResult): { reply: string; outcome: Outcome | null } {
  const scripted = scenario.guarded[result.verdict]
  if (scripted) return scripted
  switch (result.verdict) {
    // Prahari let it through, so the action runs exactly as it would unguarded.
    case 'allow':
      return scenario.unguarded
    case 'block':
      return {
        reply: scenario.free?.safeReply ?? "I can't do that from here, but I've passed it to our team to look at.",
        outcome: { tone: 'ok', title: 'Stopped before it ran', detail: result.reason },
      }
    case 'escalate':
      return {
        reply: scenario.free?.safeReply ?? "I'm bringing in a teammate who can take this further.",
        outcome: { tone: 'warn', title: 'Handed to a person', detail: result.reason },
      }
    case 'verify':
      return {
        reply: "Before I go ahead, I need to confirm it's you.",
        outcome: { tone: 'warn', title: 'Verification needed', detail: result.reason },
      }
  }
}

/** The visible "reading, then checking" pause before the trace streams: 1.1 to 1.8 s, a little different each time. */
function reasoningDelays(): [number, number] {
  const total = 1100 + Math.random() * 700
  const first = total * (0.4 + Math.random() * 0.15)
  return [first, total - first]
}

const pause = (domain: Domain, ms: number) => new Promise<void>((res) => later(domain, ms, res))

/** Streams `count` trace steps, then a short typing beat, then calls `finish`. */
function stream(domain: Domain, runId: string, count: number, onStep: (n: number) => void, onTyping: () => void, finish: () => void) {
  for (let i = 1; i <= count; i++) {
    later(domain, TIMING.firstStep + (i - 1) * TIMING.step, () => onStep(i))
  }
  const end = TIMING.firstStep + Math.max(0, count - 1) * TIMING.step + 200
  later(domain, end, () => {
    if (!exists(domain, runId)) return
    onTyping()
    later(domain, TIMING.onTyping, finish)
  })
}

function logResult(domain: Domain, message: string, scenario: Scenario, result: GuardResult) {
  usePrahari.getState().log({
    domain,
    message,
    action: scenario.proposed.type,
    verdict: result.verdict,
    reason: result.reason,
    ruleIds: result.matched.map((r) => r.id),
  })
}

/** The last few exchanges in this domain, for the agent model. */
function history(domain: Domain, exceptId: string): { role: 'user' | 'agent'; text: string }[] {
  return useRuns
    .getState()
    .runs[domain].filter((r) => r.id !== exceptId && r.off.phase === 'done')
    .slice(-3)
    .flatMap((r) => [
      { role: 'user' as const, text: r.message },
      { role: 'agent' as const, text: r.off.reply },
    ])
}

/** Free text: the domain's agent model proposes an action (backend), or the local parser does. */
async function freeScenario(config: DomainConfig, id: string, message: string): Promise<Scenario> {
  const domain = config.id
  const local = () => parseIntent(domain, message, config.genericReply, config.chatContext)
  let answer: AgentAnswer
  if (backendOn()) {
    try {
      answer = await backendChat(domain, message, history(domain, id), config.chatContext)
    } catch {
      answer = { ...local(), unavailable: true }
    }
  } else {
    answer = local()
  }
  const injected = sanitize(message).hits.length > 0
  return buildFreeScenario(domain, id, message, answer, config.baseFacts, injected, config.chatContext)
}

/** Posts one message into both panes of a domain and plays the run out. */
export function sendMessage(config: DomainConfig, text: string) {
  const message = text.trim()
  if (!message) return
  const domain = config.id

  // Only the exact preset text (or its chip label) plays the scripted case; anything else is free text.
  const lower = message.toLowerCase()
  const preset = config.scenarios.find((s) => s.prompt.toLowerCase() === lower || s.label.toLowerCase() === lower) ?? null

  const id = uid()
  const run: Run = {
    id,
    scenario: preset,
    message,
    off: { phase: 'typing', reply: '', outcome: null },
    on: { phase: 'checking', stage: 'intent', trace: [], revealed: 0, reply: '', outcome: null, verdict: null, followUps: [] },
  }
  useRuns.setState((s) => ({ runs: { ...s.runs, [domain]: [...s.runs[domain], run] } }))

  const scenarioP = preset ? Promise.resolve(preset) : freeScenario(config, id, message)
  void play(config, id, message, scenarioP)
}

async function play(config: DomainConfig, id: string, message: string, scenarioP: Promise<Scenario>) {
  const domain = config.id
  const [readMs, checkMs] = reasoningDelays()

  // Unguarded: the agent just does what it was asked.
  void Promise.all([pause(domain, TIMING.offTyping), scenarioP]).then(([, sc]) => {
    if (!exists(domain, id)) return
    patch(domain, id, (r) => ({ ...r, scenario: r.scenario ?? sc, off: { phase: 'done', reply: sc.unguarded.reply, outcome: sc.unguarded.outcome } }))
  })

  // Guarded, step 1: the agent reads the message (for free text, the model answers here).
  const [, scenario] = await Promise.all([pause(domain, readMs), scenarioP])
  if (!exists(domain, id)) return
  patch(domain, id, (r) => ({
    ...r,
    scenario,
    ...(backendOn() ? { pendingSource: 'backend' as const, pendingSince: Date.now() } : {}),
    on: { ...r.on, stage: 'rules' },
  }))

  // Guarded, step 2: Prahari checks the proposed action before anything runs.
  const rules = usePrahari.getState().rules
  const guardP = safeGuard({ domain, message, proposed: scenario.proposed, facts: scenario.facts }, rules)
  const [result] = await Promise.all([guardP, pause(domain, checkMs)])
  if (!exists(domain, id)) return
  const trace = buildTrace(scenario, result)
  patch(domain, id, (r) => ({ ...r, pendingSource: undefined, pendingSince: undefined, on: { ...r.on, stage: undefined, result, trace } }))
  logResult(domain, message, scenario, result)
  const { reply, outcome } = guardedResponse(scenario, result)
  stream(
    domain,
    id,
    trace.length,
    (n) => patchOn(domain, id, { revealed: n }),
    () => patchOn(domain, id, { phase: 'typing' }),
    () => patchOn(domain, id, { phase: 'done', reply, outcome, verdict: result.verdict }),
  )
}

/**
 * Step-up verification: re-runs the guard for a run with `otp_verified = true`
 * (other facts, including `approval_granted`, stay as they were) and appends the
 * new verdict and reply to the run as a FollowUp.
 */
export function verifyRun(config: DomainConfig, runId: string) {
  const domain = config.id
  const run = useRuns.getState().runs[domain].find((r) => r.id === runId)
  if (!run || !run.scenario || run.on.phase !== 'done') return
  if (run.on.followUps.some((f) => f.phase !== 'done')) return

  const scenario = run.scenario
  const facts: Facts = { ...scenario.facts, otp_verified: true }
  const fuId = uid()
  const fu: FollowUp = {
    id: fuId,
    label: 'OTP verified',
    phase: 'checking',
    trace: [],
    revealed: 0,
    reply: '',
    outcome: null,
    verdict: null,
    ...(backendOn() ? { pendingSource: 'backend' as const, pendingSince: Date.now() } : {}),
  }
  patch(domain, runId, (r) => ({ ...r, on: { ...r.on, followUps: [...r.on.followUps, fu] } }))

  const rules = usePrahari.getState().rules
  void safeGuard({ domain, message: run.message, proposed: scenario.proposed, facts }, rules).then((result) => {
    if (!exists(domain, runId)) return
    const verified = { ...scenario, facts }
    const trace: TraceStep[] = [
      { id: 'recheck', title: 'Re-check', status: 'pass', detail: 'otp_verified: true · same action, same rules' },
      ...buildTrace(verified, result).filter((s) => s.id.startsWith('gate-') || s.id === 'backend-judge' || s.id === 'verdict'),
    ]
    patchFollowUp(domain, runId, fuId, { result, trace, pendingSource: undefined, pendingSince: undefined })
    logResult(domain, run.message, scenario, result)
    const { reply, outcome } = guardedResponse(scenario, result)
    stream(
      domain,
      runId,
      trace.length,
      (n) => patchFollowUp(domain, runId, fuId, { revealed: n }),
      () => patchFollowUp(domain, runId, fuId, { phase: 'typing' }),
      () => patchFollowUp(domain, runId, fuId, { phase: 'done', reply, outcome, verdict: result.verdict }),
    )
  })
}
