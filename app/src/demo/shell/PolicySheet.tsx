import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import PolicyConsole from '../policies/PolicyConsole'
import type { Domain } from '../../prahari/types'
import { SPRING } from './ui'

/** Right-side sheet over the demo that hosts the policy console. */
export function PolicySheet({
  open,
  domain,
  onClose,
  onOpenDemo,
}: {
  open: boolean
  domain: Domain
  onClose: () => void
  onOpenDemo: (d: Domain) => void
}) {
  const reduce = useReducedMotion()
  const sheet = useRef<HTMLElement>(null)

  // Move focus into the dialog on open and hand it back to the opener on close.
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement
    sheet.current?.focus({ preventScroll: true })
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div key="sheet" className="absolute inset-0 z-40 overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-ink/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.aside
            ref={sheet}
            role="dialog"
            aria-modal="true"
            aria-label="Policies"
            tabIndex={-1}
            className="outline-none absolute top-0 right-0 bottom-0 flex w-[560px] max-w-full flex-col overflow-hidden border-l border-rule bg-paper shadow-[0_0_0_1px_rgb(0_0_0/.02),-24px_0_64px_-24px_rgb(0_0_0/.28)]"
            initial={reduce ? { opacity: 0 } : { x: '100%' }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: '100%' }}
            transition={SPRING}
          >
            <div className="min-h-0 flex-1 overflow-y-auto">
              <PolicyConsole variant="sheet" initialDomain={domain} onOpenDemo={onOpenDemo} onClose={onClose} />
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
