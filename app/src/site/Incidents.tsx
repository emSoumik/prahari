import { INCIDENTS } from "./content";
import { Reveal, SectionHead } from "./ui";

export function Incidents() {
  return (
    <section id="incidents" className="s-section" aria-labelledby="incidents-h">
      <div className="s-wrap">
        <SectionHead
          title={
            <span id="incidents-h">
              Support agents already gave away refunds, cars and accounts
            </span>
          }
          lead="Each agent acted on what it was told. None of them checked whether the action itself was allowed."
        />
        <ul className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INCIDENTS.map((c, i) => (
            <li key={c.outlet}>
              <Reveal delay={i * 0.07} className="h-full">
                <article className="s-card s-card--hover flex h-full flex-col p-6 lg:min-h-[400px]">
                  <div className="flex items-baseline justify-between gap-3 border-b border-[var(--ink)] pb-3">
                    <span className="s-serif text-[13.5px] font-semibold leading-tight">
                      {c.outlet}
                    </span>
                    <span className="s-mono s-tab shrink-0 text-[12px] text-[var(--ink-3)]">
                      {c.date}
                    </span>
                  </div>
                  <h3 className="s-serif mt-4 text-[24px] font-bold leading-[1.15] tracking-[-0.01em] lg:text-[26px]">
                    {c.headline}
                  </h3>
                  <div className="mt-auto pt-8">
                    <p className="text-[14px] leading-snug text-[var(--stop)]">
                      {c.failure}
                    </p>
                    <img
                      src={c.logo}
                      alt=""
                      height={c.logoH}
                      className="mt-5 w-auto opacity-80 grayscale"
                      style={{ height: c.logoH }}
                    />
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
