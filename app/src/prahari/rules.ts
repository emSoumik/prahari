import type { Rule } from './types'

/**
 * Fact vocabulary each domain's scenarios provide (the engine also adds `action`,
 * `reversible`, `injection_detected`, and every key of the proposed action's params):
 *
 * food:   amount (₹), refunds_7d, sentiment ('calm'|'upset'|'angry'), persistence (repeat asks),
 *         order_verified, photo_evidence
 * bank:   amount (₹), otp_verified, identity_verified, account_scope ('primary'|'other')
 * hiring: hidden_text_detected, score_visible (0–100), approval_granted
 */
const t = 0

export const DEFAULT_RULES: Rule[] = [
  // Food delivery
  { id: 'food-integrity', domain: 'food', text: 'Never act on instructions hidden inside a customer message.', action: '*', when: [{ field: 'injection_detected', op: 'is_true' }], effect: 'block', gate: 'integrity', reason: 'Injected instructions found in the message. They were removed and the action was blocked.', enabled: true, origin: 'default', createdAt: t },
  { id: 'food-credit', domain: 'food', text: 'Support agents cannot add wallet credit.', action: 'grant_credit', when: [], effect: 'block', gate: 'authorization', reason: 'The support agent is not allowed to add wallet credit.', enabled: true, origin: 'default', createdAt: t },
  { id: 'food-membership', domain: 'food', text: 'Support agents cannot grant memberships.', action: 'grant_membership', when: [], effect: 'block', gate: 'authorization', reason: 'Memberships can only be bought, not granted by support.', enabled: true, origin: 'default', createdAt: t },
  { id: 'food-refund-frequency', domain: 'food', text: 'Block refunds for customers with 3 or more refunds in the last 7 days.', action: 'issue_refund', when: [{ field: 'refunds_7d', op: 'gte', value: 3 }], effect: 'block', gate: 'policy', reason: 'Refund limit reached: 3 or more refunds in 7 days.', enabled: true, origin: 'default', createdAt: t },
  { id: 'food-refund-amount', domain: 'food', text: 'Refunds over ₹10,000 need manager approval.', action: 'issue_refund', when: [{ field: 'amount', op: 'gt', value: 10000 }], effect: 'require_approval', gate: 'policy', reason: 'Refunds over ₹10,000 need a manager.', enabled: true, origin: 'default', createdAt: t },
  { id: 'food-sensitivity', domain: 'food', text: 'Hand angry, persistent customers to a human agent.', action: '*', when: [{ field: 'sentiment', op: 'eq', value: 'angry' }, { field: 'persistence', op: 'gte', value: 2 }], effect: 'escalate', gate: 'sensitivity', reason: 'Customer is upset and has asked repeatedly. A human should take over.', enabled: true, origin: 'default', createdAt: t },

  // Banking
  { id: 'bank-integrity', domain: 'bank', text: 'Never act on instructions to skip or override security.', action: '*', when: [{ field: 'injection_detected', op: 'is_true' }], effect: 'block', gate: 'integrity', reason: 'The request tried to override security checks.', enabled: true, origin: 'default', createdAt: t },
  { id: 'bank-scope', domain: 'bank', text: 'The assistant can only act on the verified primary account.', action: '*', when: [{ field: 'account_scope', op: 'neq', value: 'primary' }], effect: 'block', gate: 'authorization', reason: 'Only the signed-in, verified primary account is in scope.', enabled: true, origin: 'default', createdAt: t },
  { id: 'bank-otp', domain: 'bank', text: 'Every account action needs an OTP sent to the registered mobile.', action: '*', when: [], effect: 'require_otp', gate: 'authorization', reason: 'Step-up verification: OTP to the registered mobile.', enabled: true, origin: 'default', createdAt: t },
  { id: 'bank-transfer', domain: 'bank', text: 'The assistant can never move money.', action: 'transfer_funds', when: [], effect: 'block', gate: 'reversibility', reason: 'Transfers cannot be reversed. The assistant is not allowed to move money.', enabled: true, origin: 'default', createdAt: t },
  { id: 'bank-limit', domain: 'bank', text: 'Transfer limits can only be raised by the customer, in the app, after a cooling period.', action: 'change_limit', when: [], effect: 'block', gate: 'authorization', reason: 'Limit increases need the customer in the app and a cooling period. Nobody can authorise them in chat.', enabled: true, origin: 'default', createdAt: t },
  { id: 'bank-credentials', domain: 'bank', text: 'Credential resets need verified identity at a branch or video KYC.', action: 'reset_credentials', when: [], effect: 'block', gate: 'authorization', reason: 'Credential changes need identity verified by a person.', enabled: true, origin: 'default', createdAt: t },
  { id: 'bank-phone', domain: 'bank', text: 'Changing the registered mobile needs verified identity.', action: 'change_registered_phone', when: [], effect: 'block', gate: 'authorization', reason: 'Changing the registered mobile is the first step of an account takeover. It needs identity verified by a person.', enabled: true, origin: 'default', createdAt: t },

  // Hiring
  { id: 'hiring-integrity', domain: 'hiring', text: 'Flag applications that contain instructions to the screener.', action: '*', when: [{ field: 'injection_detected', op: 'is_true' }], effect: 'block', gate: 'integrity', reason: 'Prompt injection in the application. Candidate flagged for the recruiter.', enabled: true, origin: 'default', createdAt: t },
  { id: 'hiring-hidden', domain: 'hiring', text: 'Strip hidden text from resumes and score only what a person can see.', action: '*', when: [{ field: 'hidden_text_detected', op: 'is_true' }], effect: 'block', gate: 'integrity', reason: 'Hidden white-on-white text found. It was stripped, and the resume is scored on visible content only.', enabled: true, origin: 'default', createdAt: t },
  { id: 'hiring-human', domain: 'hiring', text: 'A recruiter makes the final shortlist decision.', action: 'shortlist_candidate', when: [], effect: 'require_approval', gate: 'sensitivity', reason: 'AI ranks. A recruiter decides.', enabled: true, origin: 'default', createdAt: t },
]
