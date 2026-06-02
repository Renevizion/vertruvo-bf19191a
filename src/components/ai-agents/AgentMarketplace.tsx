import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  Bot, Phone, MessageSquare, Star, Sparkles, Loader2, Search,
  CheckCircle2, Plus, Wrench, BookOpen, Mic, Quote, ArrowRight,
  Headphones, Calendar, ShoppingBag, HelpCircle, TrendingUp, Megaphone, Users
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Blueprint {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  type: string;
  voice: string | null;
  greeting: string | null;
  instructions: string;
  suggested_tools: any;
  default_integrations: any;
  is_featured: boolean;
  version: number;
}

// Category styling — gives each tile its own personality
const CATEGORY_STYLE: Record<string, { icon: any; from: string; to: string; ring: string; chip: string }> = {
  sales:     { icon: TrendingUp, from: "from-emerald-500/20", to: "to-emerald-500/0",  ring: "ring-emerald-500/30", chip: "bg-emerald-500/15 text-emerald-600" },
  support:   { icon: Headphones, from: "from-blue-500/20",    to: "to-blue-500/0",     ring: "ring-blue-500/30",    chip: "bg-blue-500/15 text-blue-600" },
  booking:   { icon: Calendar,   from: "from-violet-500/20",  to: "to-violet-500/0",   ring: "ring-violet-500/30",  chip: "bg-violet-500/15 text-violet-600" },
  marketing: { icon: Megaphone,  from: "from-pink-500/20",    to: "to-pink-500/0",     ring: "ring-pink-500/30",    chip: "bg-pink-500/15 text-pink-600" },
  ecommerce: { icon: ShoppingBag,from: "from-amber-500/20",   to: "to-amber-500/0",    ring: "ring-amber-500/30",   chip: "bg-amber-500/15 text-amber-600" },
  faq:       { icon: HelpCircle, from: "from-cyan-500/20",    to: "to-cyan-500/0",     ring: "ring-cyan-500/30",    chip: "bg-cyan-500/15 text-cyan-600" },
  retention: { icon: Users,      from: "from-rose-500/20",    to: "to-rose-500/0",     ring: "ring-rose-500/30",    chip: "bg-rose-500/15 text-rose-600" },
  general:   { icon: Sparkles,   from: "from-primary/20",     to: "to-primary/0",      ring: "ring-primary/30",     chip: "bg-primary/15 text-primary" },
};

const styleFor = (cat: string | null) => CATEGORY_STYLE[(cat || "general").toLowerCase()] || CATEGORY_STYLE.general;

const toArray = (v: any): any[] => Array.isArray(v) ? v : [];

