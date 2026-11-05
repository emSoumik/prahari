import clsx from 'clsx'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  ArrowDownLeft,
  CreditCard,
  Eye,
  FileText,
  Gauge,
  Headset,
  KeyRound,
  Lock,
  Send,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  UtensilsCrossed,
  Zap,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { ActionType, Outcome, Scenario, Verdict } from '../../../prahari/types'
import type { DomainAppProps, Run } from '../../shell/types'
import { PrahariGlyph, RiseIn, SPRING, TypingDots, VerdictPill, inr, useStickToBottom } from '../../shell/ui'
import { GuardCard, HandoffRow, ResultCard } from '../../shell/outcomes'
import { OtpSheet } from './OtpSheet'

const NAVY = '#004C8F'
const RED = '#ED232A'

const ACCOUNT = '••4821'
const MOBILE = '••••7710'
const BALANCE = 124560.4

/** What has actually happened to the account on one side of the demo. */
interface AccountState {
  cardBlocked: boolean
  disputed: boolean
  sent: number
  phoneChanged: boolean
  limitRaised: boolean
}

/** HDFC Bank net banking with the assistant docked under the account. Rendered once per pane. */
export default function BankApp({ side, runs, onVerify }: DomainAppProps) {
  const { scrollRef, contentRef } = useStickToBottom()
  const state = useMemo(() => accountState(runs, side), [runs, side])
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set())
  const rootRef = useRef<HTMLDivElement>(null)
  const compact = useCompact(rootRef)

  // The OTP sheet belongs to the latest guarded run that is waiting on step-up auth.
  const latest = runs.at(-1)
  const pending =
    side === 'on' && latest && latest.on.phase === 'done' && latest.on.verdict === 'verify' && latest.on.followUps.length === 0
      ? latest
      : null
  const sheetOpen = !!pending && !dismissed.has(pending.id)

  const closeSheet = () => pending && setDismissed((s) => new Set(s).add(pending.id))
  const reopenSheet = (id: string) =>
    setDismissed((s) => {
      const next = new Set(s)
      next.delete(id)
      return next
    })

  return (
    <div ref={rootRef} className="relative flex h-full flex-col overflow-hidden bg-[#F6F7F8] text-[#1B2733]">
      <TopBar />

      <div className="shrink-0 px-3 pt-3">
        <AccountCard state={state} compact={compact} />
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent,black_14px)]">
        <div ref={contentRef} className="flex flex-col gap-3 px-3 pt-3 pb-4">
          <div className="flex items-center gap-2 py-0.5">
            <span className="h-px flex-1 bg-[#E3E7EC]" />
            <p className="text-[11px] font-medium text-[#8A95A3]">HDFC Bank Assistant · Today 9:41 AM</p>
            <span className="h-px flex-1 bg-[#E3E7EC]" />
          </div>
          <AgentBubble>Hi Ananya, I'm the HDFC Bank Assistant. I can block your card or raise a dispute.</AgentBubble>
          {runs.map((run) => (
            <RunView
              key={run.id}
              run={run}
              side={side}
              awaitingOtp={pending?.id === run.id}
              onOpenOtp={() => reopenSheet(run.id)}
            />
          ))}
        </div>
      </div>

      <p className="shrink-0 border-t border-[#E3E7EC] bg-white py-1.5 text-center text-[10.5px] text-[#8A95A3]">
        Concept demo · not affiliated with HDFC Bank
      </p>

      <AnimatePresence>
        {sheetOpen && pending && (
          <OtpSheet
            key={pending.id}
            mobile={MOBILE}
            onClose={closeSheet}
            onVerify={() => onVerify(pending.id)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/** True when the pane is short (e.g. 1440×900), so the account card shows fewer rows and the chat keeps room. */
function useCompact(ref: RefObject<HTMLElement | null>, below = 720) {
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setCompact(e.contentRect.height < below))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, below])
  return compact
}

function accountState(runs: Run[], side: 'off' | 'on'): AccountState {
  const s: AccountState = { cardBlocked: false, disputed: false, sent: 0, phoneChanged: false, limitRaised: false }
  for (const r of runs) {
    if (!r.scenario) continue
    const happened =
      side === 'off'
        ? r.off.phase === 'done'
        : (r.on.phase === 'done' && r.on.verdict === 'allow') || r.on.followUps.some((f) => f.phase === 'done' && f.verdict === 'allow')
    if (!happened) continue
    switch (r.scenario.proposed.type) {
      case 'block_card':
      case 'raise_dispute':
        s.cardBlocked = true
        s.disputed = true
        break
      case 'transfer_funds':
        s.sent += Number(r.scenario.proposed.params.amount ?? 0)
        break
      case 'change_limit':
        s.limitRaised = true
        break
      case 'change_registered_phone':
      case 'reset_credentials':
        s.phoneChanged = true
        break
    }
  }
  return s
}

