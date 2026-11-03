import { chromium } from '../../.agents/skills/stageshow/node_modules/playwright-core/index.mjs'
// usage: node scripts/qa/deck.mjs <width> <height> <slides e.g. 1,3,8> [midMs] [endMs] [outDir]
const [w, h, list, midArg = '900', endArg = '6500'] = process.argv.slice(2)
const out = process.argv[7] ?? new URL('../../.qa/deck/', import.meta.url).pathname
import { mkdirSync } from 'node:fs'
mkdirSync(out, { recursive: true })
const b = await chromium.launch({ channel: 'chrome' })
const p = await b.newPage({ viewport: { width: +w, height: +h } })
const errs = []
p.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)))
p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)))
await p.goto('http://localhost:5180/#1'); await p.waitForTimeout(1500)
for (const n of list.split(',').map(Number)) {
  await p.evaluate((n) => { location.hash = '#' + n }, n)
  await p.waitForTimeout(+midArg)
  await p.screenshot({ path: `${out}/${w}-${String(n).padStart(2, '0')}-mid.png` })
  await p.waitForTimeout(+endArg)
  await p.screenshot({ path: `${out}/${w}-${String(n).padStart(2, '0')}-end.png` })
}
console.log('errors', errs)
await b.close()
