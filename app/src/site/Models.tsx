import { useState } from 'react'
import { Link } from 'react-router'
import { PROVIDERS } from './content'
import { Arrow } from './ui'

const ENV = `OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4.1-mini`

export function Models() {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ENV)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section id="models" className="s-section" aria-labelledby="models-h">
      <div className="s-wrap s-grid gap-y-10">
        <div className="col-span-12 lg:col-span-5">
          <h2 id="models-h" className="s-display s-h2">Works with the model you already use</h2>
          <p className="s-lead mt-5">
            Any OpenAI‑compatible endpoint runs the agent, the AI judge and the rule compiler. Paste a key in the app, or set three lines on
            the server.
          </p>
          <ul className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PROVIDERS.map((p) => (
              <li key={p.name} className="flex h-14 items-center gap-3 rounded-[14px] px-4 shadow-[inset_0_0_0_1px_var(--line)]">
                <img src={p.icon} alt="" width={p.w} height={p.h} className="shrink-0" style={{ height: Math.min(p.h, 24), width: 'auto' }} />
                {p.name !== 'Groq' && <span className="text-[14.5px] font-medium">{p.name}</span>}
                {p.name === 'Groq' && <span className="sr-only">Groq</span>}
              </li>
            ))}
            <li className="flex h-14 items-center rounded-[14px] px-4 text-[14.5px] font-medium shadow-[inset_0_0_0_1px_var(--line)]">Together</li>
            <li className="flex h-14 items-center rounded-[14px] px-4 text-[14.5px] text-[var(--ink-2)] shadow-[inset_0_0_0_1px_var(--line)]">
              Any <span className="s-mono mx-1">/v1</span> server
            </li>
          </ul>
        </div>

        <div className="col-span-12 flex flex-col gap-4 lg:col-span-6 lg:col-start-7">
          {/* the app's Model page, as it looks */}
          <div className="s-frame">
            <div className="flex h-11 items-center border-b border-[var(--line)] px-5 text-[13.5px] font-medium">Model</div>
            <div className="flex flex-col gap-4 p-5">
              <div className="flex flex-wrap gap-1.5">
                {['OpenAI', 'OpenRouter', 'Groq', 'Together', 'Ollama', 'Custom'].map((p, i) => (
                  <span key={p} className={i === 0 ? 's-chip !h-8 !bg-[var(--ink)] !text-[13px] !text-white !shadow-none' : 's-chip !h-8 !text-[13px] !text-[var(--ink-2)]'}>
                    {p}
                  </span>
                ))}
              </div>
              <Field label="Model" value="gpt-4.1-mini" />
              <Field label="API key" value="sk-proj-••••••••••••••••••••4f2a" mono />
              <div className="flex items-center gap-3 rounded-[12px] bg-[var(--go-soft)] px-4 py-3 text-[14px] text-[var(--go)]">
                <span className="s-dot bg-[var(--go)]" />
                Connected · gpt-4.1-mini · 0.8 s
              </div>
            </div>
          </div>
          <div className="s-frame">
            <div className="flex h-11 items-center justify-between border-b border-[var(--line)] px-5">
              <span className="s-mono text-[var(--ink-3)]">backend/.env</span>
              <button type="button" onClick={copy} className="s-link text-[13px] text-[var(--ink-2)] hover:text-[var(--ink)]">
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="s-mono overflow-x-auto p-5 text-[13.5px] leading-[1.75]">
              {ENV.split('\n').map((l) => {
                const [k, v] = l.split('=')
                return (
                  <span key={k} className="block">
                    <span className="text-[var(--ink)]">{k}</span>
                    <span className="text-[var(--ink-3)]">=</span>
                    <span className="text-[var(--go)]">{v}</span>
                  </span>
                )
              })}
            </pre>
          </div>
          <Link to="/app/settings" className="s-btn s-btn--solid w-fit">
            Add your key
            <Arrow />
          </Link>
          <p className="text-[14px] leading-snug text-[var(--ink-3)]">
            A key pasted in the app stays in your browser and is sent only to your own Prahari server, which passes it to the provider. It is never
            written to disk or logs.
          </p>
        </div>
      </div>
    </section>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="s-label block">{label}</span>
      <span className={`mt-1.5 flex h-11 items-center rounded-[12px] px-4 text-[15px] shadow-[inset_0_0_0_1px_var(--line-2)] ${mono ? 's-mono !text-[14px]' : ''}`}>{value}</span>
    </div>
  )
}
