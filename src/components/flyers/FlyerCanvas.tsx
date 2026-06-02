import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  ArrowLeft, Download, Printer, Image, Type, Square, Circle, Table2,
  ImagePlus, Trash2, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Plus, Minus, Copy, Layers, Star, Triangle, Hexagon, Palette,
  ChevronDown, ChevronUp, RotateCcw, Lock, Unlock, Eye, EyeOff,
  Sparkles, Upload, Undo2, Redo2, ZoomIn, ZoomOut,
} from "lucide-react";
import { toast } from "sonner";

export interface CanvasElement {
  id: string;
  type: "text" | "shape" | "table" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  locked?: boolean;
  visible?: boolean;
  content?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: string;
  fontFamily?: string;
  lineHeight?: number;
  letterSpacing?: number;
  color?: string;
  bgColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  shapeType?: "rect" | "circle" | "rounded" | "star" | "triangle" | "line" | "badge";
  rows?: string[][];
  imageUrl?: string;
  zIndex?: number;
  shadow?: boolean;
  gradient?: string;
}

let idCounter = 0;
const uid = () => `el-${++idCounter}-${Date.now()}`;

const CANVAS_W = 612;
const CANVAS_H = 792;
const SOCIAL_H = 612;

const PRESET_COLORS = [
  "#1a5276", "#2980b9", "#1abc9c", "#27ae60", "#f39c12", "#e74c3c",
  "#8e44ad", "#2c3e50", "#ecf0f1", "#ffffff", "#000000", "#f1c40f",
  "#e67e22", "#d35400", "#c0392b", "#16a085", "#2ecc71", "#3498db",
];

const SHAPE_PRESETS: { icon: any; label: string; type: CanvasElement["shapeType"]; bgColor: string; borderRadius: number; width: number; height: number }[] = [
  { icon: Square, label: "Rectangle", type: "rect", bgColor: "#1a5276", borderRadius: 0, width: 200, height: 120 },
  { icon: Square, label: "Rounded", type: "rounded", bgColor: "#2980b9", borderRadius: 16, width: 200, height: 120 },
  { icon: Circle, label: "Circle", type: "circle", bgColor: "#e74c3c", borderRadius: 999, width: 120, height: 120 },
  { icon: Square, label: "Badge", type: "badge", bgColor: "#f39c12", borderRadius: 999, width: 100, height: 100 },
  { icon: Square, label: "Line", type: "line", bgColor: "#2c3e50", borderRadius: 0, width: 300, height: 4 },
  { icon: Square, label: "Pill", type: "rounded", bgColor: "#27ae60", borderRadius: 999, width: 200, height: 48 },
];

const TEXT_PRESETS = [
  { label: "Heading", fontSize: 36, fontWeight: "900", content: "Heading" },
  { label: "Subheading", fontSize: 24, fontWeight: "700", content: "Subheading" },
  { label: "Body", fontSize: 16, fontWeight: "400", content: "Body text goes here" },
  { label: "Caption", fontSize: 12, fontWeight: "400", content: "Caption text" },
  { label: "Price Tag", fontSize: 40, fontWeight: "900", content: "$185" },
  { label: "CTA Button", fontSize: 18, fontWeight: "700", content: "SIGN UP NOW" },
];

const FONT_FAMILIES = [
  "Inter, sans-serif",
  "Georgia, serif",
  "Arial Black, sans-serif",
  "Courier New, monospace",
  "Trebuchet MS, sans-serif",
  "Impact, sans-serif",
  "Verdana, sans-serif",
  "Palatino, serif",
];

type SidebarTab = "elements" | "text" | "shapes" | "images" | "background";

