import clsx from 'clsx'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router'
import { PrahariGlyph } from '../demo/shell/ui'

export const EASE = [0.22, 1, 0.36, 1] as const
export const SPRING = { type: 'spring', bounce: 0, duration: 0.5 } as const

export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <PrahariGlyph size={size + 2} />
      <span className="s-display" style={{ fontSize: size, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1 }}>
        Prahari
      </span>
    </span>
  )
}

export function Arrow({ size = 15 }: { size?: number }) {
  return (
    <svg className="s-arrow" width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 8h9.5M8.5 3.5 13 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Button({
  to,
  href,
  children,
  variant = 'solid',
  size,
  className,
  onClick,
}: {
  to?: string
  href?: string
  children: ReactNode
  variant?: 'solid' | 'ghost'
  size?: 'sm'
  className?: string
  onClick?: () => void
}) {
  const cls = clsx('s-btn', `s-btn--${variant}`, size === 'sm' && 's-btn--sm', className)
  if (to) return <Link to={to} className={cls} onClick={onClick}>{children}</Link>
  if (href) {
    const external = href.startsWith('http')
    return (
      <a href={href} className={cls} onClick={onClick} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
        {children}
      </a>
    )
  }
  return <button type="button" className={cls} onClick={onClick}>{children}</button>
}

export function Section({ id, h = 1, children, className, style, label }: { id: string; h?: 1 | 2; children: ReactNode; className?: string; style?: CSSProperties; label?: string }) {
  return (
    <section id={id} aria-label={label} className={clsx('s-section', className)} style={{ '--h': h, ...style } as CSSProperties}>
      {children}
    </section>
  )
}

/** True while the element is on screen. Used to pause loops that nobody can see. */
export function useInView<T extends Element>(ref: RefObject<T | null>, margin = '0px') {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, margin])
  return inView
}

export function useMedia(query: string) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatch(m.matches)
    on()
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return match
}

export const usePhone = () => useMedia('(max-width: 767px)')

export function useInterval(fn: () => void, ms: number | null) {
  const saved = useRef(fn)
  useEffect(() => {
    saved.current = fn
  }, [fn])
  useEffect(() => {
    if (ms == null) return
    const t = setInterval(() => saved.current(), ms)
    return () => clearInterval(t)
  }, [ms])
}

/** Rises into place once, the first time it scrolls into view. Static under reduced motion. */
export function Reveal({ children, className, delay = 0, y = 18 }: { children: ReactNode; className?: string; delay?: number; y?: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

/** Each word slides up out of a mask. `play` starts it; leave undefined to start on first view. */
export function MaskWords({ lines, delay = 0, step = 0.06, play }: { lines: ReactNode[][]; delay?: number; step?: number; play?: boolean }) {
  const reduce = useReducedMotion()
  let n = 0
  const shown = { y: 0 }
  const hidden = { y: '105%' }
  return (
    <>
      {lines.map((words, li) => (
        <span key={li} className="block">
          {words.map((word, i) => {
            const d = delay + n++ * step
            return (
              <span key={i}>
                <span className="inline-block overflow-hidden pb-[0.1em] align-bottom">
                  <motion.span
                    className="inline-block"
                    initial={reduce ? false : hidden}
                    {...(play === undefined
                      ? { whileInView: shown, viewport: { once: true, margin: '0px 0px -10% 0px' } }
                      : { animate: play ? shown : hidden })}
                    transition={{ duration: 0.95, ease: EASE, delay: d }}
                  >
                    {word}
                  </motion.span>
                </span>
                {i < words.length - 1 && ' '}
              </span>
            )
          })}
        </span>
      ))}
    </>
  )
}

export const words = (s: string) => s.split(' ')

export function SectionHead({ title, lead, className }: { title: ReactNode; lead?: ReactNode; className?: string }) {
  return (
    <div className={clsx('s-grid', className)}>
      <Reveal className="col-span-12 md:col-span-7">
        <h2 className="s-display s-h2">{title}</h2>
      </Reveal>
      {lead && (
        <Reveal className="col-span-12 mt-5 md:col-span-5 md:col-start-8 md:mt-0 md:self-end" delay={0.08}>
          <p className="s-lead">{lead}</p>
        </Reveal>
      )}
    </div>
  )
}
