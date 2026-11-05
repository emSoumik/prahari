import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { useRef } from 'react'
import { Reveal } from './ui'

const STATEMENT =
  'AI agents now act for real businesses. They give refunds, move money and pick job candidates. But an agent believes what it reads, so one sneaky message can trick it. Prahari stands between the agent and the action, and checks every action before it runs.'

const POINTS = [
  {
    n: '01',
    title: 'The agent asks first',
    body: 'Your agent decides what to do, then sends that action to Prahari. Nothing has happened yet.',
  },
  {
    n: '02',
    title: 'Prahari checks it',
    body: 'Plain code checks five things. Is the request real? Is this person allowed? Can it be undone? Does it follow your rules? Is the data private?',
  },
  {
    n: '03',
    title: 'You get one clear answer',
    body: 'Go ahead, ask for an OTP, pass it to a person, or stop. Every answer comes with a reason anyone can read.',
  },
]

/** Plain-English overview. The statement lights up word by word as it scrolls past. */
export function Overview() {
  const ref = useRef<HTMLParagraphElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.5'] })
  const list = STATEMENT.split(' ')

  return (
    <section id="what" className="s-section" aria-labelledby="what-h">
      <div className="s-wrap">
        <Reveal>
          <h2 id="what-h" className="s-label">What Prahari does</h2>
        </Reveal>
        <p ref={ref} className="s-display mt-6 max-w-[22em]" style={{ fontSize: 'clamp(30px, 3.7vw, 54px)', lineHeight: 1.08, letterSpacing: '-0.035em' }}>
          {list.map((w, i) =>
            reduce ? (
              <span key={i}>{w} </span>
            ) : (
              <Word key={i} progress={scrollYProgress} range={[i / list.length, (i + 1) / list.length]}>
                {w}
              </Word>
            ),
          )}
        </p>

        <ol className="mt-16 grid grid-cols-1 gap-10 md:mt-24 md:grid-cols-3 md:gap-6">
          {POINTS.map((p, i) => (
            <li key={p.n}>
              <Reveal delay={i * 0.08} className="border-t border-[var(--ink)] pt-5">
                <span className="s-mono s-tab text-[var(--ink-3)]">{p.n}</span>
                <h3 className="s-h3 mt-3">{p.title}</h3>
                <p className="s-body mt-2 max-w-[26em]">{p.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.16, 1])
  return (
    <>
      <motion.span style={{ opacity }}>{children}</motion.span>{' '}
    </>
  )
}
