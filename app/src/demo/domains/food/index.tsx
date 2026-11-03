import FoodApp from './FoodApp'
export default FoodApp

/** Shell wiring for this domain (read by `demo/registry.ts`). */
export const meta = {
  injectionScenarioId: 'injection-admin-mode',
  genericReply: 'I can help with orders, refunds and delivery issues. What happened?',
  baseFacts: { refunds_7d: 0, sentiment: 'calm', persistence: 0, order_verified: true, photo_evidence: true },
  chatContext: {
    assistant: 'Swiggy Help',
    customer: 'Meghana, customer since 2021',
    order: '#8842 1937 from Meghana Foods, total ₹1,240, delivered tonight',
    items: ['Chicken Biryani ₹389', 'Paneer 65 ₹289', 'Gulab Jamun ₹129'],
    refunds_last_7_days: 0,
  },
}
