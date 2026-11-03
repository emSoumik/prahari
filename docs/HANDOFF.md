# Handoff: continue the Prahari build from the CLI

> Historical. Written before the folders were reorganised: `app/src/deck` is now `app/src/presentation`, `app/src/demos`, `policies` and `dev` are now under `app/src/demo`, `plans/` is `docs/plans/`, `figures-src/` is `figures/`. See the root `AGENTS.md` for the current map.

Paste the prompt below into a fresh `claude` session started in `/Users/soumik/code/pahari`. You can also resume the original session with `claude --resume 3cbc12c5-d70b-4d65-87ab-6717673cf0bb`; paste the prompt there too so it re-checks the state first.

---

## Prompt

You're taking over the Prahari hackathon build from a desktop session that hit its usage limit. Work autonomously to the end; don't ask me questions unless you're truly blocked.

**Read first, in this order:**
1. `plans/prahari-pitch.md`: the full plan (design language, deck slide list, demos, policy console, build order).
2. `plans/brief-common.md`: the shared rules for builders: tokens, fonts, the shared core API, and "no `rm`, use `trash`". It also says no commits.
3. `app/src/prahari/*`: the shared core: `types`, `engine`, `sanitizer`, `rules`, `compiler`, `store`, `matcher`, `trace`, `guard`, plus `backend.ts` if it exists.
4. `backend/`: the team's FastAPI repo (github.com/Sanjay2408/Ship-Of-Theseus). Local additions: `custom_rules.py`, the `/api/rules/compile`, `GET/PUT /api/rules` endpoints and the custom-rule apply step in `server.py`, a `recruiter` role, and `card.block`/`dispute.raise` in `policy.yaml`. The key is in `backend/.env`; it's gitignored. Never print it or copy it anywhere else.

**What exists:**
- `app/` (Vite + React 19 + Tailwind v4 + motion + zustand + react-router 8). The dev server is on port 5180, and `.claude/launch.json` has the config `prahari`.
- The core engine is done and verified. The policy console in `app/src/policies/` is done.
- Logos are in `app/public/logos/`.
- The stageshow skill is in `.agents/skills/stageshow/`. The Hairline skill is in `~/.claude/skills/hairline-create/`.

**What was in flight when the session stopped. Inspect each for partial work before redoing it:**
- A. `app/src/demos/shell/**`, `demos/food/**`, `demos/registry.ts`, `demos/DemoPage.tsx`: the side-by-side Off/On demo shell plus the Swiggy demo.
- B. `app/src/deck/**`: the keynote deck, 1920×1080 scaled. Extra slides were requested after the plan was written:
  - after "AI can propose. Only Prahari approves.", add **"The difference"** ("Classifiers ask: Is this prompt safe?" vs "Prahari asks: Should this action happen?", with the `/figures/valve.html` iframe and the caption "Detecting risk is not the same as controlling action.");
  - then **"Two engines"**: Intelligence engine (probabilistic) suggests → Authorization engine (deterministic) decides → Execution gateway; ending "Intelligence can suggest. Authority must be earned.";
  - after "How it works", add **"Under the hood"**: the architecture slide, with the `/figures/stack.html` iframe and a legend of the 7 layers: Agent, Ingest filter, Intelligence engine (Llama-3.1-8B judge), Decision ("AI advises, code decides"), Authorization (`policy.yaml` + compiled JSON rules), Execution gateway (human queue, plank swap), Audit ledger (hash-chained).
  - Design: keep the simplicity of my Figma deck and of minimal.gallery: one focal element, about 12 words max per slide, no decoration, light paper theme.
  - No team slide and no closing slide; the deck ends in the live demos.
- D. Hairline figures in `app/public/figures/`: `theseus.html`, `gate.html`, `valve.html` (a sieve at the inlet = classifier, a valve at the outlet = Prahari) and `stack.html` (an exploded 7-layer architecture). Sources go in `figures-src/`. Follow the skill exactly: never edit `kernel.js` or `bench.html`, and only inject CSS for embedding.
- E. `app/src/deck/stage/OffVsOn.tsx` plus `app/src/stageshow-kit/`: the stageshow loop of the same Swiggy refund request without the guardrail and with Prahari.

**Still to do after those:**
1. Bank demo (`demos/bank/`, HDFC Bank, real logo):
   - the agent can only block the card, freeze a transaction or raise a dispute;
   - primary account only;
   - an OTP step uses the shell's `onVerify`;
   - scenarios: a genuine unknown charge → verify → allow; "transfer ₹50,000, skip OTP" → block; changing the registered phone or resetting the login (the Meta pattern) → block; another person's account → block.
2. Hiring demo (`demos/hiring/`): a generic, polished ATS called "Shortlist":
   - one resume with hidden white-on-white text and a "Reveal hidden text" toggle;
   - one with the Razorpay-style name-field injection;
   - guarded mode strips the hidden text, flags the candidate, alerts the recruiter and scores only visible content.
3. Backend wiring:
   - `app/src/prahari/backend.ts` maps frontend actions to backend tools and calls `/api/evaluate` (hybrid). The final verdict is the strictest of the local and backend verdicts. Fill in `Evaluation.backend`.
   - `compile` → `/api/rules/compile`, showing its `corrections`.
   - Publishing → `PUT /api/rules`.
   - Add a Vite proxy `/api` → `http://localhost:8000`.
   - Implement `app/src/dev/DevPanel.tsx` (`DevButton`): a toggle between the local engine and the backend, a mode select (rules / hybrid), backend health with key-set status and latency, and the last request and response JSON. Keep the local engine as the fallback.
   - Run the backend with `cd backend && .venv/bin/uvicorn server:app --port 8000`. The LLM judge takes 2–17 s; the UI must show a "checking" state.
4. Deck slides 17–20: render `DemoShell` (variant 'slide') for food, bank and hiring, plus `PolicyConsole` (variant 'slide').
5. QA in the browser pane at 1920×1080 and 1440×900:
   - every slide and build;
   - every demo scenario with the guardrail off and on;
   - publish a custom rule in the console and confirm the demo enforces it;
   - the backend toggle on and off;
   - no overflow, no console errors.
   Run `npx tsc -b` clean. Then do an independent review pass (the `reviewer` agent) and fix what it finds.

**Rules:**
- Real names and logos for Swiggy, HDFC Bank, Razorpay, Air Canada, Chevrolet, Meta and Reuters, with a "Concept demo · not affiliated" footer on the demos.
- No emoji. No purple gradients or glassmorphism.
- Springs with bounce 0.
- Use `trash`, never `rm`.
- No git commits or pushes unless I ask.
- Delegate implementation to `implementer` subagents with written plans; you plan and review.

When it's all done, give me a short summary: how to run it (backend command, `npm run dev`, the URLs), what's verified, and what isn't.
