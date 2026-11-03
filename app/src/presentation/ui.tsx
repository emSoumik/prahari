import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { motion, useReducedMotion, type Transition } from 'motion/react'
import clsx from 'clsx'

/* ------------------------------------------------------------------ */
/* Stage constants                                                     */
/* ------------------------------------------------------------------ */

export const STAGE_W = 1920
export const STAGE_H = 1080
/** Side margin of the 12-column grid. Content width is 1680, gutter 24, column 118. */
export const MARGIN = 120
export const COL = 118
export const GUTTER = 24
/** x of the left edge of column `n` (1-based) on the stage. */
export const colX = (n: number) => MARGIN + (n - 1) * (COL + GUTTER)
/** Width spanned by `n` columns including the gutters between them. */
export const span = (n: number) => n * COL + (n - 1) * GUTTER

export const SPRING: Transition = { type: 'spring', bounce: 0, duration: 0.45 }
export const SPRING_SLOW: Transition = { type: 'spring', bounce: 0, duration: 0.5 }
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

export type Tone = 'paper' | 'leaf' | 'bark' | 'sky' | 'ink'

/* ------------------------------------------------------------------ */
/* Deck context: thumbnails in the grid overview render statically.    */
/* ------------------------------------------------------------------ */

interface DeckCtx {
  /** True when a slide is rendered as a grid thumbnail: no entrance motion. */
  isStatic: boolean
}
export const DeckContext = createContext<DeckCtx>({ isStatic: false })
export const useDeck = () => useContext(DeckContext)

/** True when entrance animations should be skipped (thumbnail or reduced motion). */
export function useStill() {
  const reduce = useReducedMotion()
  const { isStatic } = useDeck()
  return isStatic || !!reduce
}

/* ------------------------------------------------------------------ */
/* Build: a step-based reveal. Keeps its layout box when hidden, so    */
/* nothing reflows as a slide builds.                                  */
/* ------------------------------------------------------------------ */

interface BuildProps {
  show: boolean
  delay?: number
  /** Distance in px the element rises as it appears. */
  y?: number
  x?: number
  className?: string
  style?: CSSProperties
  children: ReactNode
  as?: 'div' | 'span'
}

export function Build({ show, delay = 0, y = 8, x = 0, className, style, children, as = 'div' }: BuildProps) {
  const still = useStill()
  const reduce = useReducedMotion()
  const dy = reduce ? 0 : y
  const dx = reduce ? 0 : x
  const Comp = as === 'span' ? motion.span : motion.div
  return (
    <Comp
      className={className}
      style={style}
      aria-hidden={!show}
      initial={still ? false : { opacity: 0, y: dy, x: dx }}
      animate={show ? { opacity: 1, y: 0, x: 0 } : { opacity: 0, y: dy, x: dx }}
      transition={{ ...SPRING, delay: show ? delay : 0 }}
    >
      {children}
    </Comp>
  )
}

/* ------------------------------------------------------------------ */
/* Line: a block-level display line that builds in. Same quiet motion  */
/* as Build (opacity + small drift), kept as a separate name for       */
/* readability in slide code.                                          */
/* ------------------------------------------------------------------ */

interface LineProps {
  show?: boolean
  delay?: number
  className?: string
  style?: CSSProperties
  children: ReactNode
}

