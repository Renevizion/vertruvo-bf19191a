/**
 * TwilioConnectPanel
 *
 * Full Twilio Connect interface inside Thermi Settings → Voice & Calling.
 * Handles:
 *  - OAuth connect / disconnect flow
 *  - Phone number management (search, buy, release)
 *  - Call routing (AI agent selector, webhook config)
 *  - Call forwarding (fallback number)
 *  - Call logs (history, duration, recording)
 *  - Account balance with "Add Funds" deep link
 */
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Phone, PhoneCall, PhoneIncoming, PhoneForwarded, Clock, Mic,
  ExternalLink, Loader2, CheckCircle2, AlertCircle, Unplug,
  Search, ShoppingCart, Trash2, RefreshCw, DollarSign, ChevronRight,
  Zap, ArrowRight,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

// ── helpers ──────────────────────────────────────────────────────────────────

const TWILIO_CONNECT_CLIENT_ID = import.meta.env.VITE_TWILIO_CONNECT_CLIENT_ID ?? "";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";

async function callTwilioApi(action: string, params: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const resp = await supabase.functions.invoke("twilio-connect-api", {
    body: { action, ...params },
  });
  if (resp.error) throw new Error(resp.error.message);
  if (resp.data?.error) throw new Error(resp.data.error);
  return resp.data;
}

