import { compileRule, type CompileResult, type CompileStage } from './compiler'
import { evaluate, type EvaluateInput } from './engine'
import type { Domain, Evaluation, Rule } from './types'

/**
 * The one door the UI uses to reach Prahari. 'local' runs the scripted engine in the
 * browser (always available, demo-safe). 'backend' calls the Ship-Of-Theseus service on
 * localhost and falls back to local if it is unreachable. Wired in `backend.ts`.
 */
export type GuardMode = 'local' | 'backend'

export interface GuardResult extends Evaluation {
  source: 'local' | 'backend'
  /** Set when backend mode was on but the call failed and local answered instead. */
  fallbackReason?: string
  latencyMs: number
}

type BackendImpl = {
  evaluate: (input: EvaluateInput, rules: Rule[]) => Promise<Evaluation>
  compile: (text: string, domain: Domain, rules: Rule[], onStage?: (stage: CompileStage['id']) => void) => Promise<CompileResult>
}

let mode: GuardMode = 'local'
let backend: BackendImpl | null = null

export function setGuardMode(next: GuardMode) {
  mode = next
}
export function registerBackend(impl: BackendImpl) {
  backend = impl
}

export async function guard(input: EvaluateInput, rules: Rule[]): Promise<GuardResult> {
  const t0 = performance.now()
  if (mode === 'backend' && backend) {
    try {
      const ev = await backend.evaluate(input, rules)
      if (ev.backend?.timedOut) return { ...ev, source: 'local', fallbackReason: 'Backend timed out', latencyMs: performance.now() - t0 }
      return { ...ev, source: 'backend', latencyMs: performance.now() - t0 }
    } catch (e) {
      const ev = evaluate(input, rules)
      return { ...ev, source: 'local', fallbackReason: String(e), latencyMs: performance.now() - t0 }
    }
  }
  return { ...evaluate(input, rules), source: 'local', latencyMs: performance.now() - t0 }
}

export async function compile(
  text: string,
  domain: Domain,
  rules: Rule[],
  onStage?: (stage: CompileStage['id']) => void,
): Promise<CompileResult & { source: 'local' | 'backend' }> {
  if (mode === 'backend' && backend) {
    try {
      return { ...(await backend.compile(text, domain, rules, onStage)), source: 'backend' }
    } catch {
      // fall through to the local compiler
    }
  }
  return { ...(await compileRule(text, domain, rules, onStage)), source: 'local' }
}
