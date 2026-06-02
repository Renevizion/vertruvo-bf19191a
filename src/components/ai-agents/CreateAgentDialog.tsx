import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Info, PhoneIncoming, Sparkles, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { UpgradeDialog } from "@/components/subscription/UpgradeDialog";

// Human-readable voice descriptions so non-technical users know what they're picking
const VOICE_OPTIONS = [
  { value: 'alloy', label: 'Alloy', description: 'Neutral and clear — good all-purpose voice' },
  { value: 'nova', label: 'Nova', description: 'Warm and friendly — great for customer-facing roles' },
  { value: 'shimmer', label: 'Shimmer', description: 'Soft and professional — ideal for service businesses' },
  { value: 'echo', label: 'Echo', description: 'Confident and direct' },
  { value: 'fable', label: 'Fable', description: 'Expressive and engaging' },
  { value: 'onyx', label: 'Onyx', description: 'Deep and authoritative' },
];

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType: 'voice' | 'conversation';
  onSuccess: () => void;
}

export function CreateAgentDialog({ open, onOpenChange, defaultType, onSuccess }: CreateAgentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { canCreate, getUsage, getLimit, tier } = useUsageLimits();

  const [formData, setFormData] = useState({
    name: '',
    type: defaultType,
    greeting: '',
    instructions: '',
    voice: 'nova',
    elevenlabs_agent_id: '',
    inbound_enabled: false,
  });

  const isVoice = formData.type === 'voice';

  // ── ElevenLabs: check connection status and fetch agents ──────────────────
  const { data: elevenLabsStatus } = useQuery({
    queryKey: ["elevenlabs-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("elevenlabs-connect", {
        body: { action: "get" },
      });
      if (error) return { connected: false };
      return data as { connected: boolean };
    },
    enabled: open && isVoice,
  });

  const { data: elevenLabsAgents, isLoading: agentsLoading } = useQuery({
    queryKey: ["elevenlabs-agents"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("elevenlabs-connect", {
        body: { action: "list_agents" },
      });
      if (error || data?.error) return [] as { id: string; name: string }[];
      return (data?.agents || []) as { id: string; name: string }[];
    },
    enabled: open && isVoice && !!elevenLabsStatus?.connected,
  });

  const elevenLabsConnected = !!elevenLabsStatus?.connected;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreate('agents')) {
      setUpgradeOpen(true);
      return;
    }

    setLoading(true);

    // If setting this agent as inbound, clear any existing inbound agent first
    if (formData.inbound_enabled && isVoice) {
      await supabase
        .from('ai_agents')
        .update({ inbound_enabled: false })
        .eq('type', 'voice');
    }

    const { error } = await supabase.from('ai_agents').insert({
      name: formData.name,
      type: formData.type,
      greeting: formData.greeting || null,
      instructions: formData.instructions || null,
      voice: formData.voice,
      elevenlabs_agent_id: formData.elevenlabs_agent_id.trim() || null,
      inbound_enabled: isVoice ? formData.inbound_enabled : false,
      status: formData.inbound_enabled ? 'active' : 'draft',
    });

    if (error) {
      toast({ title: "Error", description: "Failed to create agent", variant: "destructive" });
    } else {
      toast({ title: "Agent created", description: formData.inbound_enabled ? "Agent is active and will answer inbound calls." : "Agent saved as draft. Activate it when ready." });
      onSuccess();
      onOpenChange(false);
      setFormData({ name: '', type: defaultType, greeting: '', instructions: '', voice: 'nova', elevenlabs_agent_id: '', inbound_enabled: false });
    }
    setLoading(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {isVoice ? 'Create Voice Agent' : 'Create Conversation Agent'}
            </SheetTitle>
            <SheetDescription>
              {isVoice
                ? 'This agent will answer phone calls on your behalf — outbound campaigns and inbound calls from customers.'
                : 'This agent handles chat and messaging conversations with your leads and contacts.'}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-5 py-4">

            {/* Agent Name */}
            <div className="space-y-1">
              <Label htmlFor="name">Agent name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Front Desk Assistant"
                required
              />
              <p className="text-xs text-muted-foreground">This is what you'll see in your dashboard. Customers won't see it.</p>
            </div>

            {/* Agent Type */}
            <div className="space-y-1">
              <Label htmlFor="type">Agent type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'voice' | 'conversation') => setFormData({ ...formData, type: value, inbound_enabled: false })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="voice">
                    <div className="flex flex-col">
                      <span>Voice AI</span>
                      <span className="text-xs text-muted-foreground">Answers and makes phone calls</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="conversation">
                    <div className="flex flex-col">
                      <span>Conversation AI</span>
                      <span className="text-xs text-muted-foreground">Handles chat, SMS, and messaging</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Voice selection — only for voice agents */}
            {isVoice && (
              <div className="space-y-1">
                <Label htmlFor="voice">Fallback voice</Label>
                <Select value={formData.voice} onValueChange={(value) => setFormData({ ...formData, voice: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VOICE_OPTIONS.map((v) => (
                      <SelectItem key={v.value} value={v.value}>
                        <div className="flex flex-col">
                          <span>{v.label}</span>
                          <span className="text-xs text-muted-foreground">{v.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Used when no ElevenLabs agent is selected.</p>
              </div>
            )}

            {/* Greeting */}
            <div className="space-y-1">
              <Label htmlFor="greeting">Opening line</Label>
              <Textarea
                id="greeting"
                value={formData.greeting}
                onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
                placeholder={isVoice
                  ? 'e.g. "Thanks for calling Sunrise HVAC, this is Aria. How can I help you today?"'
                  : 'e.g. "Hi! I\'m here to help. What can I do for you?"'}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">The first thing the agent says when a call or chat starts.</p>
            </div>

            {/* Instructions */}
            <div className="space-y-1">
              <Label htmlFor="instructions">Agent instructions</Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder={isVoice
                  ? 'e.g. "You are a friendly receptionist for Sunrise HVAC. Help callers book service appointments, answer questions about pricing, and collect their name and phone number. If they have an emergency, tell them to press 0 to reach a technician directly."'
                  : 'e.g. "You help leads understand our services and book a free consultation. Be friendly but concise."'}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">Tell the agent who it is, what it should do, and what to avoid. The more specific, the better.</p>
            </div>

            {/* ElevenLabs Agent — voice only */}
            {isVoice && (
              <div className="space-y-2 p-4 rounded-lg border border-dashed">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-medium">
                    ElevenLabs Agent
                    <Badge variant="secondary" className="ml-2 text-xs">Optional</Badge>
                  </Label>
                </div>

                {elevenLabsConnected ? (
                  agentsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading your ElevenLabs agents…
                    </div>
                  ) : elevenLabsAgents && elevenLabsAgents.length > 0 ? (
                    <>
                      <Select
                        value={formData.elevenlabs_agent_id || "__none__"}
                        onValueChange={(v) => setFormData({ ...formData, elevenlabs_agent_id: v === "__none__" ? "" : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an ElevenLabs agent…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            <span className="text-muted-foreground">None — use built-in voice</span>
                          </SelectItem>
                          {elevenLabsAgents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Selecting an ElevenLabs agent gives callers the most natural, human-sounding experience.
                      </p>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No agents found in your ElevenLabs account.{" "}
                      <button
                        type="button"
                        className="underline inline-flex items-center gap-1"
                        onClick={() => {
                          const w = 520, h = 640;
                          const l = window.screenX + (window.outerWidth - w) / 2;
                          const t = window.screenY + (window.outerHeight - h) / 2;
                          window.open(
                            "https://elevenlabs.io/app/conversational-ai",
                            "elevenlabs_agents",
                            `width=${w},height=${h},left=${l},top=${t},toolbar=no,menubar=no,scrollbars=yes`
                          );
                        }}
                      >
                        Create one in ElevenLabs <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  )
                ) : (
                  <>
                    <Input
                      value={formData.elevenlabs_agent_id}
                      onChange={(e) => setFormData({ ...formData, elevenlabs_agent_id: e.target.value })}
                      placeholder="e.g. agent_01jxyz..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Connect ElevenLabs in <strong>Settings → AI Configuration</strong> to pick from a dropdown instead of copy-pasting Agent IDs.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Inbound call toggle — voice only */}
            {isVoice && (
              <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted/40">
                <div className="flex items-start gap-3">
                  <PhoneIncoming className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Answer inbound calls</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      When enabled, this agent will automatically answer calls that come in to your Thermi phone number.
                      Only one agent can be the inbound handler at a time.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.inbound_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, inbound_enabled: checked })}
                />
              </div>
            )}

            {formData.inbound_enabled && !formData.elevenlabs_agent_id && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Without an ElevenLabs agent, inbound calls will be answered with a basic greeting and voicemail recording.
                  Select an ElevenLabs agent above for full AI conversation.
                </AlertDescription>
              </Alert>
            )}

            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating…' : 'Create agent'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        currentTier={tier}
        limitHit={`You've used ${getUsage('agents')} of ${getLimit('agents')} AI agents included in your plan.`}

      />
    </>
  );
}
