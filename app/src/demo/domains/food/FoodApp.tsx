import clsx from 'clsx'
import { Check, ChevronLeft, CircleCheck, IndianRupee } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Facts, Outcome, Verdict } from '../../../prahari/types'
import type { DomainAppProps, Run } from '../../shell/types'
import { GuardCard, HandoffRow, ResultCard } from '../../shell/outcomes'
import { PrahariGlyph, RiseIn, SwiggyGlyph, TypingDots, VerdictPill, useStickToBottom } from '../../shell/ui'

const ORANGE = '#FC8019'
const ORDER_ID = '8842 1937'

const ITEMS = [
  { name: 'Chicken Biryani', qty: 1, price: '₹389' },
  { name: 'Paneer 65', qty: 1, price: '₹289' },
  { name: 'Gulab Jamun', qty: 1, price: '₹129' },
]

/** Swiggy Help & Support chat for one order. Rendered once per pane. */
export default function FoodApp({ side, runs }: DomainAppProps) {
  const { scrollRef, contentRef } = useStickToBottom()
  const facts = runs.at(-1)?.scenario?.facts

  return (
    <div className="flex h-full flex-col bg-card text-[#282C3F]">
      <header className="flex h-13 shrink-0 items-center gap-2 border-b border-[#E9E9EB] px-3">
        <ChevronLeft size={20} className="text-[#3D4152]" />
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold">
          Help <span className="font-normal text-[#7E808C]">· Order #{ORDER_ID}</span>
        </p>
        <SwiggyGlyph size={20} color={ORANGE} />
      </header>

      <div className="shrink-0 px-3 pt-3">
        <OrderCard />
        <CustomerRow facts={facts} />
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div ref={contentRef} className="flex flex-col gap-3 px-3 pt-2 pb-4">
          <p className="py-1 text-center text-[11px] font-medium text-[#93959F]">Today · 9:04 PM</p>
          <AgentBubble>Hi, I'm Swiggy's support assistant. What can I help with?</AgentBubble>
          {runs.map((run) => (
            <RunView key={run.id} run={run} side={side} />
          ))}
        </div>
      </div>

      <p className="shrink-0 border-t border-[#E9E9EB] py-1.5 text-center text-[10.5px] text-[#93959F]">
        Concept demo · not affiliated with Swiggy
      </p>
    </div>
  )
}

function OrderCard() {
  return (
    <div className="rounded-[14px] p-3 ring-1 ring-inset ring-[#E9E9EB]">
      <div className="flex items-center gap-2.5">
        <div className="grid size-9 shrink-0 place-items-center rounded-[8px] bg-[#FFF1E6]">
          <span className="text-[12px] font-bold tracking-[-0.02em]" style={{ color: ORANGE }}>
            MF
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold leading-5">Meghana Foods</p>
          <p className="truncate text-[12px] leading-4 text-[#7E808C]">Koramangala</p>
        </div>
        <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-[#E8F5EC] px-2 text-[11.5px] font-medium text-[#1B8A3A]">
          <Check size={11} strokeWidth={3} />
          Delivered 8:42 PM
        </span>
      </div>
      <div className="mt-2.5 flex items-baseline justify-between gap-3 border-t border-dashed border-[#E9E9EB] pt-2 text-[12.5px] leading-[18px] text-[#7E808C]">
        <span className="truncate">{ITEMS.map((it) => it.name).join(', ')} + 2 more</span>
        <span className="shrink-0 text-[14px] font-semibold tabular text-[#282C3F]">₹1,240</span>
      </div>
    </div>
  )
}

function CustomerRow({ facts }: { facts: Facts | undefined }) {
  const refunds = typeof facts?.refunds_7d === 'number' ? facts.refunds_7d : null
  return (
    <div className="flex items-center gap-1.5 overflow-hidden py-2.5 text-[11.5px] whitespace-nowrap">
      <Chip>Customer since 2021</Chip>
      <Chip tone={refunds !== null && refunds >= 3 ? 'warn' : 'plain'}>
        Refunds this week <span className="font-semibold tabular">{refunds ?? '–'}</span>
      </Chip>
    </div>
  )
}

function Chip({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'warn' }) {
  return (
    <span
      className={clsx(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5',
        tone === 'warn' ? 'bg-[#FFF1E6] text-[#B4550B]' : 'bg-[#F2F2F4] text-[#5B5E6B]',
      )}
    >
      {children}
    </span>
  )
}

function Avatar() {
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-full" style={{ backgroundColor: ORANGE }}>
      <SwiggyGlyph size={14} color="#fff" />
    </span>
  )
}

