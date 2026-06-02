import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Phone, Trash2, Check, ShoppingCart, Lock, PhoneIncoming, Zap, AlertCircle, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { TwilioNumberPurchase } from "./TwilioNumberPurchase";
import { useSubscriptionTier, canAccessFeature } from "@/hooks/useSubscriptionTier";
import { SandboxQuotaBanner } from "@/components/voice/SandboxQuotaBanner";

export function TwilioSettings() {
  const { data: subscriptionInfo } = useSubscriptionTier();
  const canAccessTwilio = subscriptionInfo ? canAccessFeature(subscriptionInfo.tier, 'twilio_phone_numbers') : false;
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [friendlyName, setFriendlyName] = useState("");
  const [configuringId, setConfiguringId] = useState<string | null>(null);

  const { data: phoneNumbers, isLoading, refetch } = useQuery({
    queryKey: ['twilio-phone-numbers'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('twilio_phone_numbers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch active voice agents for the inbound agent selector
  const { data: voiceAgents } = useQuery({
    queryKey: ['voice-agents-for-inbound'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('id, name, status, inbound_enabled, elevenlabs_agent_id')
        .eq('type', 'voice')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const activeInboundAgent = voiceAgents?.find(a => a.inbound_enabled);

  const setInboundAgent = useMutation({
    mutationFn: async (agentId: string | null) => {
      // Clear all inbound flags first
      await supabase
        .from('ai_agents')
        .update({ inbound_enabled: false })
        .eq('type', 'voice');
      // Set the selected agent
      if (agentId) {
        const { error } = await supabase
          .from('ai_agents')
          .update({ inbound_enabled: true, status: 'active' })
          .eq('id', agentId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-agents-for-inbound'] });
      toast.success("Inbound call agent updated");
    },
    onError: (e: any) => toast.error(e.message)
  });

  const configureWebhook = async (numberId: string) => {
    setConfiguringId(numberId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await supabase.functions.invoke('configure-inbound-webhook', {
        body: { phone_number_id: numberId },
      });
      if (resp.error) throw new Error(resp.error.message);
      toast.success("Inbound call webhook configured. Your number is now ready to receive calls.");
      refetch();
    } catch (e: any) {
      toast.error("Failed to configure webhook: " + e.message);
    } finally {
      setConfiguringId(null);
    }
  };

  const handleAdd = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      if (workspaceError) throw workspaceError;
      const { error } = await supabase
        .from('twilio_phone_numbers')
        .insert({
          phone_number: phoneNumber,
          friendly_name: friendlyName,
          workspace_id: workspaceData.workspace_id,
          is_active: phoneNumbers?.length === 0
        });
      if (error) throw error;
      toast.success("Phone number added successfully");
      setDialogOpen(false);
      setPhoneNumber("");
      setFriendlyName("");
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      await supabase.from('twilio_phone_numbers').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
      const { error } = await supabase.from('twilio_phone_numbers').update({ is_active: true }).eq('id', id);
      if (error) throw error;
      toast.success("Active phone number updated");
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this phone number?")) return;
    try {
      const { error } = await supabase.from('twilio_phone_numbers').delete().eq('id', id);
      if (error) throw error;
      toast.success("Phone number removed");
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      {!canAccessTwilio && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            AI Voice Calling with Twilio is available on the Enterprise plan.
            Upgrade to unlock phone number management and voice AI features.
          </AlertDescription>
        </Alert>
      )}

      <SandboxQuotaBanner hideWhenInactive={false} />

      {/* Inbound Call Agent Section */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <PhoneIncoming className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold text-base">Inbound Call Agent</h3>
            <p className="text-sm text-muted-foreground">
              Choose which AI voice agent answers calls when someone calls your number.
            </p>
          </div>
        </div>

        {!voiceAgents || voiceAgents.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No voice agents found. Go to <strong>AI Agents</strong> and create a Voice AI agent first, then come back to assign it here.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            <Label>Select inbound agent</Label>
            <Select
              value={activeInboundAgent?.id ?? "none"}
              onValueChange={(val) => setInboundAgent.mutate(val === "none" ? null : val)}
              disabled={!canAccessTwilio}
            >
              <SelectTrigger>
                <SelectValue placeholder="No agent selected — calls will not be answered" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No agent (calls not answered)</SelectItem>
                {voiceAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <div className="flex items-center gap-2">
                      <span>{agent.name}</span>
                      {agent.elevenlabs_agent_id && (
                        <Badge variant="secondary" className="text-xs">ElevenLabs</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeInboundAgent && !activeInboundAgent.elevenlabs_agent_id && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{activeInboundAgent.name}</strong> has no ElevenLabs Agent ID set. Calls will be answered with a basic greeting and voicemail.
                  To enable full AI conversation, edit the agent and add your ElevenLabs Agent ID.
                </AlertDescription>
              </Alert>
            )}

            {activeInboundAgent?.elevenlabs_agent_id && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>ElevenLabs AI will handle all inbound calls for this workspace.</span>
              </div>
            )}
          </div>
        )}
      </Card>

      <Separator />

      {/* Phone Numbers Section */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Phone Numbers</h3>
          <p className="text-sm text-muted-foreground">
            Manage numbers used for outbound calls and inbound call receiving.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setPurchaseDialogOpen(true)} variant="default" disabled={!canAccessTwilio}>
            <ShoppingCart className="w-4 h-4 mr-2" />
            Purchase Number
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={!canAccessTwilio}>
                <Plus className="w-4 h-4 mr-2" />
                Add Manually
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Twilio Phone Number</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Phone Number</Label>
                  <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+1234567890" />
                </div>
                <div>
                  <Label>Friendly Name (Optional)</Label>
                  <Input value={friendlyName} onChange={(e) => setFriendlyName(e.target.value)} placeholder="Main Business Line" />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAdd} disabled={!phoneNumber}>Add Number</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading phone numbers…</p>
      ) : phoneNumbers && phoneNumbers.length === 0 ? (
        <Card className="p-12 text-center">
          <Phone className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No Phone Numbers</h3>
          <p className="text-muted-foreground mb-4">Purchase your first phone number to start making and receiving calls.</p>
          <Button onClick={() => setPurchaseDialogOpen(true)}>
            <ShoppingCart className="w-4 h-4 mr-2" />
            Purchase Number
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {phoneNumbers?.map((number) => (
            <Card key={number.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{number.phone_number}</p>
                      {number.is_active && (
                        <Badge variant="secondary">
                          <Check className="w-3 h-3 mr-1" />
                          Outbound Active
                        </Badge>
                      )}
                      {number.inbound_webhook_configured ? (
                        <Badge variant="default" className="bg-green-600">
                          <PhoneIncoming className="w-3 h-3 mr-1" />
                          Inbound Ready
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-400">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Inbound Not Set Up
                        </Badge>
                      )}
                    </div>
                    {number.friendly_name && (
                      <p className="text-sm text-muted-foreground">{number.friendly_name}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  {!number.inbound_webhook_configured && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => configureWebhook(number.id)}
                      disabled={configuringId === number.id || !canAccessTwilio}
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      {configuringId === number.id ? "Configuring…" : "Enable Inbound"}
                    </Button>
                  )}
                  {!number.is_active && (
                    <Button variant="outline" size="sm" onClick={() => handleSetActive(number.id)}>
                      Set Active
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(number.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {/* Inbound setup explainer */}
          <Alert className="mt-2">
            <PhoneIncoming className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>How inbound calls work:</strong> Click <em>Enable Inbound</em> on a number to connect it to your AI agent.
              Customers can then call that number and your AI agent will answer automatically.
              If you want to keep your existing business number, set up <strong>conditional call forwarding</strong> from your carrier to this Twilio number — your AI will only pick up calls you miss.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <TwilioNumberPurchase
        open={purchaseDialogOpen}
        onOpenChange={setPurchaseDialogOpen}
        onSuccess={refetch}
      />
    </div>
  );
}
