import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Bot, Phone, MessageSquare, Loader2, Star, Users } from "lucide-react";

interface Blueprint {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  type: string;
  voice: string | null;
  greeting: string | null;
  instructions: string;
  is_published: boolean;
  is_featured: boolean;
  version: number;
  created_at: string;
}

const empty = {
  name: "",
  description: "",
  category: "general",
  type: "chat",
  voice: "",
  greeting: "",
  instructions: "",
  is_published: false,
  is_featured: false,
};

export default function AgentBlueprints() {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Blueprint | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: blueprints, isLoading } = useQuery({
    queryKey: ["agent-blueprints-admin"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_blueprints")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Blueprint[];
    },
  });

  const { data: installCounts } = useQuery({
    queryKey: ["blueprint-install-counts"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agents")
        .select("blueprint_id")
        .not("blueprint_id", "is", null);
      if (error) throw error;
      const map: Record<string, number> = {};
      (data || []).forEach((r: any) => { map[r.blueprint_id] = (map[r.blueprint_id] || 0) + 1; });
      return map;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        ...form,
        voice: form.voice || null,
        greeting: form.greeting || null,
        description: form.description || null,
      };
      if (editing) {
        // Bump version if published content changed materially
        const bumpVersion = editing.is_published && (
          editing.instructions !== form.instructions ||
          editing.greeting !== (form.greeting || null) ||
          editing.voice !== (form.voice || null)
        );
        const updates: any = { ...payload };
        if (bumpVersion) updates.version = editing.version + 1;
        if (form.is_published && !editing.is_published) updates.published_at = new Date().toISOString();
        const { error } = await supabase.from("agent_blueprints").update(updates).eq("id", editing.id);
        if (error) throw error;
      } else {
        if (form.is_published) payload.published_at = new Date().toISOString();
        const { data: { user } } = await supabase.auth.getUser();
        payload.created_by = user?.id;
        const { error } = await supabase.from("agent_blueprints").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editing ? "Blueprint updated" : "Blueprint created" });
      qc.invalidateQueries({ queryKey: ["agent-blueprints-admin"] });
      qc.invalidateQueries({ queryKey: ["agent-blueprints-published"] });
      setOpen(false);
      setEditing(null);
      setForm(empty);
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agent_blueprints").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Blueprint deleted" });
      qc.invalidateQueries({ queryKey: ["agent-blueprints-admin"] });
      qc.invalidateQueries({ queryKey: ["agent-blueprints-published"] });
      setDeleteId(null);
    },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  if (adminLoading) return <div className="p-8 flex items-center"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (bp: Blueprint) => {
    setEditing(bp);
    setForm({
      name: bp.name,
      description: bp.description || "",
      category: bp.category || "general",
      type: bp.type,
      voice: bp.voice || "",
      greeting: bp.greeting || "",
      instructions: bp.instructions,
      is_published: bp.is_published,
      is_featured: bp.is_featured,
    });
    setOpen(true);
  };

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Bot className="h-6 w-6" />Agent Blueprints</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform-wide agent templates. Workspaces install their own private, editable copy.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />New Blueprint</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading…</div>
      ) : !blueprints?.length ? (
        <Card className="p-10 text-center">
          <Bot className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium">No blueprints yet</p>
          <Button onClick={openNew} className="mt-4"><Plus className="h-4 w-4 mr-1.5" />Create the first one</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {blueprints.map((bp) => {
            const installs = installCounts?.[bp.id] || 0;
            const isVoice = bp.type === "voice";
            return (
              <Card key={bp.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${isVoice ? "bg-violet-500/10 text-violet-500" : "bg-blue-500/10 text-blue-500"}`}>
                    {isVoice ? <Phone className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-semibold text-sm truncate">{bp.name}</h3>
                      {bp.is_published ? (
                        <Badge className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/15 text-emerald-600 border-0">Published</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">Draft</Badge>
                      )}
                      {bp.is_featured && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-600 border-0"><Star className="w-2.5 h-2.5 mr-0.5" />Featured</Badge>
                      )}
                    </div>
                    {bp.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{bp.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span>v{bp.version}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{installs} installs</span>
                      <span className="capitalize">{bp.category}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(bp)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(bp.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>{editing ? "Edit Blueprint" : "New Blueprint"}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chat">Chat</SelectItem>
                    <SelectItem value="voice">Voice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. sales, support, booking" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            {form.type === "voice" && (
              <div className="space-y-1.5">
                <Label>Voice ID (ElevenLabs)</Label>
                <Input value={form.voice} onChange={(e) => setForm({ ...form, voice: e.target.value })} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Greeting</Label>
              <Textarea value={form.greeting} onChange={(e) => setForm({ ...form, greeting: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Instructions</Label>
              <Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={8} placeholder="System prompt / behavior guide…" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Published</Label>
                <p className="text-xs text-muted-foreground">Visible in every workspace's marketplace</p>
              </div>
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Featured</Label>
                <p className="text-xs text-muted-foreground">Highlight at the top of the marketplace</p>
              </div>
              <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || !form.instructions || saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
              {editing ? "Save" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete blueprint?</AlertDialogTitle>
            <AlertDialogDescription>Existing installed agents will keep working but lose their blueprint link.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
