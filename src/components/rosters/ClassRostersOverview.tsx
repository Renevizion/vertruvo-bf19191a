import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, ChevronRight, ClipboardList } from "lucide-react";
import { ProgramRosterSheet } from "./ProgramRosterSheet";

interface Props {
  workspaceId: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending:      "bg-muted text-muted-foreground",
  renewing:     "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  moving:       "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  not_renewing: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  waitlist:     "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", renewing: "Renewing", moving: "Moving", not_renewing: "Not renewing", waitlist: "Waitlist",
};

export function ClassRostersOverview({ workspaceId }: Props) {
  const [openItem, setOpenItem] = useState<{ id: string; title: string } | null>(null);

  // Items that have either roster entries OR active bookings
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["roster-overview-classes", workspaceId],
    queryFn: async () => {
      // Items that look like classes/programs
      const { data: items } = await supabase
        .from("items")
        .select("id, title, item_type")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .in("item_type", ["class", "clinic", "camp", "membership", "lesson", "tournament"])
        .order("title");
      return items || [];
    },
    enabled: !!workspaceId,
  });

  const { data: tallies = {} } = useQuery({
    queryKey: ["roster-overview-tallies", workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("program_rosters" as any)
        .select("item_id, status")
        .eq("workspace_id", workspaceId);
      const map: Record<string, Record<string, number>> = {};
      (data || []).forEach((r: any) => {
        map[r.item_id] = map[r.item_id] || {};
        map[r.item_id][r.status] = (map[r.item_id][r.status] || 0) + 1;
      });
      return map;
    },
    enabled: !!workspaceId,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Roster Overview
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Review enrollment status, upcoming movement, and follow-up needs from one clear workspace.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-6">Loading…</div>
        ) : classes.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">
            No roster-ready offerings yet. Add offerings in Settings → Items when you're ready to track renewals.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {classes.map((c: any) => {
              const t = tallies[c.id] || {};
              const total = Object.values(t).reduce((a: number, b: any) => a + b, 0);
              return (
                <button
                  key={c.id}
                  onClick={() => setOpenItem({ id: c.id, title: c.title })}
                  className="text-left border rounded-lg p-3 hover:border-primary hover:bg-muted/30 transition group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{c.title}</div>
                      <div className="text-xs text-muted-foreground capitalize">{c.item_type}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                  </div>
                  {total > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(t).map(([s, n]) => (
                        <Badge key={s} variant="secondary" className={`text-[10px] ${STATUS_COLORS[s]}`}>
                          {STATUS_LABEL[s]}: {n}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> No roster yet — click to build
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </CardContent>

      {openItem && (
        <ProgramRosterSheet
          open={!!openItem}
          onOpenChange={(o) => !o && setOpenItem(null)}
          workspaceId={workspaceId}
          itemId={openItem.id}
          itemTitle={openItem.title}
        />
      )}
    </Card>
  );
}
