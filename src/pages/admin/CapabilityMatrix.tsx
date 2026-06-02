import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CAPABILITIES, type ShellKey, type Tier } from "@/capabilities/registry";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { buildCapabilityLink } from "@/core/deep-link";
import { CheckCircle2, Circle } from "lucide-react";

const SHELLS: ShellKey[] = ["saas", "widget", "kiosk", "extension", "agent", "api", "wl"];
const SHELL_ROUTE: Record<ShellKey, string> = {
  saas: "/dashboard", widget: "/shell/widget", kiosk: "/shell/kiosk",
  extension: "/shell/extension", agent: "/shell/agent", api: "/shell/api", wl: "/shell/wl",
};
const TIER_LABEL: Record<Tier, string> = { free: "Free", starter: "Starter", pro: "Pro", enterprise: "Ent.", admin: "Admin" };

/**
 * Admin: capability × shell coverage matrix.
 * Visualises the registry so you can see what every shell *would* render
 * given the right tier — the same data the shell-coverage-check.ts script
 * asserts at build time. (EMERGENCE.md §VII.50 — Capability-coverage script.)
 */
export default function CapabilityMatrix() {
  const { data: isAdmin, isLoading } = useIsAdmin();

  const rows = useMemo(() => Object.values(CAPABILITIES).sort((a, b) =>
    a.group === b.group ? a.label.localeCompare(b.label) : a.group.localeCompare(b.group),
  ), []);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!isAdmin) return <div className="p-6"><Card><CardContent className="p-6 text-muted-foreground">Admin only.</CardContent></Card></div>;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-bold">Capability Matrix</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} capabilities across {SHELLS.length} shells. Each filled dot means the capability
          ships in that shell's default surface. Empty dots are still reachable via the capability picker.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coverage</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-2 min-w-[180px]">Capability</th>
                  <th className="text-left p-2">Tier</th>
                  {SHELLS.map(s => (
                    <th key={s} className="text-center p-2 uppercase tracking-wide">{s}</th>
                  ))}
                  <th className="text-left p-2">Deep link</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((cap) => (
                  <tr key={cap.key} className="border-t border-border hover:bg-muted/30">
                    <td className="p-2">
                      <div className="font-medium">{cap.label}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{cap.key}</div>
                    </td>
                    <td className="p-2"><Badge variant="outline" className="text-[10px]">{TIER_LABEL[cap.tier]}</Badge></td>
                    {SHELLS.map(s => (
                      <td key={s} className="p-2 text-center">
                        {cap.shellDefaults.includes(s) ? (
                          <CheckCircle2 className="h-3.5 w-3.5 mx-auto text-emerald-600" aria-label={`${cap.key} default in ${s}`} />
                        ) : (
                          <Circle className="h-3 w-3 mx-auto text-muted-foreground/30" aria-label={`${cap.key} not default in ${s}`} />
                        )}
                      </td>
                    ))}
                    <td className="p-2">
                      <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-[10px]">
                        <Link to={buildCapabilityLink(SHELL_ROUTE.widget, cap.key)}>widget link</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
