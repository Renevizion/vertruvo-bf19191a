import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  LayoutTemplate, Quote, BarChart3, Megaphone, Info, Image as ImageIcon,
  Type, Sparkles, Loader2, Plus, Eye, Send
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TemplateField {
  key: string;
  label: string;
  type: "text" | "textarea" | "color";
  placeholder: string;
  defaultValue?: string;
}

interface PostTemplate {
  id: string;
  name: string;
  category: "quote" | "stats" | "promo" | "info" | "photo_overlay" | "about" | "tips" | "before_after" | "service";
  icon: React.ReactNode;
  description: string;
  fields: TemplateField[];
  promptBuilder: (values: Record<string, string>) => string;
  contentType: string;
}

const TEMPLATES: PostTemplate[] = [
  {
    id: "quote-card",
    name: "Quote Card",
    category: "quote",
    icon: <Quote className="h-4 w-4" />,
    description: "Bold typography quote on a clean background",
    contentType: "quote",
    fields: [
      { key: "quote", label: "Quote Text", type: "textarea", placeholder: "If Your Brand Was a Four-Leaf Clover..." },
      { key: "author", label: "Attribution", type: "text", placeholder: "@yourbrand" },
      { key: "bgColor", label: "Background", type: "color", placeholder: "#f5f0eb", defaultValue: "#f5f0eb" },
    ],
    promptBuilder: (v) => `Create a minimalist Instagram post with bold serif typography. The quote "${v.quote}" should be large and centered on a ${v.bgColor || 'cream/beige'} background. Attribution "${v.author}" in smaller text below. Clean, editorial aesthetic like a luxury brand. No images, typography only. Square 1080x1080.`,
  },
  {
    id: "stats-card",
    name: "Stats / Metrics",
    category: "stats",
    icon: <BarChart3 className="h-4 w-4" />,
    description: "Highlight a key number or achievement",
    contentType: "stats",
    fields: [
      { key: "headline", label: "Headline", type: "text", placeholder: "FEBRUARY WRAPPED" },
      { key: "metric", label: "Big Number", type: "text", placeholder: "74.8K" },
      { key: "label", label: "Metric Label", type: "text", placeholder: "Total Views This Month" },
      { key: "period", label: "Time Period", type: "text", placeholder: "February 2026" },
    ],
    promptBuilder: (v) => `Create a clean Instagram stats card. Header "${v.headline}" at top. Giant bold number "${v.metric}" in the center. Label "${v.label}" highlighted below it. Footer "${v.period}". Black and white with minimal accents. Modern, professional. Square 1080x1080.`,
  },
  {
    id: "promo-card",
    name: "Service Promo",
    category: "promo",
    icon: <Megaphone className="h-4 w-4" />,
    description: "Promote a service or offering",
    contentType: "promo",
    fields: [
      { key: "header", label: "Header Text", type: "text", placeholder: "NOW ACCEPTING CLIENTS" },
      { key: "service", label: "Service Name", type: "text", placeholder: "Social Media Management" },
      { key: "details", label: "Details", type: "textarea", placeholder: "CONTENT • STRATEGY • POSTING\nCONTENT MADE TO FEEL ON-BRAND AND INTENTIONAL." },
      { key: "handle", label: "Handle / CTA", type: "text", placeholder: "@yourbrand" },
    ],
    promptBuilder: (v) => `Create an Instagram promotional post. Top banner says "${v.header}" in small caps. Main text "${v.service}" in large elegant script/serif font. Details "${v.details}" in clean sans-serif below. Handle "${v.handle}" at bottom. Cream/beige background, dark text. Editorial, luxury aesthetic. Square 1080x1080.`,
  },
  {
    id: "info-list",
    name: "Info List / What I Do",
    category: "info",
    icon: <Info className="h-4 w-4" />,
    description: "List your services or key points",
    contentType: "info",
    fields: [
      { key: "title", label: "Title", type: "text", placeholder: "What I Do?" },
      { key: "items", label: "List Items (one per line)", type: "textarea", placeholder: "Social Media Management\nContent Creation\nEngagement & Growth\nPerformance Marketing\nBrand Storytelling" },
    ],
    promptBuilder: (v) => `Create a clean Instagram info card. Search bar icon with title "${v.title}" at top. Below, a vertical list with magnifying glass icons: ${v.items.split('\n').map(i => `"${i.trim()}"`).join(', ')}. Each item has a small subtitle. White/light gray background, clean minimal design. Square 1080x1080.`,
  },
  {
    id: "photo-overlay",
    name: "Photo + Text Overlay",
    category: "photo_overlay",
    icon: <ImageIcon className="h-4 w-4" />,
    description: "Professional photo with branded text overlay",
    contentType: "photo",
    fields: [
      { key: "headline", label: "Overlay Text", type: "text", placeholder: "Marketing That Delivers" },
      { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "STRATEGIES TO BUILD YOUR BRAND, GROW YOUR AUDIENCE, AND DRIVE RESULTS" },
      { key: "photoDesc", label: "Photo Description", type: "textarea", placeholder: "Professional woman in black blazer, outdoor setting" },
    ],
    promptBuilder: (v) => `Create an Instagram post with a professional photo of ${v.photoDesc || 'a business professional'}. Bold overlay text "${v.headline}" in large serif/script font. Subtitle "${v.subtitle}" in smaller text. Dark gradient overlay on the photo for text readability. Editorial magazine style. Square 1080x1080.`,
  },
  {
    id: "about-me",
    name: "About / Bio Card",
    category: "about",
    icon: <Type className="h-4 w-4" />,
    description: "Personal or brand introduction card",
    contentType: "about",
    fields: [
      { key: "header", label: "Header", type: "text", placeholder: "GET TO KNOW ME" },
      { key: "name", label: "Name", type: "text", placeholder: "Your Name" },
      { key: "bio", label: "Bio Text", type: "textarea", placeholder: "I help businesses strengthen their online presence..." },
      { key: "contact", label: "Contact Info", type: "text", placeholder: "hello@yourbrand.com" },
    ],
    promptBuilder: (v) => `Create an Instagram about/bio card. Header "${v.header}" at top in small caps. Name "${v.name}" in large bold text. A placeholder for a portrait photo on the right side. Bio text "${v.bio}" in clean readable font. Contact "${v.contact}" at bottom. Cream/beige and black color scheme. Clean, professional. Square 1080x1080.`,
  },
  {
    id: "tips-carousel",
    name: "Tips / Keys Card",
    category: "tips",
    icon: <LayoutTemplate className="h-4 w-4" />,
    description: "Educational content with key points",
    contentType: "tips",
    fields: [
      { key: "title", label: "Title", type: "text", placeholder: "4 KEYS OF SOCIAL MEDIA MARKETING" },
      { key: "points", label: "Key Points (one per line)", type: "textarea", placeholder: "Content\nAudience\nStrategy\nConsistency" },
      { key: "author", label: "Author / Brand", type: "text", placeholder: "Your Name\nMarketing & Brand Strategy" },
    ],
    promptBuilder: (v) => `Create a clean educational Instagram post. Title "${v.title}" in bold caps at top. A horizontal timeline/progress bar connecting points: ${v.points.split('\n').map(p => `"${p.trim()}"`).join(', ')}. Author "${v.author}" at bottom. Black text on white/light background. Minimal, professional infographic style. Square 1080x1080.`,
  },
  // ---- Service Business Templates ----
  {
    id: "before-after",
    name: "Before & After",
    category: "before_after" as any,
    icon: <ImageIcon className="h-4 w-4" />,
    description: "Show the transformation — perfect for landscaping, HVAC, cleaning, and home services",
    contentType: "photo",
    fields: [
      { key: "service", label: "Service Type", type: "text" as const, placeholder: "Lawn Restoration" },
      { key: "result", label: "The Result", type: "text" as const, placeholder: "Completely transformed in one day" },
      { key: "cta", label: "Call to Action", type: "text" as const, placeholder: "Book your free estimate" },
    ],
    promptBuilder: (v: Record<string, string>) => `Create a split-screen Instagram before/after post for a ${v.service} service. Left side labeled "BEFORE" shows a neglected/problem state. Right side labeled "AFTER" shows the transformed result. Bold text "${v.result}" at the bottom. CTA "${v.cta}" in a button. Clean, professional service business aesthetic. Square 1080x1080.`,
  },
  {
    id: "seasonal-promo",
    name: "Seasonal Promo",
    category: "promo" as any,
    icon: <Megaphone className="h-4 w-4" />,
    description: "Summer, spring, or seasonal service announcement — great for HVAC, landscaping, farms, and charters",
    contentType: "promo",
    fields: [
      { key: "season", label: "Season / Event", type: "text" as const, placeholder: "Summer" },
      { key: "service", label: "Service or Offer", type: "text" as const, placeholder: "AC Tune-Up Special" },
      { key: "urgency", label: "Urgency Line", type: "text" as const, placeholder: "Limited spots — book before the heat hits" },
      { key: "handle", label: "Handle / CTA", type: "text" as const, placeholder: "@yourbusiness" },
    ],
    promptBuilder: (v: Record<string, string>) => `Create a bold seasonal Instagram promotional post for a service business. Large header "${v.season} IS HERE" at top. Service offer "${v.service}" in large bold text center. Urgency line "${v.urgency}" below. Handle "${v.handle}" at bottom. Warm seasonal colors matching the season. Professional but approachable. Square 1080x1080.`,
  },
  {
    id: "customer-review",
    name: "Customer Review",
    category: "quote" as any,
    icon: <Quote className="h-4 w-4" />,
    description: "Turn a 5-star review into a shareable post — works for any service business",
    contentType: "quote",
    fields: [
      { key: "review", label: "Review Text", type: "textarea" as const, placeholder: "They showed up on time, fixed the AC in an hour, and the price was fair. Will definitely call again." },
      { key: "customer", label: "Customer Name", type: "text" as const, placeholder: "— Mike T., Norwalk CT" },
      { key: "business", label: "Business Name", type: "text" as const, placeholder: "Sunrise HVAC" },
    ],
    promptBuilder: (v: Record<string, string>) => `Create a clean Instagram customer review post. 5 gold stars at top. Review text "${v.review}" in large readable font. Customer attribution "${v.customer}" in smaller italic text. Business name "${v.business}" at bottom. White or cream background, clean professional design. Square 1080x1080.`,
  },
];

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  quote: { label: "Quote", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  stats: { label: "Stats", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  promo: { label: "Promo", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  info: { label: "Info", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  photo_overlay: { label: "Photo", color: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400" },
  about: { label: "About", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400" },
  tips: { label: "Tips", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  before_after: { label: "Before/After", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  service: { label: "Service", color: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400" },
};

interface ContentTemplatesProps {
  onPostGenerated: (imageUrl: string, caption: string, contentType: string) => void;
}

export function ContentTemplates({ onPostGenerated }: ContentTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<PostTemplate | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [batchCount, setBatchCount] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const selectTemplate = (template: PostTemplate) => {
    setSelectedTemplate(template);
    const defaults: Record<string, string> = {};
    template.fields.forEach(f => {
      defaults[f.key] = f.defaultValue || "";
    });
    setFieldValues(defaults);
    setPreviewUrl(null);
    setDialogOpen(true);
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    
    const emptyRequired = selectedTemplate.fields
      .filter(f => f.type !== "color")
      .some(f => !fieldValues[f.key]?.trim());
    
    if (emptyRequired) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = selectedTemplate.promptBuilder(fieldValues);
      
      const { data, error } = await supabase.functions.invoke('generate-social-image', {
        body: { prompt }
      });

      if (error) throw error;
      if (data?.imageUrl) {
        setPreviewUrl(data.imageUrl);
        toast.success("Template image generated!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUsePost = () => {
    if (!previewUrl || !selectedTemplate) return;
    
    // Build a caption from the template fields
    const captionParts: string[] = [];
    if (fieldValues.quote) captionParts.push(fieldValues.quote);
    if (fieldValues.headline) captionParts.push(fieldValues.headline);
    if (fieldValues.title) captionParts.push(fieldValues.title);
    if (fieldValues.service) captionParts.push(fieldValues.service);
    if (fieldValues.details) captionParts.push(fieldValues.details);
    if (fieldValues.bio) captionParts.push(fieldValues.bio);
    
    const caption = captionParts.join("\n\n");
    onPostGenerated(previewUrl, caption, selectedTemplate.contentType);
    setDialogOpen(false);
    setPreviewUrl(null);
    toast.success("Post added — edit caption and schedule it!");
  };

  const handleBatchGenerate = async () => {
    if (!selectedTemplate || batchCount < 2) return;
    setIsGenerating(true);
    
    try {
      for (let i = 0; i < batchCount; i++) {
        const prompt = selectedTemplate.promptBuilder(fieldValues) + ` Variation ${i + 1} of ${batchCount}, slightly different layout/style.`;
        const { data, error } = await supabase.functions.invoke('generate-social-image', {
          body: { prompt }
        });
        if (error) throw error;
        if (data?.imageUrl) {
          const captionParts: string[] = [];
          if (fieldValues.quote) captionParts.push(fieldValues.quote);
          if (fieldValues.headline) captionParts.push(fieldValues.headline);
          if (fieldValues.title) captionParts.push(fieldValues.title);
          onPostGenerated(data.imageUrl, captionParts.join("\n\n"), selectedTemplate.contentType);
        }
      }
      toast.success(`${batchCount} posts generated and added to queue!`);
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed during batch generation");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4 text-primary" />
          Post Templates
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Create on-brand posts like @adrianadafllamedia — pick a style, fill in your content, generate
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {TEMPLATES.map(template => {
            const cat = CATEGORY_LABELS[template.category];
            return (
              <button
                key={template.id}
                onClick={() => selectTemplate(template)}
                className="flex flex-col items-start gap-1.5 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors text-left"
              >
                <div className="flex items-center gap-1.5">
                  {template.icon}
                  <span className="text-xs font-medium">{template.name}</span>
                </div>
                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${cat.color}`}>
                  {cat.label}
                </Badge>
                <p className="text-[10px] text-muted-foreground leading-tight">{template.description}</p>
              </button>
            );
          })}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            {selectedTemplate && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {selectedTemplate.icon}
                    {selectedTemplate.name}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  {selectedTemplate.fields.map(field => (
                    <div key={field.key}>
                      <Label className="text-xs">{field.label}</Label>
                      {field.type === "textarea" ? (
                        <Textarea
                          value={fieldValues[field.key] || ""}
                          onChange={e => setFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          rows={3}
                          className="mt-1 text-sm"
                        />
                      ) : field.type === "color" ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={fieldValues[field.key] || field.defaultValue || "#f5f0eb"}
                            onChange={e => setFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="w-8 h-8 rounded border border-border cursor-pointer"
                          />
                          <Input
                            value={fieldValues[field.key] || ""}
                            onChange={e => setFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="h-8 text-xs font-mono"
                            placeholder={field.placeholder}
                          />
                        </div>
                      ) : (
                        <Input
                          value={fieldValues[field.key] || ""}
                          onChange={e => setFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          className="mt-1 text-sm"
                        />
                      )}
                    </div>
                  ))}

                  {/* Preview */}
                  {previewUrl && (
                    <div className="rounded-lg overflow-hidden border border-border">
                      <img src={previewUrl} alt="Preview" className="w-full aspect-square object-cover" />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={handleGenerate} disabled={isGenerating} className="flex-1">
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      {previewUrl ? "Regenerate" : "Generate Preview"}
                    </Button>
                    {previewUrl && (
                      <Button onClick={handleUsePost} variant="default">
                        <Send className="w-4 h-4 mr-2" />
                        Use This
                      </Button>
                    )}
                  </div>

                  {/* Batch generation */}
                  <div className="border-t pt-3 space-y-2">
                    <Label className="text-xs text-muted-foreground">Batch: generate multiple variations</Label>
                    <div className="flex gap-2">
                      <Select value={String(batchCount)} onValueChange={v => setBatchCount(Number(v))}>
                        <SelectTrigger className="w-20 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2, 3, 4, 5, 6, 8, 10].map(n => (
                            <SelectItem key={n} value={String(n)}>{n} posts</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBatchGenerate}
                        disabled={isGenerating}
                        className="flex-1"
                      >
                        {isGenerating ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Generate {batchCount} Variations
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
