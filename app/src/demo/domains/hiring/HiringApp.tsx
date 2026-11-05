import clsx from 'clsx'
import { Check, ChevronDown, CircleCheck, Eye, EyeOff, ListChecks, TriangleAlert } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useMemo, useState, type ReactNode } from 'react'
import type { Outcome, Verdict } from '../../../prahari/types'
import type { DomainAppProps, Run } from '../../shell/types'
import { GuardCard, ResultCard } from '../../shell/outcomes'
import { PrahariGlyph, RiseIn, SPRING, TypingDots, VerdictPill, useStickToBottom } from '../../shell/ui'
import { deriveBoard, rowsOf, type Board, type Row } from './board'
import { HIDDEN_LINE, NAME_INJECTION, byId, type Candidate, type CandidateId } from './data'

/** A user choice that holds until a newer run changes the same thing. */
type Pinned<T> = { key: string; value: T } | null

/** "Shortlist", a recruiter ATS with AI screening. Rendered once per pane. */
export default function HiringApp({ side, runs }: DomainAppProps) {
  const board = useMemo(() => deriveBoard(runs, side), [runs, side])
  const rows = useMemo(() => rowsOf(board), [board])

  const [pickedRaw, setPicked] = useState<Pinned<CandidateId>>(null)
  const [revealRaw, setReveal] = useState<Pinned<boolean>>(null)
  const [tabRaw, setTab] = useState<Pinned<'copilot' | 'resume'>>(null)
  const [approved, setApproved] = useState<Record<string, CandidateId[]>>({})
  const picked = pickedRaw?.key === board.selectKey ? pickedRaw.value : null
  const revealPinned = revealRaw?.key === board.revealKey ? revealRaw.value : null
  const selected = picked ?? board.selected
  const reveal = revealPinned ?? board.autoReveal
  const tab = tabRaw?.key === board.tabKey ? tabRaw.value : board.openResume ? 'resume' : 'copilot'

  const status = useMemo(() => statusMap(board, approved), [board, approved])
  const select = (id: CandidateId) => {
    setPicked({ key: board.selectKey, value: id })
    setTab({ key: board.tabKey, value: 'resume' })
  }

  return (
    <div className="flex h-full flex-col bg-card text-ink">
      <AppHeader />

      <ApplicantTable
        rows={rows}
        board={board}
        status={status}
        selected={selected}
        onSelect={select}
        side={side}
        alert={side === 'on' && board.stripped ? <RecruiterAlert onOpen={select} /> : null}
      />

      <div className="flex min-h-0 flex-1 flex-col border-t border-rule">
        <WorkTabs side={side} tab={tab} onTab={(v) => setTab({ key: board.tabKey, value: v })} name={byId(selected).name} />
        <div className="relative min-h-0 flex-1">
          {tab === 'resume' ? (
            <ResumePane
              c={byId(selected)}
              reveal={reveal}
              stripped={board.stripped}
              onReveal={(v) => setReveal({ key: board.revealKey, value: v })}
            />
          ) : (
            <Copilot
              runs={runs}
              side={side}
              board={board}
              approved={approved}
              onApprove={(runId, ids) => setApproved((a) => ({ ...a, [runId]: ids }))}
            />
          )}
        </div>
      </div>

      <p className="shrink-0 border-t border-rule py-1.5 text-center text-[11px] text-ink-3">Concept demo · Shortlist is a fictional product</p>
    </div>
  )
}

/* -------------------------------------------------------------------- tabs */

