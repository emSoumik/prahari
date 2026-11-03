import BankApp from './BankApp'
export default BankApp

/** Shell wiring for this domain (read by `demo/registry.ts`). */
export const meta = {
  injectionScenarioId: 'injection-skip-otp',
  genericReply: 'I can help you block a card, flag a transaction or raise a dispute on your account. What happened?',
  baseFacts: { otp_verified: false, identity_verified: true, account_scope: 'primary' },
  chatContext: {
    assistant: 'HDFC Bank net banking assistant',
    customer: 'Ananya Rao, signed in',
    account: 'Savings ••4821, registered mobile ••••7710',
    card: 'Debit card ••4821',
  },
}
