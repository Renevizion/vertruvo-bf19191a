import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Download, Image, Printer, TableProperties, Tag, Megaphone, PenTool, Send, Sparkles } from "lucide-react";
import { FLYER_TEMPLATES, FlyerTemplate } from "./FlyerTemplates";
import { FlyerEditorForm, FlyerData } from "./FlyerEditorForm";
import { FlyerPreview } from "./FlyerPreview";
import { FlyerCanvas } from "./FlyerCanvas";
import { FabricFlyerCanvas } from "./FabricFlyerCanvas";
import { FlyerEmailBlast } from "./FlyerEmailBlast";
import { AIFlyerGenerator } from "./AIFlyerGenerator";
import { toast } from "sonner";

function makeDefaultData(template: FlyerTemplate): FlyerData {
  const header: Record<string, string> = {};
  template.headerFields.forEach(f => (header[f.key] = ""));
  const footer: Record<string, string> = {};
  template.footerFields?.forEach(f => (footer[f.key] = ""));
  const rows: Record<string, string>[] = [];
  for (let i = 0; i < (template.defaultRows || 0); i++) {
    const row: Record<string, string> = {};
    template.columns.forEach(c => (row[c.key] = ""));
    rows.push(row);
  }
  return { header, rows, footer, bullets: [] };
}

const categoryIcon = (cat: string) => {
  switch (cat) {
    case "schedule": return TableProperties;
    case "promo": return Tag;
    case "program": return Megaphone;
    default: return TableProperties;
  }
};

export function FlyerBuilder() {
  const [mode, setMode] = useState<"pick" | "template" | "canvas" | "ai">("pick");
  const [selectedTemplate, setSelectedTemplate] = useState<FlyerTemplate | null>(null);
  const [data, setData] = useState<FlyerData>({ header: {}, rows: [], footer: {}, bullets: [] });
  const [previewFormat, setPreviewFormat] = useState<"print" | "social">("print");
  const [canvasEngine, setCanvasEngine] = useState<"fabric" | "classic">("fabric");
  const [exporting, setExporting] = useState(false);
  const [blastOpen, setBlastOpen] = useState(false);

  const selectTemplate = (t: FlyerTemplate) => {
    setSelectedTemplate(t);
    setData(makeDefaultData(t));
    setMode("template");
  };

  const handleExport = async (type: "print" | "image") => {
    const el = document.getElementById("flyer-preview");
    if (!el) return;
    
    setExporting(true);
    try {
      // Use browser print for PDF
      if (type === "print") {
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
          toast.error("Please allow popups to print");
          return;
        }
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${data.header.title || "Flyer"}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { display: flex; justify-content: center; padding: 0; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>${el.outerHTML}</body>
          </html>
        `);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); }, 300);
        toast.success("Print dialog opened");
      } else {
        // Canvas-based image export
        const { default: html2canvas } = await import("html2canvas");
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
        const link = document.createElement("a");
        link.download = `${(data.header.title || "flyer").replace(/\s+/g, "-").toLowerCase()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        toast.success("Image downloaded");
      }
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Export failed — try again");
    } finally {
      setExporting(false);
    }
  };

  // Canvas mode
  if (mode === "canvas") {
    return (
      <Tabs value={canvasEngine} onValueChange={(value) => setCanvasEngine(value as "fabric" | "classic")} className="space-y-4">
        <div className="flex justify-end">
          <TabsList>
            <TabsTrigger value="fabric">Fabric Studio</TabsTrigger>
            <TabsTrigger value="classic">Classic Editor</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="fabric" className="mt-0">
          <FabricFlyerCanvas onBack={() => setMode("pick")} />
        </TabsContent>
        <TabsContent value="classic" className="mt-0">
          <FlyerCanvas onBack={() => setMode("pick")} />
        </TabsContent>
      </Tabs>
    );
  }

  // AI mode
  if (mode === "ai") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setMode("pick")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to Flyer Studio
        </Button>
        <AIFlyerGenerator />
      </div>
    );
  }

  // Template picker
  if (mode === "pick") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Pick a template or start from a blank canvas.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* AI Generate card */}
          <Card
            className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all group border-primary/20 bg-primary/[0.02]"
            onClick={() => setMode("ai")}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm group-hover:text-primary transition-colors">AI Generate & Edit</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Generate flyers from a prompt, auto-fill from programs, or edit existing images with AI</p>
                  <Badge variant="outline" className="mt-2 text-[10px] border-primary/30 text-primary">AI Powered</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Blank canvas card */}
          <Card
            className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all group border-dashed"
            onClick={() => setMode("canvas")}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-muted">
                  <PenTool className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm group-hover:text-primary transition-colors">Blank Canvas</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Free-form drag & drop — place text, shapes, tables, images anywhere</p>
                  <Badge variant="outline" className="mt-2 text-[10px]">Custom</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {FLYER_TEMPLATES.map(t => {
            const Icon = categoryIcon(t.category);
            return (
              <Card
                key={t.id}
                className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all group"
                onClick={() => selectTemplate(t)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: t.colors.primary + "18" }}
                    >
                      <Icon className="h-5 w-5" style={{ color: t.colors.primary }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm group-hover:text-primary transition-colors">{t.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                      <Badge variant="outline" className="mt-2 text-[10px] capitalize">{t.category}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Editor + Preview
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => { setSelectedTemplate(null); setMode("pick"); }} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Templates
        </Button>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleExport("print")} disabled={exporting}>
            <Printer className="h-4 w-4 mr-1" /> Print PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport("image")} disabled={exporting}>
            <Download className="h-4 w-4 mr-1" /> Download Image
          </Button>
          <Button size="sm" onClick={() => setBlastOpen(true)} className="gap-1.5">
            <Send className="h-4 w-4" /> Email Blast
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-6">
        {/* Form */}
        <div className="bg-muted/30 rounded-lg p-4 border">
          <h3 className="font-semibold text-sm mb-3">{selectedTemplate.name}</h3>
          <FlyerEditorForm template={selectedTemplate} data={data} onChange={setData} />
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Tabs value={previewFormat} onValueChange={v => setPreviewFormat(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="print" className="text-xs h-6 px-3">
                  <Printer className="h-3 w-3 mr-1" /> Print
                </TabsTrigger>
                <TabsTrigger value="social" className="text-xs h-6 px-3">
                  <Image className="h-3 w-3 mr-1" /> Social
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex justify-center bg-muted/20 rounded-lg p-4 border min-h-[400px]">
            <FlyerPreview template={selectedTemplate} data={data} format={previewFormat} />
          </div>
        </div>
      </div>

      {/* Email Blast Dialog */}
      <FlyerEmailBlast
        open={blastOpen}
        onOpenChange={setBlastOpen}
        flyerHtml={document.getElementById("flyer-preview")?.outerHTML || ""}
        flyerTitle={data.header.title || selectedTemplate?.name || "Flyer"}
      />
    </div>
  );
}
