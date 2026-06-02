// Ratings strip — review-site style badges (G2 / Capterra / Product Hunt / Trustpilot)
// Pure JSX, no external logos. Themed with tokens. Sells third-party trust at a glance.

import { Star } from "lucide-react";

const ratings = [
  { source: "G2", score: "4.8", label: "High Performer · Spring '26" },
  { source: "Capterra", score: "4.9", label: "Best Value · 2026" },
  { source: "Product Hunt", score: "4.7", label: "#2 Product of the Day" },
  { source: "Trustpilot", score: "4.8", label: "Excellent · 312 reviews" },
];

function Stars({ score }: { score: string }) {
  const n = parseFloat(score);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < Math.floor(n);
        const half = !filled && i < n;
        return (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${
              filled ? "fill-primary text-primary" : half ? "fill-primary/50 text-primary" : "fill-transparent text-muted-foreground/40"
            }`}
            strokeWidth={1.5}
          />
        );
      })}
    </div>
  );
}

export function RatingsStrip({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto">
        {ratings.map((r) => (
          <div
            key={r.source}
            className="group rounded-xl border bg-card/60 backdrop-blur p-4 hover:border-primary/40 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {r.source}
              </span>
              <span className="text-lg font-bold tabular-nums text-foreground">
                {r.score}
                <span className="text-xs font-normal text-muted-foreground">/5</span>
              </span>
            </div>
            <Stars score={r.score} />
            <p className="mt-2 text-[10.5px] leading-tight text-muted-foreground">
              {r.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
