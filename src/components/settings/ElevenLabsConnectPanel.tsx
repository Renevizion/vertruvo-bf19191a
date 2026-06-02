import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sparkles, CheckCircle2, ExternalLink, Unplug, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function ElevenLabsConnectPanel() {
  const qc = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [showInput, setShowInput] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ["elevenlabs-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("elevenlabs-connect", {
        body: { action: "get" },
      });
      if (error) throw error;
      return data as { connected: boolean; subscription?: string; connected_at?: string };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (key: string) => {
      const { data, error } = await supabase.functions.invoke("elevenlabs-connect", {
        body: { action: "save_key", api_key: key },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      return data;
    },
    onSuccess: () => {
      toast.success("ElevenLabs connected!");
      setApiKey("");
      setShowInput(false);
      qc.invalidateQueries({ queryKey: ["elevenlabs-status"] });
    },
    onError: (e: any) => toast.error(e.message || "Invalid API key"),
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("elevenlabs-connect", {
        body: { action: "disconnect" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("ElevenLabs disconnected");
      qc.invalidateQueries({ queryKey: ["elevenlabs-status"] });
    },
  });

  const openElevenLabsPopup = () => {
    const w = 520, h = 640;
    const l = window.screenX + (window.outerWidth - w) / 2;
    const t = window.screenY + (window.outerHeight - h) / 2;
    window.open(
      "https://elevenlabs.io/app/settings/api-keys",
      "elevenlabs_apikeys",
      `width=${w},height=${h},left=${l},top=${t},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6 flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading ElevenLabs status…
      </Card>
    );
  }

  // ── CONNECTED ──────────────────────────────────────────────────────────────
  if (status?.connected) {
    return (
      <Card className="overflow-hidden">
        <div className="flex items-center gap-4 px-6 py-5 border-b bg-muted/20">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold">ElevenLabs</p>
              <Badge variant="default" className="gap-1 text-xs">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </Badge>
              {status.subscription && (
                <Badge variant="secondary" className="text-xs capitalize">{status.subscription}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your agents are available to select when creating a Voice AI agent in Thermi.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive gap-1.5 shrink-0"
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
          >
            {disconnectMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
            Disconnect
          </Button>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-muted-foreground">
            When you create a Voice AI agent, Thermi will automatically pull your ElevenLabs agents so you can select one from a dropdown — no copy-pasting needed.
          </p>
        </div>
      </Card>
    );
  }

  // ── NOT CONNECTED ──────────────────────────────────────────────────────────
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-5 border-b bg-muted/20">
        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">ElevenLabs</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connect your ElevenLabs account to use your Conversational AI agents inside Thermi.
          </p>
        </div>
        <Badge variant="outline" className="text-xs shrink-0">Not connected</Badge>
      </div>

      <div className="px-6 py-5 space-y-4">
        {!showInput ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className="gap-2 flex-1"
              onClick={() => setShowInput(true)}
            >
              <Sparkles className="h-4 w-4" /> Connect ElevenLabs
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={openElevenLabsPopup}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Don't have an account? Sign up
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Get your API key</p>
              <p>
                Click "Open ElevenLabs" below, go to <strong>Settings → API Keys</strong>, create a new key, and paste it here.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={openElevenLabsPopup}
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open ElevenLabs
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="Paste your ElevenLabs API key…"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => saveMutation.mutate(apiKey)}
                disabled={!apiKey.trim() || saveMutation.isPending}
                className="gap-1.5 shrink-0"
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Connect
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowInput(false); setApiKey(""); }}>
                Cancel
              </Button>
            </div>
            {saveMutation.isError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{(saveMutation.error as any)?.message || "Invalid API key. Please check and try again."}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
