import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { enqueueOfflineAction } from "@/lib/offline-queue";

export function QRCheckIn({ workspaceId }: { workspaceId: string | null }) {
  const elementId = useId().replace(/:/g, "-");
  const [active, setActive] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !workspaceId) return;

    let scanner: any;
    let cancelled = false;

    const start = async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      scanner = new Html5Qrcode(elementId);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText: string) => {
          setLastScan(decodedText);
          if (!navigator.onLine) {
            await enqueueOfflineAction("kiosk-check-in", { workspaceId, code: decodedText });
            toast.info("Saved QR check-in for sync when online");
          } else {
            toast.success(`QR scanned: ${decodedText}`);
          }
        },
        () => {}
      );
    };

    start().catch(() => {
      toast.error("Could not start QR scanner");
      setActive(false);
    });

    return () => {
      cancelled = true;
      if (scanner) {
        scanner.stop().catch(() => {}).finally(() => scanner.clear().catch(() => {}));
      }
    };
  }, [active, elementId, workspaceId]);

  if (!workspaceId) return null;

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <QrCode className="h-4 w-4" /> QR Check-In
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div id={elementId} className="overflow-hidden rounded-md border bg-black/5" />
        {lastScan && <p className="text-xs text-muted-foreground">Last scan: {lastScan}</p>}
        <Button type="button" variant={active ? "secondary" : "outline"} onClick={() => setActive((value) => !value)}>
          <ScanLine className="mr-2 h-4 w-4" />
          {active ? "Stop scanner" : "Start scanner"}
        </Button>
      </CardContent>
    </Card>
  );
}
