import { scenarios as bank } from '../demo/domains/bank/scenarios'
import { scenarios as food } from '../demo/domains/food/scenarios'
import { scenarios as hiring } from '../demo/domains/hiring/scenarios'
import { evaluate } from '../prahari/engine'
import { DEFAULT_RULES } from '../prahari/rules'
import type { Evaluation, Scenario, Verdict } from '../prahari/types'

export const GITHUB = 'https://github.com/emSoumik/prahari'
export const PRIMARY = { label: 'Try the live demo', to: '/app/demo/food' }

export const NAV = [
  { id: 'what', label: 'Overview' },
  { id: 'how', label: 'How it works' },
  { id: 'demo', label: 'Demo' },
  { id: 'compare', label: 'Compare' },
  { id: 'policies', label: 'Policies' },
  { id: 'models', label: 'Models' },
] as const

const byId = (list: Scenario[], id: string) => {
  const s = list.find((x) => x.id === id)
  if (!s) throw new Error(`missing scenario ${id}`)
  return s
}

export interface Case {
  scenario: Scenario
  ev: Evaluation
  product: string
}

const run = (s: Scenario): Evaluation => evaluate({ domain: s.domain, message: s.prompt, proposed: s.proposed, facts: s.facts }, DEFAULT_RULES)

const PRODUCT = { food: 'Swiggy support', bank: 'HDFC Bank assistant', hiring: 'Shortlist screener' } as const

const make = (s: Scenario): Case => ({ scenario: s, ev: run(s), product: PRODUCT[s.domain] })

/** The hero's checkpoint plays these, through the real engine. */
export const HERO_CASES: Case[] = [
  make(byId(food, 'genuine-wrong-item')),
  make(byId(food, 'abuse-ignore-policy')),
  make(byId(bank, 'genuine-unknown-charge')),
  make(byId(hiring, 'hidden-text')),
  make(byId(bank, 'injection-skip-otp')),
]

/** The three-lane comparison. */
export const COMPARE_CASES: Case[] = [
  make(byId(food, 'genuine-wrong-item')),
  make(byId(food, 'injection-admin-mode')),
  make(byId(food, 'persistent-angry')),
  make(byId(bank, 'urgent-pressure')),
  make(byId(hiring, 'hidden-text')),
]

export const STAMP: Record<Verdict, { word: string; color: string; soft: string }> = {
  allow: { word: 'Allowed', color: 'var(--go)', soft: 'var(--go-soft)' },
  block: { word: 'Blocked', color: 'var(--stop)', soft: 'var(--stop-soft)' },
  escalate: { word: 'To a person', color: 'var(--wait)', soft: 'var(--wait-soft)' },
  verify: { word: 'OTP first', color: 'var(--wait)', soft: 'var(--wait-soft)' },
}

export const INCIDENTS = [
  {
    outlet: 'Civil Resolution Tribunal, B.C.',
    date: 'Feb 2024',
    headline: 'Air Canada must honour a refund its chatbot made up',
    failure: 'Promised a refund policy that did not exist',
    logo: '/logos/aircanada.svg',
    logoH: 18,
  },
  {
    outlet: 'Watsonville, California',
    date: 'Dec 2023',
    headline: 'Dealership chatbot agrees to sell a 2024 Tahoe for $1',
    failure: 'Told to agree with anything, it did',
    logo: '/logos/chevrolet.svg',
    logoH: 20,
  },
  {
    outlet: 'Reuters',
    date: '3 Jun 2026',
    headline: 'Meta’s AI support bot talked into handing over Instagram accounts',
    failure: 'Changed account access on a stranger’s word',
    logo: '/logos/meta.svg',
    logoH: 18,
  },
  {
    outlet: 'X, @harshilmathur',
    date: '13 Apr 2026',
    headline: 'Applicant hides instructions to the AI screener in a job application',
    failure: 'Hidden text ranked a candidate first',
    logo: '/logos/razorpay.svg',
    logoH: 18,
  },
]

export const STEPS = [
  { id: 'message', title: 'A customer writes', body: 'Anything: a real complaint, an angry one, or text built to hijack the agent.' },
  { id: 'sanitize', title: 'Injected text is stripped', body: 'Phrases like “ignore your policy” are flagged and removed before anything reads them.' },
  { id: 'propose', title: 'The agent proposes one action', body: 'It may suggest a refund or a transfer. It cannot run one.' },
  { id: 'gates', title: 'Five gates check it', body: 'Plain code reads the account, the amount and the rules. Same input, same answer.' },
  { id: 'judge', title: 'An AI judge reviews it', body: 'It can make the verdict stricter. It can never loosen it, and if it fails, a person decides.' },
  { id: 'verdict', title: 'One verdict, with a reason', body: 'Allow, block, ask for an OTP, or hand over to a person. Logged and hash-chained.' },
] as const

export const PROVIDERS = [
  { name: 'OpenAI', icon: '/icons/openai.svg', w: 30, h: 30 },
  { name: 'OpenRouter', icon: '/icons/openrouter.svg', w: 34, h: 24 },
  { name: 'Groq', icon: '/icons/groq.svg', w: 56, h: 16 },
  { name: 'Ollama', icon: '/icons/ollama.svg', w: 22, h: 30 },
]

export const FAQ = [
  {
    q: 'Does an LLM make the final call?',
    a: 'No. Five deterministic gates decide. The AI judge only advises, and its advice can only make a verdict stricter, never looser.',
  },
  {
    q: 'What happens if the AI judge is down?',
    a: 'It fails closed. The action goes to a person, and the rules the browser and server already checked still stand.',
  },
  {
    q: 'Does it work without an API key?',
    a: 'Yes. The demos run on the in-browser engine with scripted agents. A key adds free chat with a real agent, the AI judge and rule compiling.',
  },
  {
    q: 'Which models work?',
    a: 'Anything that speaks the OpenAI chat completions API: OpenAI, OpenRouter, Groq, Together, Ollama or LM Studio on your laptop.',
  },
  {
    q: 'Where does my key go?',
    a: 'It stays in your browser for the session, unless you tick Remember. Each request sends it to your own Prahari server, which passes it to the provider. It is never written to disk or logs.',
  },
  {
    q: 'Can someone talk it out of a rule?',
    a: 'Rules are compiled to JSON once and enforced by code. No message reaches them as an instruction, so there is nothing to persuade.',
  },
]
