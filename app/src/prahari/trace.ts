import { GATES, type Evaluation, type Scenario, type TraceStep } from './types'

const pct = (n: number) => `${Math.round(n * 100)}%`

/** Turns an evaluation into the ordered steps the Prahari panel streams. */
export function buildTrace(scenario: Scenario, ev: Evaluation): TraceStep[] {
  const steps: TraceStep[] = []

  steps.push({
    id: 'sanitizer',
    title: 'Phase 0 · Sanitizer',
    status: ev.sanitizer.hits.length ? 'fail' : 'pass',
    detail: ev.sanitizer.hits.length
      ? `Stripped ${ev.sanitizer.hits.length} injected instruction${ev.sanitizer.hits.length > 1 ? 's' : ''}: “${ev.sanitizer.hits[0].match}”`
      : scenario.facts.injection_detected === true || scenario.facts.hidden_text_detected === true
        ? 'Message clean · application checked at Integrity'
        : 'No injected instructions',
  })

  const free = scenario.free
  steps.push({
    id: 'intent',
    title: !free
      ? 'Intent · quarantined reader'
      : free.source === 'llm'
        ? `Agent model · ${free.model ?? 'Llama-3.1-8B'}`
        : free.unavailable
          ? 'Agent model unavailable · local parser'
          : 'Intent · local parser',
    status: free?.unavailable ? 'warn' : 'info',
    detail: [
      scenario.intent.name,
      pct(scenario.intent.confidence),
      scenario.intent.sentiment,
      free?.source === 'llm' && free.latencyMs ? `${(free.latencyMs / 1000).toFixed(1)} s` : '',
    ]
      .filter(Boolean)
      .join(' · '),
  })

  const memory = Object.entries(scenario.facts)
    .filter(([k]) => k !== 'injection_detected')
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'number' && k === 'amount' ? `₹${v.toLocaleString('en-IN')}` : String(v)}`)
  steps.push({ id: 'memory', title: 'Memory', status: 'info', detail: memory.join(' · ') || 'No history' })

  steps.push({ id: 'action', title: 'Proposed action', status: 'info', detail: `${scenario.proposed.label}${scenario.proposed.reversible ? '' : ' · irreversible'}` })

  for (const g of ev.gates) {
    const meta = GATES.find((x) => x.id === g.gate)!
    steps.push({ id: `gate-${g.gate}`, title: `${meta.label} gate`, status: g.status, detail: g.status === 'pass' ? meta.asks.replace('?', ' ✓') : g.note, rules: g.rules })
  }

  const be = ev.backend
  if (be) {
    const ruleReasons = be.reasons.filter((r) => !r.startsWith('AI ') && !r.startsWith('judge unavailable') && r !== 'no API key set')
    if (!be.timedOut) {
      steps.push({
        id: 'backend-rules',
        title: 'Backend rules · policy.yaml',
        status: be.verdict === 'BLOCK' && be.decidedBy !== 'llm' ? 'fail' : ruleReasons.some((r) => r !== 'no rule triggered') ? 'warn' : 'pass',
        detail: ruleReasons.join(' · ') || 'No rule triggered',
      })
    }
    const s = be.signals
    const failed = be.judgeFailed || s?.judge_failed
    const rulesOnly = be.mode === 'rules'
    const flags = s
      ? [
          s.injection_suspected ? 'injection suspected' : '',
          s.aligned === false ? 'not aligned with the request' : '',
          s.pressure_tactics ? 'pressure tactics' : '',
        ].filter(Boolean)
      : []
    steps.push({
      id: 'backend-judge',
      title: rulesOnly ? 'AI judge off (rules only)' : failed ? 'AI judge · unavailable' : `AI judge · ${be.model}${s?.latency_ms ? ` · ${(s.latency_ms / 1000).toFixed(1)} s` : ''}`,
      status: rulesOnly ? 'info' : failed ? 'warn' : !s ? 'info' : flags.length ? 'warn' : 'pass',
      detail: rulesOnly
        ? 'Rules decided alone'
        : failed
          ? be.timedOut
            ? 'AI judge unavailable · timed out · local rules decided'
            : 'AI judge unavailable · local rules decided'
          : !s
            ? 'No AI signals returned'
            : [
                s.reason ?? s.summary ?? 'No reason given',
                typeof s.confidence === 'number' ? `${pct(s.confidence)} confident` : '',
                [s.intent?.replace(/_/g, ' '), s.sensitivity].filter(Boolean).join(', '),
                flags.length ? flags.join(', ') : 'no flags',
              ]
                .filter(Boolean)
                .join(' · '),
    })
  }

  steps.push({
    id: 'verdict',
    title: 'Verdict',
    status: ev.verdict === 'allow' ? 'pass' : ev.verdict === 'block' ? 'fail' : 'warn',
    detail: `${ev.verdict.toUpperCase()} · ${ev.reason}`,
  })
  return steps
}