export function FlyerCanvas({ onBack }: { onBack: () => void }) {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; startW: number; startH: number; startX: number; startY: number } | null>(null);
  const [editingText, setEditingText] = useState<string | null>(null);
  const [previewFormat, setPreviewFormat] = useState<"print" | "social">("print");
  const [exporting, setExporting] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("elements");
  const [canvasBg, setCanvasBg] = useState("#ffffff");
  const [canvasBgImage, setCanvasBgImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.75);
  const [showProperties, setShowProperties] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const textEditRef = useRef<HTMLTextAreaElement>(null);

  const selectedEl = elements.find(e => e.id === selected);
  const canvasH = previewFormat === "social" ? SOCIAL_H : CANVAS_H;

  useEffect(() => {
    if (editingText && textEditRef.current) {
      textEditRef.current.focus();
      textEditRef.current.select();
    }
  }, [editingText]);

  const addElement = (el: Partial<CanvasElement> & { type: CanvasElement["type"] }) => {
    const base: CanvasElement = {
      id: uid(),
      x: 40 + Math.random() * 60,
      y: 40 + Math.random() * 60,
      width: 200,
      height: 120,
      zIndex: elements.length,
      opacity: 1,
      visible: true,
      locked: false,
      ...el,
    };
    setElements(prev => [...prev, base]);
    setSelected(base.id);
  };

  const addText = (preset: typeof TEXT_PRESETS[0]) => {
    addElement({
      type: "text",
      width: preset.fontSize > 30 ? 400 : 300,
      height: preset.fontSize > 30 ? 60 : 40,
      content: preset.content,
      fontSize: preset.fontSize,
      fontWeight: preset.fontWeight,
      fontStyle: "normal",
      textAlign: "center",
      color: "#ffffff",
      bgColor: "transparent",
      fontFamily: "Inter, sans-serif",
      lineHeight: 1.2,
      letterSpacing: preset.fontSize > 30 ? 2 : 0,
    });
  };

  const addShape = (preset: typeof SHAPE_PRESETS[0]) => {
    addElement({
      type: "shape",
      width: preset.width,
      height: preset.height,
      bgColor: preset.bgColor,
      borderRadius: preset.borderRadius,
      shapeType: preset.type,
      borderWidth: 0,
      borderColor: "#000000",
      shadow: false,
    });
  };

  const addImage = (url?: string) => {
    addElement({
      type: "image",
      width: 200,
      height: 200,
      bgColor: "#e5e7eb",
      imageUrl: url || "",
      borderRadius: 0,
    });
  };

  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    setElements(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const removeElement = (id: string) => {
    setElements(prev => prev.filter(e => e.id !== id));
    if (selected === id) setSelected(null);
  };

  const duplicateElement = (id: string) => {
    const el = elements.find(e => e.id === id);
    if (!el) return;
    const copy = { ...el, id: uid(), x: el.x + 20, y: el.y + 20, zIndex: elements.length };
    if (el.rows) copy.rows = el.rows.map(r => [...r]);
    setElements(prev => [...prev, copy]);
    setSelected(copy.id);
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const el = elements.find(x => x.id === id);
    if (!el || el.locked) return;
    setSelected(id);
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = rect.width / CANVAS_W;
    setDragging({ id, offsetX: e.clientX / scale - el.x, offsetY: e.clientY / scale - el.y });
  };

  const handleResizeDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const el = elements.find(x => x.id === id);
    if (!el || el.locked) return;
    setResizing({ id, startW: el.width, startH: el.height, startX: e.clientX, startY: e.clientY });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = rect.width / CANVAS_W;
    if (dragging) {
      const newX = Math.max(0, Math.min(CANVAS_W - 20, e.clientX / scale - dragging.offsetX));
      const newY = Math.max(0, Math.min(canvasH - 20, e.clientY / scale - dragging.offsetY));
      updateElement(dragging.id, { x: newX, y: newY });
    }
    if (resizing) {
      const dx = (e.clientX - resizing.startX) / scale;
      const dy = (e.clientY - resizing.startY) / scale;
      updateElement(resizing.id, {
        width: Math.max(30, resizing.startW + dx),
        height: Math.max(10, resizing.startH + dy),
      });
    }
  }, [dragging, resizing, canvasH]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setResizing(null);
  }, []);

  const handleExport = async (type: "print" | "image") => {
    const el = document.getElementById("canvas-flyer-preview");
    if (!el) return;
    setExporting(true);
    setSelected(null);
    setEditingText(null);
    await new Promise(r => setTimeout(r, 100));
    try {
      if (type === "print") {
        const pw = window.open("", "_blank");
        if (!pw) { toast.error("Allow popups to print"); return; }
        pw.document.write(`<!DOCTYPE html><html><head><title>Flyer</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{display:flex;justify-content:center;}@media print{@page{margin:0;}}</style></head><body>${el.outerHTML}</body></html>`);
        pw.document.close();
        setTimeout(() => pw.print(), 300);
        toast.success("Print dialog opened");
      } else {
        const { default: html2canvas } = await import("html2canvas");
        const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: null });
        const link = document.createElement("a");
        link.download = "thermi-flyer.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
        toast.success("Image downloaded");
      }
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (selected && selectedEl?.type === "image") {
        updateElement(selected, { imageUrl: url });
      } else {
        addImage(url);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCanvasBgImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const addTableRow = (id: string) => {
    const el = elements.find(e => e.id === id);
    if (!el?.rows) return;
    const cols = el.rows[0]?.length || 3;
    updateElement(id, { rows: [...el.rows, Array(cols).fill("")], height: el.height + 32 });
  };

  const addTableCol = (id: string) => {
    const el = elements.find(e => e.id === id);
    if (!el?.rows) return;
    updateElement(id, { rows: el.rows.map(r => [...r, ""]), width: el.width + 90 });
  };

  const updateCell = (id: string, row: number, col: number, value: string) => {
    const el = elements.find(e => e.id === id);
    if (!el?.rows) return;
    const newRows = el.rows.map((r, ri) => ri === row ? r.map((c, ci) => ci === col ? value : c) : [...r]);
    updateElement(id, { rows: newRows });
  };

  const moveLayer = (id: string, direction: "up" | "down") => {
    const el = elements.find(e => e.id === id);
    if (!el) return;
    updateElement(id, { zIndex: (el.zIndex || 0) + (direction === "up" ? 1 : -1) });
  };

  // Render sidebar content
  const renderSidebar = () => {
    switch (sidebarTab) {
      case "text":
        return (
          <div className="p-3 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Text Styles</p>
            {TEXT_PRESETS.map((p, i) => (
              <button
                key={i}
                onClick={() => addText(p)}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all group"
              >
                <span style={{ fontSize: Math.min(p.fontSize * 0.6, 22), fontWeight: p.fontWeight as any }} className="text-foreground group-hover:text-primary transition-colors">
                  {p.label}
                </span>
                <span className="block text-[10px] text-muted-foreground mt-0.5">{p.fontSize}px · {p.fontWeight === "900" ? "Black" : p.fontWeight === "700" ? "Bold" : "Regular"}</span>
              </button>
            ))}
          </div>
        );

      case "shapes":
        return (
          <div className="p-3 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Shapes</p>
            <div className="grid grid-cols-3 gap-2">
              {SHAPE_PRESETS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => addShape(s)}
                  className="aspect-square flex flex-col items-center justify-center rounded-lg border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all p-2"
                >
                  <div
                    className="w-8 h-8 mb-1"
                    style={{
                      backgroundColor: s.bgColor,
                      borderRadius: s.type === "circle" || s.type === "badge" ? "50%" : s.borderRadius,
                      height: s.type === "line" ? 3 : 32,
                    }}
                  />
                  <span className="text-[9px] text-muted-foreground">{s.label}</span>
                </button>
              ))}
            </div>
            <Separator className="my-3" />
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Colors</p>
            <div className="grid grid-cols-6 gap-1.5">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  className="w-7 h-7 rounded-md border border-border/50 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    if (selectedEl) updateElement(selectedEl.id, { bgColor: c });
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>
        );

      case "images":
        return (
          <div className="p-3 space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Upload Image</p>
            <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
              <Upload className="h-8 w-8 text-muted-foreground/60" />
              <span className="text-xs text-muted-foreground">Click to upload</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
            <Separator />
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">From URL</p>
            <div className="flex gap-1.5">
              <Input
                id="img-url-input"
                placeholder="https://..."
                className="h-8 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addImage((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
              />
              <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => {
                const input = document.getElementById("img-url-input") as HTMLInputElement;
                if (input?.value) { addImage(input.value); input.value = ""; }
              }}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );

      case "background":
        return (
          <div className="p-3 space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Canvas Background</p>
            <div>
              <Label className="text-[10px]">Color</Label>
              <div className="grid grid-cols-6 gap-1.5 mt-1.5">
                {[...PRESET_COLORS, "#0d2137", "#1b4332", "#3c1642", "#d4a574", "#faf3e0", "#1a1a2e"].map(c => (
                  <button
                    key={c}
                    className={`w-7 h-7 rounded-md border transition-transform hover:scale-110 ${canvasBg === c ? "ring-2 ring-primary ring-offset-1" : "border-border/50"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => { setCanvasBg(c); setCanvasBgImage(null); }}
                  />
                ))}
              </div>
              <Input type="color" className="h-8 w-full mt-2" value={canvasBg} onChange={e => { setCanvasBg(e.target.value); setCanvasBgImage(null); }} />
            </div>
            <Separator />
            <div>
              <Label className="text-[10px]">Background Image</Label>
              <label className="flex items-center justify-center gap-2 p-4 mt-1.5 rounded-lg border-2 border-dashed border-border/60 hover:border-primary/40 cursor-pointer transition-all">
                <ImagePlus className="h-5 w-5 text-muted-foreground/60" />
                <span className="text-xs text-muted-foreground">Upload background</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleBgImageUpload} />
              </label>
              {canvasBgImage && (
                <Button variant="ghost" size="sm" className="w-full mt-1.5 text-xs text-destructive" onClick={() => setCanvasBgImage(null)}>
                  Remove background image
                </Button>
              )}
            </div>
          </div>
        );

      default: // elements overview
        return (
          <div className="p-3 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Add Elements</p>
            {[
              { icon: Type, label: "Text", desc: "Headings, body, captions", tab: "text" as SidebarTab },
              { icon: Square, label: "Shapes", desc: "Rectangles, circles, lines", tab: "shapes" as SidebarTab },
              { icon: ImagePlus, label: "Images", desc: "Upload or paste URL", tab: "images" as SidebarTab },
              { icon: Table2, label: "Table", desc: "Schedule grid", tab: null as SidebarTab | null },
              { icon: Palette, label: "Background", desc: "Canvas color & image", tab: "background" as SidebarTab },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  if (item.tab) {
                    setSidebarTab(item.tab);
                  } else if (item.label === "Table") {
                    addElement({
                      type: "table",
                      width: 400,
                      height: 160,
                      rows: [
                        ["Day", "Time", "Dates"],
                        ["Monday", "1:30 - 3:00 PM", "5/11 - 6/8"],
                        ["Wednesday", "5:30 - 7:00 PM", "5/13 - 6/10"],
                        ["Friday", "2:30 - 4:00 PM", "5/15 - 6/12"],
                      ],
                      color: "#1a1a1a",
                      bgColor: "#1a5276",
                      borderColor: "rgba(255,255,255,0.2)",
                    });
                  }
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all group text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-muted/80 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                  <item.icon className="h-4.5 w-4.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
              </button>
            ))}

            {elements.length > 0 && (
              <>
                <Separator className="my-3" />
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Layers ({elements.length})</p>
                <div className="space-y-1">
                  {[...elements].reverse().map(el => (
                    <button
                      key={el.id}
                      onClick={() => setSelected(el.id)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-all ${
                        selected === el.id ? "bg-primary/10 border border-primary/30 text-primary" : "hover:bg-muted/60 text-muted-foreground"
                      }`}
                    >
                      {el.type === "text" ? <Type className="h-3 w-3 shrink-0" /> :
                       el.type === "shape" ? <Square className="h-3 w-3 shrink-0" /> :
                       el.type === "table" ? <Table2 className="h-3 w-3 shrink-0" /> :
                       <Image className="h-3 w-3 shrink-0" />}
                      <span className="truncate">{el.type === "text" ? (el.content?.slice(0, 20) || "Text") : el.type}</span>
                      {el.locked && <Lock className="h-2.5 w-2.5 ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        );
    }
  };

  // Render properties panel
  const renderProperties = () => {
    if (!selectedEl) return (
      <div className="p-4 text-center text-muted-foreground">
        <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-xs">Select an element</p>
      </div>
    );

    return (
      <div className="p-3 space-y-3">
        {/* Quick actions */}
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="flex-1 text-[10px] h-7" onClick={() => duplicateElement(selectedEl.id)}>
            <Copy className="h-3 w-3 mr-0.5" /> Clone
          </Button>
          <Button size="sm" variant="outline" className="flex-1 text-[10px] h-7 text-destructive hover:text-destructive" onClick={() => removeElement(selectedEl.id)}>
            <Trash2 className="h-3 w-3 mr-0.5" /> Delete
          </Button>
        </div>

        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => updateElement(selectedEl.id, { locked: !selectedEl.locked })} title={selectedEl.locked ? "Unlock" : "Lock"}>
            {selectedEl.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveLayer(selectedEl.id, "up")} title="Bring forward">
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveLayer(selectedEl.id, "down")} title="Send backward">
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>

        <Separator />

        {/* Position & Size */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Position & Size</p>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <Label className="text-[9px]">X</Label>
              <Input type="number" className="h-6 text-[10px]" value={Math.round(selectedEl.x)} onChange={e => updateElement(selectedEl.id, { x: +e.target.value })} />
            </div>
            <div>
              <Label className="text-[9px]">Y</Label>
              <Input type="number" className="h-6 text-[10px]" value={Math.round(selectedEl.y)} onChange={e => updateElement(selectedEl.id, { y: +e.target.value })} />
            </div>
            <div>
              <Label className="text-[9px]">W</Label>
              <Input type="number" className="h-6 text-[10px]" value={Math.round(selectedEl.width)} onChange={e => updateElement(selectedEl.id, { width: +e.target.value })} />
            </div>
            <div>
              <Label className="text-[9px]">H</Label>
              <Input type="number" className="h-6 text-[10px]" value={Math.round(selectedEl.height)} onChange={e => updateElement(selectedEl.id, { height: +e.target.value })} />
            </div>
          </div>
        </div>

        {/* Opacity */}
        <div>
          <Label className="text-[9px]">Opacity</Label>
          <Slider
            value={[(selectedEl.opacity ?? 1) * 100]}
            onValueChange={([v]) => updateElement(selectedEl.id, { opacity: v / 100 })}
            min={0} max={100} step={5}
            className="mt-1"
          />
        </div>

        <Separator />

        {/* Type-specific controls */}
        {selectedEl.type === "text" && (
          <>
            <div>
              <Label className="text-[9px]">Font Family</Label>
              <select
                className="w-full h-7 text-[10px] rounded-md border border-input bg-background px-2"
                value={selectedEl.fontFamily || "Inter, sans-serif"}
                onChange={e => updateElement(selectedEl.id, { fontFamily: e.target.value })}
              >
                {FONT_FAMILIES.map(f => (
                  <option key={f} value={f} style={{ fontFamily: f }}>{f.split(",")[0]}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-[9px]">Font Size</Label>
              <Input type="number" className="h-6 text-[10px]" value={selectedEl.fontSize || 18} onChange={e => updateElement(selectedEl.id, { fontSize: +e.target.value })} />
            </div>
            <div className="flex gap-0.5">
              <Button size="sm" variant={selectedEl.fontWeight === "bold" || selectedEl.fontWeight === "700" || selectedEl.fontWeight === "900" ? "default" : "outline"} className="h-7 w-7 p-0" onClick={() => updateElement(selectedEl.id, { fontWeight: selectedEl.fontWeight === "bold" || selectedEl.fontWeight === "700" ? "normal" : "bold" })}>
                <Bold className="h-3 w-3" />
              </Button>
              <Button size="sm" variant={selectedEl.fontStyle === "italic" ? "default" : "outline"} className="h-7 w-7 p-0" onClick={() => updateElement(selectedEl.id, { fontStyle: selectedEl.fontStyle === "italic" ? "normal" : "italic" })}>
                <Italic className="h-3 w-3" />
              </Button>
              <Button size="sm" variant={selectedEl.textDecoration === "underline" ? "default" : "outline"} className="h-7 w-7 p-0" onClick={() => updateElement(selectedEl.id, { textDecoration: selectedEl.textDecoration === "underline" ? "none" : "underline" })}>
                <Underline className="h-3 w-3" />
              </Button>
              <div className="w-px bg-border mx-0.5" />
              <Button size="sm" variant={selectedEl.textAlign === "left" ? "default" : "outline"} className="h-7 w-7 p-0" onClick={() => updateElement(selectedEl.id, { textAlign: "left" })}>
                <AlignLeft className="h-3 w-3" />
              </Button>
              <Button size="sm" variant={selectedEl.textAlign === "center" ? "default" : "outline"} className="h-7 w-7 p-0" onClick={() => updateElement(selectedEl.id, { textAlign: "center" })}>
                <AlignCenter className="h-3 w-3" />
              </Button>
              <Button size="sm" variant={selectedEl.textAlign === "right" ? "default" : "outline"} className="h-7 w-7 p-0" onClick={() => updateElement(selectedEl.id, { textAlign: "right" })}>
                <AlignRight className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <Label className="text-[9px]">Text Color</Label>
                <Input type="color" className="h-6 w-full" value={selectedEl.color || "#ffffff"} onChange={e => updateElement(selectedEl.id, { color: e.target.value })} />
              </div>
              <div>
                <Label className="text-[9px]">Background</Label>
                <Input type="color" className="h-6 w-full" value={selectedEl.bgColor === "transparent" ? "#ffffff" : (selectedEl.bgColor || "#ffffff")} onChange={e => updateElement(selectedEl.id, { bgColor: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-[9px]">Letter Spacing</Label>
              <Input type="number" className="h-6 text-[10px]" value={selectedEl.letterSpacing || 0} onChange={e => updateElement(selectedEl.id, { letterSpacing: +e.target.value })} />
            </div>
          </>
        )}

        {selectedEl.type === "shape" && (
          <>
            <div>
              <Label className="text-[9px]">Fill Color</Label>
              <Input type="color" className="h-6 w-full" value={selectedEl.bgColor || "#1a5276"} onChange={e => updateElement(selectedEl.id, { bgColor: e.target.value })} />
              <div className="grid grid-cols-6 gap-1 mt-1.5">
                {PRESET_COLORS.slice(0, 12).map(c => (
                  <button key={c} className="w-5 h-5 rounded border border-border/30 hover:scale-110 transition-transform" style={{ backgroundColor: c }} onClick={() => updateElement(selectedEl.id, { bgColor: c })} />
                ))}
              </div>
            </div>
            <div>
              <Label className="text-[9px]">Border Radius</Label>
              <Slider value={[selectedEl.borderRadius || 0]} onValueChange={([v]) => updateElement(selectedEl.id, { borderRadius: v })} min={0} max={200} className="mt-1" />
            </div>
            <div>
              <Label className="text-[9px]">Border Width</Label>
              <Input type="number" className="h-6 text-[10px]" value={selectedEl.borderWidth || 0} onChange={e => updateElement(selectedEl.id, { borderWidth: +e.target.value })} />
            </div>
            {(selectedEl.borderWidth || 0) > 0 && (
              <div>
                <Label className="text-[9px]">Border Color</Label>
                <Input type="color" className="h-6 w-full" value={selectedEl.borderColor || "#000"} onChange={e => updateElement(selectedEl.id, { borderColor: e.target.value })} />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={!!selectedEl.shadow} onChange={e => updateElement(selectedEl.id, { shadow: e.target.checked })} className="rounded" />
              <Label className="text-[10px]">Drop Shadow</Label>
            </div>
          </>
        )}

        {selectedEl.type === "table" && (
          <>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="flex-1 text-[10px] h-7" onClick={() => addTableRow(selectedEl.id)}>
                <Plus className="h-3 w-3 mr-0.5" /> Row
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-[10px] h-7" onClick={() => addTableCol(selectedEl.id)}>
                <Plus className="h-3 w-3 mr-0.5" /> Col
              </Button>
            </div>
            <div>
              <Label className="text-[9px]">Header Color</Label>
              <Input type="color" className="h-6 w-full" value={selectedEl.bgColor || "#1a5276"} onChange={e => updateElement(selectedEl.id, { bgColor: e.target.value })} />
            </div>
          </>
        )}

        {selectedEl.type === "image" && (
          <>
            <div>
              <Label className="text-[9px]">Image URL</Label>
              <Input className="h-6 text-[10px]" value={selectedEl.imageUrl || ""} onChange={e => updateElement(selectedEl.id, { imageUrl: e.target.value })} placeholder="https://..." />
            </div>
            <label className="flex items-center justify-center gap-1.5 p-3 rounded-md border border-dashed border-border/60 hover:border-primary/40 cursor-pointer transition-all text-xs text-muted-foreground">
              <Upload className="h-3.5 w-3.5" /> Replace image
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
            <div>
              <Label className="text-[9px]">Border Radius</Label>
              <Slider value={[selectedEl.borderRadius || 0]} onValueChange={([v]) => updateElement(selectedEl.id, { borderRadius: v })} min={0} max={200} className="mt-1" />
            </div>
          </>
        )}
      </div>
    );
  };

  const displayW = CANVAS_W * zoom;
  const displayH = canvasH * zoom;

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
      {/* Top toolbar */}
      <div className="flex items-center justify-between gap-2 px-2 py-2 border-b bg-card/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-xs h-8">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <Tabs value={previewFormat} onValueChange={v => setPreviewFormat(v as any)}>
            <TabsList className="h-7">
              <TabsTrigger value="print" className="text-[10px] h-5 px-2.5 gap-1">
                <Printer className="h-3 w-3" /> Print 8.5×11
              </TabsTrigger>
              <TabsTrigger value="social" className="text-[10px] h-5 px-2.5 gap-1">
                <Image className="h-3 w-3" /> Social 1:1
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-muted/50 rounded-md px-1.5 py-0.5">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}>
              <ZoomOut className="h-3 w-3" />
            </Button>
            <span className="text-[10px] w-8 text-center font-mono">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}>
              <ZoomIn className="h-3 w-3" />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-5" />
          <Button size="sm" variant="outline" onClick={() => handleExport("print")} disabled={exporting} className="h-8 text-xs gap-1">
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
          <Button size="sm" onClick={() => handleExport("image")} disabled={exporting} className="h-8 text-xs gap-1">
            <Download className="h-3.5 w-3.5" /> Export PNG
          </Button>
        </div>
      </div>

      {/* Main layout: sidebar + canvas + properties */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar */}
        <div className="w-56 border-r bg-card/30 shrink-0 flex flex-col">
          {/* Sidebar tabs */}
          <div className="flex border-b shrink-0">
            {([
              { tab: "elements" as SidebarTab, icon: Layers, label: "All" },
              { tab: "text" as SidebarTab, icon: Type, label: "Text" },
              { tab: "shapes" as SidebarTab, icon: Square, label: "Shapes" },
              { tab: "images" as SidebarTab, icon: ImagePlus, label: "Images" },
            ]).map(t => (
              <button
                key={t.tab}
                onClick={() => setSidebarTab(t.tab)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[9px] transition-colors ${
                  sidebarTab === t.tab ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
          <ScrollArea className="flex-1">
            {renderSidebar()}
          </ScrollArea>
        </div>

        {/* Canvas area */}
        <div className="flex-1 bg-muted/30 overflow-auto flex items-start justify-center p-6">
          <div
            ref={canvasRef}
            id="canvas-flyer-preview"
            className="relative shadow-2xl select-none"
            style={{
              width: displayW,
              height: displayH,
              background: canvasBgImage ? `url(${canvasBgImage}) center/cover` : canvasBg,
              cursor: dragging ? "grabbing" : "default",
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={(e) => { if (e.target === e.currentTarget) { setSelected(null); setEditingText(null); } }}
          >
            {elements.filter(e => e.visible !== false).map(el => {
              const isSelected = el.id === selected;
              const isEditing = editingText === el.id;
              const s: React.CSSProperties = {
                position: "absolute",
                left: el.x * zoom,
                top: el.y * zoom,
                width: el.width * zoom,
                zIndex: el.zIndex || 0,
                opacity: el.opacity ?? 1,
                outline: isSelected ? "2px solid hsl(210 100% 50%)" : "none",
                outlineOffset: 2,
                cursor: el.locked ? "not-allowed" : dragging?.id === el.id ? "grabbing" : "grab",
                transition: dragging ? "none" : "outline 0.15s",
              };

              if (el.type === "text") {
                return (
                  <div
                    key={el.id}
                    style={{
                      ...s,
                      height: "auto",
                      minHeight: 20 * zoom,
                      fontSize: (el.fontSize || 18) * zoom,
                      fontWeight: el.fontWeight || "normal",
                      fontStyle: el.fontStyle || "normal",
                      textDecoration: el.textDecoration || "none",
                      textAlign: (el.textAlign as any) || "left",
                      color: el.color || "#ffffff",
                      background: el.bgColor || "transparent",
                      fontFamily: el.fontFamily || "Inter, sans-serif",
                      lineHeight: el.lineHeight || 1.2,
                      letterSpacing: (el.letterSpacing || 0) * zoom,
                      padding: 6 * zoom,
                      wordBreak: "break-word",
                    }}
                    onMouseDown={e => handleMouseDown(e, el.id)}
                    onDoubleClick={() => { if (!el.locked) setEditingText(el.id); }}
                  >
                    {isEditing ? (
                      <textarea
                        ref={textEditRef}
                        className="w-full bg-transparent border-none outline-none resize-none"
                        style={{
                          fontSize: "inherit",
                          fontWeight: "inherit",
                          fontStyle: "inherit",
                          fontFamily: "inherit",
                          color: "inherit",
                          textAlign: "inherit",
                          lineHeight: "inherit",
                          letterSpacing: "inherit",
                          padding: 0,
                          minHeight: 20 * zoom,
                        }}
                        value={el.content || ""}
                        onChange={e => updateElement(el.id, { content: e.target.value })}
                        onBlur={() => setEditingText(null)}
                        onKeyDown={e => { if (e.key === "Escape") setEditingText(null); }}
                      />
                    ) : (
                      el.content || "Text"
                    )}
                    {isSelected && !isEditing && (
                      <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize border-2 border-white" onMouseDown={e => handleResizeDown(e, el.id)} />
                    )}
                  </div>
                );
              }

              if (el.type === "shape") {
                return (
                  <div
                    key={el.id}
                    style={{
                      ...s,
                      height: el.height * zoom,
                      background: el.bgColor || "#1a5276",
                      borderRadius: el.shapeType === "circle" || el.shapeType === "badge" ? "50%" : (el.borderRadius || 0) * zoom,
                      border: el.borderWidth ? `${el.borderWidth * zoom}px solid ${el.borderColor || "#000"}` : "none",
                      boxShadow: el.shadow ? `0 ${4 * zoom}px ${12 * zoom}px rgba(0,0,0,0.3)` : "none",
                    }}
                    onMouseDown={e => handleMouseDown(e, el.id)}
                  >
                    {isSelected && (
                      <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize border-2 border-white" onMouseDown={e => handleResizeDown(e, el.id)} />
                    )}
                  </div>
                );
              }

              if (el.type === "table" && el.rows) {
                return (
                  <div
                    key={el.id}
                    style={{ ...s, height: el.height * zoom, overflow: "hidden", borderRadius: 4 * zoom }}
                    onMouseDown={e => handleMouseDown(e, el.id)}
                  >
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 * zoom }}>
                      <tbody>
                        {el.rows.map((row, ri) => (
                          <tr key={ri}>
                            {row.map((cell, ci) => (
                              <td
                                key={ci}
                                style={{
                                  border: `1px solid ${el.borderColor || "rgba(255,255,255,0.2)"}`,
                                  padding: `${4 * zoom}px ${6 * zoom}px`,
                                  background: ri === 0 ? (el.bgColor || "#1a5276") : "rgba(255,255,255,0.95)",
                                  color: ri === 0 ? "#fff" : (el.color || "#1a1a1a"),
                                  fontWeight: ri === 0 ? 700 : 400,
                                }}
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  const val = prompt("Edit cell:", cell);
                                  if (val !== null) updateCell(el.id, ri, ci, val);
                                }}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {isSelected && (
                      <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize border-2 border-white" onMouseDown={e => handleResizeDown(e, el.id)} />
                    )}
                  </div>
                );
              }

              if (el.type === "image") {
                return (
                  <div
                    key={el.id}
                    style={{
                      ...s,
                      height: el.height * zoom,
                      borderRadius: (el.borderRadius || 0) * zoom,
                      overflow: "hidden",
                    }}
                    onMouseDown={e => handleMouseDown(e, el.id)}
                  >
                    {el.imageUrl ? (
                      <img src={el.imageUrl} alt="" className="w-full h-full object-cover" draggable={false} />
                    ) : (
                      <div className="w-full h-full bg-muted/40 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-muted-foreground/20 rounded" style={{ borderRadius: (el.borderRadius || 0) * zoom }}>
                        <ImagePlus className="text-muted-foreground/40" style={{ width: 20 * zoom, height: 20 * zoom }} />
                        <span className="text-muted-foreground/50" style={{ fontSize: 9 * zoom }}>Double-click or<br/>use properties</span>
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize border-2 border-white" onMouseDown={e => handleResizeDown(e, el.id)} />
                    )}
                  </div>
                );
              }

              return null;
            })}

            {elements.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center px-8">
                  <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground/60">Start designing</p>
                  <p className="text-xs text-muted-foreground/40 mt-1">Add elements from the left panel</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right properties panel */}
        {showProperties && (
          <div className="w-52 border-l bg-card/30 shrink-0 overflow-y-auto">
            <div className="px-3 py-2 border-b flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Properties</span>
            </div>
            <ScrollArea className="h-full">
              {renderProperties()}
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}