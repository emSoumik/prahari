import { Component, type ReactNode } from 'react'

/** Wipes the persisted rules (the one thing that can poison a render) and reloads. */
function resetDemo() {
  try {
    localStorage.removeItem('prahari-rules-v1')
  } catch {
    // storage unavailable: the reload alone is the best we can do
  }
  window.location.reload()
}

/** A calm fallback so one broken slide or demo never blanks the whole stage. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Prahari render error', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="fixed inset-0 z-50 grid place-items-center bg-paper p-8 font-sans text-ink">
        <div className="max-w-[420px] text-center">
          <p className="display text-[28px] leading-tight">Something broke</p>
          <p className="mt-2 text-[15px] leading-snug text-ink-2">The demo hit an unexpected state. Resetting clears saved rules and starts fresh.</p>
          <button
            type="button"
            onClick={resetDemo}
            className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-ink px-5 text-[15px] font-semibold text-paper transition-transform active:scale-[0.97]"
          >
            Reset demo
          </button>
        </div>
      </div>
    )
  }
}
