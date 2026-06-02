import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

const ASPECT_RATIOS = [
  { label: "1:1", value: 1, description: "Square" },
  { label: "4:5", value: 4 / 5, description: "Portrait" },
  { label: "1.91:1", value: 1.91, description: "Landscape" },
] as const;

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedImageDataUrl: string) => void;
}

export function ImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
}: ImageCropDialogProps) {
  const [aspectRatio, setAspectRatio] = useState(1);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(true);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);

  // Fixed crop box dimensions
  const CROP_BOX_WIDTH = 280;
  const getCropBoxHeight = () => Math.round(CROP_BOX_WIDTH / aspectRatio);

  // Load image when dialog opens
  useEffect(() => {
    if (!open || !imageSrc) return;
    
    setIsLoading(true);
    const img = new Image();
    
    // Set crossOrigin BEFORE src for external URLs
    if (imageSrc.startsWith('http') && !imageSrc.startsWith('data:')) {
      img.crossOrigin = "anonymous";
    }
    
    img.onload = () => {
      imageObjRef.current = img;
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      
      // Calculate initial scale to fit image in crop box
      const cropHeight = getCropBoxHeight();
      const scaleToFitWidth = CROP_BOX_WIDTH / img.naturalWidth;
      const scaleToFitHeight = cropHeight / img.naturalHeight;
      const fitScale = Math.max(scaleToFitWidth, scaleToFitHeight);
      
      setScale(fitScale);
      setPosition({ x: 0, y: 0 });
      setIsLoading(false);
    };
    
    img.onerror = () => {
      console.error("Failed to load image for cropping");
      setIsLoading(false);
    };
    
    img.src = imageSrc;
  }, [open, imageSrc, aspectRatio]);

  // Update preview canvas whenever position/scale changes
  useEffect(() => {
    if (!imageObjRef.current || isLoading) return;
    drawPreview();
  }, [position, scale, aspectRatio, isLoading]);

  const drawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;

    const cropWidth = CROP_BOX_WIDTH;
    const cropHeight = getCropBoxHeight();
    
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, cropWidth, cropHeight);

    // Calculate where to draw the image
    const scaledWidth = img.naturalWidth * scale;
    const scaledHeight = img.naturalHeight * scale;
    
    // Center point + offset
    const drawX = (cropWidth - scaledWidth) / 2 + position.x;
    const drawY = (cropHeight - scaledHeight) / 2 + position.y;

    ctx.drawImage(img, drawX, drawY, scaledWidth, scaledHeight);
  }, [position, scale, aspectRatio]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleCrop = () => {
    const img = imageObjRef.current;
    if (!img) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Output at Instagram-recommended resolution
    const outputWidth = 1080;
    const outputHeight = Math.round(outputWidth / aspectRatio);
    
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fill with background color first
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, outputWidth, outputHeight);

    // Scale from preview to output
    const previewWidth = CROP_BOX_WIDTH;
    const previewHeight = getCropBoxHeight();
    const outputScale = outputWidth / previewWidth;

    // Calculate draw position scaled up
    const scaledWidth = img.naturalWidth * scale * outputScale;
    const scaledHeight = img.naturalHeight * scale * outputScale;
    const drawX = (outputWidth - scaledWidth) / 2 + (position.x * outputScale);
    const drawY = (outputHeight - scaledHeight) / 2 + (position.y * outputScale);

    ctx.drawImage(img, drawX, drawY, scaledWidth, scaledHeight);

    try {
      const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.92);
      onCropComplete(croppedDataUrl);
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to export cropped image:", err);
    }
  };

  const resetPosition = () => {
    if (!imageObjRef.current) return;
    const img = imageObjRef.current;
    const cropHeight = getCropBoxHeight();
    const scaleToFitWidth = CROP_BOX_WIDTH / img.naturalWidth;
    const scaleToFitHeight = cropHeight / img.naturalHeight;
    const fitScale = Math.max(scaleToFitWidth, scaleToFitHeight);
    setScale(fitScale);
    setPosition({ x: 0, y: 0 });
  };

  const cropBoxHeight = getCropBoxHeight();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crop for Instagram</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Aspect Ratio Selection */}
          <div className="space-y-2">
            <Label className="text-xs">Aspect Ratio</Label>
            <div className="flex gap-2">
              {ASPECT_RATIOS.map((ratio) => (
                <Button
                  key={ratio.label}
                  variant={aspectRatio === ratio.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setAspectRatio(ratio.value);
                    // Reset position when changing aspect ratio
                    setTimeout(() => resetPosition(), 50);
                  }}
                  className="flex-1 text-xs h-8"
                >
                  {ratio.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Crop Preview Area */}
          <div className="flex justify-center">
            <div
              className="relative bg-muted rounded-md overflow-hidden cursor-move border border-border"
              style={{ width: CROP_BOX_WIDTH, height: cropBoxHeight }}
              onMouseDown={handleMouseDown}
            >
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                  Loading...
                </div>
              ) : (
                <canvas
                  ref={previewCanvasRef}
                  className="w-full h-full"
                  style={{ width: CROP_BOX_WIDTH, height: cropBoxHeight }}
                />
              )}
              {/* Rule of thirds grid */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="border border-white/10" />
                ))}
              </div>
            </div>
          </div>

          {/* Zoom Control */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs">Zoom</Label>
              <span className="text-xs text-muted-foreground">{Math.round(scale * 100)}%</span>
            </div>
            <Slider
              value={[scale]}
              onValueChange={([value]) => setScale(value)}
              min={0.1}
              max={3}
              step={0.05}
              className="w-full"
            />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Drag to reposition • Use slider to zoom
          </p>

          {/* Hidden canvas for final crop output */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={resetPosition}>
            Reset
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCrop} disabled={isLoading}>
            Apply Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
