import { AnimatePresence, motion } from 'motion/react'
import { ChevronRight, RefreshCw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useDev } from '../../prahari/backend'
import { hostOf, useLlm } from '../../prahari/llm'
import clsx from 'clsx'

const spring = { type: 'spring', bounce: 0, duration: 0.35 } as const

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid rounded-[10px] bg-ink/5 p-0.5" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={clsx(
            'h-8 rounded-[8px] text-[13px] font-medium transition-[background,color,box-shadow] duration-150 active:scale-[0.97]',
            value === o.id ? 'bg-white text-ink shadow-[0_1px_2px_rgb(0_0_0/.08),0_1px_6px_-2px_rgb(0_0_0/.12)]' : 'text-ink-2',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function StatusDot({ tone }: { tone: 'idle' | 'ok' | 'down' }) {
  return <span className={clsx('inline-block size-2 rounded-full', tone === 'ok' ? 'bg-leaf' : tone === 'down' ? 'bg-alarm' : 'bg-ink-3')} />
}

/** Developer panel: choose the scripted local engine or the localhost backend, and inspect calls. */
export function DevButton() {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)
  const { mode, judge, health, log, setMode, setJudge, checkHealth, clearLog } = useDev()
  const root = useRef<HTMLDivElement>(null)
  const llmModel = useLlm((s) => s.model)
  const llmBase = useLlm((s) => s.baseUrl)
  const modelName = health?.llm?.model || llmModel.trim()
  const modelHost = health?.llm?.baseHost || hostOf(llmBase)
  const connected = health?.ok === true && health.llmKey

  useEffect(() => {
    void checkHealth()
  }, [checkHealth])

  useEffect(() => {
    if (!open) return
    void checkHealth()
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, checkHealth])

  const tone = mode === 'local' ? 'idle' : health?.ok ? 'ok' : 'down'

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex h-[2.3em] items-center gap-2 rounded-full bg-card px-[1em] text-[length:var(--t-ui,13px)] font-medium text-ink ring-1 ring-inset ring-rule transition-transform duration-150 active:scale-[0.97] [@media(hover:hover)]:hover:ring-ink/25"
      >
        <StatusDot tone={tone} />
        {mode === 'local' ? 'Local engine' : 'Backend'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={spring}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-[380px] rounded-[18px] border border-rule bg-card p-4 text-left shadow-[0_1px_2px_rgb(0_0_0/.06),0_18px_48px_-12px_rgb(0_0_0/.22)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">Developer</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid size-7 place-items-center rounded-full text-ink-3 hover:bg-ink/5">
                <X size={14} />
              </button>
            </div>

            <p className="mb-1.5 text-[13px] font-medium">Engine</p>
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { id: 'local', label: 'Local · scripted' },
                { id: 'backend', label: 'Backend · localhost' },
              ]}
            />

            <div className="mt-3 flex items-center justify-between rounded-[12px] bg-paper px-3 py-2.5 text-[13px]">
              <span className="flex items-center gap-2">
                <StatusDot tone={health == null ? 'idle' : health.ok ? 'ok' : 'down'} />
                {health == null ? 'Checking…' : health.ok ? `Online · ${health.llmKey ? 'model connected' : 'no model'}` : 'Offline · local answers instead'}
              </span>
              <button type="button" onClick={() => void checkHealth()} aria-label="Check again" className="grid size-7 place-items-center rounded-full text-ink-2 hover:bg-ink/5">
                <RefreshCw size={13} />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 rounded-[12px] bg-paper px-3 py-2.5 text-[13px]">
              <span className="min-w-0 truncate">
                <span className="text-ink-3">Model </span>
                {connected && modelName ? <span className="font-mono text-[12px]">{modelName}{modelHost ? ` · ${modelHost}` : ''}</span> : 'No model connected'}
              </span>
              <Link to="/app/settings" className="shrink-0 font-medium text-cobalt [@media(hover:hover)]:hover:underline">
                Settings
              </Link>
            </div>
            {health && !health.ok && (
              <p className="mt-2 font-mono text-[11px] leading-relaxed text-ink-3">cd backend && .venv/bin/uvicorn server:app --port 8000</p>
            )}

            <AnimatePresence initial={false}>
              {mode === 'backend' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={spring} className="overflow-hidden">
                  <p className="mb-1.5 mt-4 text-[13px] font-medium">Backend checks</p>
                  <Segmented
                    value={judge}
                    onChange={setJudge}
                    options={[
                      { id: 'rules', label: 'Rules only' },
                      { id: 'hybrid', label: 'Rules + AI judge' },
                    ]}
                  />
                  <p className="mt-2 text-[12px] leading-snug text-ink-3">The browser engine still runs. The stricter verdict wins, and the AI judge can only escalate.</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mb-1.5 mt-4 flex items-center justify-between">
              <p className="text-[13px] font-medium">Recent calls</p>
              {log.length > 0 && (
                <button type="button" onClick={clearLog} className="text-[12px] text-ink-3 hover:text-ink">
                  Clear
                </button>
              )}
            </div>
            <div className="max-h-[260px] overflow-auto rounded-[12px] border border-rule">
              {log.length === 0 ? (
                <p className="px-3 py-4 text-center text-[12px] text-ink-3">No backend calls yet</p>
              ) : (
                log.map((e, i) => (
                  <div key={`${i}-${e.at}`} className="border-b border-rule last:border-b-0">
                    <button type="button" onClick={() => setExpanded(expanded === i ? null : i)} className="flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-[11.5px]">
                      <ChevronRight size={12} className={clsx('shrink-0 text-ink-3 transition-transform duration-150', expanded === i && 'rotate-90')} />
                      <StatusDot tone={e.ok ? 'ok' : 'down'} />
                      <span className="flex-1 truncate">{e.path}</span>
                      <span className="tabular text-ink-3">{Math.round(e.ms)} ms</span>
                    </button>
                    {expanded === i && (
                      <pre className="max-h-[200px] overflow-auto bg-paper px-3 py-2 font-mono text-[10.5px] leading-relaxed text-ink-2">
                        {JSON.stringify({ request: e.request, response: e.response }, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
