import { useEffect, useRef } from "react";
import { Canvas, Rect, Textbox } from "fabric";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Square, Type } from "lucide-react";
import { toast } from "sonner";

export function FabricFlyerCanvas({ onBack }: { onBack: () => void }) {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);

  useEffect(() => {
    if (!canvasElementRef.current) return;

    const canvas = new Canvas(canvasElementRef.current, {
      width: 612,
      height: 792,
      backgroundColor: "#ffffff",
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;

    canvas.add(
      new Textbox("Your headline", {
        left: 72,
        top: 72,
        width: 460,
        fontSize: 36,
        fontWeight: "700",
        fill: "#111827",
      })
    );

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, []);

  const addText = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.add(
      new Textbox("New text", {
        left: 96,
        top: 180,
        width: 260,
        fontSize: 24,
        fill: "#1f2937",
      })
    );
    const object = canvas.getObjects().at(-1);
    if (object) canvas.setActiveObject(object);
    canvas.requestRenderAll();
  };

  const addShape = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.add(
      new Rect({
        left: 110,
        top: 280,
        width: 180,
        height: 100,
        fill: "#8b5cf6",
        rx: 16,
        ry: 16,
      })
    );
    const object = canvas.getObjects().at(-1);
    if (object) canvas.setActiveObject(object);
    canvas.requestRenderAll();
  };

  const exportPng = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL({ format: "png", multiplier: 2 });
    const link = document.createElement("a");
    link.href = url;
    link.download = "thermi-fabric-flyer.png";
    link.click();
    toast.success("Fabric flyer exported");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addText}>
            <Type className="mr-2 h-4 w-4" /> Add text
          </Button>
          <Button size="sm" variant="outline" onClick={addShape}>
            <Square className="mr-2 h-4 w-4" /> Add shape
          </Button>
          <Button size="sm" onClick={exportPng}>
            <Download className="mr-2 h-4 w-4" /> Export PNG
          </Button>
        </div>
      </div>
      <div className="overflow-auto rounded-lg border bg-muted/20 p-4">
        <canvas ref={canvasElementRef} className="mx-auto block max-w-full rounded shadow-lg" />
      </div>
    </div>
  );
}
