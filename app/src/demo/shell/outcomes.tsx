import clsx from 'clsx'
import { TriangleAlert } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import type { Outcome, Verdict } from '../../prahari/types'
import { EASE_OUT, PrahariGlyph, SPRING, VERDICT_META } from './ui'

/**
 * Outcome cards shared by every domain app, so the left and right panes speak
 * the same visual language and land at the same rhythm.
 *
 * - `ResultCard`: what the unguarded agent actually did. A loss is heavy: the card
 *   drops in a little further and an alarm strip wipes across under it.
 * - `GuardCard`: what happened behind Prahari. Calm: a soft field, a small
 *   "Blocked by Prahari" line, then the result.
 */

const CARD = 'overflow-hidden rounded-[16px] bg-card ring-1 ring-inset'

export function ResultCard({ outcome, icon }: { outcome: Outcome; icon: ReactNode }) {
  const reduce = useReducedMotion()
  const loss = outcome.tone === 'loss'
  const warn = outcome.tone === 'warn'
  const strip = (loss || warn) && outcome.detail
  return (
    <motion.div
      className={clsx(CARD, loss ? 'ring-alarm/35' : warn ? 'ring-amber/45' : 'ring-rule')}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: loss ? 22 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, duration: loss ? 0.55 : 0.45, delay: 0.1 }}
    >
      <div className="flex items-center gap-3 p-(--s-inset)">
        <span
          className={clsx(
            'grid size-[2.2em] shrink-0 place-items-center rounded-full text-(length:--t-label)',
            loss ? 'bg-alarm-soft text-alarm' : warn ? 'bg-amber-soft text-[#9A6412]' : 'bg-leaf-soft text-leaf',
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-(length:--t-title) leading-[1.3] font-semibold text-ink tabular">{outcome.title}</p>
          {!strip && outcome.detail && <p className="mt-0.5 text-(length:--t-small) leading-[1.35] text-ink-3">{outcome.detail}</p>}
        </div>
      </div>
      {strip && (
        <motion.div
          className={clsx(
            'flex items-center gap-2 px-(--s-inset) py-[0.6em] text-(length:--t-ui) leading-[1.35] font-semibold tabular',
            loss ? 'bg-alarm text-white' : 'bg-amber-soft text-[#8A5A10]',
          )}
          initial={reduce ? { opacity: 0 } : { clipPath: 'inset(0 100% 0 0)' }}
          animate={reduce ? { opacity: 1 } : { clipPath: 'inset(0 0% 0 0)' }}
          transition={{ duration: loss ? 0.6 : 0.4, ease: EASE_OUT, delay: 0.35 }}
        >
          <TriangleAlert className="size-[1.05em] shrink-0" strokeWidth={2.5} />
          {outcome.detail}
        </motion.div>
      )}
    </motion.div>
  )
}

const FIELD: Record<Verdict, { box: string; label: string }> = {
  allow: { box: 'bg-leaf-soft ring-leaf/25', label: 'text-leaf' },
  block: { box: 'bg-leaf-soft ring-leaf/25', label: 'text-leaf' },
  escalate: { box: 'bg-amber-soft ring-amber/40', label: 'text-[#8A5A10]' },
  verify: { box: 'bg-amber-soft ring-amber/40', label: 'text-[#8A5A10]' },
}

export function GuardCard({
  verdict,
  title,
  detail,
  aside,
  by,
  children,
}: {
  verdict: Verdict
  /** Overrides the "by Prahari" line. */
  by?: string
  title: ReactNode
  detail?: ReactNode
  /** Right side of the header block, e.g. a button. */
  aside?: ReactNode
  /** Extra rows under the header block, on a card surface. */
  children?: ReactNode
}) {
  const reduce = useReducedMotion()
  const f = FIELD[verdict]
  return (
    <motion.div
      className={clsx('overflow-hidden rounded-[16px] ring-1 ring-inset', f.box)}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.1 }}
    >
      <div className="flex items-center gap-3 p-(--s-inset)">
        <div className="min-w-0 flex-1">
          <p className={clsx('flex items-center gap-1.5 text-(length:--t-small) leading-[1.3] font-semibold', f.label)}>
            <PrahariGlyph size={13} mono />
            {by ?? VERDICT_META[verdict].by}
          </p>
          <p className="mt-1 text-(length:--t-title) leading-[1.3] font-semibold text-ink tabular">{title}</p>
          {detail && <p className="mt-0.5 text-(length:--t-small) leading-[1.35] text-ink-2">{detail}</p>}
        </div>
        {aside}
      </div>
      {children && <div className="m-1 mt-0 overflow-hidden rounded-[12px] bg-card">{children}</div>}
    </motion.div>
  )
}

/** A person picking the conversation up, with what they were handed. */
export function HandoffRow({ avatar, name, team, chips }: { avatar: ReactNode; name: string; team: string; chips: string[] }) {
  return (
    <div className="p-(--s-inset) pt-[calc(var(--s-inset)*0.85)]">
      <div className="flex items-center gap-3">
        <span className="relative shrink-0">
          {avatar}
          <span className="absolute right-0 bottom-0 size-[0.6em] rounded-full bg-[#1B8A3A] ring-2 ring-card" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-(length:--t-label) leading-[1.3] font-semibold text-ink">{name}</p>
          <p className="text-(length:--t-small) leading-[1.35] text-ink-3">{team}</p>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <span key={c} className="inline-flex h-[1.9em] items-center rounded-full bg-paper-2/80 px-[0.75em] text-(length:--t-small) text-ink-2">
            {c}
          </span>
        ))}
      </div>
    </div>
  )
}
