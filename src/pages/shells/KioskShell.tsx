import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShellChrome } from "@/shells/ShellChrome";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Lock, Unlock } from "lucide-react";
import { CAPABILITIES } from "@/capabilities/registry";
import { supabase } from "@/integrations/supabase/client";
import { OfflineBanner } from "@/components/kiosk/OfflineBanner";
import { QRCheckIn } from "@/components/kiosk/QRCheckIn";
import { useWorkspaceStore } from "@/store/workspace-store";

export default function KioskShell() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState(false);
  const setWorkspace = useWorkspaceStore((state) => state.setWorkspace);
  const setStaffMode = useWorkspaceStore((state) => state.setStaffMode);
  const [pin, setPin] = useState("");
  const [idleAt, setIdleAt] = useState(Date.now());
  const [slug, setSlug] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    void supabase
      .from("workspaces")
      .select("id,slug")
      .not("slug", "is", null)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const workspace = data as { id?: string; slug?: string } | null;
        setWorkspaceId(workspace?.id ?? null);
        setSlug(workspace?.slug ?? null);
        setWorkspace(workspace?.id ?? null, workspace?.slug ?? null);
        setBusy(false);
      });
  }, []);

  useEffect(() => {
    const reset = () => setIdleAt(Date.now());
    ["pointerdown","keydown","touchstart"].forEach(e => window.addEventListener(e, reset));
    const i = setInterval(() => {
      if (staff && Date.now() - idleAt > 15 * 60 * 1000) { setStaff(false); setStaffMode(false); toast.info("Staff session timed out"); }
    }, 30000);
    return () => { clearInterval(i); ["pointerdown","keydown","touchstart"].forEach(e => window.removeEventListener(e, reset)); };
  }, [staff, idleAt]);

  function openCapability(k: string) {
    if (k === "booking.public" && slug) { navigate(`/book/${slug}`); return; }
    const cap = CAPABILITIES[k];
    if (cap?.saasPath) navigate(cap.saasPath);
    else toast.info(`${cap?.label ?? k} not configured`);
  }

  return (
    <ShellChrome
      shell="kiosk"
      title="Thermi Kiosk"
      subtitle={staff ? "Staff mode — 15 min auto-lock" : "Customer mode — tap to begin"}
      accent="bg-gradient-to-br from-violet-500 to-violet-700"
      defaultCapability={staff ? "pay.pos" : "booking.public"}
      onPickCapability={openCapability}
    >
      <OfflineBanner />
      <section aria-label="Kiosk primary surface">
        <Card className="overflow-hidden">
          <CardContent className="p-8 sm:p-12 text-center space-y-6">
            <h2 className="text-2xl sm:text-4xl font-bold">Welcome</h2>
            <p className="text-base sm:text-lg text-muted-foreground">{staff ? "Walk-in tools enabled" : "Tap below to book, sign up, or message us."}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="min-h-[56px] text-lg" aria-busy={busy} onClick={() => openCapability("booking.public")}>{busy ? "Loading…" : "Book a time"}</Button>
              <Button size="lg" variant="outline" className="min-h-[56px] text-lg" onClick={() => openCapability("crm.capture")}>Sign up</Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-label="Staff access" className="max-w-sm">
        {!staff ? (
          <form onSubmit={(e) => { e.preventDefault(); if (pin === "1234") { setStaff(true); setStaffMode(true); toast.success("Staff mode unlocked"); } else { toast.error("Invalid PIN"); } setPin(""); }} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground" htmlFor="kiosk-pin">Staff PIN</label>
              <Input id="kiosk-pin" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" className="min-h-[44px]" />
            </div>
            <Button type="submit" variant="outline" className="min-h-[44px]"><Lock className="h-4 w-4 mr-1" />Unlock</Button>
          </form>
        ) : (
          <div className="space-y-3">
            <Button variant="outline" onClick={() => { setStaff(false); setStaffMode(false); }} className="min-h-[44px]"><Unlock className="h-4 w-4 mr-1" />Lock kiosk</Button>
            <QRCheckIn workspaceId={workspaceId} />
          </div>
        )}
      </section>
    </ShellChrome>
  );
}
