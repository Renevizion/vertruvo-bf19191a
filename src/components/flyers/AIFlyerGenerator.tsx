import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Sparkles, Download, Pencil, RefreshCw, FileText } from "lucide-react";

export function AIFlyerGenerator() {
  const [prompt, setPrompt] = useState("");
  const [contentItemId, setContentItemId] = useState<string>("");
  const [editPrompt, setEditPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [mode, setMode] = useState<"generate" | "edit">("generate");

  const { data: workspace } = useQuery({
    queryKey: ["workspace"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("workspaces").select("id").eq("owner_id", user.id).single();
      return data;
    },
  });

  const { data: contentItems = [] } = useQuery({
    queryKey: ["content-items-for-flyer", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const { data } = await supabase
        .from("content_items")
        .select("id, title, description, content_type, details")
        .eq("workspace_id", workspace.id)
        .eq("is_active", true)
        .order("updated_at", { ascending: false });
      return data || [];
    },
    enabled: !!workspace?.id,
  });

  const { data: brandKit } = useQuery({
    queryKey: ["brand-kit", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return null;
      const { data } = await supabase
        .from("brand_kits")
        .select("*")
        .eq("workspace_id", workspace.id)
        .single();
      return data;
    },
    enabled: !!workspace?.id,
  });

  const buildPromptFromContentItem = (itemId: string) => {
    const item = contentItems.find(i => i.id === itemId);
    if (!item) return "";
    const details = item.details as Record<string, any> | null;
    let p = `Create a professional flyer for: "${item.title}"`;
    if (item.description) p += `\nDescription: ${item.description}`;
    if (details?.schedule) p += `\nSchedule: ${details.schedule}`;
    if (details?.location) p += `\nLocation: ${details.location}`;
    if (details?.price) p += `\nPrice: ${details.price}`;
    if (brandKit) {
      p += `\nBrand colors: primary ${brandKit.primary_color || "#1a5276"}, secondary ${brandKit.secondary_color || "#2980b9"}, accent ${brandKit.accent_color || "#e74c3c"}`;
      if (brandKit.font_heading) p += `, heading font: ${brandKit.font_heading}`;
    }
    p += `\nStyle: Clean, professional, ready to print or share on social media. Include all the information prominently.`;
    return p;
  };

  const handleContentItemSelect = (id: string) => {
    setContentItemId(id);
    if (id) {
      setPrompt(buildPromptFromContentItem(id));
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error("Enter a prompt"); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-social-image", {
        body: { prompt: prompt.trim() }
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Generation failed");
      setGeneratedImage(data.imageUrl);
      toast.success("Flyer generated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  const handleEdit = async () => {
    const sourceImage = uploadedImage || generatedImage;
    if (!sourceImage) { toast.error("No image to edit"); return; }
    if (!editPrompt.trim()) { toast.error("Enter edit instructions"); return; }
    setEditing(true);
    try {
      const { data, error } = await supabase.functions.invoke("edit-social-image", {
        body: { imageUrl: sourceImage, editPrompt: editPrompt.trim() }
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Edit failed");
      setGeneratedImage(data.imageUrl);
      setUploadedImage(null);
      toast.success("Image edited!");
    } catch (err: any) {
      toast.error(err.message || "Failed to edit");
    } finally {
      setEditing(false);
    }
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImage(ev.target?.result as string);
      setMode("edit");
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = "ai-flyer.png";
    link.click();
    toast.success("Downloaded");
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-[400px_1fr] gap-6">
        {/* Controls */}
        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={mode === "generate" ? "default" : "outline"}
              onClick={() => setMode("generate")}
              className="flex-1 gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" /> Generate
            </Button>
            <Button
              size="sm"
              variant={mode === "edit" ? "default" : "outline"}
              onClick={() => setMode("edit")}
              className="flex-1 gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit Image
            </Button>
          </div>

          {mode === "generate" && (
            <>
              {/* From content item */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Auto-fill from Content Item</Label>
                <Select value={contentItemId} onValueChange={handleContentItemSelect}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Pick a program, event, or promo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contentItems.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          {item.title}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Prompt</Label>
                <Textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="Describe the flyer you want... e.g. 'A professional flyer for our Summer Program, bold colors, schedule table, contact info at bottom'"
                  rows={6}
                  className="text-sm"
                />
              </div>

              <Button onClick={handleGenerate} disabled={generating || !prompt.trim()} className="w-full gap-2">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generating ? "Generating..." : "Generate Flyer"}
              </Button>
            </>
          )}

          {mode === "edit" && (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Upload Image to Edit</Label>
                <Input type="file" accept="image/*" onChange={handleUploadImage} className="text-xs" />
                {!uploadedImage && generatedImage && (
                  <p className="text-xs text-muted-foreground">Or edit the currently generated image below.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">What to change</Label>
                <Textarea
                  value={editPrompt}
                  onChange={e => setEditPrompt(e.target.value)}
                  placeholder="e.g. 'Change the title text to Summer 2026', 'Make the background darker', 'Replace the URL with www.thermi.com', 'Add a red banner at the top'"
                  rows={4}
                  className="text-sm"
                />
              </div>

              <Button
                onClick={handleEdit}
                disabled={editing || !editPrompt.trim() || (!uploadedImage && !generatedImage)}
                className="w-full gap-2"
              >
                {editing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                {editing ? "Editing..." : "Apply AI Edit"}
              </Button>
            </>
          )}

          {generatedImage && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload} className="flex-1 gap-1.5">
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setGeneratedImage(null); setPrompt(""); }} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="flex justify-center items-start">
          {uploadedImage && mode === "edit" ? (
            <Card className="overflow-hidden">
              <CardContent className="p-2">
                <img src={uploadedImage} alt="Source" className="max-w-full max-h-[600px] rounded" />
                <p className="text-xs text-muted-foreground text-center mt-2">Source image — describe edits on the left</p>
              </CardContent>
            </Card>
          ) : generatedImage ? (
            <Card className="overflow-hidden">
              <CardContent className="p-2">
                <img src={generatedImage} alt="Generated flyer" className="max-w-full max-h-[600px] rounded" />
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-[400px] w-full bg-muted/20 rounded-lg border border-dashed">
              <div className="text-center text-muted-foreground">
                <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">AI Flyer Studio</p>
                <p className="text-xs mt-1 max-w-xs">
                  Generate a flyer from a prompt, auto-fill from your programs, or upload an image to edit with AI
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
