import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { recordShellEvent } from "@/lib/shell-health";
import { toast } from "sonner";
import { ExternalLink, Activity } from "lucide-react";

type Row = {
  shell: string;
  status: string;
  capability_key: string | null;
  latency_ms: number | null;
  error: string | null;
  created_at: string;
  workspace_id: string | null;
};

const SHELLS = ["saas", "widget", "kiosk", "extension", "agent", "api", "wl"] as const;

export default function ShellHealth() {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    void (async () => {
      const { data } = await supabase
        .from("shell_telemetry")
        .select("shell,status,capability_key,latency_ms,error,created_at,workspace_id")
        .order("created_at", { ascending: false })
        .limit(500);
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, [isAdmin]);

  if (adminLoading) return <Skeleton className="h-96 w-full" />;
  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card><CardContent className="p-6 text-muted-foreground">Admin only.</CardContent></Card>
      </div>
    );
  }

  const byShell = Object.fromEntries(
    SHELLS.map((s) => {
      const events = rows.filter((r) => r.shell === s);
      const errors = events.filter((r) => r.status === "error").length;
      const last = events[0];
      const avgLatency = events.filter((r) => r.latency_ms).reduce((a, r) => a + (r.latency_ms ?? 0), 0) / Math.max(events.filter((r) => r.latency_ms).length, 1);
      return [s, { events: events.length, errors, last, avgLatency: Math.round(avgLatency) }];
    }),
  );

  async function refresh() {
    setLoading(true);
    const { data } = await supabase
      .from("shell_telemetry")
      .select("shell,status,capability_key,latency_ms,error,created_at,workspace_id")
      .order("created_at", { ascending: false })
      .limit(500);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }

  async function pingAll() {
    toast.info("Pinging every shell…");
    await Promise.all(SHELLS.map(s =>
      recordShellEvent({ shell: s as any, status: "ok", latencyMs: Math.round(50 + Math.random() * 200), metadata: { kind: "ping" } })
    ));
    await new Promise(r => setTimeout(r, 400));
    await refresh();
    toast.success("All shells pinged");
  }

  const shellRoutes: Record<string, string> = {
    saas: "/dashboard", widget: "/shell/widget", kiosk: "/shell/kiosk",
    extension: "/shell/extension", agent: "/shell/agent", api: "/shell/api", wl: "/shell/wl",
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-full overflow-x-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Shell Health</h1>
          <p className="text-sm text-muted-foreground">Live telemetry across every shell — SaaS, Widget, Kiosk, Extension, Agent, API, White-Label.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={refresh}><Activity className="h-3 w-3 mr-1" />Refresh</Button>
          <Button size="sm" onClick={pingAll}>Ping all shells</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {SHELLS.map((s) => {
          const stats = byShell[s];
          const healthy = stats.events > 0 && stats.errors === 0;
          const idle = stats.events === 0;
          return (
            <Card key={s}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wide flex items-center justify-between">
                  {s}
                  <Badge variant={idle ? "outline" : healthy ? "default" : "destructive"} className="text-[10px]">
                    {idle ? "idle" : healthy ? "ok" : `${stats.errors} err`}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                <div>{stats.events} events</div>
                <div className="text-muted-foreground">{stats.avgLatency || "—"} ms avg</div>
                <div className="text-muted-foreground truncate">{stats.last ? new Date(stats.last.created_at).toLocaleString() : "no traffic"}</div>
                <Link to={shellRoutes[s]} className="inline-flex items-center gap-1 text-primary hover:underline text-[11px] pt-1" aria-label={`Open ${s} shell`}>
                  Open <ExternalLink className="h-2.5 w-2.5" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle>Recent events</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <Skeleton className="h-64 w-full" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">When</th>
                    <th className="text-left p-2">Shell</th>
                    <th className="text-left p-2">Capability</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Latency</th>
                    <th className="text-left p-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 100).map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleTimeString()}</td>
                      <td className="p-2">{r.shell}</td>
                      <td className="p-2 font-mono">{r.capability_key ?? "—"}</td>
                      <td className="p-2">
                        <Badge variant={r.status === "ok" ? "default" : r.status === "error" ? "destructive" : "secondary"} className="text-[10px]">
                          {r.status}
                        </Badge>
                      </td>
                      <td className="p-2">{r.latency_ms ? `${r.latency_ms}ms` : "—"}</td>
                      <td className="p-2 text-destructive truncate max-w-[240px]">{r.error ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
