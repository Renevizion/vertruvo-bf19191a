import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShellChrome } from "@/shells/ShellChrome";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { withTelemetry } from "@/lib/shell-health";
import { CAPABILITIES } from "@/capabilities/registry";
import { InlineError } from "@/lib/aaa";

export default function ExtensionShell() {
  const navigate = useNavigate();
  const [url, setUrl] = useState(typeof window !== "undefined" ? window.location.href : "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      await withTelemetry({ shell: "extension", capabilityKey: "crm.capture" }, async () => {
        const { error } = await supabase.functions.invoke("form-submit", {
          body: { source: "extension", source_url: url, name, email, message: note },
        });
        if (error) throw error;
      });
      toast.success("Captured to CRM");
      setName(""); setEmail(""); setNote("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not capture. Try again.");
    } finally { setBusy(false); }
  }

  return (
    <ShellChrome
      shell="extension"
      title="Thermi Extension"
      subtitle="Quick capture from any tab"
      accent="bg-gradient-to-br from-orange-500 to-orange-700"
      defaultCapability="crm.capture"
      onPickCapability={(k) => {
        const cap = CAPABILITIES[k];
        if (cap?.saasPath) navigate(cap.saasPath);
        else toast.info(`${cap?.label ?? k} opens in workspace`);
      }}
    >
      <section aria-label="Quick capture" className="max-w-md">
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">Capture from this page</h2>
            <div><label htmlFor="ext-url" className="text-xs text-muted-foreground">Source URL</label>
              <Input id="ext-url" value={url} onChange={(e) => setUrl(e.target.value)} className="min-h-[44px]" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label htmlFor="ext-name" className="text-xs text-muted-foreground">Name</label>
                <Input id="ext-name" value={name} onChange={(e) => setName(e.target.value)} className="min-h-[44px]" /></div>
              <div><label htmlFor="ext-email" className="text-xs text-muted-foreground">Email</label>
                <Input id="ext-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-[44px]" /></div>
            </div>
            <div><label htmlFor="ext-note" className="text-xs text-muted-foreground">Note</label>
              <Textarea id="ext-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Selected text or context…" /></div>
            {err && <InlineError message={err} onRetry={() => setErr(null)} />}
            <Button className="w-full min-h-[44px]" disabled={busy || (!name && !email)} onClick={save}>
              {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{busy ? "Saving…" : "Save to CRM"}
            </Button>
          </CardContent>
        </Card>
      </section>
    </ShellChrome>
  );
}
