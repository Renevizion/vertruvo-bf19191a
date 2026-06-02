// Logo wall — abstract wordmarks rendered as SVG, no external assets.
// These are generic service-business archetypes (HVAC, real estate, agency, fitness, clinic, etc.)
// presented as a "trusted by" row. Pure JSX, themed via tokens.

const logos: { name: string; mark: JSX.Element }[] = [
  {
    name: "Apex HVAC",
    mark: (
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rotate-45 bg-current rounded-[2px]" />
        <span className="font-bold tracking-tight">APEX</span>
        <span className="font-light opacity-60">HVAC</span>
      </span>
    ),
  },
  {
    name: "Keystone Realty",
    mark: (
      <span className="flex items-center gap-1.5 font-serif italic text-[1.05em]">
        Keystone<span className="not-italic font-sans font-bold opacity-70">·R</span>
      </span>
    ),
  },
  {
    name: "Momentum Digital",
    mark: (
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-full border-2 border-current" />
        <span className="font-bold tracking-[0.18em] text-[0.85em]">MOMENTUM</span>
      </span>
    ),
  },
  {
    name: "Northwind Studio",
    mark: (
      <span className="flex items-center gap-1.5">
        <span className="font-extrabold">N/</span>
        <span className="font-light tracking-wide">northwind</span>
      </span>
    ),
  },
  {
    name: "Lumen Wellness",
    mark: (
      <span className="flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 14 14" className="fill-current">
          <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="7" cy="7" r="2" />
        </svg>
        <span className="font-semibold tracking-tight lowercase">lumen</span>
      </span>
    ),
  },
  {
    name: "Forge & Co",
    mark: (
      <span className="flex items-center gap-1.5 font-bold uppercase tracking-[0.2em] text-[0.8em]">
        Forge<span className="opacity-50">&amp;Co</span>
      </span>
    ),
  },
  {
    name: "Atlas Group",
    mark: (
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 border-l-2 border-b-2 border-current rotate-[-45deg]" />
        <span className="font-semibold tracking-wider text-[0.95em]">ATLAS</span>
      </span>
    ),
  },
  {
    name: "Verde Studio",
    mark: (
      <span className="flex items-center gap-1.5 font-serif">
        <span className="font-bold">Verde</span>
        <span className="opacity-50 italic">studio</span>
      </span>
    ),
  },
];

export function LogoWall({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full ${className}`}>
      <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">
        Powering teams from solo operators to 60-person service crews
      </p>
      <div className="relative overflow-hidden">
        {/* edge fade masks */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10" />

        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5 md:gap-x-14 text-muted-foreground/80 px-12">
          {logos.map((l) => (
            <div
              key={l.name}
              className="text-[15px] md:text-base grayscale opacity-70 hover:opacity-100 hover:text-foreground transition-all"
              aria-label={l.name}
            >
              {l.mark}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
