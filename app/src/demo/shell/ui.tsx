import clsx from 'clsx'
import { motion, useReducedMotion } from 'motion/react'
import { createContext, useContext, useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import type { Verdict } from '../../prahari/types'

/** Shared building blocks for the shell and the domain apps. */

export const SPRING = { type: 'spring', bounce: 0, duration: 0.45 } as const
/** Strong ease-out for things entering the screen. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const
/** iOS sheet curve (Vaul): a very steep start, so 0.5 s never feels slow. */
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const

/* ------------------------------------------------------------- type scale */

/**
 * Two sizes for the whole demo. `lg` is the projector size: the deck's 1920×1080
 * stage, or a /demo page at least that big. `md` is a laptop (e.g. 1440×900).
 * The shell measures itself and sets these as CSS variables, so every app uses
 * `text-(length:--t-body)` and never branches on size for type.
 */
export type ShellSize = 'lg' | 'md'

export const TYPE_VARS: Record<ShellSize, CSSProperties> = {
  lg: {
    '--t-meta': '13px',
    '--t-small': '14px',
    '--t-ui': '15px',
    '--t-label': '16px',
    '--t-body': '17px',
    '--t-title': '19px',
    '--t-amount': '24px',
    '--t-verdict': '34px',
    '--s-inset': '16px',
  } as CSSProperties,
  md: {
    '--t-meta': '11.5px',
    '--t-small': '12.5px',
    '--t-ui': '13px',
    '--t-label': '14px',
    '--t-body': '14.5px',
    '--t-title': '15.5px',
    '--t-amount': '18px',
    '--t-verdict': '26px',
    '--s-inset': '12px',
  } as CSSProperties,
}

export const ShellSizeContext = createContext<ShellSize>('md')
export const useShellSize = () => useContext(ShellSizeContext)

/* ---------------------------------------------------------------- verdicts */

export const VERDICT_META: Record<Verdict, { label: string; by: string; text: string; bg: string; dot: string; ring: string }> = {
  allow: { label: 'Allowed', by: 'Allowed by Prahari', text: 'text-leaf', bg: 'bg-leaf-soft', dot: 'bg-leaf', ring: 'ring-leaf/25' },
  // Blocked is good news on the guarded side, so it is ink, never alarm red: red belongs to the damage on the left.
  block: { label: 'Blocked', by: 'Blocked by Prahari', text: 'text-ink', bg: 'bg-ink/[0.06]', dot: 'bg-ink', ring: 'ring-ink/15' },
  escalate: { label: 'Escalated', by: 'Sent to a person by Prahari', text: 'text-[#9A6412]', bg: 'bg-amber-soft', dot: 'bg-amber', ring: 'ring-amber/30' },
  verify: { label: 'Verify first', by: 'Prahari asked for an OTP', text: 'text-[#9A6412]', bg: 'bg-amber-soft', dot: 'bg-amber', ring: 'ring-amber/30' },
}

/** `label` overrides the default wording, for apps whose verify step is not an OTP screen. */
export function VerdictPill({ verdict, className, label }: { verdict: Verdict | null; className?: string; label?: string }) {
  const m = verdict ? VERDICT_META[verdict] : null
  return (
    <span
      className={clsx(
        'inline-flex h-[2em] shrink-0 items-center gap-[0.55em] rounded-full px-[0.85em] text-(length:--t-ui) font-semibold whitespace-nowrap ring-1 ring-inset',
        m ? [m.text, m.bg, m.ring] : 'bg-paper-2 text-ink-2 ring-rule',
        className,
      )}
    >
      <span className={clsx('size-[0.45em] rounded-full', m ? m.dot : 'bg-ink-3')} />
      {m ? (label ?? m.label) : 'No action'}
    </span>
  )
}

/** Three dots that pulse in sequence. */
export function TypingDots({ className }: { className?: string }) {
  const reduce = useReducedMotion()
  return (
    <span className={clsx('inline-flex items-center gap-1', className)} aria-label="Typing">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-current"
          initial={{ opacity: 0.25 }}
          animate={reduce ? { opacity: 0.6 } : { opacity: [0.25, 1, 0.25] }}
          transition={reduce ? { duration: 0 } : { duration: 1.1, repeat: Infinity, delay: i * 0.16, ease: 'easeInOut' }}
        />
      ))}
    </span>
  )
}

/** Wraps a message or card so it rises in from below. */
export function RiseIn({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Keeps a scroll container pinned to the bottom while its content grows
 * (new messages, streaming trace steps). Put `scrollRef` on the scroller and
 * `contentRef` on its single child.
 */
export function useStickToBottom<S extends HTMLElement = HTMLDivElement, C extends HTMLElement = HTMLDivElement>() {
  const scrollRef = useRef<S>(null)
  const contentRef = useRef<C>(null)
  useEffect(() => {
    const scroller = scrollRef.current
    const content = contentRef.current
    if (!scroller || !content) return
    const ro = new ResizeObserver(() => {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' })
    })
    ro.observe(content)
    ro.observe(scroller)    // the pinned verdict card shrinks the scroller after the last step lands
    return () => ro.disconnect()
  }, [])
  return { scrollRef, contentRef }
}

/** The mono Swiggy glyph, tinted with CSS mask. */
export function SwiggyGlyph({ size = 16, color = '#FC8019', className }: { size?: number | string; color?: string; className?: string }) {
  const mask: CSSProperties = {
    width: size,
    height: size,
    backgroundColor: color,
    WebkitMaskImage: 'url(/logos/swiggy-glyph.svg)',
    maskImage: 'url(/logos/swiggy-glyph.svg)',
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
  }
  return <span aria-hidden className={clsx('inline-block shrink-0', className)} style={mask} />
}

/** Prahari's shield-and-keel glyph. */
export function PrahariGlyph({ size = 18, className, mono }: { size?: number; className?: string; mono?: boolean }) {
  const fill = mono ? 'currentColor' : 'var(--color-leaf)'
  return (
    <svg width={size} height={size * (20 / 18)} viewBox="0 0 18 20" fill="none" aria-hidden className={clsx('shrink-0', className)}>
      <path d="M9 1.25 16.25 3.9v5.6c0 4.5-3.05 7.85-7.25 9.25C4.8 17.35 1.75 14 1.75 9.5V3.9L9 1.25Z" fill={fill} />
      <path d="M9 5.25v8.5" stroke="var(--color-paper)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5.6 11.1c.9 1.9 2.1 2.85 3.4 2.85s2.5-.95 3.4-2.85" stroke="var(--color-paper)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function PrahariWordmark({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <PrahariGlyph size={20} />
      <span className="font-display text-[21px] font-extrabold leading-none tracking-[-0.035em] text-ink">Prahari</span>
    </span>
  )
}

/** Formats rupees with Indian grouping. */
export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
