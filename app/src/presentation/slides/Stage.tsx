import OffVsOn from '../stage/OffVsOn'
import { MARGIN, Paper } from '../ui'

/* 18 · Off vs On: same request, two outcomes. */
export function OffVsOnSlide() {
  return (
    <Paper>
      <h2 className="pointer-events-none absolute top-[72px] display text-[64px]" style={{ left: MARGIN }}>
        Same request. Two outcomes.
      </h2>
      {/* The stage (1100 × 536) fits by height. Its columns span x 40–1060, so
          a 883px-tall box scales them to 1.647× and lands them on the
          120px side margins, flush with the title. */}
      <div className="absolute inset-x-0 bottom-0 top-[197px]">
        <OffVsOn />
      </div>
    </Paper>
  )
}