function formatDuration(seconds: string | number) {
  const s = Number(seconds);
  if (!s) return "0s";
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}m ${rem}s` : `${rem}s`;
}

// ── sub-components ────────────────────────────────────────────────────────────

function ConnectBanner({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="rounded-2xl border bg-gradient-to-br from-background to-muted/30 p-8 text-center space-y-5">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Phone className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-bold">Connect Your Twilio Account</h2>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
          Link your own Twilio account so your AI agent can answer calls, send texts, and leave voicemails — all from your number, on your account.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button size="lg" className="gap-2" onClick={onConnect}>
          <Phone className="h-4 w-4" />
          Connect with Twilio
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="gap-2"
          onClick={() => {
            const w = 520, h = 640;
            const l = Math.round(window.screenX + (window.outerWidth - w) / 2);
            const t = Math.round(window.screenY + (window.outerHeight - h) / 2);
            window.open("https://www.twilio.com/try-twilio", "twilio_signup", `width=${w},height=${h},left=${l},top=${t},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`);
          }}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Don't have Twilio? Sign up free
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Your credentials stay on your Twilio account. Thermi never stores your password or billing info.
      </p>
    </div>
  );
}

function StatusBar({
  accountName,
  accountStatus,
  connectedAt,
  balance,
  onDisconnect,
  onRefreshBalance,
}: {
  accountName: string | null;
  accountStatus: string | null;
  connectedAt: string | null;
  balance: { balance: string; currency: string; add_funds_url: string } | null;
  onDisconnect: () => void;
  onRefreshBalance: () => void;
}) {
  return (
    <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 px-5 py-4 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="h-8 w-8 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 truncate">
            {accountName ?? "Twilio Connected"}
          </p>
          <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70">
            {connectedAt ? `Connected ${formatDistanceToNow(new Date(connectedAt), { addSuffix: true })}` : "Active"}
            {accountStatus ? ` · ${accountStatus}` : ""}
          </p>
        </div>
      </div>
      {balance && (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            {balance.balance} {balance.currency}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 border-emerald-300"
            onClick={() => window.open(balance.add_funds_url, "_blank")}
          >
            Add Funds <ExternalLink className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onRefreshBalance}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5"
        onClick={onDisconnect}
      >
        <Unplug className="h-3.5 w-3.5" />
        Disconnect
      </Button>
    </div>
  );
}

function NumbersPanel({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const [areaCode, setAreaCode] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [releasing, setReleasing] = useState<string | null>(null);

  const { data: numbersData, isLoading } = useQuery({
    queryKey: ["twilio-connect-numbers", workspaceId],
    queryFn: () => callTwilioApi("list_numbers"),
  });

  const numbers = numbersData?.numbers ?? [];

  const handleSearch = async () => {
    setSearching(true);
    try {
      const result = await callTwilioApi("search_numbers", { area_code: areaCode });
      setSearchResults(result.numbers ?? []);
      if ((result.numbers ?? []).length === 0) toast.info("No numbers found for that area code");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSearching(false);
    }
  };

  const handleBuy = async (phoneNumber: string) => {
    setBuying(phoneNumber);
    try {
      await callTwilioApi("buy_number", { phone_number: phoneNumber, friendly_name: "Thermi Business Line" });
      toast.success(`${phoneNumber} purchased and ready`);
      setSearchResults([]);
      qc.invalidateQueries({ queryKey: ["twilio-connect-numbers"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBuying(null);
    }
  };

  const handleRelease = async (sid: string, number: string) => {
    if (!confirm(`Release ${number}? This cannot be undone.`)) return;
    setReleasing(sid);
    try {
      await callTwilioApi("release_number", { sid });
      toast.success(`${number} released`);
      qc.invalidateQueries({ queryKey: ["twilio-connect-numbers"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setReleasing(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Phone Numbers</h3>
          <p className="text-xs text-muted-foreground">Numbers on your Twilio account</p>
        </div>
      </div>

      {/* Search for new numbers */}
      <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
        <p className="text-sm font-medium">Get a new number</p>
        <div className="flex gap-2">
          <Input
            placeholder="Area code (e.g. 203)"
            value={areaCode}
            onChange={e => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
            className="w-40"
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
          <Button variant="outline" onClick={handleSearch} disabled={searching} className="gap-1.5">
            {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Search
          </Button>
        </div>
        {searchResults.length > 0 && (
          <div className="space-y-2 mt-2">
            {searchResults.map(n => (
              <div key={n.phone_number} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">{n.phone_number}</p>
                  <p className="text-xs text-muted-foreground">{n.locality}, {n.region} · {n.monthly_cost}/mo</p>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5 h-7"
                  onClick={() => handleBuy(n.phone_number)}
                  disabled={buying === n.phone_number}
                >
                  {buying === n.phone_number ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShoppingCart className="h-3 w-3" />}
                  Buy
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Existing numbers */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading numbers...
        </div>
      ) : numbers.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <Phone className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No numbers yet. Search above to get your first business number.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {numbers.map((n: any) => (
            <div key={n.sid} className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{n.phone_number}</p>
                <p className="text-xs text-muted-foreground truncate">{n.friendly_name}</p>
              </div>
              <div className="flex items-center gap-2">
                {n.voice_url?.includes("twilio-inbound-call") ? (
                  <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
                    <PhoneIncoming className="h-3 w-3 mr-1" /> AI Ready
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                    <AlertCircle className="h-3 w-3 mr-1" /> Not configured
                  </Badge>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleRelease(n.sid, n.phone_number)}
                  disabled={releasing === n.sid}
                >
                  {releasing === n.sid ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RoutingPanel({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const [forwardNumber, setForwardNumber] = useState("");
  const [savingForward, setSavingForward] = useState(false);
  const [configuringWebhook, setConfiguringWebhook] = useState<string | null>(null);

  const { data: numbersData } = useQuery({
    queryKey: ["twilio-connect-numbers", workspaceId],
    queryFn: () => callTwilioApi("list_numbers"),
  });

  const { data: voiceAgents } = useQuery({
    queryKey: ["voice-agents-routing"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_agents").select("id, name, inbound_enabled").eq("type", "voice").order("name");
      return data ?? [];
    },
  });

  const numbers = numbersData?.numbers ?? [];
  const activeAgent = voiceAgents?.find((a: any) => a.inbound_enabled);

  const handleSetAgent = async (agentId: string) => {
    await supabase.from("ai_agents").update({ inbound_enabled: false }).eq("type", "voice");
    if (agentId !== "none") {
      await supabase.from("ai_agents").update({ inbound_enabled: true }).eq("id", agentId);
    }
    qc.invalidateQueries({ queryKey: ["voice-agents-routing"] });
    toast.success("Inbound agent updated");
  };

  const handleConfigureWebhook = async (sid: string) => {
    setConfiguringWebhook(sid);
    try {
      await callTwilioApi("configure_webhook", { sid });
      toast.success("AI agent connected to this number");
      qc.invalidateQueries({ queryKey: ["twilio-connect-numbers"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setConfiguringWebhook(null);
    }
  };

  const handleSaveForward = async () => {
    const activeNumber = numbers.find((n: any) => n.voice_url?.includes("twilio-inbound-call"));
    if (!activeNumber) {
      toast.error("Configure an AI-ready number first");
      return;
    }
    setSavingForward(true);
    try {
      await callTwilioApi("update_forwarding", { sid: activeNumber.sid, forward_to: forwardNumber });
      toast.success("Fallback forwarding saved");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingForward(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold">Call Routing</h3>
        <p className="text-xs text-muted-foreground">Control how incoming calls are handled</p>
      </div>

      {/* AI Agent selector */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <Mic className="h-4 w-4 text-violet-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">AI Agent</p>
            <p className="text-xs text-muted-foreground mb-2">Which agent answers inbound calls</p>
            {(voiceAgents?.length ?? 0) === 0 ? (
              <p className="text-xs text-amber-600">No voice agents yet. Create one in AI Agents.</p>
            ) : (
              <Select value={activeAgent?.id ?? "none"} onValueChange={handleSetAgent}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No agent (calls ring through)</SelectItem>
                  {voiceAgents?.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* Enable AI on numbers */}
      {numbers.length > 0 && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Enable AI on Numbers</p>
              <p className="text-xs text-muted-foreground mb-3">Connect your AI agent to each number</p>
              <div className="space-y-2">
                {numbers.map((n: any) => {
                  const isReady = n.voice_url?.includes("twilio-inbound-call");
                  return (
                    <div key={n.sid} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{n.phone_number}</p>
                        <p className="text-xs text-muted-foreground">{n.friendly_name}</p>
                      </div>
                      {isReady ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> AI Active
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleConfigureWebhook(n.sid)}
                          disabled={configuringWebhook === n.sid}
                        >
                          {configuringWebhook === n.sid
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Zap className="h-3 w-3" />}
                          Enable AI
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fallback forwarding */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <PhoneForwarded className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Fallback Forwarding</p>
            <p className="text-xs text-muted-foreground mb-2">
              If the AI can't handle a call, forward it to this number
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="+12035550101"
                value={forwardNumber}
                onChange={e => setForwardNumber(e.target.value)}
                className="max-w-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveForward}
                disabled={savingForward || !forwardNumber}
                className="gap-1.5"
              >
                {savingForward ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CallLogsPanel({ workspaceId }: { workspaceId: string }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["twilio-call-logs", workspaceId],
    queryFn: () => callTwilioApi("get_call_logs", { page_size: 25 }),
  });

  const calls = data?.calls ?? [];

  const directionIcon = (dir: string) => {
    if (dir === "inbound") return <PhoneIncoming className="h-3.5 w-3.5 text-emerald-600" />;
    return <PhoneCall className="h-3.5 w-3.5 text-blue-600" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Call History</h3>
          <p className="text-xs text-muted-foreground">Last 25 calls on your account</p>
        </div>
        <Button size="sm" variant="ghost" className="gap-1.5 h-8" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading call history...
        </div>
      ) : calls.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No calls yet. Once your AI agent starts answering, calls will appear here.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {calls.map((c: any) => (
            <div key={c.sid} className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                {directionIcon(c.direction)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{c.direction === "inbound" ? c.from : c.to}</p>
                  <Badge variant="outline" className="text-xs capitalize">{c.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.start_time ? format(new Date(c.start_time), "MMM d, h:mm a") : "—"} · {formatDuration(c.duration)}
                  {c.price ? ` · ${c.price}` : ""}
                </p>
              </div>
              {c.recording_url && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1"
                  onClick={() => window.open(c.recording_url, "_blank")}
                >
                  <Mic className="h-3 w-3" /> Recording
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export function TwilioConnectPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();
  const [activeSection, setActiveSection] = useState<"numbers" | "routing" | "logs">("numbers");

  // Handle OAuth callback params
  useEffect(() => {
    if (searchParams.get("twilio_connected") === "true") {
      toast.success("Twilio connected successfully!");
      setSearchParams(p => { p.delete("twilio_connected"); return p; });
      qc.invalidateQueries({ queryKey: ["twilio-connect-status"] });
    }
    if (searchParams.get("twilio_error")) {
      const err = searchParams.get("twilio_error");
      toast.error(`Twilio connection failed: ${err}`);
      setSearchParams(p => { p.delete("twilio_error"); return p; });
    }
  }, [searchParams]);

  const { data: workspace } = useQuery({
    queryKey: ["workspace-for-twilio"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("workspaces").select("id").eq("owner_id", user.id).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["twilio-connect-status", workspace?.id],
    queryFn: () => callTwilioApi("get_status"),
    enabled: !!workspace?.id,
    retry: false,
  });

  const { data: balance, refetch: refetchBalance } = useQuery({
    queryKey: ["twilio-connect-balance", workspace?.id],
    queryFn: () => callTwilioApi("get_account_balance"),
    enabled: !!workspace?.id && status?.connected === true,
    retry: false,
  });

  const handleConnect = () => {
    if (!workspace?.id) {
      toast.error("Workspace not found");
      return;
    }
    if (!TWILIO_CONNECT_CLIENT_ID) {
      toast.error("Twilio Connect is not configured yet. Add VITE_TWILIO_CONNECT_CLIENT_ID to your environment.");
      return;
    }
    const redirectUri = `${SUPABASE_URL}/functions/v1/twilio-oauth-callback`;
    const oauthUrl = new URL("https://login.twilio.com/oauth2/authorize");
    oauthUrl.searchParams.set("response_type", "code");
    oauthUrl.searchParams.set("client_id", TWILIO_CONNECT_CLIENT_ID);
    oauthUrl.searchParams.set("redirect_uri", redirectUri);
    oauthUrl.searchParams.set("scope", "openid profile email");
    oauthUrl.searchParams.set("state", workspace.id);

    // Open as a small popup so the user stays in Thermi
    const width = 520;
    const height = 640;
    const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
    const popup = window.open(
      oauthUrl.toString(),
      "twilio_oauth",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      // Popup blocked — fall back to redirect
      window.location.href = oauthUrl.toString();
      return;
    }

    // Listen for the callback to post a message back to this window
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "twilio_oauth_success") {
        popup.close();
        window.removeEventListener("message", onMessage);
        toast.success("Twilio connected successfully!");
        qc.invalidateQueries({ queryKey: ["twilio-connect-status"] });
        qc.invalidateQueries({ queryKey: ["setup-status"] });
      } else if (event.data?.type === "twilio_oauth_error") {
        popup.close();
        window.removeEventListener("message", onMessage);
        toast.error(`Connection failed: ${event.data.error}`);
      }
    };
    window.addEventListener("message", onMessage);

    // Poll for popup closure as a fallback (user closed manually)
    const pollClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollClosed);
        window.removeEventListener("message", onMessage);
        // Re-check status in case it succeeded before close
        qc.invalidateQueries({ queryKey: ["twilio-connect-status"] });
      }
    }, 500);
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Twilio? Your AI agent will stop answering calls.")) return;
    try {
      await callTwilioApi("disconnect");
      toast.success("Twilio disconnected");
      qc.invalidateQueries({ queryKey: ["twilio-connect-status"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (statusLoading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Checking Twilio connection...
      </div>
    );
  }

  if (!status?.connected) {
    return <ConnectBanner onConnect={handleConnect} />;
  }

  const sections = [
    { id: "numbers", label: "Numbers", icon: Phone },
    { id: "routing", label: "Routing & Forwarding", icon: PhoneForwarded },
    { id: "logs", label: "Call History", icon: Clock },
  ] as const;

  return (
    <div className="space-y-5">
      <StatusBar
        accountName={status.account_name}
        accountStatus={status.account_status}
        connectedAt={status.connected_at}
        balance={balance ?? null}
        onDisconnect={handleDisconnect}
        onRefreshBalance={() => refetchBalance()}
      />

      {/* Section tabs */}
      <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
        {sections.map(s => {
          const Icon = s.icon;
          const active = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                active
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Section content */}
      {workspace?.id && (
        <>
          {activeSection === "numbers" && <NumbersPanel workspaceId={workspace.id} />}
          {activeSection === "routing" && <RoutingPanel workspaceId={workspace.id} />}
          {activeSection === "logs" && <CallLogsPanel workspaceId={workspace.id} />}
        </>
      )}
    </div>
  );
}
