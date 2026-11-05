import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Bring-your-own-model settings. Any OpenAI-compatible endpoint works.
 * The key lives in sessionStorage (gone when the tab closes) unless the user chose to remember it
 * on this device. It is sent only to the Prahari backend, in request headers, never to a third party from the browser.
 */

export type ProviderId = 'openai' | 'openrouter' | 'groq' | 'together' | 'ollama' | 'custom'

export interface Provider {
  id: ProviderId
  label: string
  baseUrl: string
  defaultModel: string
  needsKey: boolean
  keyHint: string
  /** Where to get a key (empty when none is needed). */
  docs: string
}

export const PROVIDERS: Provider[] = [
  { id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4.1-mini', needsKey: true, keyHint: 'sk-…', docs: 'https://platform.openai.com/api-keys' },
  { id: 'openrouter', label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', defaultModel: 'openai/gpt-4.1-mini', needsKey: true, keyHint: 'sk-or-…', docs: 'https://openrouter.ai/keys' },
  { id: 'groq', label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.1-8b-instant', needsKey: true, keyHint: 'gsk_…', docs: 'https://console.groq.com/keys' },
  { id: 'together', label: 'Together', baseUrl: 'https://api.together.xyz/v1', defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', needsKey: true, keyHint: 'Paste your key', docs: 'https://api.together.ai/settings/api-keys' },
  { id: 'ollama', label: 'Ollama', baseUrl: 'http://localhost:11434/v1', defaultModel: 'llama3.1', needsKey: false, keyHint: 'Not needed', docs: 'https://ollama.com/download' },
  { id: 'custom', label: 'Custom', baseUrl: '', defaultModel: '', needsKey: true, keyHint: 'Paste your key', docs: '' },
]

export const providerOf = (id: ProviderId): Provider => PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[PROVIDERS.length - 1]

const KEY_NAME = 'prahari-llm-key'

function readKey(remember: boolean): string {
  try {
    return (remember ? localStorage : sessionStorage).getItem(KEY_NAME) ?? ''
  } catch {
    return ''
  }
}

function writeKey(key: string, remember: boolean) {
  try {
    const keep = remember ? localStorage : sessionStorage
    const other = remember ? sessionStorage : localStorage
    other.removeItem(KEY_NAME)
    if (key) keep.setItem(KEY_NAME, key)
    else keep.removeItem(KEY_NAME)
  } catch {
    // storage blocked: the key stays in memory for this tab
  }
}

interface LlmState {
  provider: ProviderId
  baseUrl: string
  model: string
  apiKey: string
  remember: boolean
  /** Pick a preset: fills base URL and model. */
  setProvider: (id: ProviderId) => void
  setBaseUrl: (v: string) => void
  setModel: (v: string) => void
  setApiKey: (v: string) => void
  /** Moves the stored key between session and device storage. */
  setRemember: (v: boolean) => void
  forgetKey: () => void
}

const initialProvider = providerOf('openai')

export const useLlm = create<LlmState>()(
  persist(
    (set, get) => ({
      provider: 'openai',
      baseUrl: initialProvider.baseUrl,
      model: initialProvider.defaultModel,
      apiKey: '',
      remember: false,
      setProvider: (id) => {
        const p = providerOf(id)
        set({ provider: id, baseUrl: p.baseUrl, model: p.defaultModel })
      },
      setBaseUrl: (baseUrl) => set({ baseUrl }),
      setModel: (model) => set({ model }),
      setApiKey: (apiKey) => {
        writeKey(apiKey, get().remember)
        set({ apiKey })
      },
      setRemember: (remember) => {
        writeKey(get().apiKey, remember)
        set({ remember })
      },
      forgetKey: () => {
        try {
          sessionStorage.removeItem(KEY_NAME)
          localStorage.removeItem(KEY_NAME)
        } catch {
          // ignore
        }
        set({ apiKey: '' })
      },
    }),
    {
      name: 'prahari-llm-v1',
      version: 1,
      partialize: (s) => ({ provider: s.provider, baseUrl: s.baseUrl, model: s.model, remember: s.remember }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<LlmState>
        const remember = p.remember === true
        const provider = PROVIDERS.some((x) => x.id === p.provider) ? (p.provider as ProviderId) : current.provider
        return {
          ...current,
          provider,
          baseUrl: typeof p.baseUrl === 'string' ? p.baseUrl : current.baseUrl,
          model: typeof p.model === 'string' ? p.model : current.model,
          remember,
          apiKey: readKey(remember),
        }
      },
    },
  ),
)

/** Headers for every /api call. Only non-empty values; base URL and model go along even without a key (Ollama). */
export function llmHeaders(): Record<string, string> {
  const { apiKey, baseUrl, model } = useLlm.getState()
  const h: Record<string, string> = {}
  if (apiKey.trim()) h['X-LLM-Key'] = apiKey.trim()
  if (baseUrl.trim()) h['X-LLM-Base-URL'] = baseUrl.trim()
  if (model.trim()) h['X-LLM-Model'] = model.trim()
  return h
}

/** Model name for the UI. */
export const modelLabel = (): string => useLlm.getState().model.trim() || 'AI judge'

/** Host part of a base URL, for display. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0]
  }
}

export type TestResult = { ok: true; model: string; latencyMs: number } | { ok: false; error: string }

export async function testConnection(): Promise<TestResult> {
  try {
    const r = await fetch('/api/llm/test', { method: 'POST', headers: { 'content-type': 'application/json', ...llmHeaders() }, body: '{}', signal: AbortSignal.timeout(30000) })
    const j = await r.json().catch(() => null)
    if (j?.ok) return { ok: true, model: String(j.model ?? useLlm.getState().model), latencyMs: Number(j.latency_ms) || 0 }
    return { ok: false, error: String(j?.error ?? j?.detail ?? `The backend answered HTTP ${r.status}`) }
  } catch (e) {
    if (e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError')) return { ok: false, error: 'The model took too long to answer' }
    return { ok: false, error: 'Could not reach the Prahari backend' }
  }
}

export async function listModels(): Promise<{ ok: true; models: string[] } | { ok: false; error: string }> {
  try {
    const r = await fetch('/api/llm/models', { headers: llmHeaders(), signal: AbortSignal.timeout(15000) })
    const j = await r.json().catch(() => null)
    if (r.ok && Array.isArray(j?.models)) return { ok: true, models: j.models.filter((m: unknown): m is string => typeof m === 'string') }
    return { ok: false, error: String(j?.detail ?? j?.error ?? `The backend answered HTTP ${r.status}`) }
  } catch {
    return { ok: false, error: 'Could not reach the Prahari backend' }
  }
}
