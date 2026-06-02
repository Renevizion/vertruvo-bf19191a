import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';

import { Phone, X, PhoneCall, PhoneOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useErrorToast } from "@/hooks/useErrorToast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useSubscriptionTier, canAccessFeature } from "@/hooks/useSubscriptionTier";

export const CallWidget = () => {
  const { toast } = useToast();
  const { showError } = useErrorToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [calling, setCalling] = useState(false);
  
  const { data: subscriptionInfo } = useSubscriptionTier();
  const canAccessCalling = subscriptionInfo ? canAccessFeature(subscriptionInfo.tier, 'twilio_phone_numbers') : false;

  const { data: twilioNumbers } = useQuery({
    queryKey: ['twilio-numbers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('twilio_phone_numbers')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: contacts } = useQuery({
    queryKey: ['contacts-for-calling'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, phone')
        .not('phone', 'is', null);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: templates } = useQuery({
    queryKey: ['call-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_templates')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const { data: agents } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('id, name, type, status')
        .in('status', ['active', 'draft'])
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: workspaces } = useQuery({
    queryKey: ['user-workspaces', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', session!.user.id)
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: recentCalls } = useQuery({
    queryKey: ['recent-calls', workspaces?.workspace_id],
    enabled: !!workspaces?.workspace_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_logs')
        .select(`
          id,
          phone_number,
          status,
          created_at,
          duration,
          call_sid,
          contacts(name),
          leads(name),
          ai_agents(name)
        `)
        .eq('workspace_id', workspaces!.workspace_id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 3000, // Poll every 3 seconds for active calls
  });

  // Real-time subscription for call updates
  useEffect(() => {
    if (!workspaces?.workspace_id) return;

    const channel = supabase
      .channel('call-logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_logs',
          filter: `workspace_id=eq.${workspaces.workspace_id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['recent-calls'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaces?.workspace_id, queryClient]);

  const hasActiveTwilioNumber = twilioNumbers && twilioNumbers.length > 0;

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string, icon: any }> = {
      'queued': { variant: 'secondary', label: 'Queued', icon: PhoneCall },
      'ringing': { variant: 'default', label: 'Ringing', icon: PhoneCall },
      'in-progress': { variant: 'default', label: 'In Progress', icon: PhoneCall },
      'completed': { variant: 'outline', label: 'Completed', icon: Phone },
      'busy': { variant: 'destructive', label: 'Busy', icon: PhoneOff },
      'failed': { variant: 'destructive', label: 'Failed', icon: PhoneOff },
      'no-answer': { variant: 'destructive', label: 'No Answer', icon: PhoneOff },
      'canceled': { variant: 'secondary', label: 'Canceled', icon: PhoneOff },
    };
    
    const config = statusConfig[status] || { variant: 'outline' as const, label: status, icon: Phone };
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleCall = async () => {
    const finalPhoneNumber = phoneNumber || contacts?.find(c => c.id === selectedContactId)?.phone;
    
    if (!finalPhoneNumber) {
      toast({
        title: "Phone number required",
        description: "Please enter a phone number or select a contact",
        variant: "destructive",
      });
      return;
    }

    if (!hasActiveTwilioNumber) {
      toast({
        title: "No phone number configured",
        description: "Please purchase and configure a Twilio phone number in Settings",
        variant: "destructive",
      });
      return;
    }

    if (!workspaces?.workspace_id) {
      toast({
        title: "Workspace not found",
        description: "Could not determine workspace",
        variant: "destructive",
      });
      return;
    }

    setCalling(true);
    
    let data: { success?: boolean; error?: string; callSid?: string } | null = null;
    let invokeError: Error | null = null;
    
    try {
      const result = await supabase.functions.invoke('twilio-make-call', {
        body: {
          phoneNumber: finalPhoneNumber,
          contactId: selectedContactId || null,
          templateId: selectedTemplate || null,
          agentId: selectedAgent || null,
          workspaceId: workspaces.workspace_id,
        },
      });
      data = result.data;
      invokeError = result.error;
    } catch (e) {
      invokeError = e as Error;
    }

    // Handle any errors - throw to trigger error modal
    if (invokeError || data?.success === false || data?.error) {
      const errorMessage = data?.error || invokeError?.message || "Could not initiate call";
      setCalling(false);
      throw new Error(errorMessage);
    }

    toast({
      title: "Call initiated",
      description: `Calling ${finalPhoneNumber}...`,
    });
    
    setPhoneNumber("");
    setSelectedContactId("");
    setSelectedTemplate("");
    setSelectedAgent("");
    
    // Invalidate queries to refresh call list
    queryClient.invalidateQueries({ queryKey: ['recent-calls'] });
    setCalling(false);
  };

  const handleEndCall = async (callSid: string) => {
    try {
      const { error } = await supabase.functions.invoke('twilio-end-call', {
        body: { callSid },
      });

      if (error) throw error;

      toast({
        title: "Call ended",
        description: "Call terminated successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['recent-calls'] });
    } catch (error) {
      console.error('Error ending call:', error);
      toast({
        title: "Error",
        description: "Failed to end call",
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Phone className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex h-full w-full flex-col overflow-hidden p-0 sm:max-w-xl">
        <div className="surface-mesh border-b px-6 py-5">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-display text-2xl">
              <Phone className="h-5 w-5" />
              Voice workspace
            </SheetTitle>
            <p className="text-sm text-muted-foreground">Recent call state, access status, and outbound calling in one place.</p>
          </SheetHeader>
        </div>

        <ScrollArea className="min-h-0 flex-1 px-6 py-5">
          
          {/* Call Monitoring Section */}
          {recentCalls && recentCalls.length > 0 && (
            <div className="mb-6 space-y-3">
              <h3 className="text-sm font-medium">Recent & Active Calls</h3>
              <div className="space-y-2">
                {recentCalls.map((call) => (
                   <div
                     key={call.id}
                     className="flex items-center justify-between p-3 rounded-lg border bg-card"
                   >
                     <div className="flex-1 min-w-0">
                       <p className="text-sm font-medium truncate">
                         {call.contacts?.name || call.leads?.name || call.phone_number}
                       </p>
                       <div className="flex items-center gap-2 mt-1">
                         <p className="text-xs text-muted-foreground">
                           {call.phone_number}
                         </p>
                         {call.ai_agents?.name && (
                           <>
                             <span className="text-xs text-muted-foreground">•</span>
                             <p className="text-xs text-muted-foreground">
                               {call.ai_agents.name}
                             </p>
                           </>
                         )}
                       </div>
                       <p className="text-xs text-muted-foreground mt-1">
                         {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                         {call.duration && ` • ${call.duration}s`}
                       </p>
                     </div>
                     <div className="ml-4 flex items-center gap-2">
                       {(call.status === 'in-progress' || call.status === 'ringing' || call.status === 'queued') && call.call_sid && (
                         <Button
                           size="sm"
                           variant="destructive"
                           onClick={() => handleEndCall(call.call_sid!)}
                         >
                           <PhoneOff className="h-3 w-3" />
                         </Button>
                       )}
                       {getStatusBadge(call.status)}
                     </div>
                   </div>
                ))}
              </div>
              <div className="border-t pt-4" />
            </div>
          )}
        
        {hasActiveTwilioNumber && canAccessCalling ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agent" className="text-xs font-medium">AI Agent (Optional)</Label>
                <Select
                  value={selectedAgent}
                  onValueChange={setSelectedAgent}
                  disabled={calling}
                >
                  <SelectTrigger id="agent" className="h-9">
                    <SelectValue placeholder="Choose agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agents?.filter(a => a.type === 'voice').map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Voice agent will handle the conversation
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="template" className="text-xs font-medium">Call Script (Optional)</Label>
                <Select
                  value={selectedTemplate}
                  onValueChange={setSelectedTemplate}
                  disabled={calling}
                >
                  <SelectTrigger id="template" className="h-9">
                    <SelectValue placeholder="Choose script..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact" className="text-xs font-medium">Select Contact</Label>
              <Select 
                value={selectedContactId} 
                onValueChange={(value) => {
                  setSelectedContactId(value);
                  setPhoneNumber("");
                }}
                disabled={calling}
              >
                <SelectTrigger id="contact">
                  <SelectValue placeholder="Choose from contacts..." />
                </SelectTrigger>
                <SelectContent>
                  {contacts?.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name} • {contact.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-medium">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setSelectedContactId("");
                }}
                disabled={calling || !!selectedContactId}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleCall} 
                disabled={calling || (!phoneNumber && !selectedContactId) || !canAccessCalling}
                className="flex-1"
                size="lg"
              >
                <Phone className="h-4 w-4 mr-2" />
                {calling ? "Calling..." : canAccessCalling ? "Start Call" : "Enterprise Only"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-6">
            <div className="rounded-xl border bg-muted/20 p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Calling is not ready yet</p>
                  <p className="text-sm text-muted-foreground">
                    {!canAccessCalling
                      ? "Voice calling is available on eligible plans only."
                      : "Add an active phone number before placing calls."}
                  </p>
                </div>
              </div>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between rounded-lg border bg-background/70 px-3 py-2">
                  <span className="text-muted-foreground">Plan access</span>
                  <Badge variant={canAccessCalling ? "default" : "outline"}>{canAccessCalling ? "Enabled" : "Locked"}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-background/70 px-3 py-2">
                  <span className="text-muted-foreground">Phone number</span>
                  <Badge variant={hasActiveTwilioNumber ? "default" : "outline"}>{hasActiveTwilioNumber ? "Configured" : "Missing"}</Badge>
                </div>
              </div>
            </div>
            <Button asChild className="w-full">
              <Link to="/settings">Configure Phone Number</Link>
            </Button>
          </div>
        )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};