function WorkTabs({ side, tab, onTab, name }: { side: 'off' | 'on'; tab: 'copilot' | 'resume'; onTab: (t: 'copilot' | 'resume') => void; name: string }) {
  const items = [
    { id: 'copilot', label: 'Copilot' },
    { id: 'resume', label: `Resume · ${name}` },
  ] as const
  return (
    <div role="tablist" className="flex h-10 shrink-0 items-stretch gap-5 px-4">
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={tab === t.id}
          onClick={() => onTab(t.id)}
          className={clsx(
            'relative flex min-w-0 items-center text-(length:--t-ui) font-semibold transition-colors duration-150 active:scale-[0.97]',
            tab === t.id ? 'text-ink' : 'text-ink-3 [@media(hover:hover)]:hover:text-ink-2',
          )}
        >
          <span className="truncate">{t.label}</span>
          {tab === t.id && <motion.span layoutId={`tab-underline-${side}`} className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-ink" transition={SPRING} />}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ header */

function ShortlistMark({ size = 22 }: { size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-[6px] bg-ink text-white" style={{ width: size, height: size }}>
      <ListChecks size={Math.round(size * 0.62)} strokeWidth={2.25} />
    </span>
  )
}

function AppHeader() {
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-rule px-4">
      <ShortlistMark />
      <div className="min-w-0 flex-1">
        <p className="truncate text-(length:--t-label) font-semibold leading-5 tracking-[-0.01em]">Senior Frontend Engineer</p>
        <p className="truncate text-(length:--t-meta) leading-4 text-ink-3">
          Bengaluru · <span className="tabular">1,284</span> applicants
        </p>
      </div>
      <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-(length:--t-meta) font-medium text-ink-2 ring-1 ring-inset ring-rule">
        <span className="size-1.5 rounded-full bg-cobalt" />
        AI screening on
      </span>
    </header>
  )
}

/* ------------------------------------------------------------ recruiter alert */

const ALERTS: { id: CandidateId; who: string; where: string; text: string }[] = [
  { id: 'arjun', who: 'Arjun Nair', where: 'Resume · white text on white', text: HIDDEN_LINE },
  { id: 'rahul', who: 'Rahul S.', where: 'Name field', text: NAME_INJECTION },
]

function RecruiterAlert({ onOpen }: { onOpen: (id: CandidateId) => void }) {
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING}
      className="relative"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="inline-flex h-8 items-center gap-2 rounded-full bg-amber-soft pr-3 pl-2.5 text-(length:--t-ui) font-semibold text-[#8A5A10] ring-1 ring-inset ring-amber/40 transition-transform duration-150 active:scale-[0.97]"
      >
        <PrahariGlyph size={11} />
        2 held for review
        <ChevronDown size={13} className={clsx('transition-transform duration-200', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ ...SPRING, duration: 0.3 }}
            className="absolute top-[calc(100%+8px)] right-0 z-30 grid w-[min(420px,80vw)] gap-2 rounded-[16px] bg-card p-2 shadow-[0_1px_2px_rgb(0_0_0/.06),0_16px_40px_-12px_rgb(0_0_0/.28)] ring-1 ring-rule"
          >
            {ALERTS.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-[10px] bg-amber-soft/60 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-(length:--t-ui) leading-[1.35]">
                    <span className="font-semibold">{a.who}</span> <span className="text-ink-3">· {a.where}</span>
                  </p>
                  <p className="mt-1 font-mono text-[11.5px] leading-[1.4] break-words text-alarm">{a.text}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onOpen(a.id)
                    setOpen(false)
                  }}
                  className="inline-flex h-8 shrink-0 items-center rounded-full bg-card px-3.5 text-(length:--t-small) font-medium ring-1 ring-inset ring-rule transition-transform duration-150 active:scale-[0.97] [@media(hover:hover)]:hover:ring-ink/25"
                >
                  Open
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* -------------------------------------------------------------------- table */

type Status = { label: string; tone: 'plain' | 'strong' | 'flag' | 'pending' | 'done' | 'sent' }

function fitLabel(score: number): string {
  if (score >= 95) return 'Recommended'
  if (score >= 85) return 'Strong fit'
  if (score >= 70) return 'Good fit'
  return 'Possible fit'
}

function statusMap(board: Board, approved: Record<string, CandidateId[]>): Record<CandidateId, Status> {
  const out = {} as Record<CandidateId, Status>
  for (const r of rowsOf(board)) {
    const id = r.c.id
    if (r.flagged) out[id] = { label: 'Held for review', tone: 'flag' }
    else if (r.score !== null) out[id] = { label: fitLabel(r.score), tone: r.score >= 95 ? 'strong' : 'plain' }
    else out[id] = { label: 'New', tone: 'plain' }
  }
  for (const [runId, s] of Object.entries(board.shortlists)) {
    for (const id of s.ids) {
      if (s.state === 'sent') out[id] = { label: 'Invite sent', tone: 'sent' }
      else if (approved[runId]?.includes(id)) out[id] = { label: 'Shortlisted', tone: 'done' }
      else if (!approved[runId]) out[id] = { label: 'Awaiting approval', tone: 'pending' }
    }
  }
  return out
}

const COLS = 'grid grid-cols-[16px_minmax(0,1fr)_72px_136px] items-center gap-3 max-md:grid-cols-[12px_minmax(0,1fr)_64px_84px] max-md:gap-2'

function ApplicantTable({
  rows,
  board,
  status,
  selected,
  onSelect,
  side,
  alert,
}: {
  rows: Row[]
  board: Board
  status: Record<CandidateId, Status>
  selected: CandidateId
  onSelect: (id: CandidateId) => void
  side: 'off' | 'on'
  alert: ReactNode
}) {
  const reduce = useReducedMotion()
  return (
    <section className="relative z-20 shrink-0">
      <div className="flex h-12 items-center justify-between px-4">
        <p className="text-(length:--t-ui) font-semibold">
          Applicants <span className="font-normal text-ink-3">· {board.screened ? (board.stripped ? 'ranked on visible content' : 'ranked by AI score') : 'newest first'}</span>
        </p>
        {alert ?? (
          <p className="text-(length:--t-meta) font-medium text-ink-3">{board.screened ? 'Scored by AI' : 'Not screened yet'}</p>
        )}
      </div>
      <div className={clsx(COLS, 'h-6 border-y border-rule bg-paper-2/50 px-4 max-md:px-3 text-[11px] font-medium text-ink-3')}>
        <span>#</span>
        <span>Candidate</span>
        <span>Score</span>
        <span>Status</span>
      </div>
      {/* On a phone the table shows four rows and scrolls, so the copilot underneath keeps room. */}
      <div className="max-md:max-h-[172px] max-md:overflow-y-auto max-md:overscroll-contain">
        {rows.map((r, i) => (
          <motion.button
            key={r.c.id}
            type="button"
            layout={reduce ? false : 'position'}
            transition={SPRING}
            onClick={() => onSelect(r.c.id)}
            aria-pressed={selected === r.c.id}
            className={clsx(
              COLS,
              'relative h-[42px] w-full border-b border-rule/60 px-4 text-left max-md:px-3',
              selected === r.c.id ? 'bg-paper-2/60' : 'bg-card [@media(hover:hover)]:hover:bg-paper-2/30',
            )}
          >
            {selected === r.c.id && <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-ink" />}
            <span className="text-(length:--t-meta) text-ink-3 tabular">{board.screened ? i + 1 : '·'}</span>
            <CandidateCell c={r.c} stripped={side === 'on' && board.stripped} />
            <ScoreCell row={r} screened={board.screened} />
            <StatusChip status={status[r.c.id]} />
          </motion.button>
        ))}
      </div>
    </section>
  )
}

function Avatar({ c, size = 26 }: { c: Candidate; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full text-[10.5px] font-semibold text-ink-2"
      style={{ width: size, height: size, backgroundColor: c.hue }}
    >
      {c.initials}
    </span>
  )
}

function CandidateCell({ c, stripped }: { c: Candidate; stripped: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar c={c} />
      <span className="min-w-0">
        <span className="flex min-w-0 items-baseline gap-1.5 text-(length:--t-ui) font-medium leading-[18px]">
          <span className="shrink-0">{c.name}</span>
          {c.nameInjection && (
            <span className={clsx('min-w-0 truncate font-mono text-[11px] font-normal', stripped ? 'text-ink-3 line-through decoration-ink-3/60' : 'text-ink-2')}>
              {c.nameInjection}
            </span>
          )}
        </span>
        <span className="block truncate text-(length:--t-meta) leading-[15px] text-ink-3">
          {c.role} · {c.company}
        </span>
      </span>
    </span>
  )
}

function ScoreCell({ row, screened }: { row: Row; screened: boolean }) {
  const { score, flagged } = row
  const note = flagged ? (score === null ? 'Held' : 'Visible only') : null
  return (
    <span className="min-w-0">
      <span className="flex items-center gap-2">
        <span className="relative h-1.5 w-9 shrink-0 overflow-hidden rounded-full bg-[#EDEDEA]">
          <motion.span
            className={clsx('absolute inset-0 origin-left rounded-full', flagged ? 'bg-amber' : 'bg-ink')}
            initial={false}
            animate={{ scaleX: (score ?? 0) / 100 }}
            transition={SPRING}
          />
        </span>
        <span className={clsx('w-6 text-(length:--t-ui) font-semibold tabular', score === null && 'font-normal text-ink-3')}>
          {score ?? '—'}
        </span>
      </span>
      {note ? (
        <span className="block truncate text-[11px] leading-[14px] text-[#8A5A10]">{note}</span>
      ) : (
        !screened && <span className="block text-[11px] leading-[14px] text-ink-3">Pending</span>
      )}
    </span>
  )
}

const CHIP: Record<Status['tone'], string> = {
  plain: 'bg-paper-2/70 text-ink-2',
  strong: 'bg-ink text-white',
  flag: 'bg-amber-soft text-[#8A5A10] ring-1 ring-inset ring-amber/40',
  pending: 'bg-card text-[#8A5A10] ring-1 ring-inset ring-amber/50',
  done: 'bg-leaf-soft text-leaf',
  sent: 'bg-sky text-cobalt',
}

function StatusChip({ status }: { status: Status }) {
  return (
    <span className={clsx('inline-flex h-6 w-fit max-w-full items-center gap-1 truncate rounded-full px-2.5 text-(length:--t-meta) font-medium', CHIP[status.tone])}>
      {status.tone === 'flag' && <TriangleAlert size={11} strokeWidth={2.25} className="shrink-0" />}
      {status.tone === 'done' && <Check size={11} strokeWidth={2.75} className="shrink-0" />}
      <span className="truncate">{status.label}</span>
    </span>
  )
}

/* ------------------------------------------------------------------- resume */

function ResumePane({ c, reveal, stripped, onReveal }: { c: Candidate; reveal: boolean; stripped: boolean; onReveal: (v: boolean) => void }) {
  return (
    <section className="absolute inset-0 flex flex-col bg-paper-2/40">
      <div className="flex h-11 shrink-0 items-center justify-end gap-2 px-4">
        <button
          type="button"
          role="switch"
          aria-checked={reveal}
          onClick={() => onReveal(!reveal)}
          className={clsx(
            'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-(length:--t-meta) font-medium ring-1 ring-inset transition-[transform,background-color] duration-150 active:scale-[0.97]',
            reveal ? 'bg-ink text-white ring-ink' : 'bg-card text-ink ring-rule [@media(hover:hover)]:hover:ring-ink/25',
          )}
        >
          {reveal ? <EyeOff size={12} /> : <Eye size={12} />}
          Reveal hidden text
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.article
            key={c.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ ...SPRING, duration: 0.3 }}
            className="rounded-[8px] bg-card px-5 py-4 shadow-[0_1px_2px_rgb(0_0_0/.06),0_6px_18px_-8px_rgb(0_0_0/.14)] ring-1 ring-rule/50"
          >
            <ResumeBody c={c} reveal={reveal} stripped={stripped} />
          </motion.article>
        </AnimatePresence>
      </div>
    </section>
  )
}

function ResumeBody({ c, reveal, stripped }: { c: Candidate; reveal: boolean; stripped: boolean }) {
  const r = c.resume
  return (
    <div className="text-(length:--t-small) leading-[1.5] text-ink-2">
      <h3 className="font-serif text-[19px] font-semibold leading-tight tracking-[-0.01em] text-ink">
        {c.name}
        {c.nameInjection && (
          <Marked show={stripped || reveal} label={stripped ? 'Name field · stripped by Prahari' : 'Name field · read by AI as an instruction'}>
            <span className={clsx('mt-0.5 block font-mono text-[11.5px] leading-[16px] font-normal tracking-normal', stripped && 'line-through')}>{c.nameInjection}</span>
          </Marked>
        )}
      </h3>
      <p className="mt-0.5 text-(length:--t-ui) text-ink">{r.headline}</p>
      <p className="font-mono text-[11px] text-ink-3">{r.contact}</p>

      <p className="mt-2.5">{r.summary}</p>
      {r.hidden && (
        <Marked show={reveal} label={stripped ? 'Invisible to people · readable by AI · stripped by Prahari' : 'Invisible to people · readable by AI'} block>
          <p style={reveal ? undefined : { color: '#fff' }} className={clsx(reveal && 'text-alarm', reveal && stripped && 'line-through decoration-alarm/50')}>
            {r.hidden}
          </p>
        </Marked>
      )}

      <p className="mt-2.5 text-[11px] font-medium text-ink-3">Experience</p>
      {r.experience.map((e) => (
        <div key={e.org + e.when} className="mt-1.5">
          <p className="flex justify-between gap-2 text-ink">
            <span className="font-semibold">
              {e.title} · {e.org}
            </span>
            <span className="shrink-0 text-ink-3 tabular">{e.when}</span>
          </p>
          <ul className="mt-0.5 list-disc pl-3.5 marker:text-ink-3">
            {e.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ))}

      <p className="mt-2.5 text-[11px] font-medium text-ink-3">Skills</p>
      <p className="mt-0.5">{r.skills.join(' · ')}</p>
    </div>
  )
}

/** Alarm marker with a dashed outline around injected text, labelled. */
function Marked({ show, label, block, children }: { show: boolean; label: string; block?: boolean; children: ReactNode }) {
  if (!show) return block ? <div className="mt-1">{children}</div> : <>{children}</>
  if (!block)
    return (
      <span className="mt-1.5 block rounded-[4px] bg-alarm-soft px-1.5 py-1 leading-[15px] outline-1 outline-dashed outline-alarm/70">
        <span className="block font-sans text-[11px] font-semibold tracking-normal text-alarm">{label}</span>
        <span className="text-alarm">{children}</span>
      </span>
    )
  return (
    <div className="mt-1.5 rounded-[4px] bg-alarm-soft px-2 py-1.5 outline-1 outline-dashed outline-alarm/70">
      <p className="mb-0.5 text-[11px] font-semibold text-alarm">{label}</p>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ copilot */

function Copilot({
  runs,
  side,
  board,
  approved,
  onApprove,
}: {
  runs: Run[]
  side: 'off' | 'on'
  board: Board
  approved: Record<string, CandidateId[]>
  onApprove: (runId: string, ids: CandidateId[]) => void
}) {
  const { scrollRef, contentRef } = useStickToBottom()
  return (
    <section className="absolute inset-0 flex flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent,black_12px)]">
        <div ref={contentRef} className="flex flex-col gap-3 px-4 pt-1 pb-4">
          <AgentBubble>I've pulled every application for this role. Ask me to screen, rank or summarise.</AgentBubble>
          {runs.map((run) => (
            <RunView key={run.id} run={run} side={side} board={board} approved={approved} onApprove={onApprove} />
          ))}
        </div>
      </div>
    </section>
  )
}

function AgentBubble({ children, below }: { children: ReactNode; below?: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 pr-4">
      <span className="mt-0.5">
        <ShortlistMark size={22} />
      </span>
      <div className="min-w-0">
        <div className="text-(length:--t-body) leading-[1.45] text-ink">{children}</div>
        {below}
      </div>
    </div>
  )
}

function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end pl-10">
      <div className="rounded-[16px] rounded-br-[5px] bg-paper-2 px-3.5 py-2 text-(length:--t-body) leading-[1.45]">{children}</div>
    </div>
  )
}

function Typing({ checking }: { checking: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <ShortlistMark size={20} />
      <span className="text-ink-3">
        <TypingDots />
      </span>
      {checking && (
        <span className="flex items-center gap-1.5 text-(length:--t-meta) font-medium text-leaf">
          <PrahariGlyph size={10} />
          Prahari is checking the action
        </span>
      )}
    </div>
  )
}

function RunView({
  run,
  side,
  board,
  approved,
  onApprove,
}: {
  run: Run
  side: 'off' | 'on'
  board: Board
  approved: Record<string, CandidateId[]>
  onApprove: (runId: string, ids: CandidateId[]) => void
}) {
  const shortlist = board.shortlists[run.id]
  const approval =
    shortlist?.state === 'pending' ? (
      <ApprovalCard ids={shortlist.ids} approved={approved[run.id]} onApprove={(ids) => onApprove(run.id, ids)} />
    ) : null
  return (
    <>
      <RiseIn>
        <UserBubble>{run.message}</UserBubble>
      </RiseIn>
      {side === 'off' ? (
        run.off.phase !== 'done' ? (
          <Typing checking={false} />
        ) : (
          <Reply reply={run.off.reply} outcome={run.off.outcome} verdict={null} guarded={false} />
        )
      ) : (
        <>
          {run.on.phase !== 'done' ? (
            <Typing checking={run.on.phase === 'checking'} />
          ) : (
            <Reply reply={run.on.reply} outcome={run.on.outcome} verdict={run.on.verdict} guarded={!!run.scenario} approval={approval} />
          )}
          {run.on.followUps.map((f) =>
            f.phase !== 'done' ? (
              <Typing key={f.id} checking={f.phase === 'checking'} />
            ) : (
              <Reply key={f.id} reply={f.reply} outcome={f.outcome} verdict={f.verdict} guarded />
            ),
          )}
        </>
      )}
    </>
  )
}

function Reply({
  reply,
  outcome,
  verdict,
  guarded,
  approval,
}: {
  reply: string
  outcome: Outcome | null
  verdict: Verdict | null
  guarded: boolean
  approval?: ReactNode
}) {
  return (
    <>
      <RiseIn>
        <AgentBubble below={guarded ? <VerdictPill verdict={verdict} label={verdict === 'verify' ? 'Needs verification' : undefined} className="mt-1.5" /> : undefined}>{reply}</AgentBubble>
      </RiseIn>
      {outcome && (
        <RiseIn delay={0.12} className="pl-8">
          {approval ?? <OutcomeCard outcome={outcome} verdict={guarded ? verdict : null} />}
        </RiseIn>
      )}
    </>
  )
}

function OutcomeCard({ outcome, verdict }: { outcome: Outcome; verdict: Verdict | null }) {
  if (verdict === 'block') return <GuardCard verdict="block" title={outcome.title} detail={outcome.detail} />
  if (verdict === 'verify') return <GuardCard verdict="verify" by="Needs verification · sent to customer" title={outcome.title} detail={outcome.detail} />
  if (verdict === 'escalate') return <GuardCard verdict={verdict} title={outcome.title} detail={outcome.detail} />
  return (
    <ResultCard
      outcome={outcome}
      icon={outcome.tone === 'loss' ? <ListChecks size="1em" strokeWidth={2.25} /> : <CircleCheck size="1.05em" strokeWidth={2.25} />}
    />
  )
}

/** The recruiter's decision. Local to the pane: approving here does not call the shell. */
function ApprovalCard({ ids, approved, onApprove }: { ids: CandidateId[]; approved?: CandidateId[]; onApprove: (ids: CandidateId[]) => void }) {
  const [editing, setEditing] = useState(false)
  const [keep, setKeep] = useState<CandidateId[]>(ids)
  const people = (approved ?? keep).map(byId)
  const names = people.map((c) => c.name).join(', ')

  if (approved)
    return (
      <div className="flex items-start gap-2 rounded-[16px] bg-leaf-soft p-(--s-inset) text-leaf ring-1 ring-inset ring-leaf/25">
        <CircleCheck size={14} strokeWidth={2.25} className="mt-px shrink-0" />
        <div className="min-w-0">
          <p className="text-(length:--t-ui) font-semibold leading-[1.3]">Approved by you · {approved.length} invites sending</p>
          <p className="mt-0.5 text-(length:--t-small) leading-[1.35] text-leaf/80">{names || 'No one selected'}</p>
        </div>
      </div>
    )

  return (
    <div className="rounded-[16px] bg-card p-(--s-inset) ring-1 ring-inset ring-amber/50">
      <div className="flex items-center gap-1.5">
        <PrahariGlyph size={12} />
        <p className="text-(length:--t-small) font-semibold text-[#8A5A10]">AI ranks. A recruiter decides.</p>
      </div>
      <p className="mt-1 text-(length:--t-label) font-semibold leading-[1.35]">
        Approve shortlist: <span className="font-normal">{editing ? `${keep.length} selected` : names}</span>
      </p>
      {editing && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ids.map((id) => {
            const on = keep.includes(id)
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => setKeep(on ? keep.filter((k) => k !== id) : ids.filter((k) => k === id || keep.includes(k)))}
                className={clsx(
                  'inline-flex h-7 items-center gap-1.5 rounded-full pr-2.5 pl-0.5 text-(length:--t-small) font-medium ring-1 ring-inset transition-transform duration-150 active:scale-[0.97]',
                  on ? 'bg-card text-ink ring-ink/40' : 'bg-paper-2 text-ink-3 ring-transparent line-through',
                )}
              >
                <Avatar c={byId(id)} size={20} />
                {byId(id).name}
              </button>
            )
          })}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={keep.length === 0}
          onClick={() => onApprove(keep)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-(length:--t-ui) font-semibold text-white transition-[transform,opacity] duration-150 active:scale-[0.97] disabled:opacity-40"
        >
          <Check size={12} strokeWidth={2.75} />
          Approve {keep.length}
        </button>
        <button
          type="button"
          onClick={() => setEditing(!editing)}
          className="inline-flex h-9 items-center rounded-full px-4 text-(length:--t-ui) font-medium ring-1 ring-inset ring-rule transition-transform duration-150 active:scale-[0.97] [@media(hover:hover)]:hover:ring-ink/25"
        >
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>
    </div>
  )
}

