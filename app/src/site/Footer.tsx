import { Link } from 'react-router'
import { GITHUB, NAV, PRIMARY } from './content'
import { Arrow, Button, MaskWords, Reveal, Wordmark, words } from './ui'

export function Footer() {
  return (
    <footer className="s-section flex flex-col" style={{ minHeight: '100svh' }}>
      <div className="s-wrap flex flex-1 flex-col">
        <div className="flex flex-1 flex-col justify-center py-10">
          <p className="s-label">Prahari, Sanskrit for guard</p>
          <p className="s-display mt-5 text-[clamp(52px,9.5vw,152px)]" style={{ lineHeight: 0.9 }}>
            <MaskWords lines={[words('AI can propose.'), [<span key="o" className="text-[var(--ink-3)]">Only</span>, <span key="p" className="text-[var(--ink-3)]">Prahari</span>, 'approves.']]} step={0.08} />
          </p>
          <Reveal delay={0.4} className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button to={PRIMARY.to}>
              {PRIMARY.label}
              <Arrow />
            </Button>
            <Button href={GITHUB} variant="ghost">Read the code on GitHub</Button>
          </Reveal>
        </div>

        <div className="grid grid-cols-2 gap-8 border-t border-[var(--line)] pt-8 md:grid-cols-12">
          <div className="col-span-2 md:col-span-4">
            <Wordmark />
            <p className="mt-3 max-w-[22em] text-[14px] leading-snug text-[var(--ink-3)]">Checks every action your AI agent wants to take, before it runs.</p>
          </div>
          <nav aria-label="Page" className="md:col-span-3 md:col-start-7">
            <p className="s-label">Page</p>
            <ul className="mt-3 flex flex-col gap-2 text-[14.5px]">
              {NAV.map((n) => (
                <li key={n.id}><a href={`#${n.id}`} className="s-link text-[var(--ink-2)] hover:text-[var(--ink)]">{n.label}</a></li>
              ))}
              <li><a href="#faq" className="s-link text-[var(--ink-2)] hover:text-[var(--ink)]">FAQ</a></li>
            </ul>
          </nav>
          <nav aria-label="Product" className="md:col-span-3 md:col-start-10">
            <p className="s-label">Product</p>
            <ul className="mt-3 flex flex-col gap-2 text-[14.5px]">
              <li><Link to="/app" className="s-link text-[var(--ink-2)] hover:text-[var(--ink)]">Open the app</Link></li>
              <li><Link to="/app/policies" className="s-link text-[var(--ink-2)] hover:text-[var(--ink)]">Policy console</Link></li>
              <li><Link to="/app/settings" className="s-link text-[var(--ink-2)] hover:text-[var(--ink)]">Model settings</Link></li>
              <li><a href={GITHUB} target="_blank" rel="noreferrer" className="s-link text-[var(--ink-2)] hover:text-[var(--ink)]">GitHub</a></li>
            </ul>
          </nav>
        </div>
        <p className="mt-10 text-[12.5px] leading-relaxed text-[var(--ink-3)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          © {new Date().getFullYear()} Prahari. Concept demos, not affiliated with Swiggy, HDFC Bank or the companies named in the news
          above. Product names and logos are trademarks of their owners.
        </p>
      </div>
    </footer>
  )
}
