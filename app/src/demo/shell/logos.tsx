import { ListChecks } from 'lucide-react'
import { SwiggyGlyph } from './ui'

/** Tab-sized brand marks (about 16px tall). */
export function SwiggyTabLogo() {
  return <SwiggyGlyph size={16} />
}

export function HdfcTabLogo() {
  return <img src="/logos/hdfc.svg" alt="" className="h-3 w-auto" draggable={false} />
}

/** "Shortlist", the generic recruiter tool used in the hiring demo. */
export function HiringTabLogo() {
  return (
    <span className="grid size-4 place-items-center rounded-[5px] bg-ink text-paper">
      <ListChecks size={11} strokeWidth={2.5} />
    </span>
  )
}
