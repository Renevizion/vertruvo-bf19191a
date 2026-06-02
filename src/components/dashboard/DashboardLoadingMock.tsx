import { DollarSign, Users, Phone, Calendar, TrendingUp } from "lucide-react";

/**
 * High-fidelity seeded loading mock for the dashboard.
 * Replaces the "Loading metrics..." text with a branded, animated
 * shimmer that looks like the real dashboard about to resolve.
 *
 * Style language matches HeroProductMock (emerald, soft shimmer, thermiBar).
 */
export function DashboardLoadingMock() {
  const cards = [
    { label: "Opportunity Value", icon: DollarSign, w: "70%" },
    { label: "Pipeline", icon: Users, w: "55%" },
    { label: "Conversion Rate", icon: TrendingUp, w: "45%" },
    { label: "Active Tasks", icon: Calendar, w: "60%" },
  ];

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes kvShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes kvPulseDot {
          0%, 100% { opacity: .35; }
          50% { opacity: 1; }
        }
        .kv-shimmer {
          position: relative;
          overflow: hidden;
          background: hsl(var(--muted));
        }
        .kv-shimmer::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, hsl(var(--background) / .9), transparent);
          animation: kvShimmer 1.6s infinite;
        }
      `}</style>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {cards.map(({ label, icon: Icon, w }, i) => (
          <div
            key={label}
            className="rounded-xl border bg-card p-4 shadow-sm"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
              <Icon className="h-4 w-4 text-primary/70" />
            </div>
            <div className="h-7 rounded kv-shimmer mb-2" style={{ width: w }} />
            <div className="h-3 rounded kv-shimmer w-1/2 opacity-70" />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
        <span className="relative inline-flex h-1.5 w-1.5">
          <span
            className="absolute inset-0 rounded-full bg-primary"
            style={{ animation: "kvPulseDot 1.2s ease-in-out infinite" }}
          />
        </span>
        Syncing live metrics
      </div>
    </div>
  );
}
