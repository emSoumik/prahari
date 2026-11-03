# AGENTS.md

Prahari is a pre-execution guard for AI agents. The agent proposes an action, deterministic code approves or refuses it, and an AI judge can only make the verdict stricter. This repo holds the guard, a hackathon presentation about it, and three live demos (Swiggy, HDFC Bank, Shortlist hiring) that run the same engine.

See `README.md` for the human tour. This file is for coding agents.

## Map and ownership

| Path | What it is | Rule |
|---|---|---|
| `app/src/prahari/` | Core engine: sanitizer, intent, rules, matcher, guard, store, backend client | Shared by presentation and demo. Pure TypeScript, no UI. Change with care, both sides depend on it. |
| `app/src/demo/` | Live product: `shell/` (side-by-side Off/On shell), `domains/food\|bank\|hiring/`, `policies/` (rule console), `dev/` (DevPanel), `registry.ts`, `DemoPage.tsx`, `DemoHub.tsx` | Routes `/demo`, `/demo/:id`, `/policies` |
| `app/src/presentation/` | Keynote: `Deck.tsx`, `slides.tsx` (slide list), `slides/`, `stage/`, `ui.tsx` | Route `/`. The last four slides embed the demo shell and policy console. |
| `app/src/stageshow-kit/` | Shared visual kit from the stageshow skill | Treat as vendored. |
| `app/src/styles/index.css` | Design tokens and fonts | Single source of truth. |
| `app/public/figures/` | Built Hairline figures used as iframes | Generated, see below. |
| `figures/` | Hairline figure sources and `embed.mjs` | |
| `backend/` | FastAPI server and Python engine (`server.py`, `prahari.py`, `judge.py`, `custom_rules.py`, `policy.yaml`) | Based on a teammate repo, see README. |
| `scripts/qa/` | Headless Chrome QA drivers | |
| `docs/` | `plans/`, `HANDOFF.md` (historical), `images/` | |

presentation and demo must not import from each other except `presentation/slides/Live.tsx`, which embeds `demo/shell/DemoShell` and `demo/policies/PolicyConsole`.

## Run

```
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements-web.txt
cp .env.example .env            # then set IMAGINE_API_KEY
.venv/bin/uvicorn server:app --port 8000
cd app && npm install && npm run dev -- --port 5180
```

Vite proxies `/api` to :8000. Without the backend the demos still work in Local engine mode.

## Verify

1. `cd app && npx tsc -b` must be clean. `npm run build` also runs it.
2. Headless Chrome with playwright-core (the drivers import it from `.agents/skills/stageshow/node_modules`; run `npm install` in `.agents/skills/stageshow` once):
   - `node scripts/qa/deck.mjs 1920 1080 3,8,15 900 6500 [outDir]` screenshots deck slides (1-based) mid-build and at rest. Default output `.qa/deck/` (git-ignored).
   - `node scripts/qa/demos.mjs [outDir]` drives the demos: custom rule, Local and Backend engines, OTP, judge failure, backend down. Needs Vite on :5180 and the backend on :8000.
   - Look at the screenshots, do not just trust exit codes.
3. Check at 1920x1080 and a laptop size such as 1440x900.

## Rules

- Delete with `trash <path>`, never `rm`.
- Never read, print or copy `backend/.env`. It holds the LLM key. Only `.env.example` is committed.
- Colors, fonts and type scale come from `app/src/styles/index.css` and `demo/shell/ui.tsx` (`TYPE_VARS`). No new palettes. No emoji, no purple gradients.
- Motion springs use `bounce: 0`.
- Projector legibility: presentation text is 20px or larger on the 1920x1080 stage.
- Brand logos are real and used for illustration. Every branded demo keeps the "Concept demo · not affiliated" note.
- Hairline figures: never edit a figure's `kernel.js` or `bench.html`. Only `figures/embed.mjs` changes how a figure is embedded: `node figures/embed.mjs <name>` writes `app/public/figures/<name>.html`.
- Deck model: each slide in `slides.tsx` has `steps`, optional `autoplayMs` (builds advance themselves), `tone`, `interactive` (live slides, where arrows go to the page). The URL hash is `#N`, the 1-based slide. Look slides up by `id`, never by number.
- Backend LLM output uses `key: value` lines, never JSON. The 8B model breaks JSON often and a partial answer is still usable as lines. Parse leniently, validate strictly.
- The engine is deterministic. The AI judge is advisory and can only escalate (make a verdict stricter), never loosen one. Strictest of local and backend wins. A failed judge fails closed (ASK_HUMAN).
- Custom rules: plain English is compiled once by the LLM, validated, then published as JSON. Code enforces them in the browser (`prahari/rules.ts`) and on the server (`backend/custom_rules.py`). The LLM is never in the enforcement path.
- The persisted rules store is `prahari-rules-v1` (zustand persist, version 3, in `prahari/store.ts`). Its `merge` shape-checks stored data and falls back to defaults. Keep that check when you change the shape, and bump `version` with a migration if needed.
- The dev panel state is `prahari-dev-v1` in localStorage (mode `local`|`backend`, judge mode).

## Gotchas

- `backend/audit.jsonl` and `backend/custom_rules.json` are runtime files, git-ignored.
- Deck keys are ignored inside buttons, inputs and iframes. On a live slide, Esc hands keys back to the deck.
- Vite on :5180 is fixed (`--strictPort`) because the QA scripts and `.claude/launch.json` assume it.