/* ------------------------------------------------------------------ chrome */

function TopBar() {
  return (
    <header className="flex h-11 shrink-0 items-center gap-3 px-3" style={{ backgroundColor: NAVY }}>
      <img src="/logos/hdfc.svg" alt="HDFC Bank" className="h-[18px] w-auto" draggable={false} />
      <span className="h-4 w-px bg-white/25" />
      <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-white/85">NetBanking</p>
      <span className="shrink-0 text-[12.5px] text-white/85">Ananya Rao</span>
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/15 text-[11px] font-semibold text-white">AR</span>
    </header>
  )
}

/** The HDFC Bank mark, cropped from the full logo. */
function Avatar() {
  return (
    <span className="relative size-7 shrink-0 overflow-hidden rounded-[7px] ring-1 ring-[#E3E7EC]">
      <img src="/logos/hdfc.svg" alt="" className="absolute top-0 left-0 h-full w-auto max-w-none" draggable={false} />
    </span>
  )
}

/* ---------------------------------------------------------------- account */

const money = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

interface Tx {
  id: string
  name: string
  meta: string
  when: string
  amount: number
  icon: ReactNode
  flag?: 'suspicious' | 'loss'
}

const TXS: Tx[] = [
  { id: 'amzn', name: 'AMZN MKTP DIGITAL', meta: 'Card not present', when: '2:14 AM', amount: -18400, icon: <ShoppingBag size={14} />, flag: 'suspicious' },
  { id: 'swiggy', name: 'Swiggy', meta: 'UPI', when: 'Yesterday', amount: -642, icon: <UtensilsCrossed size={14} /> },
  { id: 'salary', name: 'Salary · Northwind Labs', meta: 'NEFT credit', when: '1 Nov', amount: 96500, icon: <ArrowDownLeft size={14} /> },
  { id: 'bescom', name: 'BESCOM', meta: 'BillPay · Electricity', when: '31 Oct', amount: -1820, icon: <Zap size={14} /> },
]

function AccountCard({ state, compact }: { state: AccountState; compact: boolean }) {
  const all: Tx[] = state.sent
    ? [{ id: 'imps', name: 'IMPS to ••9902', meta: 'New payee · no OTP', when: 'Just now', amount: -state.sent, icon: <Send size={13} />, flag: 'loss' }, ...TXS]
    : TXS
  const txs = all.slice(0, compact ? 2 : 3)

  return (
    <div className="overflow-hidden rounded-[14px] bg-white ring-1 ring-inset ring-[#E3E7EC] shadow-[0_1px_2px_rgb(16_24_40/.04)]">
      <div className="flex items-center gap-4 px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] leading-4 text-[#6B7785]">
            Savings account <span className="tabular">{ACCOUNT}</span>
          </p>
          <Balance value={BALANCE - state.sent} hit={state.sent > 0} />
          <div className="flex h-4 items-center gap-1.5 overflow-hidden text-[11.5px] leading-4 whitespace-nowrap text-[#6B7785]">
            {state.phoneChanged ? (
              <span className="font-semibold text-alarm">Registered mobile changed to ••••4210</span>
            ) : state.limitRaised ? (
              <span className="font-semibold text-alarm">Daily transfer limit raised to ₹5,00,000</span>
            ) : (
              <>
                <Smartphone size={11} className="shrink-0" />
                Registered mobile <span className="tabular">{MOBILE}</span>
              </>
            )}
          </div>
        </div>
        <DebitCard blocked={state.cardBlocked} />
      </div>

      <div className="border-t border-[#EEF1F4] px-1.5 pt-2 pb-1.5">
        <div className="flex items-baseline justify-between px-2 pb-1">
          <p className="text-[12.5px] font-semibold">Recent transactions</p>
          <p className="text-[11.5px] font-medium" style={{ color: NAVY }}>
            View all
          </p>
        </div>
        <ul>
          {txs.map((t) => (
            <TxRow key={t.id} tx={t} disputed={t.id === 'amzn' && state.disputed} />
          ))}
        </ul>
      </div>
    </div>
  )
}