function AgentBubble({ children, below }: { children: ReactNode; below?: ReactNode }) {
  return (
    <div className="flex items-end gap-2 pr-8">
      <Avatar />
      <div className="min-w-0">
        <div className="min-h-10 rounded-[18px] rounded-bl-[6px] bg-white px-3.5 py-2.5 text-[14px] leading-[1.45] ring-1 ring-inset ring-[#E9E9EB] shadow-[0_1px_2px_rgb(0_0_0/.04)]">
          {children}
        </div>
        {below}
      </div>
    </div>
  )
}

function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end pl-10">
      <div className="min-h-10 rounded-[18px] rounded-br-[6px] bg-[#FFEBDC] px-3.5 py-2.5 text-[14px] leading-[1.45] text-[#282C3F]">
        {children}
      </div>
    </div>
  )
}

function Typing({ checking }: { checking: boolean }) {
  return (
    <div className="flex items-end gap-2">
      <Avatar />
      <div>
        <div className="flex h-10 items-center rounded-[18px] rounded-bl-[6px] px-4 text-[#93959F] ring-1 ring-inset ring-[#E9E9EB]">
          <TypingDots />
        </div>
        <p className={clsx('mt-1 flex h-4 items-center gap-1.5 pl-1 text-[11px] font-medium text-leaf', !checking && 'invisible')}>
          <PrahariGlyph size={10} />
          Prahari is checking the action
        </p>
      </div>
    </div>
  )
}

function RunView({ run, side }: { run: Run; side: 'off' | 'on' }) {
  const facts = run.scenario?.facts
  return (
    <>
      <RiseIn>
        <UserBubble>{run.message}</UserBubble>
      </RiseIn>
      {side === 'off' ? (
        run.off.phase !== 'done' ? (
          <Typing checking={false} />
        ) : (
          <Reply reply={run.off.reply} outcome={run.off.outcome} verdict={null} side="off" facts={facts} />
        )
      ) : (
        <>
          {run.on.phase !== 'done' ? (
            <Typing checking={run.on.phase === 'checking'} />
          ) : (
            <Reply reply={run.on.reply} outcome={run.on.outcome} verdict={run.on.verdict} side="on" facts={facts} guarded={!!run.scenario} />
          )}
          {run.on.followUps.map((f) =>
            f.phase !== 'done' ? (
              <Typing key={f.id} checking={f.phase === 'checking'} />
            ) : (
              <Reply key={f.id} reply={f.reply} outcome={f.outcome} verdict={f.verdict} side="on" facts={facts} guarded />
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
  side,
  facts,
  guarded,
}: {
  reply: string
  outcome: Outcome | null
  verdict: Verdict | null
  side: 'off' | 'on'
  facts: Facts | undefined
  guarded?: boolean
}) {
  return (
    <>
      <RiseIn>
        <AgentBubble below={side === 'on' && guarded ? <VerdictPill verdict={verdict} label={verdict === 'verify' ? VERIFY_LABEL : undefined} className="mt-1.5" /> : undefined}>
          {reply}
        </AgentBubble>
      </RiseIn>
      {outcome && (
        <RiseIn delay={0.12} className="pl-9">
          <OutcomeCard outcome={outcome} verdict={side === 'on' ? verdict : null} facts={facts} />
        </RiseIn>
      )}
    </>
  )
}

/** This app has no OTP screen: a verify verdict means the customer is asked to confirm outside the chat. */
const VERIFY_LABEL = 'Needs verification'
const VERIFY_BY = 'Needs verification · sent to customer'

function OutcomeCard({ outcome, verdict, facts }: { outcome: Outcome; verdict: Verdict | null; facts: Facts | undefined }) {
  if (verdict === 'block') return <GuardCard verdict="block" title={outcome.title} detail={outcome.detail} />
  if (verdict === 'verify') return <GuardCard verdict="verify" by={VERIFY_BY} title={outcome.title} detail={outcome.detail} />
  if (verdict === 'escalate') return <Handoff outcome={outcome} facts={facts} />
  return <ResultCard outcome={outcome} icon={outcome.tone === 'loss' ? <IndianRupee size="1em" strokeWidth={2.5} /> : <CircleCheck size="1.05em" strokeWidth={2.5} />} />
}

function Handoff({ outcome, facts }: { outcome: Outcome; facts: Facts | undefined }) {
  const asks = typeof facts?.persistence === 'number' ? facts.persistence : 0
  const sentiment = typeof facts?.sentiment === 'string' ? facts.sentiment : 'upset'
  return (
    <GuardCard verdict="escalate" title={outcome.title} detail={outcome.detail} aside={<span className="text-amber"><TypingDots /></span>}>
      <HandoffRow
        avatar={<span className="grid size-9 place-items-center rounded-full bg-[#F4E4D4] text-[14px] font-semibold text-bark">P</span>}
        name="Priya"
        team="Swiggy Support"
        chips={[`Order #${ORDER_ID}`, `Sentiment: ${sentiment}`, `${asks} earlier ask${asks === 1 ? '' : 's'}`]}
      />
    </GuardCard>
  )
}
