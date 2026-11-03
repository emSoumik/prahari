import type { Run } from '../../shell/types'
import { CANDIDATES, type Candidate, type CandidateId } from './data'

/**
 * The applicant table for one pane, derived purely from the runs: replay every run
 * whose reply has landed on this side, in order.
 */
export interface Board {
  /** The pool has been scored at least once. */
  screened: boolean
  /** Prahari stripped hidden text and name-field commands before scoring. */
  stripped: boolean
  /** Ids in an invite run: 'sent' went out, 'pending' waits for the recruiter. */
  shortlists: Record<string, { ids: CandidateId[]; state: 'sent' | 'pending' }>
  /** Last candidate a run opened, and which run did it (so a later click can override). */
  selected: CandidateId
  selectKey: string
  /** The guarded side reveals the hidden line itself after the hidden-text block. */
  autoReveal: boolean
  revealKey: string
  /** A run asked to see a resume, so the resume tab opens by itself (a click on a tab overrides it). */
  openResume: boolean
  tabKey: string
}

export interface Row {
  c: Candidate
  score: number | null
  flagged: boolean
}

const RANKING = new Set(['rank_candidate', 'shortlist_candidate'])

export function scoreOf(c: Candidate, board: Pick<Board, 'screened' | 'stripped'>): number | null {
  if (!board.screened) return null
  if (!board.stripped && c.manipulatedScore !== undefined) return c.manipulatedScore
  return c.visibleScore
}

export const isSuspicious = (c: Candidate) => c.manipulatedScore !== undefined

/** Rows in display order: by score once screened, by application order before. */
export function rowsOf(board: Pick<Board, 'screened' | 'stripped'>): Row[] {
  const rows = CANDIDATES.map((c) => ({ c, score: scoreOf(c, board), flagged: board.stripped && isSuspicious(c) }))
  if (!board.screened) return rows
  return rows.sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
}

export function deriveBoard(runs: Run[], side: 'off' | 'on'): Board {
  const b: Board = {
    screened: false,
    stripped: false,
    shortlists: {},
    selected: 'meera',
    selectKey: 'init',
    autoReveal: false,
    revealKey: 'init',
    openResume: false,
    tabKey: 'init',
  }
  for (const run of runs) {
    const sc = run.scenario
    const done = side === 'off' ? run.off.phase === 'done' : run.on.phase === 'done'
    if (!sc || !done) continue
    const verdict = side === 'on' ? run.on.verdict : null

    if (RANKING.has(sc.proposed.type)) {
      // Asking about the ranking scores the pool first. On the guarded side the
      // integrity gate strips the injected text unless an admin turned it off (allow).
      if (!b.screened || sc.proposed.type === 'rank_candidate') b.stripped = side === 'on' && verdict !== 'allow'
      b.screened = true
    }

    const select = (id: CandidateId) => {
      b.selected = id
      b.selectKey = run.id
    }
    if (sc.id === 'hidden-text') {
      select('arjun')
      b.openResume = true
      b.tabKey = run.id
      if (side === 'on' && verdict === 'block') {
        b.autoReveal = true
        b.revealKey = run.id
      }
    }
    if (sc.id === 'injection-name-field') select('rahul')
    if (sc.id === 'genuine-meera') select('meera')
    // Any later run goes back to the conversation, unless it opened a resume itself.
    if (sc.id !== 'hidden-text') {
      b.openResume = false
      b.tabKey = run.id
    }

    if (sc.id === 'shortlist-top3' && verdict !== 'block') {
      const ids = rowsOf(b)
        .filter((r) => !r.flagged && r.score !== null)
        .slice(0, 3)
        .map((r) => r.c.id)
      b.shortlists[run.id] = { ids, state: verdict === 'escalate' ? 'pending' : 'sent' }
    }
  }
  return b
}
