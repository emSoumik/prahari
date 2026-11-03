# Architecture

One engine, two surfaces. The presentation and the demos both call `app/src/prahari/guard.ts`; the backend is an optional second opinion.

```
app/src/prahari/   sanitizer.ts   strip and flag injected text
                   intent.ts      free text -> proposed action (when no backend agent)
                   rules.ts       built-in + custom rules as data
                   matcher.ts     evaluates a rule against action + facts
                   engine.ts      the five gates, deterministic
                   compiler.ts    plain English -> rule (calls /api/rules/compile), validates
                   store.ts       zustand store, persisted as prahari-rules-v1
                   backend.ts     /api client, dev mode (local | backend), judge mode
                   guard.ts       the entry point: sanitize, engine, backend, merge, trace
                   trace.ts       the step list the reasoning panel shows
```

## One check

1. `guard()` sanitizes the input and runs the local engine. That is the verdict if the backend is off.
2. In Backend mode it also sends the action to `POST /api/evaluate`. The server runs `policy.yaml` rules, then the AI judge (`judge.py`, advisory), then custom rules (`custom_rules.py`).
3. The two verdicts are merged and the stricter one wins. A judge failure becomes an escalation, never an allow.
4. The trace (gates, judge reasoning, matched custom rules) is streamed into the reasoning panel.

## Why the LLM is boxed in

- The agent model proposes. Its output is `key: value` lines, parsed leniently and validated.
- The judge can raise a verdict (allow to verify to escalate to block), never lower it.
- Custom rules are compiled once, then enforced by code. The model is not consulted again.

## Surfaces

- `presentation/`: a 1920x1080 stage scaled to the window. Slides are listed in `slides.tsx`. The live slides render `demo/shell/DemoShell` and `demo/policies/PolicyConsole` directly.
- `demo/`: the same shell on its own routes. `registry.ts` wires each domain (scenarios, app, logo, chat context). To add a domain, add `domains/<id>/`, register it, and extend the `Domain` type.
