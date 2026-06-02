import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, FileText, Send, Trash2, Pencil, Loader2, Printer, Search,
  Calendar, MapPin, Tag, LayoutGrid, Megaphone, PartyPopper, Percent, ChevronRight
} from "lucide-react";
import { QuickSendDialog } from "@/components/content/QuickSendDialog";
import { FlyerBuilder } from "@/components/flyers/FlyerBuilder";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  details: Record<string, any>;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CONTENT_TYPES = [
  { value: "program", label: "Program / Class", icon: LayoutGrid, color: "text-primary bg-primary/10" },
  { value: "announcement", label: "Announcement", icon: Megaphone, color: "text-amber-600 bg-amber-400/10 dark:text-amber-400" },
  { value: "event", label: "Event", icon: PartyPopper, color: "text-violet-600 bg-violet-400/10 dark:text-violet-400" },
  { value: "promotion", label: "Promotion", icon: Percent, color: "text-rose-600 bg-rose-400/10 dark:text-rose-400" },
];

const typeConfig = (t: string) => CONTENT_TYPES.find(c => c.value === t) || CONTENT_TYPES[0];

export default function ContentHub() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<ContentItem | null>(null);
  const [sendItem, setSendItem] = useState<ContentItem | null>(null);
  const [detailItem, setDetailItem] = useState<ContentItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    content_type: "program",
    schedule: "",
    location: "",
    price: "",
  });

  const { data: workspace } = useQuery({
    queryKey: ["workspace"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("workspaces").select("id").eq("owner_id", user.id).single();
      return data;
    },
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["content-items", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const { data, error } = await supabase
        .from("content_items")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as ContentItem[];
    },
    enabled: !!workspace?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const { error } = await supabase.from("content_items").insert({
        workspace_id: workspace!.id,
        title: values.title,
        description: values.description || null,
        content_type: values.content_type,
        details: { schedule: values.schedule || null, location: values.location || null, price: values.price || null },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-items"] });
      toast.success("Content item created");
      setCreateOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: typeof form }) => {
      const { error } = await supabase.from("content_items").update({
        title: values.title,
        description: values.description || null,
        content_type: values.content_type,
        details: { schedule: values.schedule || null, location: values.location || null, price: values.price || null },
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-items"] });
      toast.success("Updated");
      setEditItem(null);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-items"] });
      toast.success("Deleted");
      if (detailItem?.id) setDetailItem(null);
    },
  });

  const resetForm = () => setForm({ title: "", description: "", content_type: "program", schedule: "", location: "", price: "" });

  const openEdit = (item: ContentItem) => {
    setForm({
      title: item.title,
      description: item.description || "",
      content_type: item.content_type,
      schedule: (item.details as any)?.schedule || "",
      location: (item.details as any)?.location || "",
      price: (item.details as any)?.price || "",
    });
    setEditItem(item);
  };

  const matchesSearch = (item: ContentItem) => {
    const hay = `${item.title} ${item.description || ""} ${item.content_type} ${(item.details as any)?.schedule || ""} ${(item.details as any)?.location || ""}`.toLowerCase();
    return hay.includes(searchQuery.toLowerCase());
  };

  const activeItems = items.filter(i => i.is_active).length;
  const sendReadyItems = items.filter(i => i.description || (i.details as any)?.schedule || (i.details as any)?.price).length;

  const ContentCard = ({ item }: { item: ContentItem }) => {
    const cfg = typeConfig(item.content_type);
    const Icon = cfg.icon;
    const isSelected = detailItem?.id === item.id;
    return (
      <button
        onClick={() => setDetailItem(item)}
        className={cn(
          "w-full text-left rounded-xl border transition-all hover:border-primary/30 overflow-hidden group",
          isSelected && "border-primary/50 bg-primary/5"
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", cfg.color)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-sm truncate">{item.title}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="secondary" className="text-[10px] py-0 h-4">{cfg.label}</Badge>
            <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", isSelected && "rotate-90")} />
          </div>
        </div>
        <div className="px-4 py-3 space-y-2">
          {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
          <div className="flex flex-wrap gap-3">
            {(item.details as any)?.schedule && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Calendar className="h-3 w-3" />{(item.details as any).schedule}</span>
            )}
            {(item.details as any)?.location && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" />{(item.details as any).location}</span>
            )}
            {(item.details as any)?.price && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Tag className="h-3 w-3" />{(item.details as any).price}</span>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium mb-0.5">Operations</p>
          <h1 className="text-2xl font-bold tracking-tight">Content Hub</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Content
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        {[
          { label: "Library", value: items.length, color: "text-foreground" },
          { label: "Active", value: activeItems, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Ready to Send", value: sendReadyItems, color: "text-primary" },
          ...CONTENT_TYPES.map(t => ({ label: t.label, value: items.filter(i => i.content_type === t.value).length, color: "text-muted-foreground" })).slice(0, 1),
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border bg-card px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">{label}</p>
            <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="all" className="flex-1 flex flex-col min-h-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
          <TabsList className="w-fit">
            <TabsTrigger value="all">All</TabsTrigger>
            {CONTENT_TYPES.map(t => (
              <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
            ))}
            <TabsTrigger value="flyers" className="gap-1.5">
              <Printer className="h-3.5 w-3.5" /> Flyers
            </TabsTrigger>
          </TabsList>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search content…" className="pl-9 h-9" />
          </div>
        </div>

        {["all", ...CONTENT_TYPES.map(t => t.value)].map(tab => (
          <TabsContent key={tab} value={tab} className="flex-1 mt-4 min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex gap-4 h-full min-h-0">
                {/* List */}
                <div className="w-full xl:w-[420px] shrink-0 space-y-3 overflow-y-auto">
                  {items.filter(i => (tab === "all" || i.content_type === tab) && matchesSearch(i)).length === 0 ? (
                    <div className="rounded-xl border border-dashed p-12 text-center">
                      <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">No content here yet.</p>
                      <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => setCreateOpen(true)}>
                        <Plus className="h-3.5 w-3.5" /> Add content
                      </Button>
                    </div>
                  ) : (
                    items.filter(i => (tab === "all" || i.content_type === tab) && matchesSearch(i)).map(item => (
                      <ContentCard key={item.id} item={item} />
                    ))
                  )}
                </div>

                {/* Detail panel */}
                <div className="hidden xl:flex flex-1 min-w-0">
                  {detailItem ? (
                    <div className="w-full rounded-xl border bg-card overflow-hidden flex flex-col">
                      {/* Detail header */}
                      <div className="px-6 py-5 border-b bg-muted/20 shrink-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            {(() => {
                              const cfg = typeConfig(detailItem.content_type);
                              const Icon = cfg.icon;
                              return (
                                <div className="flex items-center gap-2 mb-2">
                                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", cfg.color)}>
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <Badge variant="secondary" className="text-xs">{cfg.label}</Badge>
                                </div>
                              );
                            })()}
                            <h2 className="text-xl font-bold">{detailItem.title}</h2>
                            {detailItem.description && <p className="text-sm text-muted-foreground mt-1">{detailItem.description}</p>}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => openEdit(detailItem)}>
                              <Pencil className="h-3.5 w-3.5" />Edit
                            </Button>
                            <Button size="sm" className="gap-1.5 h-8" onClick={() => setSendItem(detailItem)}>
                              <Send className="h-3.5 w-3.5" />Send
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => { if (confirm(`Delete "${detailItem.title}"?`)) deleteMutation.mutate(detailItem.id); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Detail body */}
                      <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Details</p>
                          <div className="space-y-2">
                            {[
                              { icon: Calendar, label: "Schedule", value: (detailItem.details as any)?.schedule },
                              { icon: MapPin, label: "Location", value: (detailItem.details as any)?.location },
                              { icon: Tag, label: "Price", value: (detailItem.details as any)?.price },
                            ].filter(d => d.value).map(({ icon: Icon, label, value }) => (
                              <div key={label} className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-2.5">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Icon className="h-3.5 w-3.5" />{label}
                                </div>
                                <span className="text-sm font-medium">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Created</p>
                          <p className="text-sm text-muted-foreground">{format(new Date(detailItem.created_at), "MMMM d, yyyy 'at' h:mm a")}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full rounded-xl border border-dashed flex items-center justify-center">
                      <div className="text-center">
                        <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Select a content item to view details</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        ))}

        <TabsContent value="flyers" className="mt-4 flex-1">
          <FlyerBuilder />
        </TabsContent>
      </Tabs>

      {/* Create / Edit Sheet */}
      <Sheet open={createOpen || !!editItem} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditItem(null); resetForm(); } }}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
          <SheetHeader className="px-6 py-5 border-b bg-muted/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-base">{editItem ? "Edit Content" : "New Content Item"}</SheetTitle>
                <SheetDescription className="text-xs mt-0.5">One source of truth for classes, programs, and announcements.</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</Label>
              <Select value={form.content_type} onValueChange={v => setForm(f => ({ ...f, content_type: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Summer Swim Program" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Program details, what participants should know…" rows={3} className="resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Schedule</Label>
                <Input value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))} placeholder="Mon/Wed 6–7pm" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Main facility" className="h-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Price</Label>
              <Input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="$99/month" className="h-9" />
            </div>
          </div>

          <SheetFooter className="px-6 py-4 border-t bg-muted/20 shrink-0 flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => { setCreateOpen(false); setEditItem(null); resetForm(); }}>Cancel</Button>
            <Button
              size="sm"
              disabled={!form.title || createMutation.isPending || updateMutation.isPending}
              onClick={() => editItem ? updateMutation.mutate({ id: editItem.id, values: form }) : createMutation.mutate(form)}
              className="gap-1.5"
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editItem ? "Save Changes" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {sendItem && (
        <QuickSendDialog item={sendItem} open={!!sendItem} onOpenChange={(o) => !o && setSendItem(null)} />
      )}
    </div>
  );
}
