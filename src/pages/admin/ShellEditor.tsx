import { useEffect, useState, type ReactNode } from "react";
import { useParams, Link } from "react-router-dom";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { CAPABILITIES } from "@/capabilities/registry";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, GripVertical, Plus, X, ExternalLink, Save, Monitor, PanelRightOpen, Rows3, SquareMousePointer } from "lucide-react";

type ShellRow = {
  id: string;
  workspace_id: string;
  kind: string;
  slug: string;
  name: string;
  hero_title: string | null;
  hero_subtitle: string | null;
  accent_color: string | null;
  capability_keys: string[];
  is_published: boolean;
  brand_name: string | null;
  logo_url: string | null;
  support_email: string | null;
  footer_note: string | null;
  layout: ShellLayout;
};

type ShellLayout = {
  tileSize?: "compact" | "standard" | "large";
  openMode?: "inline" | "sheet" | "link";
  startOpen?: boolean;
  visualStyle?: "seed" | "focused" | "kiosk";
};

export default function ShellEditor() {
  const { id } = useParams<{ id: string }>();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const [shell, setShell] = useState<ShellRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const { data, error } = await supabase
        .from("shell_instances").select("*").eq("id", id).maybeSingle();
      if (error) toast.error(error.message);
      setShell(data as ShellRow | null);
      setLoading(false);
    })();
  }, [id]);

  if (adminLoading || loading) return <div className="p-6 text-muted-foreground">…</div>;
  if (!isAdmin) return <div className="p-6 text-muted-foreground">Admin only.</div>;
  if (!shell) return <div className="p-6 text-muted-foreground">Shell not found.</div>;

  const enabledKeys = shell.capability_keys ?? [];
  const enabledSet = new Set(enabledKeys);
  const allCaps = Object.values(CAPABILITIES);
  const available = allCaps.filter((c) => !enabledSet.has(c.key));

  function update<K extends keyof ShellRow>(field: K, value: ShellRow[K]) {
    setShell((s) => (s ? { ...s, [field]: value } : s));
  }

  function updateLayout<K extends keyof ShellLayout>(field: K, value: ShellLayout[K]) {
    setShell((s) => (s ? { ...s, layout: { ...(s.layout ?? {}), [field]: value } } : s));
  }

  function addCap(key: string) {
    update("capability_keys", [...enabledKeys, key]);
  }
  function removeCap(key: string) {
    update("capability_keys", enabledKeys.filter((k) => k !== key));
  }
  function onDragEnd(r: DropResult) {
    if (!r.destination || r.destination.index === r.source.index) return;
    const arr = [...enabledKeys];
    const [m] = arr.splice(r.source.index, 1);
    arr.splice(r.destination.index, 0, m);
    update("capability_keys", arr);
  }

  const layout = shell.layout ?? {};

  async function save() {
    if (!shell) return;
    setSaving(true);
    const { error } = await supabase
      .from("shell_instances")
      .update({
        name: shell.name,
        hero_title: shell.hero_title,
        hero_subtitle: shell.hero_subtitle,
        accent_color: shell.accent_color,
        capability_keys: shell.capability_keys,
        brand_name: shell.brand_name,
        logo_url: shell.logo_url,
        support_email: shell.support_email,
        footer_note: shell.footer_note,
        layout: shell.layout,
      })
      .eq("id", shell.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setPreviewKey((k) => k + 1);
  }

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/shells/manage"><ArrowLeft className="h-4 w-4 mr-1" />All shells</Link>
          </Button>
          <Badge variant="outline">{shell.kind}</Badge>
          {shell.is_published && <Badge className="bg-emerald-600">Live</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/k/${shell.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1" />Preview
            </Link>
          </Button>
          <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" />{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,1.3fr]">
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="font-semibold">Branding</h2>
            <div>
              <Label htmlFor="name">Name (internal)</Label>
              <Input id="name" value={shell.name} onChange={(e) => update("name", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="hero">Hero title</Label>
              <Input id="hero" value={shell.hero_title ?? ""} placeholder="Welcome"
                onChange={(e) => update("hero_title", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="sub">Hero subtitle</Label>
              <Textarea id="sub" rows={2} value={shell.hero_subtitle ?? ""}
                placeholder="Tap below to book, sign up, or message us."
                onChange={(e) => update("hero_subtitle", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="accent">Accent color</Label>
              <div className="flex gap-2 items-center">
                <Input id="accent" type="color" className="w-16 h-10 p-1"
                  value={shell.accent_color ?? "#059669"}
                  onChange={(e) => update("accent_color", e.target.value)} />
                <Input value={shell.accent_color ?? ""} placeholder="#059669"
                  onChange={(e) => update("accent_color", e.target.value)} />
              </div>
            </div>
            <div className="space-y-3 pt-3 border-t">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Design + behavior</div>
              <ControlGroup label="Paint">
                <ChoiceButton active={(layout.visualStyle ?? "seed") === "seed"} onClick={() => updateLayout("visualStyle", "seed")} icon={<SquareMousePointer className="h-3.5 w-3.5" />}>Seed UI</ChoiceButton>
                <ChoiceButton active={layout.visualStyle === "focused"} onClick={() => updateLayout("visualStyle", "focused")} icon={<PanelRightOpen className="h-3.5 w-3.5" />}>Focused</ChoiceButton>
                <ChoiceButton active={layout.visualStyle === "kiosk"} onClick={() => updateLayout("visualStyle", "kiosk")} icon={<Monitor className="h-3.5 w-3.5" />}>Kiosk</ChoiceButton>
              </ControlGroup>
              <ControlGroup label="Tile size">
                <ChoiceButton active={layout.tileSize === "compact"} onClick={() => updateLayout("tileSize", "compact")}>Compact</ChoiceButton>
                <ChoiceButton active={(layout.tileSize ?? "standard") === "standard"} onClick={() => updateLayout("tileSize", "standard")}>Standard</ChoiceButton>
                <ChoiceButton active={layout.tileSize === "large"} onClick={() => updateLayout("tileSize", "large")}>Large</ChoiceButton>
              </ControlGroup>
              <ControlGroup label="Open mode">
                <ChoiceButton active={(layout.openMode ?? "inline") === "inline"} onClick={() => updateLayout("openMode", "inline")} icon={<Rows3 className="h-3.5 w-3.5" />}>Inline</ChoiceButton>
                <ChoiceButton active={layout.openMode === "sheet"} onClick={() => updateLayout("openMode", "sheet")} icon={<PanelRightOpen className="h-3.5 w-3.5" />}>Sheet</ChoiceButton>
                <ChoiceButton active={layout.openMode === "link"} onClick={() => updateLayout("openMode", "link")} icon={<ExternalLink className="h-3.5 w-3.5" />}>Link</ChoiceButton>
              </ControlGroup>
              <label className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                <span className="min-w-0">
                  <span className="font-medium block">Load first tile open</span>
                  <span className="text-xs text-muted-foreground">Best for kiosks/screens where one capability should already be visible.</span>
                </span>
                <input type="checkbox" checked={Boolean(layout.startOpen)} onChange={(e) => updateLayout("startOpen", e.target.checked)} className="h-4 w-4 accent-primary" />
              </label>
            </div>
            {shell.kind === "wl" && (
              <div className="space-y-3 pt-3 border-t">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">White-label</div>
                <div>
                  <Label htmlFor="brand">Brand name (replaces "Thermi")</Label>
                  <Input id="brand" value={shell.brand_name ?? ""} placeholder="Their brand"
                    onChange={(e) => update("brand_name", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="logo">Logo URL</Label>
                  <Input id="logo" value={shell.logo_url ?? ""} placeholder="https://…"
                    onChange={(e) => update("logo_url", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="supp">Support email</Label>
                  <Input id="supp" value={shell.support_email ?? ""} placeholder="hello@brand.com"
                    onChange={(e) => update("support_email", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="foot">Footer note</Label>
                  <Input id="foot" value={shell.footer_note ?? ""} placeholder="© Brand 2026"
                    onChange={(e) => update("footer_note", e.target.value)} />
                </div>
              </div>
            )}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Public URL: <code>/k/{shell.slug}</code>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Tiles ({enabledKeys.length})</h2>
              <span className="text-xs text-muted-foreground">Drag to reorder</span>
            </div>

            {enabledKeys.length === 0 ? (
              <div className="text-sm text-muted-foreground p-6 border border-dashed rounded text-center">
                No tiles yet. Add capabilities below.
              </div>
            ) : (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="tiles">
                  {(prov) => (
                    <div ref={prov.innerRef} {...prov.droppableProps} className="space-y-2">
                      {enabledKeys.map((key, i) => {
                        const cap = CAPABILITIES[key];
                        if (!cap) return null;
                        return (
                          <Draggable key={key} draggableId={key} index={i}>
                            {(p) => (
                              <div ref={p.innerRef} {...p.draggableProps}
                                className="flex items-center gap-2 p-2.5 border rounded-md bg-card">
                                <div {...p.dragHandleProps} className="text-muted-foreground cursor-grab">
                                  <GripVertical className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{cap.label}</div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {cap.group} · {cap.publicPath ? "public" : "auth required"}
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => removeCap(key)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {prov.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}

            <div className="pt-3 border-t space-y-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Add capability</div>
              <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                {available.map((cap) => (
                  <button key={cap.key} onClick={() => addCap(cap.key)}
                    className="w-full text-left flex items-start gap-2 p-2 rounded hover:bg-muted transition-colors">
                    <Plus className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium flex items-center gap-2">
                        {cap.label}
                        <Badge variant="outline" className="text-[10px]">{cap.tier}</Badge>
                        {cap.publicPath && <Badge variant="secondary" className="text-[10px]">public</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{cap.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <div className="text-sm font-medium">Live preview</div>
            <Button size="sm" variant="ghost" onClick={() => setPreviewKey((k) => k + 1)}>Refresh</Button>
          </div>
          <iframe
            key={previewKey}
            title="Shell preview"
            src={`/k/${shell.slug}/preview`}
            className="w-full h-[720px] border-0 rounded-b-md bg-background"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ControlGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="grid grid-cols-3 gap-2">{children}</div>
    </div>
  );
}

function ChoiceButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon?: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-md border px-2.5 text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5 ${
        active ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background hover:bg-muted"
      }`}
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
}
