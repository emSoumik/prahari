import { Link } from 'react-router'
import { DemoShell } from '../../demo/shell/DemoShell'
import PolicyConsole from '../../demo/policies/PolicyConsole'
import type { Domain } from '../../prahari/types'
import { SLIDES } from '../slides'

export type LiveKind = Domain | 'policies'

/** The deck's last slides are the product itself: the same shell and console as /demo and /policies. */
export default function LiveSlide({ kind }: { kind: LiveKind }) {
  if (kind === 'policies') {
    return (
      <div className="absolute inset-0 overflow-hidden bg-paper">
        <PolicyConsole
          variant="slide"
          initialDomain="food"
          onOpenDemo={(d) => {
            // jump to that domain's live slide, where the new rule is already enforced
            window.location.hash = `#${slideOf(d)}`
          }}
        />
        <Link
          to="/policies"
          className="absolute right-8 bottom-5 z-20 rounded-full bg-card/90 px-4 py-1.5 text-[20px] text-ink-3 ring-1 ring-rule transition-colors [@media(hover:hover)]:hover:text-ink"
        >
          Open full console →
        </Link>
      </div>
    )
  }
  return (
    <div className="absolute inset-0">
      <DemoShell domain={kind} variant="slide" />
    </div>
  )
}

/** 1-based deck position of a domain's live slide, looked up by id so reordering the deck cannot break it. */
function slideOf(d: Domain) {
  return SLIDES.findIndex((s) => s.id === `live-${d}`) + 1
}
