import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { FAQ } from './content'
import { EASE } from './ui'

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  const reduce = useReducedMotion()
  return (
    <section id="faq" className="s-section" aria-labelledby="faq-h">
      <div className="s-wrap s-grid gap-y-8">
        <div className="col-span-12 lg:col-span-5">
          <h2 id="faq-h" className="s-display s-h2">Questions about Prahari</h2>
        </div>
        <ul className="col-span-12 border-t border-[var(--line)] lg:col-span-7 lg:col-start-6">
          {FAQ.map((f, i) => {
            const isOpen = open === i
            return (
              <li key={f.q} className="border-b border-[var(--line)]">
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="group flex w-full items-center justify-between gap-6 py-5 text-left text-[18px] font-medium md:text-[19px]"
                  >
                    {f.q}
                    <span className="relative grid size-8 shrink-0 place-items-center rounded-full shadow-[inset_0_0_0_1px_var(--line-2)] transition-colors group-hover:shadow-[inset_0_0_0_1px_var(--ink)]">
                      <span className="absolute h-[1.5px] w-3 bg-[var(--ink)]" />
                      <span className="absolute h-3 w-[1.5px] bg-[var(--ink)] transition-transform duration-300" style={{ transform: isOpen ? 'scaleY(0)' : 'scaleY(1)' }} />
                    </span>
                  </button>
                </h3>
                <motion.div
                  id={`faq-${i}`}
                  initial={false}
                  animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.4, ease: EASE }}
                  className="overflow-hidden"
                  hidden={!isOpen && reduce ? true : undefined}
                >
                  <p className="s-body max-w-[38em] pb-6 text-[16px]">{f.a}</p>
                </motion.div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
