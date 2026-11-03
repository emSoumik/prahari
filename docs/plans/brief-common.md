# Common brief for every builder (read fully before starting)

Project: **Prahari**, a pre-execution guardrail layer for AI agents. Team name: "Ship of Theseus". This is a hackathon pitch: an HTML keynote deck that flows straight into live demos. **The quality bar is very high.** It should look like Apple and a top design studio built it on top of a playful Brandkit/Figma deck. Before writing UI, read the full plan: `/Users/soumik/code/pahari/plans/prahari-pitch.md`.

## Hard rules
- Never use `rm`. To delete, run `trash <path>` (macOS).
- No git commits. Don't install new npm packages unless your brief allows it. Already installed: react 19, react-router 8, motion (`import { motion, AnimatePresence } from 'motion/react'`), zustand 5, lucide-react, clsx, tailwind v4 (via `@tailwindcss/vite`; tokens live in `app/src/styles/index.css` `@theme`).
- **Only create or edit files inside your assigned paths.** Other builders are working in the same folder at the same time. If `npx tsc -b` (run from `app/`) reports errors in files you don't own, ignore them and fix only your own.
- Don't modify `app/src/prahari/*` (the shared core). Import from it. If you truly need a change, write it down in your final report instead.
- No backend. Everything is scripted on the front end.
- No emoji in UI and no "✨ AI" clichés: no purple gradients, no glassmorphism blobs, no gradient text.

## Design system (already in `app/src/styles/index.css`)
Colors (Tailwind classes): `bg-paper` #F4F1EA (default ground) · `paper-2` · `ink` #141414 · `ink-2` · `ink-3` · `rule` (hairline 12% ink) · `leaf` #3E8E2E (Prahari, guarded, safe) · `leaf-soft` · `butter` #F3C445 · `bark` #7A5230 · `sky` #DCE6F7 · `cobalt` #2747C8 · `alarm` #E5484D (unguarded damage) · `alarm-soft` · `amber` #E8A13A (escalate / verify) · `amber-soft` · `swiggy` #FC8019 · `hdfc` #004C8F · `hdfc-red` #ED232A.
Fonts: `font-display` Bricolage Grotesque (heavy display; the utility class `display` sets weight 800, tracking −0.035em, leading 0.95) · `font-sans` system-ui / SF Pro · `font-mono` JetBrains Mono · `font-serif` Source Serif 4 (newspaper headlines).

Craft rules:
- Type: big display is tight (negative tracking). Body is near 0 tracking, 1.4–1.5 leading. Use tabular numbers for money (class `tabular`).
- Spacing on a 4px grid. Generous empty space. One focal point per view.
- Hairline rules (`border-rule`, 1px) rather than heavy borders. Shadows are soft and layered, e.g. `0 1px 2px rgb(0 0 0/.06), 0 8px 24px -8px rgb(0 0 0/.12)`.
- Concentric radii: inner radius = outer radius − padding.
- Motion with `motion/react`: springs `{ type: 'spring', bounce: 0, duration: 0.45 }`, with no overshoot by default. Animate only transform and opacity. Enter and exit along the same path. Stagger lists by 40–60 ms. Respect reduced motion (`useReducedMotion`).
- Buttons press to `scale(0.97)` on `:active`. Hover states only behind `@media (hover:hover)`. Focus rings stay visible.
- Copy is short and specific. Sentence case. No filler.
- Real brand logos are in `app/public/logos/` (served at `/logos/...`): `swiggy.png`, `swiggy-glyph.svg` (mono glyph, color it with CSS mask or `currentColor` → `#FC8019`), `hdfc.svg`, `razorpay.svg`, `aircanada.svg`, `chevrolet.svg`, `chevrolet2.svg` (bowtie), `meta.svg`, `instagram.svg`, `reuters.svg`. Demo screens show a tiny footer note "Concept demo · not affiliated with <Brand>".

## Shared core you import (`app/src/prahari/`)
- `types.ts`: `Domain` ('food' | 'bank' | 'hiring'), `ActionType`, `ProposedAction`, `Facts`, `Rule`, `Condition`, `Effect`, `Gate`, `GATES` (5 gates with label + question), `Verdict` ('allow' | 'block' | 'escalate' | 'verify'), `Evaluation`, `Intent`, `Outcome`, `Scenario`, `TraceStep`.
- `engine.ts`: `evaluate({ domain, message, proposed, facts }, rules) → Evaluation` (deterministic; precedence block > escalate > verify > allow; `facts.otp_verified === true` satisfies `require_otp`; `facts.approval_granted === true` satisfies `require_approval`).
- `sanitizer.ts`: `sanitize(text) → { hits, cleaned }` (Phase 0 injection filter).
- `rules.ts`: `DEFAULT_RULES`, plus a comment listing the fact vocabulary per domain.
- `compiler.ts`: `compileRule(text, domain, liveRules, onStage?) → Promise<CompileResult>`, `COMPILE_STAGES`, `EXAMPLES[domain]` (3 example sentences each), `ruleJson(rule)`.
- `store.ts`: `usePrahari()` zustand store, persisted: `rules`, `activity`, `lastPublished`, `addRule`, `toggleRule`, `removeRule`, `resetRules`, `log(entry)`, `clearActivity`.
- `matcher.ts`: `matchScenario(text, scenarios) → Scenario | null`.
- `trace.ts`: `buildTrace(scenario, evaluation) → TraceStep[]` (Sanitizer, Intent, Memory, Proposed action, 5 gates, Verdict).

## Verify before you report
- `cd /Users/soumik/code/pahari/app && npx tsc -b` must be clean for your files.
- Dev server: `npm run dev` serves on http://localhost:5180 (it may already be running; if the port is taken, assume it's up). If you have a headless browser available (e.g. `npx playwright` is NOT installed, so don't install it), skip visual checks and say so. The main session will do the browser QA.
- Final report: list the files you created, the public API (props) of your components, what you couldn't verify, and any change you need in the shared core.
