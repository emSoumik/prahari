import clsx from 'clsx'
import { ArrowUp, Check } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { Scenario } from '../../prahari/types'

/** Preset chips plus a free-text box. Sends the same message to both panes. */
export function Composer({
  scenarios,
  busy,
  placeholder,
  onSend,
  mobile,
}: {
  scenarios: Scenario[]
  busy: boolean
  placeholder: string
  onSend: (text: string) => void
  /** Phone layout: pinned strip with a scrolling chip row and a 44px send button. */
  mobile?: boolean
}) {
  const [text, setText] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (busy || !text.trim()) return
    onSend(text)
    setText('')
  }

  if (mobile) {
    return (
      <div className="shrink-0 border-t border-rule bg-paper pt-2.5 pb-[max(10px,env(safe-area-inset-bottom))] text-(length:--t-ui)">
        <div className="mb-2.5 flex snap-x items-center gap-2 overflow-x-auto overscroll-x-contain px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,#000_12px,#000_calc(100%-24px),transparent)]">
          {scenarios.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={busy}
              onClick={(e) => {
                e.currentTarget.blur()
                onSend(s.prompt)
              }}
              className="relative inline-flex h-10 shrink-0 snap-start items-center gap-1.5 rounded-full bg-card px-4 text-(length:--t-label) font-medium text-ink ring-1 ring-inset ring-rule transition-[transform,opacity] duration-150 before:absolute before:-inset-y-0.5 before:inset-x-0 before:content-[''] active:scale-[0.97] disabled:opacity-45"
            >
              {s.genuine && (
                <span className="grid size-4 place-items-center rounded-full bg-leaf text-paper" aria-label="Genuine request">
                  <Check size={10} strokeWidth={3.5} />
                </span>
              )}
              {s.label}
            </button>
          ))}
        </div>
        <form
          onSubmit={submit}
          className="mx-3 flex items-center gap-1.5 rounded-full bg-card py-1 pr-1 pl-4 ring-1 ring-inset ring-rule shadow-[0_1px_2px_rgb(0_0_0/.04)]"
        >
          <input
            data-deck-ignore-keys
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            aria-label="Message both agents"
            enterKeyHint="send"
            className="h-11 min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-3"
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            aria-label="Send to both"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-paper transition-[transform,opacity] duration-150 active:scale-[0.95] disabled:opacity-35"
          >
            <ArrowUp size={19} strokeWidth={2.5} />
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="shrink-0 px-5 pt-4 pb-5 text-(length:--t-ui)">
      <div className="mb-3 flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
        <span className="mr-1 shrink-0 text-(length:--t-small) font-medium text-ink-3">Try</span>
        {scenarios.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.currentTarget.blur()
              onSend(s.prompt)
            }}
            title={s.prompt}
            className={clsx(
              'inline-flex h-[2.4em] shrink-0 items-center gap-1.5 rounded-full bg-card px-[1.1em] text-(length:--t-ui) font-medium text-ink ring-1 ring-inset ring-rule transition-[transform,opacity,box-shadow] duration-150 active:scale-[0.97] disabled:opacity-45',
              '[@media(hover:hover)]:hover:ring-ink/25',
            )}
          >
            {s.genuine && (
              <span className="grid size-[1.1em] place-items-center rounded-full bg-leaf text-paper" aria-label="Genuine request">
                <Check size={10} strokeWidth={3.5} />
              </span>
            )}
            {s.label}
          </button>
        ))}
      </div>
      <form
        onSubmit={submit}
        className="flex items-center gap-2 rounded-[20px] bg-card p-1.5 ring-1 ring-inset ring-rule shadow-[0_1px_2px_rgb(0_0_0/.04),0_8px_24px_-12px_rgb(0_0_0/.12)]"
      >
        <input
          data-deck-ignore-keys
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          aria-label="Message both agents"
          className="h-[2.9em] min-w-0 flex-1 rounded-[14px] bg-transparent px-3 text-(length:--t-label) text-ink outline-none placeholder:text-ink-3"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="inline-flex h-[2.9em] shrink-0 items-center gap-1.5 rounded-[14px] bg-ink px-[1.4em] text-(length:--t-ui) font-semibold text-paper transition-[transform,opacity] duration-150 active:scale-[0.97] disabled:opacity-35"
        >
          Send to both
          <ArrowUp size={15} strokeWidth={2.5} />
        </button>
      </form>
    </div>
  )
}
