import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, Mail, Phone, Building2, Calendar, Check, ShieldOff, Merge, Sparkles, Link2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type DupRecord = {
  id: string;
  workspace_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  created_at: string;
};

type Group = {
  id: string; // fingerprint
  table: "contacts" | "leads";
  workspace_id: string;
  keepId: string;
  deleteIds: string[];
  records: DupRecord[];
  matchedBy: string[];
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Filter to one table; otherwise show both */
  table?: "contacts" | "leads";
}

type CrossLink = {
  id: string;
  workspace_id: string;
  matchedBy: string[];
  lead: DupRecord | null;
  contact: DupRecord | null;
};

export function DuplicateReviewDialog({ open, onOpenChange, table }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [crossLinks, setCrossLinks] = useState<CrossLink[]>([]);
  const [keepBy, setKeepBy] = useState<Record<string, string> | any>({});
  const [busyGroup, setBusyGroup] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const visibleGroups = table ? groups.filter((g) => g.table === table) : groups;
  // Cross-links are inherently mixed-table — show them whenever the dialog is open.
  const visibleCrossLinks = crossLinks;

  const scan = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cleanup-duplicates", {
        body: { action: "scan" },
      });
      if (error) throw error;
      const gs: Group[] = data?.groups || [];
      setGroups(gs);
      setCrossLinks(data?.crossLinks || []);
      const keeps: any = {};
      for (const g of gs) keeps[g.id] = g.keepId;
      setKeepBy(keeps);
    } catch (e: any) {
      toast({ title: "Scan failed", description: e?.message || "Could not scan duplicates", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const refreshAfter = () => {
    qc.invalidateQueries({ queryKey: ["contacts"] });
    qc.invalidateQueries({ queryKey: ["leads"] });
  };

  const mergeGroup = async (g: Group) => {
    setBusyGroup(g.id);
    try {
      const keepId = keepBy[g.id] || g.keepId;
      const { data, error } = await supabase.functions.invoke("cleanup-duplicates", {
        body: { action: "merge", groupIds: [g.id], keepOverrides: { [g.id]: keepId } },
      });
      if (error) throw error;
      toast({
        title: "Merged",
        description: `Combined ${data?.deleted ?? 0} record${data?.deleted === 1 ? "" : "s"} into one.`,
      });
      setGroups((prev) => prev.filter((x) => x.id !== g.id));
      refreshAfter();
    } catch (e: any) {
      toast({ title: "Merge failed", description: e?.message || "Try again", variant: "destructive" });
    } finally {
      setBusyGroup(null);
    }
  };

  const ignoreGroup = async (g: Group) => {
    setBusyGroup(g.id);
    try {
      const { error } = await supabase.functions.invoke("cleanup-duplicates", {
        body: {
          action: "ignore",
          table: g.table,
          workspaceId: g.workspace_id,
          recordIds: g.records.map((r) => r.id),
        },
      });
      if (error) throw error;
      toast({ title: "Marked as separate", description: "We won't flag this group again." });
      setGroups((prev) => prev.filter((x) => x.id !== g.id));
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e?.message || "Try again", variant: "destructive" });
    } finally {
      setBusyGroup(null);
    }
  };

  const mergeAll = async () => {
    setBulkBusy(true);
    try {
      const ids = visibleGroups.map((g) => g.id);
      const overrides: any = {};
      for (const g of visibleGroups) overrides[g.id] = keepBy[g.id] || g.keepId;
      const { data, error } = await supabase.functions.invoke("cleanup-duplicates", {
        body: { action: "merge", groupIds: ids, keepOverrides: overrides },
      });
      if (error) throw error;
      toast({
        title: "All merged",
        description: `Combined ${data?.deleted ?? 0} record${data?.deleted === 1 ? "" : "s"}.`,
      });
      setGroups((prev) => (table ? prev.filter((g) => g.table !== table) : []));
      refreshAfter();
    } catch (e: any) {
      toast({ title: "Merge failed", description: e?.message || "Try again", variant: "destructive" });
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busyGroup && !bulkBusy && onOpenChange(o)}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Duplicate review
          </DialogTitle>
          <DialogDescription>
            See exactly what's about to be combined. Pick which record to keep, merge, or mark a group as
            separate so it stops showing up.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {loading
              ? "Scanning…"
              : visibleGroups.length === 0 && visibleCrossLinks.length === 0
              ? "No duplicates or split records found."
              : `${visibleGroups.length} group${visibleGroups.length === 1 ? "" : "s"} • ${visibleGroups.reduce((n, g) => n + g.deleteIds.length, 0)} flagged${visibleCrossLinks.length ? ` • ${visibleCrossLinks.length} lead↔contact split${visibleCrossLinks.length === 1 ? "" : "s"}` : ""}`}
          </span>
          <Button size="sm" variant="ghost" onClick={scan} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1", loading && "animate-spin")} />
            Rescan
          </Button>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="py-12 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Looking for duplicates…
            </div>
          ) : visibleGroups.length === 0 && visibleCrossLinks.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Check className="h-6 w-6 mx-auto mb-2 text-emerald-600" />
              You're all clean. No duplicates detected.
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {visibleGroups.map((g) => {
                const keepId = keepBy[g.id] || g.keepId;
                return (
                  <div key={g.id} className="border rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-muted/50 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="capitalize">{g.table}</Badge>
                        <span className="text-muted-foreground">
                          {g.records.length} records • matched by {g.matchedBy.join(" + ") || "name"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => ignoreGroup(g)}
                          disabled={busyGroup === g.id || bulkBusy}
                        >
                          <ShieldOff className="h-3.5 w-3.5 mr-1" />
                          Keep separate
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => mergeGroup(g)}
                          disabled={busyGroup === g.id || bulkBusy}
                        >
                          {busyGroup === g.id ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          ) : (
                            <Merge className="h-3.5 w-3.5 mr-1" />
                          )}
                          Merge into selected
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border">
                      {g.records.map((r) => {
                        const isKeep = r.id === keepId;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setKeepBy((p: any) => ({ ...p, [g.id]: r.id }))}
                            className={cn(
                              "text-left p-3 bg-background hover:bg-accent/40 transition-colors",
                              isKeep && "bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500/40"
                            )}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm truncate">
                                {r.name || "(no name)"}
                              </span>
                              {isKeep ? (
                                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] gap-1">
                                  <Check className="h-3 w-3" /> Keep
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">Will be merged</Badge>
                              )}
                            </div>
                            <div className="space-y-0.5 text-xs text-muted-foreground">
                              {r.email && <div className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 flex-shrink-0" />{r.email}</div>}
                              {r.phone && <div className="flex items-center gap-1.5 truncate"><Phone className="h-3 w-3 flex-shrink-0" />{r.phone}</div>}
                              {r.company && <div className="flex items-center gap-1.5 truncate"><Building2 className="h-3 w-3 flex-shrink-0" />{r.company}</div>}
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3 flex-shrink-0" />
                                Added {new Date(r.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {visibleCrossLinks.length > 0 && (
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                    <Link2 className="h-4 w-4 text-amber-600" />
                    Lead ↔ Contact splits
                    <Badge variant="outline" className="text-[10px]">{visibleCrossLinks.length}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 flex items-start gap-1.5">
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0 text-amber-600" />
                    These records exist in both Leads and Contacts. They can't be auto-merged (different schemas), but messages and history may be split between them.
                  </p>
                  <div className="space-y-2">
                    {visibleCrossLinks.map((cl) => (
                      <div key={cl.id} className="border rounded-lg overflow-hidden">
                        <div className="px-3 py-1.5 bg-muted/40 text-xs text-muted-foreground">
                          matched by {cl.matchedBy.join(" + ") || "name"}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border">
                          {[
                            { rec: cl.lead, label: "Lead" },
                            { rec: cl.contact, label: "Contact" },
                          ].map(({ rec, label }) =>
                            rec ? (
                              <div key={label} className="p-3 bg-background">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-sm truncate">{rec.name || "(no name)"}</span>
                                  <Badge variant="outline" className="text-[10px]">{label}</Badge>
                                </div>
                                <div className="space-y-0.5 text-xs text-muted-foreground">
                                  {rec.email && <div className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 flex-shrink-0" />{rec.email}</div>}
                                  {rec.phone && <div className="flex items-center gap-1.5 truncate"><Phone className="h-3 w-3 flex-shrink-0" />{rec.phone}</div>}
                                  {rec.company && <div className="flex items-center gap-1.5 truncate"><Building2 className="h-3 w-3 flex-shrink-0" />{rec.company}</div>}
                                </div>
                              </div>
                            ) : null
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="border-t pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!!busyGroup || bulkBusy}>
            Close
          </Button>
          {visibleGroups.length > 1 && (
            <Button onClick={mergeAll} disabled={bulkBusy || !!busyGroup}>
              {bulkBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Merge className="h-4 w-4 mr-1" />}
              Merge all {visibleGroups.length} groups
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
