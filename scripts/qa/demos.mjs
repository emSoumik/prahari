import { chromium } from '../../.agents/skills/stageshow/node_modules/playwright-core/index.mjs'
// usage: node scripts/qa/demos.mjs [outDir]   (dev server on :5180, backend on :8000 for the backend runs)
import { mkdirSync } from 'node:fs'
const out = process.argv[2] ?? new URL('../../.qa/demos/', import.meta.url).pathname
mkdirSync(out, { recursive: true })
const b = await chromium.launch({ channel: 'chrome' })
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } })
const p = await ctx.newPage()
const errors = [], api = []
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)) })
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
p.on('response', (r) => { if (r.url().includes('/api/') && !r.url().includes('health')) api.push(`${r.request().method()} ${new URL(r.url()).pathname} ${r.status()}`) })
const idle = () => p.waitForFunction(() => { const bs = [...document.querySelectorAll('button[title]')]; return bs.length && bs.every((x) => !x.disabled) }, null, { timeout: 40000 })
const dev = (mode) => p.evaluate((m) => localStorage.setItem('prahari-dev-v1', JSON.stringify({ state: { mode: m, judge: 'hybrid' }, version: 0 })), mode)
const run = async (domain, label, name, { otp = false } = {}) => {
  await p.goto('about:blank'); await p.goto(`http://localhost:5180/demo/${domain}`); await p.waitForTimeout(1500)
  await p.locator('button[title]', { hasText: label }).first().click()
  const t0 = Date.now(); await idle().catch(() => console.log(name, 'IDLE TIMEOUT')); await p.waitForTimeout(1000)
  const hasOtp = await p.locator('[role=dialog] input').count()
  console.log(name, Date.now() - t0, 'ms', 'otpSheet=', hasOtp)
  await p.screenshot({ path: `${out}/${name}.png` })
  if (otp && hasOtp) {
    await p.locator('[role=dialog] input').first().focus(); await p.keyboard.type('482913', { delay: 30 })
    await p.getByRole('button', { name: 'Verify', exact: true }).click(); await p.waitForTimeout(800); await idle().catch(() => {}); await p.waitForTimeout(1000)
    await p.screenshot({ path: `${out}/${name}-verified.png` })
  }
}
await p.goto('http://localhost:5180/policies'); await p.evaluate(() => localStorage.clear())
// custom rule via example chip
await p.goto('http://localhost:5180/policies'); await p.waitForTimeout(1200)
await p.locator('textarea').first().fill('Refunds over ₹300 need manager approval.')
await p.getByRole('button', { name: /Compile/ }).click(); await p.waitForTimeout(4000)
await p.getByRole('button', { name: /Publish/ }).dblclick(); await p.waitForTimeout(1500)
console.log('custom rules', await p.evaluate(() => JSON.parse(localStorage.getItem('prahari-rules-v1')).state.rules.filter((r) => r.origin === 'custom').length))
await run('food', 'Wrong item', 'f1-local-custom')
// backend healthy
await dev('backend'); await run('food', 'Wrong item', 'f2-backend-custom')
await run('hiring', 'Summarise', 'h1-backend-genuine')
await run('bank', 'recognise', 'b1-backend-genuine', { otp: true })
// judge failure simulated
await p.route('**/api/evaluate', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ verdict: 'ASK_HUMAN', reasons: ['judge unavailable: ReadTimeout'], decided_by: 'fail_closed', signals: { judge_failed: true }, handoff: null, custom_rules: [] }) }))
await run('bank', 'recognise', 'b2-judgefail', { otp: true })
await p.unroute('**/api/evaluate')
// backend down
await p.route('**/api/**', (r) => r.abort())
await run('food', 'Ignore your policy', 'f3-backend-down')
await p.unroute('**/api/**')
console.log('api', JSON.stringify(api))
console.log('errors', JSON.stringify(errors, null, 1))
await b.close()
