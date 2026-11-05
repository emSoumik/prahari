import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { SPRING } from './ui'

/**
 * Phone bottom sheet: backdrop, drag handle, drag-to-dismiss (distance or velocity),
 * spring open/close, internal scroll, safe-area bottom. Only the handle zone drags,
 * so the content scrolls freely. Renders inside a positioned parent (the shell root).
 */
export function BottomSheet({
  open,
  onClose,
  label,
  height,
  header,
  children,
}: {
  open: boolean
  onClose: () => void
  label: string
  /** Fixed CSS height (e.g. '85dvh'). Without it the sheet fits its content, capped at 85dvh. */
  height?: string
  /** Optional title row that sits next to the handle and also drags. */
  header?: ReactNode
  children: ReactNode
}) {
  const reduce = useReducedMotion()
  const controls = useDragControls()
  const sheet = useRef<HTMLDivElement>(null)

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
        <div key="sheet" className="absolute inset-0 z-40 flex flex-col justify-end overflow-hidden">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-ink/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            ref={sheet}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            style={{ height, maxHeight: '85dvh' }}
            className="relative flex flex-col overflow-hidden rounded-t-[22px] bg-paper outline-none shadow-[0_-1px_2px_rgb(0_0_0/.06),0_-16px_40px_-12px_rgb(0_0_0/.25)]"
            initial={reduce ? { opacity: 0 } : { y: '100%' }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '100%' }}
            transition={SPRING}
            drag={reduce ? false : 'y'}
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            dragMomentum={false}
            dragSnapToOrigin
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose()
            }}
          >
            <div
              className="shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
              onPointerDown={(e) => controls.start(e)}
            >
              <span aria-hidden className="mx-auto mt-2.5 mb-1.5 block h-1 w-9 rounded-full bg-ink/20" />
              {header}
            </div>
            <div className="flex min-h-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)]">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