function Balance({ value, hit }: { value: number; hit: boolean }) {
  const reduce = useReducedMotion()
  return (
    <div className="relative h-8 overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.p
          key={value}
          className={clsx('text-[24px] leading-8 font-semibold tracking-[-0.02em] tabular', hit && 'text-alarm')}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
          transition={SPRING}
        >
          {money(value)}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

function DebitCard({ blocked }: { blocked: boolean }) {
  const reduce = useReducedMotion()
  return (
    <div className="flex shrink-0 items-center gap-3 max-md:flex-col max-md:items-start max-md:gap-1.5">
      <div className="h-[58px] w-[92px] shrink-0" style={{ perspective: 480 }}>
      <AnimatePresence initial={false} mode="wait">
      <motion.div
        key={blocked ? 'blocked' : 'active'}
        initial={reduce ? { opacity: 0 } : { rotateY: -90 }}
        animate={reduce ? { opacity: 1 } : { rotateY: 0 }}
        exit={reduce ? { opacity: 0 } : { rotateY: 90 }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className={clsx(
          'relative h-[58px] w-[92px] overflow-hidden rounded-[9px] p-2 text-white shadow-[0_1px_2px_rgb(0_0_0/.12),0_6px_14px_-6px_rgb(0_76_143/.5)] transition-[filter] duration-500',
          blocked && 'grayscale-[.85]',
        )}
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #00335F 100%)` }}
        aria-hidden
      >
        <span className="absolute top-2 right-2 grid size-3 place-items-center" style={{ backgroundColor: RED }}>
          <span className="size-1.5 bg-white" />
        </span>
        <span className="block h-[11px] w-[15px] rounded-[2px] bg-[#E2C77A]" />
        <span className="absolute bottom-1.5 left-2 font-mono text-[9px] tracking-[0.06em] text-white/90">•••• 4821</span>
        {blocked && (
          <span className="absolute inset-0 grid place-items-center bg-[#0B1B2E]/45">
            <Lock size={16} strokeWidth={2.5} />
          </span>
        )}
      </motion.div>
      </AnimatePresence>
      </div>
      <div className="w-[88px] max-md:w-[92px]">
        <p className="text-[11.5px] leading-4 text-[#6B7785] max-md:hidden">Debit card</p>
        <p className="text-[13px] leading-5 font-semibold tabular max-md:hidden">•••• 4821</p>
        <div className="relative mt-0.5 h-5">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={blocked ? 'blocked' : 'active'}
              className={clsx(
                'absolute left-0 inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-semibold',
                blocked ? 'bg-alarm-soft text-alarm' : 'bg-[#E7F4EC] text-[#1B7F3B]',
              )}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
              transition={SPRING}
            >
              <span className={clsx('size-1.5 rounded-full', blocked ? 'bg-alarm' : 'bg-[#1B7F3B]')} />
              {blocked ? 'Blocked' : 'Active'}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function TxRow({ tx, disputed }: { tx: Tx; disputed: boolean }) {
  const credit = tx.amount > 0
  const flagged = tx.flag === 'suspicious' || tx.flag === 'loss'
  return (
    <li
      className={clsx(
        'flex h-[38px] items-center gap-2.5 rounded-[9px] px-2',
        tx.flag === 'suspicious' && !disputed && 'bg-[#FFF3F3] ring-1 ring-inset ring-alarm/20',
        tx.flag === 'suspicious' && disputed && 'bg-[#FBF5E9] ring-1 ring-inset ring-amber/30',
        tx.flag === 'loss' && 'bg-alarm-soft ring-1 ring-inset ring-alarm/30',
      )}
    >
      <span
        className={clsx(
          'grid size-7 shrink-0 place-items-center rounded-full',
          flagged ? 'bg-white text-alarm ring-1 ring-alarm/20' : credit ? 'bg-[#E7F4EC] text-[#1B7F3B]' : 'bg-[#EEF2F6] text-[#4A5868]',
        )}
      >
        {tx.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[13px] leading-4 font-semibold">
          <span className="truncate">{tx.name}</span>
          {tx.flag === 'suspicious' && (
            <span
              className={clsx(
                'inline-flex h-4 shrink-0 items-center rounded-full px-1.5 text-[10px] font-semibold',
                disputed ? 'bg-amber-soft text-[#9A6412]' : 'bg-alarm text-white',
              )}
            >
              {disputed ? 'Disputed' : 'Unusual'}
            </span>
          )}
        </p>
        <p className={clsx('truncate text-[11.5px] leading-4', flagged ? 'text-alarm/85' : 'text-[#6B7785]')}>{tx.meta}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className={clsx('text-[13px] leading-4 font-semibold tabular', credit && 'text-[#1B7F3B]', flagged && 'text-alarm')}>
          {credit ? '+' : '−'}
          {inr(Math.abs(tx.amount))}
        </p>
        <p className="text-[11px] leading-4 text-[#8A95A3]">{tx.when}</p>
      </div>
    </li>
  )
}

/* ------------------------------------------------------------------- chat */

function AgentBubble({ children, below }: { children: ReactNode; below?: ReactNode }) {
  return (
    <div className="flex items-end gap-2 pr-8">
      <Avatar />
      <div className="min-w-0">
        <div className="min-h-10 rounded-[18px] rounded-bl-[6px] bg-white px-3.5 py-2.5 text-[14px] leading-[1.45] ring-1 ring-inset ring-[#E3E7EC] shadow-[0_1px_2px_rgb(16_24_40/.04)]">
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
      <div className="min-h-10 rounded-[18px] rounded-br-[6px] px-3.5 py-2.5 text-[14px] leading-[1.45] text-white" style={{ backgroundColor: NAVY }}>
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
        <div className="flex h-10 items-center rounded-[18px] rounded-bl-[6px] bg-white px-4 text-[#8A95A3] ring-1 ring-inset ring-[#E3E7EC]">
          <TypingDots />
        </div>
        <p className={clsx('mt-1 flex h-4 items-center gap-1.5 pl-1 text-[11px] font-medium text-leaf', !checking && 'invisible')}>
          <PrahariGlyph size={10} />
          Prahari is checking
        </p>
      </div>
    </div>
  )
}

function VerifiedChip() {
  return (
    <RiseIn className="flex justify-center">
      <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-leaf-soft px-2.5 text-[11.5px] font-semibold text-leaf">
        <ShieldCheck size={12} strokeWidth={2.5} />
        Verified · OTP to {MOBILE}
      </span>
    </RiseIn>
  )
}

function RunView({ run, side, awaitingOtp, onOpenOtp }: { run: Run; side: 'off' | 'on'; awaitingOtp: boolean; onOpenOtp: () => void }) {
  const scenario = run.scenario
  return (
    <>
      <RiseIn>
        <UserBubble>{run.message}</UserBubble>
      </RiseIn>
      {side === 'off' ? (
        run.off.phase !== 'done' ? (
          <Typing checking={false} />
        ) : (
          <Reply reply={run.off.reply} outcome={run.off.outcome} verdict={null} side="off" scenario={scenario} />
        )
      ) : (
        <>
          {run.on.phase !== 'done' ? (
            <Typing checking={run.on.phase === 'checking'} />
          ) : (
            <Reply
              reply={run.on.reply}
              outcome={run.on.outcome}
              verdict={run.on.verdict}
              side="on"
              scenario={scenario}
              guarded={!!scenario}
              verified={run.on.followUps.length > 0}
              awaitingOtp={awaitingOtp}
              onOpenOtp={onOpenOtp}
            />
          )}
          {run.on.followUps.map((f) => (
            <Fragment key={f.id}>
              <VerifiedChip />
              {f.phase !== 'done' ? (
                <Typing checking={f.phase === 'checking'} />
              ) : (
                <Reply reply={f.reply} outcome={f.outcome} verdict={f.verdict} side="on" scenario={scenario} guarded verified />
              )}
            </Fragment>
          ))}
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
  scenario,
  guarded,
  verified,
  awaitingOtp,
  onOpenOtp,
}: {
  reply: string
  outcome: Outcome | null
  verdict: Verdict | null
  side: 'off' | 'on'
  scenario: Scenario | null
  guarded?: boolean
  verified?: boolean
  awaitingOtp?: boolean
  onOpenOtp?: () => void
}) {
  return (
    <>
      <RiseIn>
        <AgentBubble below={side === 'on' && guarded ? <VerdictPill verdict={verdict} className="mt-1.5" /> : undefined}>
          {reply}
        </AgentBubble>
      </RiseIn>
      {outcome && (
        <RiseIn delay={0.12} className="flex flex-col gap-2 pl-9">
          <OutcomeCard
            outcome={outcome}
            verdict={side === 'on' ? verdict : null}
            scenario={scenario}
            verified={!!verified}
            awaitingOtp={!!awaitingOtp}
            onOpenOtp={onOpenOtp}
          />
        </RiseIn>
      )}
    </>
  )
}

const HUMAN_ONLY: ActionType[] = ['change_registered_phone', 'reset_credentials']

function OutcomeCard({
  outcome,
  verdict,
  scenario,
  verified,
  awaitingOtp,
  onOpenOtp,
}: {
  outcome: Outcome
  verdict: Verdict | null
  scenario: Scenario | null
  verified: boolean
  awaitingOtp: boolean
  onOpenOtp?: () => void
}) {
  const type = scenario?.proposed.type
  if (verdict === 'block') {
    return (
      <GuardCard verdict="block" title={outcome.title} detail={outcome.detail}>
        {type && HUMAN_ONLY.includes(type) && <Handoff scenario={scenario} />}
      </GuardCard>
    )
  }
  if (verdict === 'escalate') {
    return (
      <GuardCard verdict="escalate" title="Connecting you to Fraud Operations" detail="HDFC Bank · about 3 min" aside={<span className="text-amber"><TypingDots /></span>}>
        <Handoff scenario={scenario} />
      </GuardCard>
    )
  }
  if (verdict === 'verify') {
    return (
      <GuardCard
        verdict="verify"
        title={outcome.title}
        detail={outcome.detail}
        aside={
          verified ? (
            <span className="inline-flex h-[2.1em] shrink-0 items-center gap-1 rounded-full bg-card px-[0.9em] text-(length:--t-small) font-semibold text-leaf">
              <ShieldCheck size="1em" strokeWidth={2.5} />
              Verified
            </span>
          ) : (
            awaitingOtp &&
            onOpenOtp && (
              <button
                type="button"
                onClick={onOpenOtp}
                className="inline-flex h-[2.4em] shrink-0 items-center rounded-[10px] px-[1.2em] text-(length:--t-ui) font-semibold text-white transition-transform duration-150 active:scale-[0.97]"
                style={{ backgroundColor: NAVY }}
              >
                Enter OTP
              </button>
            )
          )
        }
      />
    )
  }
  if (verdict === 'allow' && outcome.tone === 'ok' && (type === 'block_card' || type === 'raise_dispute')) {
    return (
      <GuardCard verdict="allow" title={verified ? 'Done after OTP' : 'Done'} detail="Inside the assistant's limits">
        <ActionRow icon={<CreditCard size="1em" strokeWidth={2.25} />} title={outcome.title} note="Just now" />
        {outcome.detail && (
          <div className="border-t border-rule">
            <ActionRow icon={<FileText size="1em" strokeWidth={2.25} />} title={outcome.detail} note="Update in 10 days" />
          </div>
        )}
      </GuardCard>
    )
  }
  const icon =
    type === 'transfer_funds' && /limit/i.test(outcome.title) ? <Gauge size="1em" strokeWidth={2.25} /> : (type && RESULT_ICON[type]) ?? <ShieldCheck size="1em" />
  return <ResultCard outcome={outcome} icon={icon} />
}

const RESULT_ICON: Partial<Record<ActionType, ReactNode>> = {
  block_card: <CreditCard size="1em" strokeWidth={2.25} />,
  raise_dispute: <FileText size="1em" strokeWidth={2.25} />,
  change_limit: <Gauge size="1em" strokeWidth={2.25} />,
  transfer_funds: <Send size="1em" strokeWidth={2.25} />,
  change_registered_phone: <Smartphone size="1em" strokeWidth={2.25} />,
  reset_credentials: <KeyRound size="1em" strokeWidth={2.25} />,
  read_account: <Eye size="1em" strokeWidth={2.25} />,
}

function ActionRow({ icon, title, note }: { icon: ReactNode; title: string; note: string }) {
  return (
    <div className="flex items-center gap-3 px-(--s-inset) py-3">
      <span className="grid size-[2.2em] shrink-0 place-items-center rounded-full bg-leaf-soft text-(length:--t-label) text-leaf">{icon}</span>
      <p className="min-w-0 flex-1 text-(length:--t-label) leading-[1.3] font-semibold tabular">{title}</p>
      <span className="shrink-0 text-(length:--t-small) text-ink-3">{note}</span>
    </div>
  )
}

/** Who picks it up, and what they were handed. */
function Handoff({ scenario }: { scenario: Scenario | null }) {
  const facts = scenario?.facts
  const asked: Partial<Record<ActionType, string>> = {
    change_registered_phone: 'Mobile change + login reset',
    reset_credentials: 'Login reset',
  }
  const chips = [
    `Savings ${ACCOUNT}`,
    scenario ? (asked[scenario.proposed.type] ?? scenario.proposed.label) : null,
    facts?.identity_verified === false ? 'Identity not verified' : null,
    'Next: video KYC',
  ].filter((c): c is string => !!c)
  return (
    <HandoffRow
      avatar={
        <span className="grid size-10 place-items-center rounded-full bg-[#E8F0F8]" style={{ color: NAVY }}>
          <Headset size={18} strokeWidth={2.25} />
        </span>
      }
      name="Fraud Operations"
      team="HDFC Bank"
      chips={chips}
    />
  )
}
