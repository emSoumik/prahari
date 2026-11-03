import clsx from 'clsx'
import { motion, useReducedMotion } from 'motion/react'
import { MessageSquareLock, X } from 'lucide-react'
import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react'
import { EASE_DRAWER } from '../../shell/ui'

const LENGTH = 6
const RESEND_S = 30
const NAVY = '#004C8F'

/**
 * Bottom sheet that rises inside the guarded pane when Prahari asks for step-up auth.
 * Any 6 digits verify (it's a demo). Render inside <AnimatePresence>.
 */
export function OtpSheet({ mobile, onVerify, onClose }: { mobile: string; onVerify: () => void; onClose: () => void }) {
  const reduce = useReducedMotion()
  const [digits, setDigits] = useState<string[]>(() => Array(LENGTH).fill(''))
  const [left, setLeft] = useState(RESEND_S)
  const [sent, setSent] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const complete = digits.every((d) => d !== '')

  useEffect(() => {
    const opener = document.activeElement
    const t = window.setTimeout(() => inputs.current[0]?.focus({ preventScroll: true }), 320)
    return () => {
      window.clearTimeout(t)
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])

  useEffect(() => {
    if (left <= 0) return
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [left])

  const focus = (i: number) => inputs.current[Math.max(0, Math.min(LENGTH - 1, i))]?.focus()

  const fill = (from: number, chars: string) => {
    const clean = chars.replace(/\D/g, '').slice(0, LENGTH - from)
    if (!clean) return
    setDigits((prev) => {
      const next = [...prev]
      for (let k = 0; k < clean.length; k++) next[from + k] = clean[k]
      return next
    })
    focus(from + clean.length)
  }

  const onChange = (i: number, value: string) => {
    if (value === '') {
      setDigits((prev) => prev.map((d, k) => (k === i ? '' : d)))
      return
    }
    const v = value.replace(/\D/g, '')
    // Typing into a box that already holds a digit: keep only the new one.
    if (v.length === 2 && digits[i]) fill(i, v.startsWith(digits[i]) ? v.slice(1) : v.slice(0, 1))
    else fill(i, v)
  }

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      e.preventDefault()
      setDigits((prev) => prev.map((d, k) => (k === i - 1 ? '' : d)))
      focus(i - 1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      focus(i - 1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      focus(i + 1)
    }
  }

  /** Escape closes; Tab cycles inside the sheet so focus never reaches the page behind it. */
  const onSheetKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')]
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (e.shiftKey && (active === first || !e.currentTarget.contains(active))) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && (active === last || !e.currentTarget.contains(active))) {
      e.preventDefault()
      first.focus()
    }
  }

  const onPaste = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    fill(i, e.clipboardData.getData('text'))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (complete) onVerify()
  }

  const resend = () => {
    setLeft(RESEND_S)
    setSent(true)
    setDigits(Array(LENGTH).fill(''))
    focus(0)
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end">
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-[#0B1B2E]/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
      />
      <motion.form
        role="dialog"
        aria-modal="true"
        aria-labelledby="otp-title"
        onSubmit={submit}
        onKeyDown={onSheetKeyDown}
        className="relative rounded-t-[20px] bg-card px-5 pt-3 pb-5 shadow-[0_-1px_2px_rgb(0_0_0/.06),0_-16px_40px_-12px_rgb(0_0_0/.25)]"
        initial={reduce ? { opacity: 0 } : { y: '100%' }}
        animate={reduce ? { opacity: 1 } : { y: 0 }}
        exit={reduce ? { opacity: 0 } : { y: '100%' }}
        transition={{ duration: 0.5, ease: EASE_DRAWER }}
      >
        <span aria-hidden className="mx-auto mb-3 block h-1 w-9 rounded-full bg-[#D5DAE1]" />
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#E8F0F8]" style={{ color: NAVY }}>
            <MessageSquareLock size={17} strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <p id="otp-title" className="text-[16px] font-semibold leading-6 text-[#1B2733]">
              Enter the OTP sent to <span className="tabular">{mobile}</span>
            </p>
            <p className="text-[12.5px] leading-[18px] text-[#6B7785]">
              {sent ? 'A new OTP is on its way.' : 'Valid for 3 minutes. HDFC Bank will never call you to ask for it.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 -mr-2 grid size-8 shrink-0 place-items-center rounded-full text-[#6B7785] transition-transform duration-150 active:scale-[0.97] [@media(hover:hover)]:hover:bg-[#F1F3F6]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 flex justify-center gap-2" role="group" aria-label="One-time password">
          {digits.map((d, i) => (
            <input
              key={i}
              data-deck-ignore-keys
              ref={(el) => {
                inputs.current[i] = el
              }}
              value={d}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              pattern="[0-9]*"
              maxLength={LENGTH}
              aria-label={`Digit ${i + 1}`}
              onChange={(e) => onChange(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onPaste={(e) => onPaste(i, e)}
              onFocus={(e) => e.target.select()}
              className={clsx(
                'h-12 w-11 rounded-[10px] bg-card text-center text-[20px] font-semibold tabular text-[#1B2733] ring-1 ring-inset outline-none transition-shadow duration-150',
                'focus:ring-2 focus:ring-[#004C8F]',
                d ? 'ring-[#9FB3C8]' : 'ring-[#D5DAE1]',
              )}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <p className="min-w-0 flex-1 text-[12.5px] text-[#6B7785]">
            {left > 0 ? (
              <>
                Resend OTP in <span className="font-medium tabular text-[#1B2733]">0:{String(left).padStart(2, '0')}</span>
              </>
            ) : (
              <button type="button" onClick={resend} className="font-semibold underline-offset-2 [@media(hover:hover)]:hover:underline" style={{ color: NAVY }}>
                Resend OTP
              </button>
            )}
          </p>
          <button
            type="submit"
            disabled={!complete}
            className="inline-flex h-10 items-center rounded-[10px] px-6 text-[14px] font-semibold text-white transition-[transform,opacity] duration-150 active:scale-[0.97] disabled:opacity-40"
            style={{ backgroundColor: NAVY }}
          >
            Verify
          </button>
        </div>
      </motion.form>
    </div>
  )
}