export function AgentMarketplace({ workspaceId }: { workspaceId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "chat" | "voice">("all");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [openBp, setOpenBp] = useState<Blueprint | null>(null);

  const { data: blueprints, isLoading } = useQuery({
    queryKey: ["agent-blueprints-published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_blueprints")
        .select("*")
        .eq("is_published", true)
        .order("is_featured", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data || []) as Blueprint[];
    },
  });

  const { data: installed } = useQuery({
    queryKey: ["installed-blueprint-ids", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agents")
        .select("blueprint_id")
        .eq("workspace_id", workspaceId)
        .not("blueprint_id", "is", null);
      if (error) throw error;
      return new Set((data || []).map((r: any) => r.blueprint_id));
    },
  });

  const addMutation = useMutation({
    mutationFn: async (bp: Blueprint) => {
      const { error } = await supabase.from("ai_agents").insert({
        workspace_id: workspaceId,
        name: bp.name,
        type: bp.type,
        status: "draft",
        voice: bp.voice,
        greeting: bp.greeting,
        instructions: bp.instructions,
        description: bp.description,
        blueprint_id: bp.id,
        blueprint_version: bp.version,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Added to your workspace", description: "Find it in My Agents to customize and activate." });
      qc.invalidateQueries({ queryKey: ["ai-agents"] });
      qc.invalidateQueries({ queryKey: ["installed-blueprint-ids", workspaceId] });
      setOpenBp(null);
    },
    onError: (e: any) => toast({ title: "Couldn't add agent", description: e.message, variant: "destructive" }),
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    (blueprints || []).forEach((b) => set.add((b.category || "general").toLowerCase()));
    return ["all", ...Array.from(set).sort()];
  }, [blueprints]);

  const filtered = useMemo(() => {
    return (blueprints || []).filter((b) => {
      if (typeFilter !== "all" && b.type !== typeFilter) return false;
      if (activeCategory !== "all" && (b.category || "general").toLowerCase() !== activeCategory) return false;
      if (query) {
        const q = query.toLowerCase();
        if (![b.name, b.description, b.category].some((s) => (s || "").toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [blueprints, typeFilter, activeCategory, query]);

  const featured = filtered.filter((b) => b.is_featured);
  const rest = filtered.filter((b) => !b.is_featured);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />Loading marketplace…
      </div>
    );
  }

  if (!blueprints?.length) {
    return (
      <Card className="p-10 text-center">
        <Bot className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium">No published agents yet</p>
        <p className="text-xs text-muted-foreground mt-1">Check back soon, or build your own from scratch.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents (sales closer, after-hours support, booking…)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-md bg-muted p-1">
          {(["all", "chat", "voice"] as const).map((t) => (
            <Button key={t} size="sm" variant={typeFilter === t ? "default" : "ghost"} className="h-7 px-3 text-xs capitalize" onClick={() => setTypeFilter(t)}>
              {t === "chat" && <MessageSquare className="w-3 h-3 mr-1" />}
              {t === "voice" && <Phone className="w-3 h-3 mr-1" />}
              {t}
            </Button>
          ))}
        </div>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {categories.map((c) => {
          const active = activeCategory === c;
          const s = c === "all" ? CATEGORY_STYLE.general : styleFor(c);
          const Icon = s.icon;
          return (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border text-muted-foreground"
              )}
            >
              {c !== "all" && <Icon className="w-3 h-3" />}
              {c === "all" ? "All categories" : c}
            </button>
          );
        })}
      </div>

      {/* Featured hero row */}
      {featured.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />Featured
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {featured.slice(0, 2).map((bp) => (
              <FeaturedCard key={bp.id} bp={bp} installed={installed?.has(bp.id)} onOpen={() => setOpenBp(bp)} />
            ))}
          </div>
        </div>
      )}

      {/* Rest */}
      {rest.length > 0 && (
        <div className="space-y-2">
          {featured.length > 0 && (
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
              <Sparkles className="w-3.5 h-3.5" />Browse all
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rest.map((bp) => (
              <CompactCard key={bp.id} bp={bp} installed={installed?.has(bp.id)} onOpen={() => setOpenBp(bp)} />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <Card className="p-10 text-center text-sm text-muted-foreground">No agents match your filters.</Card>
      )}

      {/* Detail Sheet */}
      <DetailSheet
        bp={openBp}
        installed={openBp ? installed?.has(openBp.id) : false}
        onClose={() => setOpenBp(null)}
        onAdd={(bp) => addMutation.mutate(bp)}
        adding={addMutation.isPending}
      />
    </div>
  );
}

/* -------------------- Featured (big tile) -------------------- */
function FeaturedCard({ bp, installed, onOpen }: { bp: Blueprint; installed?: boolean; onOpen: () => void }) {
  const s = styleFor(bp.category);
  const Icon = s.icon;
  const isVoice = bp.type === "voice";
  return (
    <button
      onClick={onOpen}
      className={cn(
        "group text-left relative overflow-hidden rounded-xl border bg-card p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 ring-1 ring-transparent hover:ring-2",
        s.ring
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80 -z-0", s.from, s.to)} />
      <div className="relative z-10 flex flex-col h-full min-h-[180px]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-background/80 backdrop-blur flex items-center justify-center shadow-sm">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <Badge className={cn("text-[10px] px-1.5 py-0 h-4 border-0 mb-1", s.chip)}>
                {bp.category || "general"}
              </Badge>
              <h3 className="font-semibold text-base leading-tight">{bp.name}</h3>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] bg-background/70 backdrop-blur">
            {isVoice ? <Phone className="w-3 h-3 mr-1" /> : <MessageSquare className="w-3 h-3 mr-1" />}
            {isVoice ? "Voice" : "Chat"}
          </Badge>
        </div>
        {bp.description && (
          <p className="text-sm text-foreground/80 mt-3 line-clamp-3">{bp.description}</p>
        )}
        <div className="mt-auto pt-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Wrench className="w-3 h-3" />{toArray(bp.suggested_tools).length} tools</span>
            {bp.voice && <span className="flex items-center gap-1"><Mic className="w-3 h-3" />Voice ready</span>}
            <span>v{bp.version}</span>
          </div>
          <div className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
            {installed ? "View kit" : "See what's inside"}<ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
        {installed && (
          <div className="absolute top-3 right-3">
            <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border-0">
              <CheckCircle2 className="w-2.5 h-2.5 mr-1" />Added
            </Badge>
          </div>
        )}
      </div>
    </button>
  );
}

/* -------------------- Compact (grid tile) -------------------- */
function CompactCard({ bp, installed, onOpen }: { bp: Blueprint; installed?: boolean; onOpen: () => void }) {
  const s = styleFor(bp.category);
  const Icon = s.icon;
  const isVoice = bp.type === "voice";
  return (
    <button
      onClick={onOpen}
      className="group text-left relative overflow-hidden rounded-lg border bg-card p-4 transition-all hover:shadow-md hover:border-primary/40"
    >
      <div className="flex items-start gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br", s.from, s.to)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="font-semibold text-sm truncate">{bp.name}</h3>
            {installed && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 capitalize">{bp.category || "general"}</Badge>
            <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
              {isVoice ? <Phone className="w-2.5 h-2.5" /> : <MessageSquare className="w-2.5 h-2.5" />}
              {isVoice ? "Voice" : "Chat"}
            </span>
          </div>
        </div>
      </div>
      {bp.description && (
        <p className="text-xs text-muted-foreground mt-2.5 line-clamp-2">{bp.description}</p>
      )}
      <div className="mt-3 pt-2.5 border-t flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Wrench className="w-2.5 h-2.5" />{toArray(bp.suggested_tools).length} tools</span>
        <span className="text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">View kit →</span>
      </div>
    </button>
  );
}

/* -------------------- Detail Sheet — "what's in the kit" -------------------- */
function DetailSheet({
  bp, installed, onClose, onAdd, adding,
}: {
  bp: Blueprint | null;
  installed?: boolean;
  onClose: () => void;
  onAdd: (bp: Blueprint) => void;
  adding: boolean;
}) {
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  if (!bp) return null;
  const s = styleFor(bp.category);
  const Icon = s.icon;
  const isVoice = bp.type === "voice";
  const tools = toArray(bp.suggested_tools);
  const integrations = toArray(bp.default_integrations);
  const promptLen = bp.instructions.length;
  const isLongPrompt = promptLen > 800;

  return (
    <Sheet open={!!bp} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Hero header */}
        <div className={cn("relative px-6 pt-8 pb-6 bg-gradient-to-br border-b", s.from, s.to)}>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-background/90 backdrop-blur flex items-center justify-center shadow-sm">
              <Icon className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Badge className={cn("text-[10px] px-1.5 py-0 h-4 border-0 capitalize", s.chip)}>{bp.category || "general"}</Badge>
                <Badge variant="outline" className="text-[10px] bg-background/70">
                  {isVoice ? <Phone className="w-2.5 h-2.5 mr-1" /> : <MessageSquare className="w-2.5 h-2.5 mr-1" />}
                  {isVoice ? "Voice agent" : "Chat agent"}
                </Badge>
                {bp.is_featured && (
                  <Badge className="text-[10px] bg-amber-500/15 text-amber-600 border-0"><Star className="w-2.5 h-2.5 mr-0.5" />Featured</Badge>
                )}
              </div>
              <SheetTitle className="text-xl leading-tight">{bp.name}</SheetTitle>
              {bp.description && (
                <SheetDescription className="mt-2 text-sm leading-relaxed">{bp.description}</SheetDescription>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Greeting preview */}
          {bp.greeting && (
            <Section icon={Quote} title="Opening line" subtle="What clients hear first">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm italic leading-relaxed">"{bp.greeting}"</p>
              </div>
            </Section>
          )}

          {/* Behavior guide — full, readable, expandable */}
          <Section
            icon={BookOpen}
            title="Behavior guide"
            subtle={`${promptLen.toLocaleString()} chars · ${bp.instructions.split(/\s+/).filter(Boolean).length} words`}
          >
            <div
              className={cn(
                "rounded-lg border bg-muted/30 p-3 overflow-y-auto transition-all",
                showFullPrompt || !isLongPrompt ? "max-h-96" : "max-h-48"
              )}
            >
              <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground/90">
                {bp.instructions}
              </pre>
            </div>
            {isLongPrompt && (
              <button
                onClick={() => setShowFullPrompt((v) => !v)}
                className="mt-2 text-xs font-medium text-primary hover:underline"
              >
                {showFullPrompt ? "Show less" : "Read full guide"}
              </button>
            )}
          </Section>

          {/* Suggested tools — detailed list */}
          {tools.length > 0 && (
            <Section icon={Wrench} title="Suggested tools" subtle={`${tools.length} included`}>
              <div className="space-y-1.5">
                {tools.map((t: any, i: number) => {
                  const name = t?.name || t?.key || (typeof t === "string" ? t : `Tool ${i + 1}`);
                  const desc = t?.description || t?.summary;
                  return (
                    <div key={i} className="flex items-start gap-2 rounded-md border bg-card p-2.5">
                      <Wrench className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium">{name}</p>
                        {desc && <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Integrations */}
          {integrations.length > 0 && (
            <Section icon={Plus} title="Recommended integrations">
              <div className="flex flex-wrap gap-1.5">
                {integrations.map((i: any, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-[11px]">
                    {i?.name || i?.key || (typeof i === "string" ? i : `Integration ${idx + 1}`)}
                  </Badge>
                ))}
              </div>
            </Section>
          )}

          {/* Voice profile */}
          {isVoice && bp.voice && (
            <Section icon={Mic} title="Voice profile">
              <div className="rounded-lg border bg-muted/30 p-3 flex items-center gap-3">
                <Mic className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium">ElevenLabs voice configured</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{bp.voice}</p>
                </div>
              </div>
            </Section>
          )}

          {/* How to put it to work */}
          <Section icon={ArrowRight} title="How to put it to work">
            <ol className="space-y-2.5">
              {[
                { t: "Add it to your workspace", d: "We'll copy this kit into a private, editable agent only you can see." },
                { t: "Customize", d: "Tweak the name, opening line, behavior guide. None of your edits affect anyone else." },
                ...(isVoice
                  ? [{ t: "Hook up a phone number", d: "Use a sandbox number (Pro tier) or bring your own Twilio." }]
                  : [{ t: "Pick the channels", d: "Wire it into chat, forms, or your Instagram inbox from the agent settings." }]),
                { t: "Attach a knowledge base (optional)", d: "Feed it your docs, FAQs, or scripts so answers stay accurate." },
                { t: "Set live", d: "Flip status from Draft to Live and start handling conversations." },
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">{i + 1}</span>
                  <div className="text-sm">
                    <span className="font-medium">{step.t}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <SheetFooter className="sticky bottom-0 bg-background/95 backdrop-blur border-t px-6 py-3 flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="sm:order-1">Close</Button>
          <Button onClick={() => onAdd(bp)} disabled={adding} className="sm:order-2 flex-1">
            {adding && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {installed ? <>Add another copy<Plus className="w-3.5 h-3.5 ml-1.5" /></> : <>Add to my workspace<ArrowRight className="w-3.5 h-3.5 ml-1.5" /></>}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Section({ icon: Icon, title, subtle, children }: { icon: any; title: string; subtle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-sm font-semibold flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" />{title}</h4>
        {subtle && <span className="text-[10px] text-muted-foreground">{subtle}</span>}
      </div>
      {children}
    </div>
  );
}

function KitItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-2.5">
      <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
