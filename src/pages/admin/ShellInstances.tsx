import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { Plus, ExternalLink, Edit, Trash2, Globe, EyeOff, Eye } from "lucide-react";

type Shell = {
  id: string;
  workspace_id: string;
  kind: string;
  slug: string;
  name: string;
  is_published: boolean;
  capability_keys: string[];
  updated_at: string;
};



function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

export default function ShellInstances() {
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const [shells, setShells] = useState<Shell[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<string>("kiosk");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("shell_instances")
      .select("id, workspace_id, kind, slug, name, is_published, capability_keys, updated_at")
      .order("updated_at", { ascending: false });
    if (error) { toast.error(error.message); }
    setShells((data ?? []) as Shell[]);
    setLoading(false);
  }

  async function createShell() {
    if (!newName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Sign in required"); return; }
    const { data: ws } = await supabase
      .from("workspaces").select("id").eq("owner_id", user.id).limit(1).maybeSingle();
    if (!ws) { toast.error("No workspace"); return; }
    const baseSlug = slugify(newName) || `shell-${Date.now()}`;
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase
      .from("shell_instances")
      .insert({
        workspace_id: (ws as { id: string }).id,
        kind: newKind,
        slug,
        name: newName.trim(),
        capability_keys: [],
        created_by: user.id,
      })
      .select("id").single();
    if (error) { toast.error(error.message); return; }
    toast.success("Shell created");
    setCreating(false);
    setNewName("");
    navigate(`/admin/shells/manage/${data.id}`);
  }

  async function togglePublish(s: Shell) {
    const { error } = await supabase
      .from("shell_instances")
      .update({ is_published: !s.is_published })
      .eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    toast.success(s.is_published ? "Unpublished" : "Published");
    void load();
  }

  async function deleteShell(s: Shell) {
    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("shell_instances").delete().eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    void load();
  }

  if (adminLoading) return <div className="p-6 text-muted-foreground">…</div>;
  if (!isAdmin) return <div className="p-6 text-muted-foreground">Admin only.</div>;

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deployed Shells</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Every kiosk, widget, agent, or white-label surface live across all workspaces.
            One registry. One contract. One brand.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" />New shell</Button>
      </header>

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : shells.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          No shells yet. Create the first one — kiosk, widget, agent, etc.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {shells.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{s.name}</span>
                    <Badge variant="outline" className="text-xs">{s.kind}</Badge>
                    {s.is_published ? (
                      <Badge className="text-xs bg-emerald-600">Live</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Draft</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                    <span>/k/{s.slug}</span>
                    <span>·</span>
                    <span>{s.capability_keys.length} capabilities</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/k/${s.slug}/preview`} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-3.5 w-3.5 mr-1" />Preview
                    </Link>
                  </Button>
                  {s.is_published && (
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/k/${s.slug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />Live
                      </Link>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => togglePublish(s)}>
                    {s.is_published ? <><EyeOff className="h-3.5 w-3.5 mr-1" />Unpublish</> : <><Globe className="h-3.5 w-3.5 mr-1" />Publish</>}
                  </Button>
                  <Button asChild size="sm">
                    <Link to={`/admin/shells/manage/${s.id}`}>
                      <Edit className="h-3.5 w-3.5 mr-1" />Edit
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteShell(s)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={creating} onOpenChange={setCreating}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>New deployed shell</SheetTitle>
            <SheetDescription>
              A shell is a deployed surface for one client. Pick the kind, then add capabilities they need.
              Saving creates a draft you can preview before publishing.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label htmlFor="shell-name">Internal name</Label>
              <Input
                id="shell-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Bouncy House — Front Desk"
              />
              <p className="text-xs text-muted-foreground mt-1">For your reference. The client sees their brand/hero, not this.</p>
            </div>
            <div>
              <Label htmlFor="shell-kind">Surface type</Label>
              <Select value={newKind} onValueChange={setNewKind}>
                <SelectTrigger id="shell-kind"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kiosk">Kiosk — in-venue self-serve tablet</SelectItem>
                  <SelectItem value="widget">Widget — embed on their site</SelectItem>
                  <SelectItem value="agent">Agent — standalone AI chat surface</SelectItem>
                  <SelectItem value="extension">Extension — quick tools panel</SelectItem>
                  <SelectItem value="wl">White-Label — full reseller brand</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={createShell} disabled={!newName.trim()}>Create draft</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
