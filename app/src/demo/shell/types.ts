import type { ComponentType, ReactNode } from 'react'
import type { GuardResult } from '../../prahari/guard'
import type { ChatContext } from '../../prahari/intent'
import type { Domain, Facts, Outcome, Scenario, TraceStep, Verdict } from '../../prahari/types'

/**
 * One message sent from the composer, played into both panes at once.
 *
 * - `off` is the unguarded agent: it "types" for ~900 ms, then replies and its
 *   outcome lands. Its reply/outcome always come from `scenario.unguarded`.
 * - `on` is the same agent behind Prahari: `guard()` runs immediately
 *   (`phase: 'checking'`), the trace streams in (`revealed` counts visible steps),
 *   then a short `'typing'` beat, then `'done'` with `reply`, `outcome`, `verdict`.
 * - `pendingSource` is 'backend' while `guard()` is waiting on the backend (AI judge) and no
 *   result has landed; `pendingSince` is the Date.now() when that wait began. Both clear on result.
 * - `scenario` is null only for a moment while free text waits for the agent model. Free text
 *   (anything that is not exactly a preset) becomes a scenario built on the fly (`scenario.free`),
 *   so it goes through the same guard, trace and outcome path as a preset.
 * - `on.followUps` holds re-checks appended by `onVerify(runId)` (e.g. after an OTP).
 *   Render them after the main reply, in order.
 */
export interface Run {
  id: string
  scenario: Scenario | null
  /** Exactly what the user sent (may differ from `scenario.prompt` for free text). */
  message: string
  /** Set while the guarded check is in flight against the backend; cleared when the result lands. */
  pendingSource?: 'backend'
  pendingSince?: number
  off: {
    phase: 'typing' | 'done'
    reply: string
    outcome: Outcome | null
  }
  on: {
    phase: 'checking' | 'typing' | 'done'
    /** What the checking indicator says while the agent reads and the rules run. */
    stage?: 'intent' | 'rules'
    result?: GuardResult
    trace: TraceStep[]
    revealed: number
    reply: string
    outcome: Outcome | null
    verdict: Verdict | null
    followUps: FollowUp[]
  }
}

/** A re-check of the same run with extra facts (today: `otp_verified: true`). */
export interface FollowUp {
  id: string
  /** What changed, shown in the trace, e.g. "OTP verified". */
  label: string
  phase: 'checking' | 'typing' | 'done'
  result?: GuardResult
  trace: TraceStep[]
  revealed: number
  reply: string
  outcome: Outcome | null
  verdict: Verdict | null
  /** Same as `Run.pendingSource`, for this re-check. */
  pendingSource?: 'backend'
  pendingSince?: number
}

/**
 * Props every domain app receives. The shell renders the app twice, once per pane.
 *
 * - `side`: 'off' renders `run.off`, 'on' renders `run.on` (+ `run.on.followUps`).
 * - `runs`: oldest first. Render each run as user message → agent reply (or a
 *   typing / checking indicator while the phase is not 'done') → outcome card.
 * - `onVerify(runId)`: call it from your step-up UI (e.g. an OTP sheet) when the
 *   guarded verdict is 'verify'. The shell re-runs `guard()` with
 *   `facts.otp_verified = true` and appends a FollowUp to that run.
 * - `variant`: 'slide' when embedded in the 1920×1080 deck stage.
 */
export interface DomainAppProps {
  side: 'off' | 'on'
  runs: Run[]
  onVerify: (runId: string) => void
  variant: 'page' | 'slide'
}

export interface DomainConfig {
  id: Domain
  /** Brand / product name, e.g. 'Swiggy'. */
  name: 'Swiggy' | 'HDFC Bank' | 'Hiring'
  /** Short label for the shell tab. */
  tab: string
  /** Small logo (about 16px tall) for the tab. */
  logo: ReactNode
  scenarios: Scenario[]
  App: ComponentType<DomainAppProps>
  /** Used when free text matches no scenario but the sanitizer still finds an injection. */
  injectionScenarioId: string
  /** Said when free text is a plain question and the agent proposes no action. */
  genericReply: string
  /** Facts of the domain's genuine case; free-text actions start from these. */
  baseFacts: Facts
  /** What the agent model is told about this conversation (customer, order, account, candidates). */
  chatContext: ChatContext
}
