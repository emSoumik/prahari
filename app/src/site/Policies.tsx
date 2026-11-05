import clsx from 'clsx'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { COMPILE_STAGES, compileRule, EXAMPLES, ruleJson, type CompileResult } from '../prahari/compiler'
import { DEFAULT_RULES } from '../prahari/rules'
import type { Domain } from '../prahari/types'
import { Arrow, EASE, useInView } from './ui'

const DOMAINS: { id: Domain; label: string }[] = [
  { id: 'food', label: 'Food delivery' },
  { id: 'bank', label: 'Banking' },
  { id: 'hiring', label: 'Hiring' },
]

/** Pretty JSON with keys, strings and numbers tinted. */
function Json({ value }: { value: unknown }) {
  const text = JSON.stringify(value, null, 2)
  const parts = text.split(/("(?:[^"\\]|\\.)*"(?=\s*:)|"(?:[^"\\]|\\.)*"|\b-?\d+(?:\.\d+)?\b|\btrue\b|\bfalse\b)/g)
  return (
    <pre className="s-mono overflow-x-auto whitespace-pre text-[13px] leading-[1.65] text-[var(--ink-2)]">
      {parts.map((p, i) => {
        const next = text.slice(parts.slice(0, i + 1).join('').length).trimStart()
        const isKey = p.startsWith('"') && next.startsWith(':')
        const cls = isKey ? 'text-[var(--ink)]' : p.startsWith('"') ? 'text-[var(--go)]' : /^-?\d|true|false/.test(p) ? 'text-[var(--focus)]' : undefined
        return cls ? <span key={i} className={cls}>{p}</span> : p
      })}
    </pre>
  )
}

export function Policies() {
  const reduce = useReducedMotion()
  const [domain, setDomain] = useState<Domain>('food')
  const [text, setText] = useState(EXAMPLES.food[0])
  const [stage, setStage] = useState<string | null>(null)
  const [result, setResult] = useState<CompileResult | null>(null)
  const busy = stage !== null && result === null
  const frame = useRef<HTMLDivElement>(null)
  const seen = useInView(frame, '-20% 0px')
  const auto = useRef(false)

  const run = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!text.trim() || busy) return
    setResult(null)
    const r = await compileRule(text, domain, DEFAULT_RULES, (s) => setStage(s))
    setResult(r)
  }

  // compile the first example once, the first time the widget is on screen
  useEffect(() => {
    if (!seen || auto.current) return
    auto.current = true
    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen])

  return (
    <section id="policies" className="s-section" aria-labelledby="policies-h">
      <div className="s-wrap s-grid gap-y-10">
        <div className="col-span-12 lg:col-span-5">
          <h2 id="policies-h" className="s-display s-h2">Policies written as sentences, enforced as code</h2>
          <p className="s-lead mt-5">
            Write a rule the way you would tell a new hire. It is compiled once into a strict rule, checked, and then code enforces
            it on every action. The model is never asked again.
          </p>
          <Link to="/app/policies" className="s-btn s-btn--ghost mt-8">
            Open the policy console
            <Arrow />
          </Link>
        </div>

        <div className="col-span-12 lg:col-span-7">
          <div ref={frame} className="s-frame">
            <form onSubmit={run} className="border-b border-[var(--line)] p-5">
              <div className="flex flex-wrap items-center gap-2">
                {DOMAINS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={domain === d.id}
                    onClick={() => {
                      setDomain(d.id)
                      setText(EXAMPLES[d.id][0])
                      setResult(null)
                      setStage(null)
                    }}
                    className="s-chip !h-8 !text-[13.5px]"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <label htmlFor="rule-text" className="s-label mt-5 block">Rule</label>
              <textarea
                id="rule-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void run()
                }}
                rows={2}
                className="s-display mt-1.5 w-full resize-none bg-transparent text-[24px] leading-[1.2] outline-none placeholder:text-[var(--ink-3)] md:text-[28px]"
                style={{ letterSpacing: '-0.025em', fontWeight: 500 }}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {EXAMPLES[domain].slice(1).map((ex) => (
                  <button key={ex} type="button" onClick={() => { setText(ex); setResult(null); setStage(null) }} className="s-chip !h-auto min-h-8 !whitespace-normal py-1.5 text-left !text-[13px] !text-[var(--ink-2)]">
                    {ex}
                  </button>
                ))}
                <button type="submit" disabled={busy || !text.trim()} className="s-btn s-btn--solid s-btn--sm ml-auto disabled:opacity-40">
                  {busy ? 'Compiling' : 'Compile rule'}
                </button>
              </div>
            </form>

            <div className="grid grid-cols-1 md:min-h-[300px] md:grid-cols-[230px_1fr]">
              <ol className="grid grid-cols-2 gap-3 border-b md:flex border-[var(--line)] p-5 md:flex-col md:gap-3 md:border-r md:border-b-0">
                {COMPILE_STAGES.map((s, i) => {
                  const at = COMPILE_STAGES.findIndex((x) => x.id === stage)
                  const done = result ? true : at > i
                  const now = !result && at === i
                  return (
                    <li key={s.id} className="flex shrink-0 items-center gap-2.5 text-[13.5px]">
                      <span
                        className={clsx('grid size-5 place-items-center rounded-full transition-colors duration-300', done ? 'bg-[var(--ink)] text-white' : now ? 'bg-white shadow-[inset_0_0_0_1.5px_var(--ink)]' : 'shadow-[inset_0_0_0_1px_var(--line-2)]')}
                      >
                        {done && (
                          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden>
                            <path d="m3 7.3 2.6 2.5L11 4.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {now && <span className="s-live size-1.5 rounded-full bg-[var(--ink)]" />}
                      </span>
                      <span className={done || now ? 'text-[var(--ink)]' : 'text-[var(--ink-3)]'}>{s.label}</span>
                    </li>
                  )
                })}
              </ol>
              <div className="relative min-w-0 p-5" aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                  {result?.ok ? (
                    <motion.div key="ok" initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-7 items-center rounded-full bg-[var(--go-soft)] px-3 text-[13px] font-medium text-[var(--go)]">Valid rule</span>
                        <span className="inline-flex h-7 items-center rounded-full bg-[var(--tint)] px-3 text-[13px] text-[var(--ink-2)] shadow-[inset_0_0_0_1px_var(--line)]">
                          {result.rule.gate} gate · {result.rule.effect.replace('_', ' ')}
                        </span>
                      </div>
                      <Json value={ruleJson(result.rule)} />
                    </motion.div>
                  ) : result && !result.ok ? (
                    <motion.p key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[15px] text-[var(--stop)]">
                      {result.message}
                    </motion.p>
                  ) : (
                    <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[14.5px] text-[var(--ink-3)]">
                      {busy ? 'Reading the sentence' : 'Press Compile rule to see the JSON that code will enforce.'}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
