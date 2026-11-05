import { motion, useReducedMotion } from 'motion/react'
import { Checkpoint } from './Checkpoint'
import { PRIMARY } from './content'
import { Arrow, Button, EASE, MaskWords, usePhone, words } from './ui'

export function Hero() {
  const reduce = useReducedMotion()
  const phone = usePhone()
  const rise = (delay: number, y = 12) => ({
    initial: reduce ? false : { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: EASE, delay },
  })
  return (
    <section id="top" className="s-hero-ground relative" style={{ paddingTop: 'calc(var(--nav) + env(safe-area-inset-top))' }}>
      <div className="s-wrap flex flex-col items-center pb-20 pt-12 text-center md:pb-28 md:pt-20">
        <motion.p
          className="inline-flex items-center gap-2 rounded-full bg-white py-1 pl-1.5 pr-3 text-[14px] text-[var(--ink-2)] shadow-[inset_0_0_0_1px_var(--line)]"
          {...rise(0, 8)}
        >
          <span className="rounded-full bg-[var(--go-soft)] px-2 py-0.5 text-[12.5px] font-medium text-[var(--go)]">New</span>
          Works with any OpenAI‑compatible model
        </motion.p>

        <h1 className="s-display mt-7" style={{ fontSize: 'clamp(44px, 7.4vw, 112px)', lineHeight: 0.92 }}>
          <MaskWords lines={phone ? [words('Pre‑execution'), words('guard for'), words('AI agents.')] : [words('Pre‑execution guard'), words('for AI agents.')]} delay={0.1} step={0.07} play />
        </h1>

        <motion.p className="s-lead mx-auto mt-7 max-w-[34em] text-center" {...rise(0.45)}>
          Your AI agent wants to give a refund, move money or shortlist a candidate. Prahari checks that action against your rules
          before it happens, and stops the unsafe ones.
        </motion.p>

        <motion.div className="mt-9 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:gap-3" {...rise(0.55)}>
          <Button to={PRIMARY.to} className="w-full sm:w-auto">
            {PRIMARY.label}
            <Arrow />
          </Button>
          <Button href="#how" variant="ghost" className="w-full sm:w-auto">
            See how a check runs
          </Button>
        </motion.div>

        <motion.div
          className="relative mt-14 w-full max-w-[760px] text-left md:mt-20"
          initial={reduce ? false : { opacity: 0, y: 48, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.2, ease: EASE, delay: 0.55 }}
        >
          <Checkpoint compact={phone} />
        </motion.div>
      </div>
    </section>
  )
}
