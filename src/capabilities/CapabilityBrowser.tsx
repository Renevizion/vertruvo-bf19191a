import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CAPABILITIES, type Capability, type ShellKey, type Tier } from "@/capabilities/registry";
import { can } from "@/lib/can";
import type { Viewer } from "@/lib/viewer";

interface Props {
  shell: ShellKey;
  viewer: Viewer;
  planTier: Tier;
  /** Called when the user picks a capability. Shell decides how to mount it. */
  onPick: (capability: Capability) => void;
}

const GROUP_LABEL: Record<string, string> = {
  identity: "Account", crm: "CRM", booking: "Booking", pay: "Payments",
  agent: "AI Agents", comms: "Voice & SMS", email: "Email",
  content: "Content & Social", forms: "Forms", auto: "Automations",
  disco: "Discovery", insights: "Insights", admin: "Admin",
};

/**
 * Universal capability picker — used by every shell to let the user navigate
 * from the entry capability into any other entitled capability.
 *
 * See CORE_CONTRACT.md §4 (Progressive Expansion Protocol).
 */
export function CapabilityBrowser({ shell, viewer, planTier, onPick }: Props) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const entitled = useMemo(() => {
    return Object.values(CAPABILITIES).filter(c => can(viewer, c.key, planTier));
  }, [viewer, planTier]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return entitled;
    return entitled.filter(c =>
      c.label.toLowerCase().includes(needle) ||
      c.description.toLowerCase().includes(needle) ||
      c.key.toLowerCase().includes(needle)
    );
  }, [entitled, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, Capability[]>();
    for (const c of filtered) {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group)!.push(c);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const handle = (c: Capability) => {
    onPick(c);
    // For SaaS shell, also navigate if there's a route.
    if (shell === "saas" && c.saasPath) navigate(c.saasPath);
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search capabilities…"
          className="pl-9"
          autoFocus
        />
      </div>

      <ScrollArea className="h-[60vh] pr-2">
        <div className="flex flex-col gap-4">
          {grouped.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No capabilities match your search.
            </p>
          )}
          {grouped.map(([group, caps]) => (
            <div key={group} className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                {GROUP_LABEL[group] ?? group}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {caps.map((c) => (
                  <Card
                    key={c.key}
                    onClick={() => handle(c)}
                    className="p-3 cursor-pointer hover:border-primary transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.label}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                      </div>
                      {c.tier !== "free" && (
                        <Badge variant="outline" className="text-[10px] uppercase shrink-0">
                          {c.tier}
                        </Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
