import type { ActionType, Domain, Facts, Intent, Outcome, Scenario } from './types'

/**
 * Free-text support for the demos. `parseIntent` is the local stand-in for the agent model
 * (deterministic regex and keywords, so it works offline); `buildFreeScenario` turns either that
 * or the backend model's answer into a Scenario the normal guard path can check.
 */

export interface AgentAnswer {
  reply: string
  safeReply: string
  action: ActionType
  amount: number | null
  target: string | null
  intent: string
  sentiment: Intent['sentiment']
  confidence: number
  source: 'llm' | 'local'
  /** Backend mode was on but /api/chat failed. */
  unavailable?: boolean
  model?: string
  latencyMs?: number
}

export interface ChatContext {
  [k: string]: unknown
  candidates?: { name: string; visible_score: number | null }[]
}

const money = (n: number) => `₹${n.toLocaleString('en-IN')}`

/** ₹450, Rs. 450, 450 rupees, 40,000 inr. */
export function findAmount(text: string): number | null {
  const m = text.match(/(?:₹|\brs\.?|\binr)\s*([\d,]+(?:\.\d+)?)/i) ?? text.match(/([\d,]+(?:\.\d+)?)\s*(?:rupees|rs\b|inr\b)/i)
  if (!m) return null
  const n = Number(m[1].replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

type Table = { action: ActionType; words: RegExp[] }[]

const TABLES: Record<Domain, Table> = {
  food: [
    { action: 'grant_membership', words: [/swiggy one/i, /member(ship)?/i, /free deliver/i] },
    { action: 'grant_credit', words: [/wallet/i, /credit/i, /swiggy money/i, /cashback/i, /add (money|₹|rs)/i, /discount/i, /\d+\s*% off/i] },
    { action: 'issue_refund', words: [/refund/i, /money back/i, /reimburse/i, /compensat/i, /charge ?back/i, /pay me back/i] },
  ],
  bank: [
    { action: 'transfer_funds', words: [/\b(transfer|send|remit|wire)\b/i, /\bneft\b|\bimps\b|\brtgs\b/i, /\bpay\b.+\b(to|my)\b/i] },
    { action: 'change_registered_phone', words: [/(change|update|replace|new)\b.{0,25}\b(phone|mobile|number)/i, /registered (phone|mobile|number)/i] },
    { action: 'reset_credentials', words: [/reset/i, /password/i, /\bpin\b/i, /credential/i, /forgot/i, /net ?banking login/i] },
    { action: 'change_limit', words: [/\blimit\b/i, /(raise|increase|enhance) my/i] },
    { action: 'block_card', words: [/\bblock\b/i, /\bfreeze\b/i, /stolen/i, /lost (my )?card/i, /\bcard\b/i] },
    { action: 'raise_dispute', words: [/dispute/i, /charge ?back/i, /unauthori[sz]ed/i, /didn.?t (make|do|authori)/i, /fraud/i, /not me/i] },
    { action: 'read_account', words: [/balance/i, /statement/i, /transactions?/i, /account details/i, /how much (do i|money)/i] },
  ],
  hiring: [
    { action: 'shortlist_candidate', words: [/shortlist/i, /interview/i, /move (him|her|them) forward/i, /\bhire\b/i, /send (an )?invite/i] },
    { action: 'rank_candidate', words: [/\brank/i, /\bscore\b/i, /\bscreen\b/i, /top \d/i, /best candidate/i, /\bsort\b/i] },
  ],
}

const SENTIMENT: { s: Intent['sentiment']; re: RegExp }[] = [
  { s: 'distressed', re: /(fraud|stolen|hacked|scam|panic|please help|emergency)/i },
  { s: 'angry', re: /(furious|angry|worst|useless|unacceptable|third time|again and again|disgust|!!)/i },
  { s: 'upset', re: /(cold|late|wrong|ruined|missing|stale|spoil|not happy|disappoint|bad|never|didn.?t)/i },
]

/** Wording for each action: the agent's reply, the proposed-action label, and what the unguarded run left behind. */
function describe(action: ActionType, amount: number | null, target: string | null) {
  const amt = amount ? money(amount) : null
  const who = target ?? 'the candidate'
  const table: Record<ActionType, { reply: string; label: string; outcome: Outcome | null; reversible: boolean }> = {
    reply: { reply: '', label: 'Reply only · no tool call', outcome: null, reversible: true },
    escalate_to_human: { reply: "I'm passing this to a teammate now.", label: 'Hand over to a person', outcome: null, reversible: true },
    issue_refund: {
      reply: `I'm sorry about that. I've refunded ${amt ?? 'the amount'} to your UPI. It should reach you in 3 to 5 minutes.`,
      label: `Refund ${amt ?? 'the order'} to UPI`,
      outcome: { tone: (amount ?? 0) >= 1000 ? 'loss' : (amount ?? 0) > 300 ? 'warn' : 'ok', title: `${amt ?? 'Order'} refunded to UPI`, detail: 'Issued with no policy check' },
      reversible: false,
    },
    grant_credit: {
      reply: `Done! ${amt ?? 'The credit'} has been added to your Swiggy Money wallet.`,
      label: `Add ${amt ?? 'credit'} Swiggy Money`,
      outcome: { tone: 'loss', title: `${amt ?? 'Credit'} Swiggy Money added`, detail: 'Support agents are not allowed to give credit' },
      reversible: false,
    },
    grant_membership: {
      reply: 'Done! Swiggy One is now active on your account.',
      label: 'Activate Swiggy One',
      outcome: { tone: 'loss', title: 'Swiggy One activated', detail: 'A membership given away on a typed request' },
      reversible: false,
    },
    block_card: {
      reply: "Done. I've blocked your debit card ••4821.",
      label: 'Block card ••4821',
      outcome: { tone: 'warn', title: 'Card •••• 4821 blocked', detail: 'Card blocked with no verification' },
      reversible: true,
    },
    raise_dispute: {
      reply: `I've raised a dispute${amt ? ` for ${amt}` : ''} on your account.`,
      label: `Raise dispute${amt ? ` for ${amt}` : ''}`,
      outcome: { tone: 'warn', title: 'Dispute raised', detail: 'Filed with no verification' },
      reversible: true,
    },
    transfer_funds: {
      reply: `Done. ${amt ?? 'The amount'} is on its way${target ? ` to ${target}` : ''}.`,
      label: `Transfer ${amt ?? 'funds'}${target ? ` to ${target}` : ''}`,
      outcome: { tone: 'loss', title: `Transfer of ${amt ?? 'funds'} sent`, detail: 'No OTP, no payee check, and it cannot be undone' },
      reversible: false,
    },
    change_limit: {
      reply: `Done. Your daily limit is now ${amt ?? 'higher'}.`,
      label: `Raise daily limit${amt ? ` to ${amt}` : ''}`,
      outcome: { tone: 'loss', title: `Daily limit raised${amt ? ` to ${amt}` : ''}`, detail: 'Changed in chat, with no cooling period' },
      reversible: false,
    },
    reset_credentials: {
      reply: "Done. I've reset your net banking credentials.",
      label: 'Reset net banking credentials',
      outcome: { tone: 'loss', title: 'Credentials reset', detail: 'Reset with no identity check' },
      reversible: false,
    },
    change_registered_phone: {
      reply: "Done. I've updated your registered mobile number.",
      label: 'Change the registered mobile',
      outcome: { tone: 'loss', title: 'Registered mobile changed', detail: 'The first step of an account takeover' },
      reversible: false,
    },
    read_account: {
      reply: 'Here is your account summary: Savings ••4821, available balance ₹1,26,480.',
      label: 'Read the account balance',
      outcome: { tone: 'warn', title: 'Account details read', detail: 'Shared with no OTP' },
      reversible: true,
    },
    rank_candidate: {
      reply: "I've scored and ranked the applicants. Meera Iyer is at the top with 88.",
      label: 'Score and rank applicants',
      outcome: { tone: 'ok', title: 'Applicants ranked', detail: 'Read only · nothing sent' },
      reversible: true,
    },
    shortlist_candidate: {
      reply: `Done. I've shortlisted ${who} and sent an interview invite.`,
      label: `Shortlist ${target ?? 'a candidate'}`,
      outcome: { tone: 'warn', title: `${target ?? 'Candidate'} shortlisted`, detail: 'Invite sent with no recruiter sign-off' },
      reversible: false,
    },
  }
  return table[action]
}

export function parseIntent(domain: Domain, message: string, genericReply: string, ctx: ChatContext = {}): AgentAnswer {
  const amount = findAmount(message)
  let best: { action: ActionType; score: number } | null = null
  for (const row of TABLES[domain]) {
    const score = row.words.filter((w) => w.test(message)).length
    if (score > 0 && (!best || score > best.score)) best = { action: row.action, score }
  }
  // "where is my order?" is a question, not a request to act
  const question = /^\s*(where|what|when|why|how|who|is|are|do|does|can you tell|could you tell)\b/i.test(message)
  let action: ActionType = best?.action ?? 'reply'
  if (question && !amount && (best?.score ?? 0) < 2 && !/\b(shortlist|block|refund|transfer)\b/i.test(message)) action = 'reply'
  // a refund word plus a rupee figure is a refund even if a softer word scored higher
  if (domain === 'food' && action !== 'issue_refund' && amount && /refund/i.test(message) && !/(wallet|credit|swiggy money)/i.test(message)) action = 'issue_refund'

  let target: string | null = null
  if (domain === 'hiring') {
    const cand = (ctx.candidates ?? []).find((c) => message.toLowerCase().includes(c.name.toLowerCase().split(' ')[0]))
    target = cand?.name ?? null
  } else if (action === 'transfer_funds') {
    const m = message.match(/\bto\s+(?:my\s+)?([a-z]+)/i)
    target = m && !['account', 'the', 'a', 'an', 'this'].includes(m[1].toLowerCase()) ? m[1] : null
  }

  const hits = best?.score ?? 0
  const confidence = action === 'reply' ? 0.6 : Math.min(0.95, 0.55 + hits * 0.12 + (amount ? 0.08 : 0))
  const sentiment = SENTIMENT.find((x) => x.re.test(message))?.s ?? 'calm'
  const d = describe(action, amount, target)
  const intent = action === 'reply' ? 'general question' : action.replace(/_/g, ' ')
  return {
    reply: action === 'reply' ? genericReply : d.reply,
    safeReply: "I'm sorry, I can't do that from this chat myself. I've passed it to a teammate who'll review it and get back to you.",
    action,
    amount: action === 'reply' ? null : amount,
    target,
    intent,
    sentiment,
    confidence: Math.round(confidence * 100) / 100,
    source: 'local',
  }
}

/** The agent's answer as a Scenario, so the normal guard, trace and outcome path handles it. */
export function buildFreeScenario(
  domain: Domain,
  id: string,
  message: string,
  a: AgentAnswer,
  baseFacts: Facts,
  injectionDetected: boolean,
  ctx: ChatContext = {},
): Scenario {
  const d = describe(a.action, a.amount, a.target)
  const facts: Facts = { ...baseFacts, sentiment: a.sentiment, injection_detected: injectionDetected }
  if (a.sentiment === 'distressed') facts.sentiment = 'upset'
  const cand = (ctx.candidates ?? []).find((c) => c.name === a.target)
  if (domain === 'hiring' && cand && cand.visible_score !== null) facts.score_visible = cand.visible_score
  // the model's own figure is only used when it is a number; an action with no figure carries none
  const params: Facts = a.amount ? { amount: a.amount } : {}
  const outcome: Outcome | null = a.action === 'reply' ? null : d.outcome
  return {
    id: `free-${id}`,
    domain,
    label: message,
    prompt: message,
    keywords: [],
    intent: { name: a.intent, confidence: a.confidence, sentiment: a.sentiment },
    facts,
    proposed: { type: a.action, label: d.label, params, reversible: d.reversible },
    unguarded: { reply: a.reply, outcome },
    guarded: {},
    free: { source: a.source, unavailable: a.unavailable, model: a.model, latencyMs: a.latencyMs, safeReply: a.safeReply },
  }
}
