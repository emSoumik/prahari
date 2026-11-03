import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react'
import ErrorBoundary from '../ErrorBoundary'
import { SLIDES, type SlideDef } from './slides'
import { DeckContext, STAGE_H, STAGE_W, TONE_FG, type Tone } from './ui'

/* ------------------------------------------------------------------ */
/* Position <-> URL hash. "#12" = slide 12 (1-based). Builds autoplay,  */
/* so the step is not part of the URL; old "#12.2" hashes still work.  */
/* ------------------------------------------------------------------ */

interface Pos {
  slide: number // 0-based index
  step: number
}

const clampPos = (p: Pos): Pos => {
  const slide = Math.min(Math.max(p.slide, 0), SLIDES.length - 1)
  const step = Math.min(Math.max(p.step, 0), SLIDES[slide].steps - 1)
  return { slide, step }
}

function readHash(): Pos {
  const m = window.location.hash.match(/^#(\d+)(?:\.\d+)?$/)
  if (!m) return { slide: 0, step: 0 }
  return clampPos({ slide: Number(m[1]) - 1, step: 0 })
}

function writeHash(p: Pos) {
  const hash = `#${p.slide + 1}`
  if (window.location.hash !== hash) history.replaceState(null, '', hash)
}

/* ------------------------------------------------------------------ */
/* Keyboard filtering                                                  */
/* ------------------------------------------------------------------ */

function isTyping(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  if (target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return true
  return (target as HTMLElement).isContentEditable === true
}

/** Space/Enter on a focused control must activate the control, not the deck. */
function isControl(target: EventTarget | null) {
  return target instanceof Element && !!target.closest('button, a[href], [role="button"], summary')
}

/* ------------------------------------------------------------------ */
/* Stage scale                                                         */
/* ------------------------------------------------------------------ */

function useStageScale() {
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return scale
}

/* ------------------------------------------------------------------ */
/* Deck                                                                */
/* ------------------------------------------------------------------ */

export default function Deck() {
  const [pos, setPos] = useState<Pos>(readHash)
  const [dir, setDir] = useState(1)
  const [grid, setGrid] = useState(false)
  const scale = useStageScale()
  const reduce = useReducedMotion()
  const posRef = useRef(pos)
  useLayoutEffect(() => {
    posRef.current = pos
  }, [pos])

  useEffect(() => writeHash(pos), [pos.slide]) // eslint-disable-line react-hooks/exhaustive-deps


  useEffect(() => {
    const onHash = () => setPos(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = useCallback((next: Pos, direction: number) => {
    setDir(direction)
    setPos(clampPos(next))
  }, [])

  // Next/previous always change slide; builds never take a key press.
  const next = useCallback(() => {
    const { slide } = posRef.current
    if (slide < SLIDES.length - 1) go({ slide: slide + 1, step: 0 }, 1)
  }, [go])

  const prev = useCallback(() => {
    const { slide } = posRef.current
    if (slide > 0) go({ slide: slide - 1, step: 0 }, -1)
  }, [go])

  // Builds play by themselves once a slide opens.
  const slideIdx = pos.slide
  useEffect(() => {
    const sl = SLIDES[slideIdx]
    if (sl.steps <= 1 || reduce) return
    const id = window.setInterval(() => {
      setPos((p) => (p.slide !== slideIdx || p.step >= sl.steps - 1 ? p : { ...p, step: p.step + 1 }))
    }, sl.autoplayMs ?? 550)
    return () => window.clearInterval(id)
  }, [slideIdx, reduce])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key
      if (key === 'Escape' && SLIDES[posRef.current.slide].interactive) {
        // leave whatever control holds focus so the clicker drives the deck again
        const el = document.activeElement
        if (el instanceof HTMLElement && el !== document.body) el.blur()
      }
      if (isTyping(e.target)) return
      if (key === 'g' || key === 'G') {
        e.preventDefault()
        setGrid((g) => !g)
        return
      }
      if (key === 'f' || key === 'F') {
        e.preventDefault()
        toggleFullscreen()
        return
      }
      if (key === 'Escape') {
        setGrid(false)
        return
      }
      if (grid) return
      if ((key === ' ' || key === 'Enter') && isControl(e.target)) return
      switch (key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
        case 'Enter':
          e.preventDefault()
          next()
          break
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault()
          prev()
          break
        case 'Home':
          e.preventDefault()
          go({ slide: 0, step: 0 }, -1)
          break
        case 'End':
          e.preventDefault()
          go({ slide: SLIDES.length - 1, step: 0 }, 1)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [grid, next, prev, go, toggleFullscreen])

  const slide = SLIDES[pos.slide]
  // Reduced motion: the final state at once.
  const step = reduce ? slide.steps - 1 : pos.step

  const onStageClick = (e: MouseEvent) => {
    if (grid || slide.interactive) return
    const t = e.target as Element
    if (t.closest('button, a, input, textarea, select, label, iframe, [data-deck-ignore-click], [data-deck-ignore-keys]')) return
    if (window.getSelection()?.toString()) return
    next()
  }

  const progress = (pos.slide + 1) / SLIDES.length

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0E0E0E]" style={{ cursor: slide.interactive ? 'auto' : 'default' }}>
      <div
        className="absolute left-1/2 top-1/2 overflow-hidden"
        style={{
          width: STAGE_W,
          height: STAGE_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center',
        }}
        onClick={onStageClick}
        role="region"
        aria-roledescription="slide deck"
        aria-label={`Slide ${pos.slide + 1} of ${SLIDES.length}`}
      >
        <style>{DECK_CSS}</style>
        {/* Reduced motion: transforms snap, opacity still fades. */}
        <MotionConfig reducedMotion="user">
          <AnimatePresence initial={false} custom={{ dir, reduce: !!reduce }}>
            <SlideFrame key={slide.id} slide={slide} step={step} dir={dir} reduce={!!reduce} />
          </AnimatePresence>
        </MotionConfig>

        <Chrome tone={slide.tone} footer={slide.footer !== false} progress={progress} />

        <AnimatePresence>
          {grid && (
            <Overview
              current={pos.slide}
              onPick={(i) => {
                go({ slide: i, step: 0 }, i >= pos.slide ? 1 : -1)
                setGrid(false)
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Slide frame: quiet cross-fade with a small vertical drift.          */
/* ------------------------------------------------------------------ */

const DRIFT = 10

/* Headlines never leave an orphan word: balance every display line on the
   keynote slides (the live demos keep their own typography). */
const DECK_CSS = `
[data-deck-slide]:not([data-interactive]) :is(h1, h2, h3, blockquote, .display) { text-wrap: balance; }
`

const frameVariants = {
  enter: ({ dir, reduce }: { dir: number; reduce: boolean }) => ({ opacity: 0, y: reduce ? 0 : DRIFT * dir, zIndex: 1 }),
  center: { opacity: 1, y: 0, zIndex: 1 },
  exit: ({ dir, reduce }: { dir: number; reduce: boolean }) => ({ opacity: 0, y: reduce ? 0 : -DRIFT * dir, zIndex: 0 }),
}

function SlideFrame({ slide, step, dir, reduce }: { slide: SlideDef; step: number; dir: number; reduce: boolean }) {
  return (
    <motion.section
      className="absolute inset-0"
      custom={{ dir, reduce }}
      variants={frameVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ y: { type: 'spring', bounce: 0, duration: 0.5 }, opacity: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }}
      aria-label={slide.title}
      data-deck-slide={slide.id}
      data-interactive={slide.interactive || undefined}
    >
      <ErrorBoundary>{slide.render(step)}</ErrorBoundary>
    </motion.section>
  )
}

/* ------------------------------------------------------------------ */
/* Chrome: Brandkit-style footer and a progress hairline.              */
/* ------------------------------------------------------------------ */

function Chrome({ tone, footer, progress }: { tone: Tone; footer: boolean; progress: number }) {
  const fg = TONE_FG[tone]
  // Plain CSS transitions: motion can't interpolate CSS custom properties.
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div
        className="absolute bottom-[48px] left-[120px] font-mono text-[16px] font-medium uppercase tracking-[0.14em]"
        style={{ color: fg, opacity: footer ? 0.6 : 0, transition: 'opacity 400ms, color 400ms' }}
      >
        Prahari
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-[3px] origin-left"
        style={{
          background: fg,
          opacity: tone === 'paper' ? 0.3 : 0.6,
          transform: `scaleX(${progress})`,
          transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1), background-color 400ms, opacity 400ms',
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Overview grid (G)                                                   */
/* ------------------------------------------------------------------ */

const COLS = 6
const PAD = 72
const GAP = 24

function Overview({ current, onPick }: { current: number; onPick: (i: number) => void }) {
  const thumbW = (STAGE_W - PAD * 2 - GAP * (COLS - 1)) / COLS
  const s = thumbW / STAGE_W
  const thumbH = STAGE_H * s
  return (
    <motion.div
      className="absolute inset-0 z-20 overflow-auto bg-[#0E0E0E]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      data-deck-ignore-click
    >
      <div className="grid content-center" style={{ gridTemplateColumns: `repeat(${COLS}, ${thumbW}px)`, gap: GAP, padding: PAD, minHeight: '100%' }}>
        {SLIDES.map((sl, i) => (
          <button
            key={sl.id}
            type="button"
            onClick={() => onPick(i)}
            className="group relative text-left outline-none"
            aria-label={`Go to slide ${i + 1}: ${sl.title ?? sl.id}`}
          >
            <div
              className="relative overflow-hidden rounded-[8px] transition-transform duration-200 group-active:scale-[0.97]"
              style={{
                width: thumbW,
                height: thumbH,
                boxShadow: i === current ? '0 0 0 3px var(--color-butter)' : '0 0 0 1px rgb(255 255 255 / .12)',
              }}
            >
              <div className="pointer-events-none absolute left-0 top-0" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${s})`, transformOrigin: 'top left' }}>
                <DeckContext.Provider value={{ isStatic: true }}>
                  {sl.interactive ? (
                    <div className="grid h-full place-items-center bg-paper font-mono text-[96px] text-ink-3">{sl.title}</div>
                  ) : (
                    sl.render(sl.steps - 1)
                  )}
                </DeckContext.Provider>
              </div>
            </div>
            <div className="mt-2 font-mono text-[18px] text-white/60">
              {String(i + 1).padStart(2, '0')} <span className="text-white/35">{sl.title}</span>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  )
}
