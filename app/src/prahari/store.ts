import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_RULES } from './rules'
import type { Domain, Rule, Verdict } from './types'

export interface ActivityEntry {
  id: string
  at: number
  domain: Domain
  message: string
  action: string
  verdict: Verdict
  reason: string
  ruleIds: string[]
}

interface PrahariState {
  rules: Rule[]
  activity: ActivityEntry[]
  /** Id of the rule published most recently, so demos can point at it. */
  lastPublished: string | null
  addRule: (rule: Rule) => void
  toggleRule: (id: string) => void
  removeRule: (id: string) => void
  resetRules: () => void
  log: (entry: Omit<ActivityEntry, 'id' | 'at'>) => void
  clearActivity: () => void
}

// Declared before create(): persist hydrates synchronously inside it, and merge() reads these.
const DOMAINS = ['food', 'bank', 'hiring']
const EFFECTS = ['block', 'escalate', 'require_otp', 'require_approval']
const GATE_IDS = ['integrity', 'authorization', 'reversibility', 'policy', 'sensitivity']

export const usePrahari = create<PrahariState>()(
  persist(
    (set) => ({
      rules: DEFAULT_RULES,
      activity: [],
      lastPublished: null,
      addRule: (rule) =>
        set((s) => (s.rules.some((r) => r.id === rule.id) ? s : { rules: [rule, ...s.rules], lastPublished: rule.id })),
      toggleRule: (id) => set((s) => ({ rules: s.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)) })),
      removeRule: (id) => set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),
      resetRules: () => set({ rules: DEFAULT_RULES, lastPublished: null }),
      log: (entry) =>
        set((s) => ({
          activity: [{ ...entry, id: Math.random().toString(36).slice(2), at: Date.now() }, ...s.activity].slice(0, 50),
        })),
      clearActivity: () => set({ activity: [] }),
    }),
    {
      name: 'prahari-rules-v1',
      version: 3,
      // everything is rebuilt defensively in `merge`, so older saves are passed through as they are
      migrate: (persisted) => persisted as PrahariState,
      partialize: (s) => ({ rules: s.rules, activity: s.activity, lastPublished: s.lastPublished }),
      // Default rules always come from code (only their on/off flag is kept), so a stale or corrupt
      // save can never change what a default rule does. Stored custom rules must pass a shape check.
      merge: (persisted, current) => {
        try {
          const p = (persisted ?? {}) as Partial<PrahariState>
          const stored = Array.isArray(p.rules) ? p.rules.filter((r): r is Rule => !!r && typeof r === 'object') : []
          const flags = new Map(stored.filter((r) => r.origin === 'default').map((r) => [r.id, r.enabled]))
          const defaults = DEFAULT_RULES.map((r) => ({ ...r, enabled: typeof flags.get(r.id) === 'boolean' ? (flags.get(r.id) as boolean) : r.enabled }))
          const seen = new Set(defaults.map((r) => r.id))
          const custom = stored.filter((r) => {
            if (r.origin !== 'custom' || !isRule(r) || seen.has(r.id)) return false
            seen.add(r.id)
            return true
          })
          return {
            ...current,
            rules: [...custom, ...defaults],
            activity: Array.isArray(p.activity) ? p.activity.filter(isActivity).slice(0, 50) : [],
            lastPublished: typeof p.lastPublished === 'string' ? p.lastPublished : null,
          }
        } catch {
          return current
        }
      },
    },
  ),
)

function isRule(r: unknown): r is Rule {
  const x = r as Rule
  return (
    !!x &&
    typeof x.id === 'string' &&
    DOMAINS.includes(x.domain) &&
    typeof x.text === 'string' &&
    typeof x.action === 'string' &&
    Array.isArray(x.when) &&
    x.when.every((c) => !!c && typeof c.field === 'string' && typeof c.op === 'string') &&
    EFFECTS.includes(x.effect) &&
    GATE_IDS.includes(x.gate) &&
    typeof x.reason === 'string' &&
    typeof x.enabled === 'boolean'
  )
}

function isActivity(a: unknown): a is ActivityEntry {
  const x = a as ActivityEntry
  return !!x && typeof x.id === 'string' && typeof x.at === 'number' && DOMAINS.includes(x.domain) && typeof x.verdict === 'string' && Array.isArray(x.ruleIds)
}

// A rule published (or removed) in another tab arrives here, so this tab's next log() can't write stale rules back.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'prahari-rules-v1') void usePrahari.persist.rehydrate()
  })
}
