import { AnimatePresence, motion } from 'motion/react'
import { Check, ExternalLink, Eye, EyeOff, LoaderCircle, ServerOff } from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import clsx from 'clsx'
import { useDev } from '../prahari/backend'
import { listModels, PROVIDERS, providerOf, testConnection, useLlm, type TestResult } from '../prahari/llm'
import { SPRING } from '../demo/shell/ui'
import { useTitle } from './useTitle'

const CARD = 'rounded-[20px] bg-card ring-1 ring-rule shadow-[0_1px_2px_rgb(0_0_0/.06),0_8px_24px_-8px_rgb(0_0_0/.12)]'
const INPUT =
  'h-12 w-full rounded-[12px] bg-paper px-3.5 text-[16px] text-ink ring-1 ring-inset ring-rule placeholder:text-ink-3 transition-shadow duration-150 focus-visible:outline-2 focus-visible:outline-offset-0 md:h-11'
const BTN_PRIMARY =
  'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[15px] font-medium text-paper transition-transform duration-150 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 md:h-11'
const BTN_QUIET =
  'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-card px-5 text-[15px] font-medium ring-1 ring-rule transition-transform duration-150 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 md:h-11 [@media(hover:hover)]:hover:ring-ink/25'

function Field({ label, htmlFor, aside, children }: { label: string; htmlFor: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[14px] font-medium">
          {label}
        </label>
        {aside}
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  useTitle('Model')
  const navigate = useNavigate()
  const id = useId()
  const { provider, baseUrl, model, apiKey, remember, setProvider, setBaseUrl, setModel, setApiKey, setRemember, forgetKey } = useLlm()
  const health = useDev((s) => s.health)
  const checkHealth = useDev((s) => s.checkHealth)
  const [show, setShow] = useState(false)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [models, setModels] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelsError, setModelsError] = useState('')
  const p = providerOf(provider)
  const offline = health != null && !health.ok

  // an old result says nothing about new settings
  useEffect(() => {
    setResult(null)
  }, [baseUrl, model, apiKey])

  useEffect(() => {
    setModels([])
    setModelsError('')
  }, [provider, baseUrl, apiKey])

  async function runTest() {
    if (testing) return
    setTesting(true)
    setResult(null)
    setResult(await testConnection())
    setTesting(false)
  }

  async function loadModels() {
    setLoadingModels(true)
    setModelsError('')
    const r = await listModels()
    if (r.ok) setModels(r.models)
    else setModelsError(r.error)
    setLoadingModels(false)
  }

  function useMine() {
    const dev = useDev.getState()
    dev.setMode('backend')
    dev.setJudge('hybrid')
    void checkHealth()
    navigate('/app')
  }

  const canTest = baseUrl.trim() !== '' && model.trim() !== '' && (!p.needsKey || apiKey.trim() !== '' || provider === 'custom')

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pt-6 md:px-8 md:pt-12">
      <h1 className="display text-[40px] md:text-[56px]">Model</h1>
      <p className="mt-3 max-w-[56ch] text-[16px] leading-snug text-ink-2 md:text-[17px]">
        Any OpenAI-compatible endpoint works. The model runs the agent&rsquo;s free chat, the AI judge and rule compiling. Rules and gates never depend on it.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 md:mt-10 md:grid-cols-12 md:gap-8">
        <form
          className={clsx(CARD, 'p-5 md:col-span-7 md:p-7')}
          onSubmit={(e) => {
            e.preventDefault()
            if (canTest) void runTest()
          }}
        >
          <fieldset>
            <legend className="mb-2 text-[14px] font-medium">Provider</legend>
            <div
              role="radiogroup"
              aria-label="Provider"
              className="-mx-5 flex flex-col divide-y divide-rule border-y border-rule md:mx-0 md:grid md:grid-cols-3 md:gap-2 md:divide-y-0 md:border-0"
            >
              {PROVIDERS.map((x) => {
                const on = x.id === provider
                return (
                  <button
                    key={x.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setProvider(x.id)}
                    className={clsx(
                      'flex h-12 items-center justify-between px-5 text-left text-[16px] transition-colors duration-150 active:bg-ink/[0.04]',
                      'md:h-11 md:justify-center md:rounded-full md:px-3 md:text-[14px] md:font-medium md:ring-1 md:ring-inset md:active:scale-[0.97]',
                      on ? 'md:bg-ink md:text-paper md:ring-ink' : 'md:bg-paper md:text-ink-2 md:ring-rule [@media(hover:hover)]:md:hover:ring-ink/30',
                    )}
                  >
                    {x.label}
                    <Check size={18} strokeWidth={2.4} className={clsx('text-cobalt md:hidden', !on && 'invisible')} />
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div className="mt-6 space-y-5">
            <Field label="Base URL" htmlFor={`${id}-url`}>
              <input
                id={`${id}-url`}
                type="url"
                inputMode="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://…/v1"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                className={clsx(INPUT, 'font-mono text-[16px]')}
              />
            </Field>

            <Field
              label="Model"
              htmlFor={`${id}-model`}
              aside={
                <button
                  type="button"
                  onClick={() => void loadModels()}
                  disabled={loadingModels || offline}
                  className="-my-2 inline-flex h-11 items-center gap-1.5 rounded-full px-2 text-[14px] font-medium text-cobalt disabled:opacity-50 active:scale-[0.97] [@media(hover:hover)]:hover:underline"
                >
                  {loadingModels && <LoaderCircle size={14} className="animate-spin" />}
                  Load models
                </button>
              }
            >
              <input
                id={`${id}-model`}
                list={`${id}-models`}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={p.defaultModel || 'model name'}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                className={clsx(INPUT, 'font-mono')}
              />
              <datalist id={`${id}-models`}>
                {models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              {models.length > 0 && <p className="mt-1.5 text-[13px] text-ink-3">{models.length} models found. Start typing to pick one.</p>}
              {modelsError && <p className="mt-1.5 text-[13px] text-alarm">{modelsError}</p>}
            </Field>

            <Field
              label="API key"
              htmlFor={`${id}-key`}
              aside={
                p.docs ? (
                  <a href={p.docs} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] text-cobalt [@media(hover:hover)]:hover:underline">
                    {p.needsKey ? `Get a ${p.label} key` : `Get ${p.label}`}
                    <ExternalLink size={12} />
                  </a>
                ) : null
              }
            >
              <div className="relative">
                <input
                  id={`${id}-key`}
                  type={show ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={p.keyHint}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-1p-ignore
                  data-lpignore="true"
                  className={clsx(INPUT, 'pr-12 font-mono')}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? 'Hide key' : 'Show key'}
                  aria-pressed={show}
                  className="absolute right-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full text-ink-3 active:scale-[0.97] [@media(hover:hover)]:hover:text-ink"
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {!p.needsKey && <p className="mt-1.5 text-[13px] text-ink-3">Ollama runs on your machine and needs no key.</p>}
            </Field>

            <div className="flex min-h-11 items-center justify-between gap-4">
              <div>
                <p id={`${id}-rem`} className="text-[14px] font-medium">Remember on this device</p>
                <p className="text-[13px] leading-snug text-ink-3">Off: the key is gone when you close this tab.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={remember}
                aria-labelledby={`${id}-rem`}
                onClick={() => setRemember(!remember)}
                className="-mr-2 grid h-11 w-16 shrink-0 place-items-center active:scale-[0.97]"
              >
                <span className={clsx('relative block h-[30px] w-[50px] rounded-full transition-colors duration-200', remember ? 'bg-leaf' : 'bg-ink/20')}>
                  <motion.span
                    animate={{ x: remember ? 20 : 0 }}
                    transition={SPRING}
                    className="absolute left-[3px] top-[3px] size-6 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/.25)]"
                  />
                </span>
              </button>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 md:flex-row md:items-center">
            {result?.ok ? (
              <button type="button" onClick={useMine} className={BTN_PRIMARY}>
                Use my model
              </button>
            ) : (
              <button type="submit" disabled={testing || !canTest} className={BTN_PRIMARY}>
                {testing && <LoaderCircle size={16} className="animate-spin" />}
                {testing ? 'Testing…' : 'Test connection'}
              </button>
            )}
            {result?.ok && (
              <button type="button" onClick={() => void runTest()} disabled={testing} className={BTN_QUIET}>
                Test again
              </button>
            )}
            {apiKey && (
              <button type="button" onClick={forgetKey} className="inline-flex h-12 items-center justify-center rounded-full px-4 text-[15px] font-medium text-ink-2 active:scale-[0.97] md:h-11 [@media(hover:hover)]:hover:text-ink">
                Forget key
              </button>
            )}
          </div>

          <div aria-live="polite" className="mt-4 empty:hidden">
            <AnimatePresence initial={false}>
              {result && (
                <motion.p
                  key={result.ok ? 'ok' : 'err'}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={SPRING}
                  className={clsx('flex items-start gap-2 rounded-[12px] px-3.5 py-3 text-[14px] leading-snug', result.ok ? 'bg-leaf-soft text-leaf' : 'bg-alarm-soft text-alarm')}
                >
                  <span className={clsx('mt-[7px] size-2 shrink-0 rounded-full', result.ok ? 'bg-leaf' : 'bg-alarm')} />
                  <span>{result.ok ? `Connected · ${result.model} · ${(result.latencyMs / 1000).toFixed(1)} s` : result.error}</span>
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </form>

        <aside className="space-y-6 md:col-span-5">
          {offline && (
            <section className={clsx(CARD, 'p-5 md:p-6')}>
              <span className="grid size-10 place-items-center rounded-full bg-amber-soft text-[#9A6412]">
                <ServerOff size={18} />
              </span>
              <h2 className="display mt-4 text-[24px]">Backend is not running</h2>
              <p className="mt-2 text-[15px] leading-snug text-ink-2">Start it to test a model. The demos still work on the local engine.</p>
              <pre className="mt-3 whitespace-pre-wrap break-all rounded-[12px] bg-paper px-3.5 py-3 font-mono text-[12.5px] leading-relaxed text-ink-2">cd backend && .venv/bin/uvicorn server:app --port 8000</pre>
              <button type="button" onClick={() => void checkHealth()} className={clsx(BTN_QUIET, 'mt-4')}>
                Check again
              </button>
            </section>
          )}
          <section className="px-1 md:px-2">
            <h2 className="display text-[24px]">Where your key goes</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
              It is stored in this browser, for this tab only or on this device if you switch on Remember. It is sent only to your Prahari backend on this machine, with each request. The backend forwards it to your provider. It is never written to disk or to logs.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
