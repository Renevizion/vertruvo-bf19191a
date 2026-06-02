import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Palette, Save, Loader2 } from "lucide-react";

const FONT_OPTIONS = [
  "Inter", "Instrument Serif",
];

export function BrandKitSettings() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    primary_color: "#0F8B5F",
    secondary_color: "#1a1a1a",
    accent_color: "#f5f5f0",
    font_heading: "Inter",
    font_body: "Inter",
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

  const { data: brandKit, isLoading } = useQuery({
    queryKey: ["brand-kit", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return null;
      const { data, error } = await supabase
        .from("brand_kits")
        .select("*")
        .eq("workspace_id", workspace.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!workspace?.id,
  });

  useEffect(() => {
    if (brandKit) {
      setForm({
        primary_color: brandKit.primary_color || "#0F8B5F",
        secondary_color: brandKit.secondary_color || "#1a1a1a",
        accent_color: brandKit.accent_color || "#f5f5f0",
        font_heading: brandKit.font_heading || "Inter",
        font_body: brandKit.font_body || "Inter",
      });
    }
  }, [brandKit]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (brandKit) {
        const { error } = await supabase
          .from("brand_kits")
          .update({ ...form, updated_at: new Date().toISOString() })
          .eq("id", brandKit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("brand_kits")
          .insert({ workspace_id: workspace!.id, ...form });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-kit"] });
      toast.success("Brand kit saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          Brand Kit
        </CardTitle>
        <p className="text-xs text-muted-foreground">Lock in your visual identity for consistent content</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Primary</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={form.primary_color}
                onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                className="w-8 h-8 rounded border border-border cursor-pointer"
              />
              <Input
                value={form.primary_color}
                onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Secondary</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={form.secondary_color}
                onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))}
                className="w-8 h-8 rounded border border-border cursor-pointer"
              />
              <Input
                value={form.secondary_color}
                onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Accent</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={form.accent_color}
                onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))}
                className="w-8 h-8 rounded border border-border cursor-pointer"
              />
              <Input
                value={form.accent_color}
                onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Heading Font</Label>
            <Select value={form.font_heading} onValueChange={v => setForm(f => ({ ...f, font_heading: v }))}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Body Font</Label>
            <Select value={form.font_body} onValueChange={v => setForm(f => ({ ...f, font_body: v }))}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preview swatch */}
        <div className="flex items-center gap-2 pt-2">
          <div className="flex-1 h-10 rounded-md flex overflow-hidden border border-border">
            <div style={{ backgroundColor: form.primary_color }} className="flex-1" />
            <div style={{ backgroundColor: form.secondary_color }} className="flex-1" />
            <div style={{ backgroundColor: form.accent_color }} className="flex-1" />
          </div>
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
