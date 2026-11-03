import type { Scenario } from './types'

/**
 * Routes free typing to the closest scripted scenario. Exact preset text wins;
 * otherwise keywords are scored and need real evidence (a phrase, or two different words). Returns null when nothing is close enough, so the
 * caller can answer with a safe generic reply instead of breaking the demo.
 */
export function matchScenario(text: string, scenarios: Scenario[]): Scenario | null {
  const s = text.toLowerCase().trim()
  if (!s) return null
  const exact = scenarios.find((sc) => sc.prompt.toLowerCase() === s || sc.label.toLowerCase() === s)
  if (exact) return exact

  let best: Scenario | null = null
  let bestScore = 0
  for (const sc of scenarios) {
    // a keyword inside a longer matched keyword ("card" in "block my card") is the same evidence, not more
    const hit = sc.keywords.map((k) => k.toLowerCase()).filter((k) => s.includes(k))
    const distinct = hit.filter((k) => !hit.some((o) => o !== k && o.includes(k)))
    let score = 0
    for (const k of distinct) score += k.includes(' ') ? 2 : 1
    if (score > bestScore) {
      best = sc
      bestScore = score
    }
  }
  // one generic word ("wallet", "card", "policy") is not enough to pick a scenario
  return bestScore >= 2 ? best : null
}
