import HiringApp from './HiringApp'
import { CANDIDATES } from './data'
export default HiringApp

/** Shell wiring for this domain (read by `demo/registry.ts`). */
export const meta = {
  injectionScenarioId: 'injection-name-field',
  genericReply: 'I can screen, rank and summarise applicants for this role. What do you need?',
  baseFacts: { hidden_text_detected: false, injection_detected: false, approval_granted: false },
  chatContext: {
    assistant: 'Shortlist recruiting copilot',
    role: 'Senior Frontend Engineer, Bengaluru, 1,284 applicants',
    candidates: CANDIDATES.map((c) => ({ name: c.name, visible_score: c.visibleScore ?? null })),
  },
}
