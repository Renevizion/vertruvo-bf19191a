import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Download, Printer, RefreshCw, Plus, Trash2, Loader2, Users, Search, Pencil, Check, X
} from "lucide-react";

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending:       { label: "Pending",      className: "bg-muted text-muted-foreground" },
  renewing:      { label: "Renewing",     className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" },
  moving:        { label: "Moving",       className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
  not_renewing:  { label: "Not renewing", className: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200" },
  waitlist:      { label: "Waitlist",     className: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200" },
};

type RosterRow = {
  id: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  status: keyof typeof STATUS_META;
  notes: string | null;
  period_label: string;
  lead_id: string | null;
  status_updated_at: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  itemId: string;
  itemTitle: string;
}

export function ProgramRosterSheet({ open, onOpenChange, workspaceId, itemId, itemTitle }: Props) {
  const qc = useQueryClient();
  const [period, setPeriod] = useState<string>("Current");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ contact_name: "", contact_email: "", contact_phone: "", notes: "" });

  // Available periods + roster
  const { data: periods = [] } = useQuery({
    queryKey: ["roster-periods", workspaceId, itemId],
    queryFn: async () => {
      const { data } = await supabase
        .from("program_rosters" as any)
        .select("period_label")
        .eq("workspace_id", workspaceId)
        .eq("item_id", itemId);
      const set = new Set<string>(["Current"]);
      (data || []).forEach((r: any) => set.add(r.period_label));
      return Array.from(set);
    },
    enabled: open && !!workspaceId && !!itemId,
  });

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["roster-rows", workspaceId, itemId, period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_rosters" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("item_id", itemId)
        .eq("period_label", period)
        .order("contact_name");
      if (error) throw error;
      return (data || []) as unknown as RosterRow[];
    },
    enabled: open && !!workspaceId && !!itemId,
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, pending: 0, renewing: 0, moving: 0, not_renewing: 0, waitlist: 0 };
    rows.forEach(r => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (filter !== "all" && r.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return r.contact_name?.toLowerCase().includes(q)
          || r.contact_email?.toLowerCase().includes(q)
          || r.contact_phone?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [rows, filter, search]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("program_rosters" as any).update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roster-rows", workspaceId, itemId, period] }); },
    onError: (e: any) => toast.error(e.message || "Failed to update status"),
  });

  const updateNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase.from("program_rosters" as any).update({ notes }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["roster-rows", workspaceId, itemId, period] });
    },
  });

  const removeEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("program_rosters" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roster-rows", workspaceId, itemId, period] }); toast.success("Removed"); },
  });

  const addEntry = useMutation({
    mutationFn: async () => {
      if (!addForm.contact_name.trim()) throw new Error("Name required");
      const { error } = await supabase.from("program_rosters" as any).insert({
        workspace_id: workspaceId,
        item_id: itemId,
        period_label: period,
        contact_name: addForm.contact_name.trim(),
        contact_email: addForm.contact_email.trim() || null,
        contact_phone: addForm.contact_phone.trim() || null,
        notes: addForm.notes.trim() || null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAddOpen(false);
      setAddForm({ contact_name: "", contact_email: "", contact_phone: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["roster-rows", workspaceId, itemId, period] });
      toast.success("Added to roster");
    },
    onError: (e: any) => toast.error(e.message || "Failed to add"),
  });

  const syncFromBookings = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("sync_program_roster_from_bookings", {
        _workspace_id: workspaceId,
        _item_id: itemId,
        _period_label: period,
        _from: null,
        _to: null,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (added) => {
      qc.invalidateQueries({ queryKey: ["roster-rows", workspaceId, itemId, period] });
      toast.success(added ? `Pulled in ${added} new enrollee${added === 1 ? "" : "s"}` : "Already up to date");
    },
    onError: (e: any) => toast.error(e.message || "Sync failed"),
  });

  const exportCSV = () => {
    const header = ["Name", "Email", "Phone", "Status", "Notes", "Status changed"];
    const lines = [header, ...filtered.map(r => [
      r.contact_name,
      r.contact_email || "",
      r.contact_phone || "",
      STATUS_META[r.status]?.label || r.status,
      (r.notes || "").replace(/\n/g, " "),
      r.status_updated_at ? new Date(r.status_updated_at).toLocaleDateString() : "",
    ])];
    const csv = lines.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${itemTitle.replace(/\s+/g, "-").toLowerCase()}-${period.replace(/\s+/g, "-").toLowerCase()}-roster.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printRoster = () => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    const tally = (k: string) => counts[k] || 0;
    const rowsHtml = filtered.map(r => `
      <tr>
        <td>${escapeHtml(r.contact_name)}</td>
        <td>${escapeHtml(r.contact_email || "")}</td>
        <td>${escapeHtml(r.contact_phone || "")}</td>
        <td><strong>${escapeHtml(STATUS_META[r.status]?.label || r.status)}</strong></td>
        <td style="border-bottom:1px solid #999;min-width:120px">${escapeHtml(r.notes || "")}</td>
      </tr>`).join("");
    win.document.write(`<!doctype html><html><head><title>${escapeHtml(itemTitle)} — ${escapeHtml(period)} Roster</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;color:#111}
        h1{margin:0 0 4px;font-size:20px}
        .sub{color:#555;margin-bottom:16px;font-size:13px}
        .tally{display:flex;gap:16px;margin-bottom:16px;font-size:13px}
        .tally span{padding:4px 10px;border:1px solid #ccc;border-radius:6px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th,td{padding:8px 10px;text-align:left;border-bottom:1px solid #e5e5e5;vertical-align:top}
        th{background:#f6f6f6;font-weight:600}
        @media print { .noprint{display:none} }
      </style></head><body>
      <h1>${escapeHtml(itemTitle)} — ${escapeHtml(period)} Roster</h1>
      <div class="sub">Printed ${new Date().toLocaleString()} • ${filtered.length} of ${rows.length} enrollees</div>
      <div class="tally">
        <span>Renewing: ${tally("renewing")}</span>
        <span>Moving: ${tally("moving")}</span>
        <span>Not renewing: ${tally("not_renewing")}</span>
        <span>Pending: ${tally("pending")}</span>
        <span>Waitlist: ${tally("waitlist")}</span>
      </div>
      <table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Notes</th></tr></thead>
      <tbody>${rowsHtml}</tbody></table>
      <script>window.onload=()=>setTimeout(()=>window.print(),250)</script>
      </body></html>`);
    win.document.close();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader className="space-y-1">
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {itemTitle} — Roster
          </SheetTitle>
          <SheetDescription>
            One source of truth for who's in this class and where they stand for next period.
          </SheetDescription>
        </SheetHeader>

        {/* Controls */}
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[140px]">
              <Label className="text-xs">Period</Label>
              <div className="flex gap-2">
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {periods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="New period…"
                  className="w-32"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                      setPeriod((e.target as HTMLInputElement).value.trim());
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => syncFromBookings.mutate()} disabled={syncFromBookings.isPending}>
              {syncFromBookings.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-1">Pull from bookings</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />Add
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!filtered.length}>
              <Download className="h-4 w-4 mr-1" />CSV
            </Button>
            <Button variant="outline" size="sm" onClick={printRoster} disabled={!filtered.length}>
              <Printer className="h-4 w-4 mr-1" />Print
            </Button>
          </div>

          {/* Tally chips */}
          <div className="flex flex-wrap gap-1.5">
            {(["all", "renewing", "moving", "not_renewing", "pending", "waitlist"] as const).map(k => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${
                  filter === k ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                }`}
              >
                {k === "all" ? "All" : STATUS_META[k]?.label} · {counts[k] || 0}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, phone…"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="mt-4 border rounded-lg overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {rows.length === 0
                ? "No one on the roster yet. Pull from bookings or add manually."
                : "No matches for your filter."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <div>{r.contact_name}</div>
                      <div className="md:hidden text-xs text-muted-foreground mt-0.5">
                        {r.contact_email || r.contact_phone || ""}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      <div>{r.contact_email}</div>
                      <div>{r.contact_phone}</div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={r.status}
                        onValueChange={(v) => updateStatus.mutate({ id: r.id, status: v })}
                      >
                        <SelectTrigger className="h-8 w-[140px]">
                          <SelectValue>
                            <Badge variant="secondary" className={STATUS_META[r.status]?.className}>
                              {STATUS_META[r.status]?.label}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_META).map(([k, m]) => (
                            <SelectItem key={k} value={k}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="max-w-[260px]">
                      {editing === r.id ? (
                        <div className="flex gap-1 items-start">
                          <Textarea
                            value={editingNotes}
                            onChange={(e) => setEditingNotes(e.target.value)}
                            className="min-h-[60px] text-xs"
                            autoFocus
                          />
                          <div className="flex flex-col gap-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6"
                              onClick={() => updateNotes.mutate({ id: r.id, notes: editingNotes })}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="text-left text-xs text-muted-foreground hover:text-foreground w-full flex items-start gap-1 group"
                          onClick={() => { setEditing(r.id); setEditingNotes(r.notes || ""); }}
                        >
                          <span className="flex-1 truncate whitespace-pre-wrap">{r.notes || <em className="opacity-50">add note…</em>}</span>
                          <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 mt-0.5" />
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeEntry.mutate(r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Add manual */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add to roster</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={addForm.contact_name} onChange={(e) => setAddForm(f => ({ ...f, contact_name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Email</Label><Input value={addForm.contact_email} onChange={(e) => setAddForm(f => ({ ...f, contact_email: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={addForm.contact_phone} onChange={(e) => setAddForm(f => ({ ...f, contact_phone: e.target.value }))} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={addForm.notes} onChange={(e) => setAddForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={() => addEntry.mutate()} disabled={addEntry.isPending}>
                {addEntry.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
