import type { Run } from './types'
import { TypingDots, VerdictPill } from './ui'

/** The latest verdict of the guarded pane, or "Checking" while it is still running. */
export function HeaderVerdict({ run }: { run: Run | undefined }) {
  if (!run) return null
  const fu = run.on.followUps.at(-1)
  const phase = fu ? fu.phase : run.on.phase
  if (phase !== 'done') {
    return (
      <span className="inline-flex h-[2.1em] items-center gap-2 rounded-full bg-paper-2 px-[0.9em] text-(length:--t-ui) font-medium text-ink-2">
        <TypingDots /> Checking
      </span>
    )
  }
  return <VerdictPill verdict={fu ? fu.verdict : run.on.verdict} />
}