export function Line({ show = true, delay = 0, className, style, children }: LineProps) {
  return (
    <Build show={show} delay={delay} y={10} className={clsx('block', className)} style={style}>
      {children}
    </Build>
  )
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

export const TONE_BG: Record<Tone, string> = {
  paper: 'var(--color-paper)',
  leaf: 'var(--color-leaf)',
  bark: 'var(--color-bark)',
  sky: 'var(--color-sky)',
  ink: 'var(--color-ink)',
}

/** Foreground for chrome (footer, marker, progress) on each tone. */
export const TONE_FG: Record<Tone, string> = {
  paper: 'var(--color-ink)',
  leaf: 'var(--color-butter)',
  bark: 'var(--color-butter)',
  sky: 'var(--color-cobalt)',
  ink: 'var(--color-paper)',
}

/** Paper slide ground. */
export function Paper({ className, children, tint = 'paper' }: { className?: string; children: ReactNode; tint?: 'paper' | 'paper-2' }) {
  return (
    <div className={clsx('absolute inset-0 overflow-hidden', tint === 'paper' ? 'bg-paper' : 'bg-paper-2', 'text-ink', className)}>
      {children}
    </div>
  )
}

/** Section marker in mono, e.g. "– 02". */
export function Marker({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={clsx('font-mono text-[26px] font-medium tracking-[0.02em]', className)} style={style}>
      {children}
    </div>
  )
}

interface SectionFieldProps {
  tone: Exclude<Tone, 'paper'>
  marker?: string
  /** Sky field framed by thick vertical leaf/sky stripes (Figma "– 03"). */
  framed?: boolean
  className?: string
  children: ReactNode
}

/** A flat, saturated color-block section slide. */
export function SectionField({ tone, marker, framed, className, children }: SectionFieldProps) {
  const fg = TONE_FG[tone]
  if (framed) {
    return (
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          background: `repeating-linear-gradient(90deg, var(--color-leaf) 0 128px, var(--color-sky) 128px 256px)`,
        }}
      >
        <div className="absolute inset-[64px] overflow-hidden" style={{ background: TONE_BG[tone], color: fg }}>
          {marker && <Marker className="absolute left-[56px] top-[40px]">{marker}</Marker>}
          <div className={clsx('absolute inset-0', className)}>{children}</div>
        </div>
      </div>
    )
  }
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: TONE_BG[tone], color: fg }}>
      {marker && <Marker className="absolute top-[88px]" style={{ left: MARGIN }}>{marker}</Marker>}
      <div className={clsx('absolute inset-0', className)}>{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Logos                                                               */
/* ------------------------------------------------------------------ */

export type LogoName =
  | 'swiggy'
  | 'hdfc'
  | 'razorpay'
  | 'aircanada'
  | 'chevrolet'
  | 'bowtie'
  | 'meta'
  | 'instagram'
  | 'reuters'

const LOGOS: Record<Exclude<LogoName, 'swiggy'>, { src: string; ratio: number; alt: string }> = {
  hdfc: { src: '/logos/hdfc.svg', ratio: 289 / 50, alt: 'HDFC Bank' },
  razorpay: { src: '/logos/razorpay.svg', ratio: 1896 / 401, alt: 'Razorpay' },
  aircanada: { src: '/logos/aircanada.svg', ratio: 300.835 / 39.315, alt: 'Air Canada' },
  chevrolet: { src: '/logos/chevrolet.svg', ratio: 4115 / 2156, alt: 'Chevrolet' },
  bowtie: { src: '/logos/chevrolet2.svg', ratio: 94 / 30, alt: 'Chevrolet' },
  meta: { src: '/logos/meta.svg', ratio: 948 / 191, alt: 'Meta' },
  instagram: { src: '/logos/instagram.svg', ratio: 1, alt: 'Instagram' },
  reuters: { src: '/logos/reuters.svg', ratio: 517.1 / 130.6, alt: 'Reuters' },
}

/** A real brand logo at a fixed height (stage px). */
export function Logo({ name, h, className, style }: { name: LogoName; h: number; className?: string; style?: CSSProperties }) {
  if (name === 'swiggy') {
    // Mono glyph tinted with Swiggy orange through a CSS mask.
    return (
      <span
        role="img"
        aria-label="Swiggy"
        className={clsx('inline-block shrink-0', className)}
        style={{
          width: h * 0.72,
          height: h,
          background: 'var(--color-swiggy)',
          WebkitMask: 'url(/logos/swiggy-glyph.svg) center / contain no-repeat',
          mask: 'url(/logos/swiggy-glyph.svg) center / contain no-repeat',
          ...style,
        }}
      />
    )
  }
  const l = LOGOS[name]
  return (
    <img
      src={l.src}
      alt={l.alt}
      draggable={false}
      className={clsx('inline-block shrink-0 select-none', className)}
      style={{ height: h, width: Math.round(h * l.ratio), ...style }}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Figure: a same-origin iframe (hairline figures). Forwards keys to   */
/* the deck so arrows keep working after the figure was clicked.       */
/* ------------------------------------------------------------------ */

interface FigureProps {
  src: string
  title: string
  className?: string
  style?: CSSProperties
  /**
   * Optional state for the figure, posted with `postMessage` as
   * `{ source: 'prahari-deck', ...message }` on change and after load
   * (e.g. `{ layer: 3 }` for the stack figure). Figures may ignore it.
   */
  message?: Record<string, unknown>
}

/** 'checking' until we know the figure file exists. A missing file would otherwise
 *  show the dev server's SPA fallback (this app) inside the frame. */
function useFigureReady(src: string) {
  const [state, setState] = useState<'checking' | 'ready' | 'missing'>('checking')
  useEffect(() => {
    let live = true
    fetch(src.split('?')[0])
      .then(async (r) => {
        const body = r.ok ? await r.text() : ''
        if (live) setState(r.ok && !body.includes('id="root"') ? 'ready' : 'missing')
      })
      .catch(() => live && setState('missing'))
    return () => {
      live = false
    }
  }, [src])
  return state
}

export function Figure(props: FigureProps) {
  const state = useFigureReady(props.src)
  if (state === 'ready') return <FigureFrame {...props} />
  // Calm placeholder: paper ground, nothing that looks like a broken page.
  return <div className={props.className} style={props.style} role="img" aria-label={props.title} />
}

function FigureFrame({ src, title, className, style, message }: FigureProps) {
  const ref = useRef<HTMLIFrameElement>(null)
  const msgKey = message ? JSON.stringify(message) : ''
  useEffect(() => {
    const frame = ref.current
    if (!frame || !msgKey) return
    const post = () => frame.contentWindow?.postMessage({ source: 'prahari-deck', ...JSON.parse(msgKey) }, window.location.origin)
    post()
    frame.addEventListener('load', post)
    return () => frame.removeEventListener('load', post)
  }, [msgKey])
  useEffect(() => {
    // The hairline figures print a small state read-out ("rest", "02 of 05")
    // in their top-right corner. It is noise on a slide: hide it from here,
    // since the figure files are shared and not edited by the deck.
    const frame = ref.current
    if (!frame) return
    const hide = () => {
      try {
        const doc = frame.contentDocument
        if (!doc?.head || doc.getElementById('deck-hide-read')) return
        const st = doc.createElement('style')
        st.id = 'deck-hide-read'
        st.textContent = '#read{display:none!important}'
        doc.head.appendChild(st)
      } catch {
        /* cross-origin: leave it */
      }
    }
    hide()
    frame.addEventListener('load', hide)
    return () => frame.removeEventListener('load', hide)
  }, [])
  useEffect(() => {
    const frame = ref.current
    if (!frame) return
    let win: Window | null = null
    const forward = (e: KeyboardEvent) => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: e.key, code: e.code, shiftKey: e.shiftKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey, altKey: e.altKey }),
      )
    }
    const attach = () => {
      try {
        win?.removeEventListener('keydown', forward)
        win = frame.contentWindow
        win?.addEventListener('keydown', forward)
      } catch {
        win = null // cross-origin: nothing to forward
      }
    }
    attach()
    frame.addEventListener('load', attach)
    return () => {
      frame.removeEventListener('load', attach)
      try {
        win?.removeEventListener('keydown', forward)
      } catch {
        /* frame already gone */
      }
    }
  }, [])
  return (
    <iframe
      ref={ref}
      src={src}
      title={title}
      className={clsx('block border-0 bg-transparent', className)}
      style={{ pointerEvents: 'auto', colorScheme: 'normal', ...style }}
      // Clicking the figure must not advance the deck.
      data-deck-ignore-click
    />
  )
}

/* ------------------------------------------------------------------ */
/* Small shared bits                                                   */
/* ------------------------------------------------------------------ */

/** Soft layered shadow from the design system. */
export const SHADOW = '0 1px 2px rgb(0 0 0 / .06), 0 8px 24px -8px rgb(0 0 0 / .12)'
export const SHADOW_LG = '0 1px 2px rgb(0 0 0 / .05), 0 12px 32px -12px rgb(0 0 0 / .16), 0 32px 64px -32px rgb(0 0 0 / .12)'
