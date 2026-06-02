import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Bot, Phone, MessageSquare, Trash2, Edit, BookOpen, Brain, Sparkles, Play, MessageCircle, FileText, Zap, ArrowRight } from "lucide-react";
import { AgentMemoryViewer } from "@/components/ai-agents/AgentMemoryViewer";
import { AgentMarketplace } from "@/components/ai-agents/AgentMarketplace";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { AgentMonitoringView } from "@/components/ai-agents/AgentMonitoringView";
import { AgentCreatorAssistant } from "@/components/ai-agents/AgentCreatorAssistant";
import { AgentChatInterface } from "@/components/ai-agents/AgentChatInterface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/layout/PageHeader";
import { AgentCallFlow } from "@/components/landing/AgentCallFlow";
import { AgentCard } from "@/components/ai-agents/AgentCard";

const AIAgents = () => {
  const { toast } = useToast();
  const { data: isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [agentType, setAgentType] = useState<"voice" | "conversation" | null>(null);
  const [monitoringAgentId, setMonitoringAgentId] = useState<string | null>(null);
  const [monitoringSheetOpen, setMonitoringSheetOpen] = useState(false);
  const [aiCreatorOpen, setAiCreatorOpen] = useState(false);
  const [chatAgent, setChatAgent] = useState<any>(null);
  const [chatSheetOpen, setChatSheetOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "voice",
    voice: "alloy",
    greeting: "",
    instructions: "",
    description: "",
    phone_number: "",
    knowledge_base_id: "",
    call_template_id: "",
    status: "draft" as "draft" | "active",
  });

  // Handle showCreateAgent URL parameter
  useEffect(() => {
    if (searchParams.get('showCreateAgent') === 'true') {
      setAiCreatorOpen(true);
      // Clean up URL
      searchParams.delete('showCreateAgent');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    }
  });

  const { data: workspace } = useQuery({
    queryKey: ['user-workspace', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', session!.user.id)
        .limit(1)
        .single();
      
      if (error) throw error;
      return { workspace_id: data.id };
    }
  });

  const { data: agents, isLoading } = useQuery({
    queryKey: ['ai-agents', workspace?.workspace_id],
    enabled: !!workspace?.workspace_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agents')
        .select(`
          *,
          knowledge_bases(name)
        `)
        .eq('workspace_id', workspace!.workspace_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: knowledgeBases } = useQuery({
    queryKey: ['knowledge-bases', workspace?.workspace_id],
    enabled: !!workspace?.workspace_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_bases')
        .select('id, name')
        .eq('workspace_id', workspace!.workspace_id)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch call templates for voice agents
  const { data: callTemplates } = useQuery({
    queryKey: ['call-templates', workspace?.workspace_id],
    enabled: !!workspace?.workspace_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_templates')
        .select('id, name')
        .eq('workspace_id', workspace!.workspace_id)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (agent: any) => {
      const { call_template_id, ...rest } = agent;
      const payload = {
        ...rest,
        status: agent.status || 'draft',
        workspace_id: workspace!.workspace_id,
        knowledge_base_id: agent.knowledge_base_id || null,
        phone_number: agent.phone_number || null,
        greeting: agent.greeting || null,
        instructions: agent.instructions || null,
        template_id: call_template_id || null,
      };
      
      const { error } = await supabase
        .from('ai_agents')
        .insert(payload);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      toast({ title: "Agent created successfully" });
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ 
        title: "Error creating agent", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...agent }: any) => {
      const { call_template_id, ...rest } = agent;
      const payload = {
        ...rest,
        knowledge_base_id: agent.knowledge_base_id || null,
        phone_number: agent.phone_number || null,
        greeting: agent.greeting || null,
        instructions: agent.instructions || null,
        template_id: call_template_id || null,
      };
      
      const { error } = await supabase
        .from('ai_agents')
        .update(payload)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      toast({ title: "Agent updated successfully" });
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ 
        title: "Error updating agent", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_agents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      toast({ title: "Agent deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error deleting agent", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "voice",
      voice: "alloy",
      greeting: "",
      instructions: "",
      description: "",
      phone_number: "",
      knowledge_base_id: null as any,
      call_template_id: null as any,
      status: "draft",
    });
    setEditingAgent(null);
    setAgentType(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAgent) {
      updateMutation.mutate({ id: editingAgent.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (agent: any) => {
    setEditingAgent(agent);
    setAgentType(agent.type);
    setFormData({
      name: agent.name,
      type: agent.type,
      voice: agent.voice || "alloy",
      greeting: agent.greeting || "",
      instructions: agent.instructions || "",
      description: agent.description || "",
      phone_number: agent.phone_number || "",
      knowledge_base_id: agent.knowledge_base_id || null as any,
      call_template_id: (agent as any).call_template_id || (agent as any).template_id || null as any,
      status: agent.status || "draft",
    });
    setOpen(true);
  };

  const handleCreateAgent = (type: "voice" | "conversation") => {
    setAgentType(type);
    setFormData({ ...formData, type });
    setOpen(true);
  };

  const getAgentIcon = (type: string) => {
    return type === "voice" ? Phone : MessageSquare;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "border-primary/30 bg-primary/10 text-primary";
      case "draft":
        return "border-secondary bg-secondary text-secondary-foreground";
      case "inactive":
        return "border-destructive/30 bg-destructive/10 text-destructive";
      default:
        return "border-muted bg-muted text-muted-foreground";
    }
  };

  const handleOpenMonitoring = (agentId: string) => {
    setMonitoringAgentId(agentId);
    setMonitoringSheetOpen(true);
  };

  const monitoringAgent = agents?.find(a => a.id === monitoringAgentId);
  const activeAgents = agents?.filter((agent) => agent.status === "active").length || 0;
  const voiceAgents = agents?.filter((agent) => agent.type === "voice").length || 0;
  const connectedAgents = agents?.filter((agent) => agent.knowledge_base_id || (agent as any).call_template_id || (agent as any).template_id).length || 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="Operations" title="AI Agents" description="Create intelligent agents that work with your business data." />
        <div className="text-muted-foreground">Loading agents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Operations" title="AI Agents" description="Your AI voice & chat agents — answering, qualifying, and booking 24/7." />




      <div className="flex items-center justify-between gap-3 flex-wrap pt-2">

        <div className="flex items-center gap-4 text-sm">
          <span><span className="font-semibold">{activeAgents}</span> <span className="text-muted-foreground">active</span></span>
          <span className="text-border">|</span>
          <span><span className="font-semibold">{voiceAgents}</span> <span className="text-muted-foreground">voice</span></span>
          <span className="text-border">|</span>
          <span><span className="font-semibold">{connectedAgents}</span> <span className="text-muted-foreground">connected</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setAiCreatorOpen(true)} size="sm">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />AI Creator
          </Button>
          <Button onClick={() => handleCreateAgent("voice")} variant="outline" size="sm">
            <Phone className="h-3.5 w-3.5 mr-1.5" />Voice
          </Button>
          <Button onClick={() => handleCreateAgent("conversation")} variant="outline" size="sm">
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />Chat
          </Button>
        </div>
      </div>
      <Tabs defaultValue="my-agents" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="my-agents" className="flex-1 sm:flex-none">
            <Bot className="h-3 w-3 mr-1.5" />
            My Agents
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex-1 sm:flex-none">
            <FileText className="h-3 w-3 mr-1.5" />
            Marketplace
          </TabsTrigger>
        </TabsList>
        <TabsContent value="my-agents" className="space-y-4 mt-4">

      <Sheet open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-6">
          <SheetHeader className="pb-2">
            <SheetTitle className="flex items-center gap-2 text-base">
              {agentType === "voice" ? <Phone className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
              {editingAgent ? "Edit Agent" : `Create ${agentType === "voice" ? "Voice" : "Chat"} Agent`}
            </SheetTitle>
            <SheetDescription className="text-xs">
              {agentType === "voice"
                ? "Configure voice agent for calls"
                : "Configure chat agent"}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-3 pr-1">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs">Agent Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={agentType === "voice" ? "Sales Call Agent" : "Support Chat Agent"}
                required
                className="h-8 text-sm"
              />
            </div>

            {agentType === "voice" && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="voice" className="text-xs">Voice *</Label>
                  <Select
                    value={formData.voice}
                    onValueChange={(value) => setFormData({ ...formData, voice: value })}
                  >
                    <SelectTrigger id="voice" className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alloy">Alloy</SelectItem>
                      <SelectItem value="echo">Echo</SelectItem>
                      <SelectItem value="fable">Fable</SelectItem>
                      <SelectItem value="onyx">Onyx</SelectItem>
                      <SelectItem value="nova">Nova</SelectItem>
                      <SelectItem value="shimmer">Shimmer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="call_template" className="text-xs flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Call Script Template
                  </Label>
                  <Select
                    value={formData.call_template_id || ""}
                    onValueChange={(value) => setFormData({ ...formData, call_template_id: value || null as any })}
                  >
                    <SelectTrigger id="call_template" className="h-8 text-sm">
                      <SelectValue placeholder="None - Choose a call template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {callTemplates?.map((ct) => (
                        <SelectItem key={ct.id} value={ct.id}>
                          <div className="flex items-center gap-2">
                            <FileText className="h-3 w-3" />
                            {ct.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    Script the agent follows during calls. <Link to="/call-templates" className="text-primary hover:underline">Create templates →</Link>
                  </p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="phone_number" className="text-xs">Twilio Phone Number</Label>
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="h-8 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Number for outbound calls. <Link to="/settings" className="text-primary hover:underline">Configure Twilio →</Link>
                  </p>
                </div>
              </>
            )}

            <div className="space-y-1">
              <Label htmlFor="description" className="text-xs">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description..."
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="greeting" className="text-xs">Greeting Message</Label>
              <Textarea
                id="greeting"
                value={formData.greeting}
                onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
                placeholder={agentType === "voice" ? "Hi! How can I help?" : "Hi! How can I assist you?"}
                rows={2}
                className="text-sm min-h-[50px]"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="instructions" className="text-xs">System Instructions *</Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="You are a helpful assistant..."
                rows={3}
                required
                className="text-sm min-h-[60px]"
              />
              <p className="text-[10px] text-muted-foreground">Guides agent behavior</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="knowledge_base" className="text-xs">Knowledge Base (Optional)</Label>
              <Select
                value={formData.knowledge_base_id || ""}
                onValueChange={(value) => setFormData({ ...formData, knowledge_base_id: value || null as any })}
              >
                <SelectTrigger id="knowledge_base" className="h-8 text-sm">
                  <SelectValue placeholder="None - Choose a knowledge base..." />
                </SelectTrigger>
                <SelectContent>
                  {knowledgeBases?.map((kb) => (
                    <SelectItem key={kb.id} value={kb.id}>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-3 w-3" />
                        {kb.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="status" className="text-xs">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "draft" | "active") => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status" className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft - Save for later</SelectItem>
                  <SelectItem value="active">Active - Ready to use</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2 sticky bottom-0 bg-background">
              <Button type="submit" className="flex-1 h-8 text-sm">
                {editingAgent ? "Update" : "Create"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-8 text-sm">
                Cancel
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {!agents || agents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 px-4">
            <div className="p-3 bg-primary/10 rounded-full mb-4">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Create Your First AI Agent</h3>
            <p className="text-muted-foreground text-center text-sm mb-4 max-w-md">
              AI agents can handle calls, chat with customers, and automate tasks using your business data.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg mb-4">
              <Button onClick={() => setAiCreatorOpen(true)} className="flex-col h-auto py-3">
                <Sparkles className="h-5 w-5 mb-1" />
                <span className="text-xs">AI Creator</span>
                <span className="text-[10px] text-primary-foreground/70">Recommended</span>
              </Button>
              <Button onClick={() => handleCreateAgent("voice")} variant="outline" className="flex-col h-auto py-3">
                <Phone className="h-5 w-5 mb-1" />
                <span className="text-xs">Voice Agent</span>
                <span className="text-[10px] text-muted-foreground">For phone calls</span>
              </Button>
              <Button onClick={() => handleCreateAgent("conversation")} variant="outline" className="flex-col h-auto py-3">
                <MessageSquare className="h-5 w-5 mb-1" />
                <span className="text-xs">Chat Agent</span>
                <span className="text-[10px] text-muted-foreground">For messaging</span>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Or browse the <button onClick={() => document.querySelector<HTMLButtonElement>('[value="templates"]')?.click()} className="text-primary hover:underline">Agent Marketplace</button> for pre-built options
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['ai-agents'] })}
              onOpenMonitoring={handleOpenMonitoring}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}
        </TabsContent>
        <TabsContent value="templates" className="space-y-4 mt-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-semibold">Agent Marketplace</h2>
              <p className="text-sm text-muted-foreground">Install platform-published agents as your own private, editable copy.</p>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/agent-blueprints">Manage Blueprints</Link>
              </Button>
            )}
          </div>
          {workspace?.workspace_id && (
            <AgentMarketplace workspaceId={workspace.workspace_id} />
          )}
        </TabsContent>
      </Tabs>

      {/* Agent Chat Sheet */}
      <Sheet open={chatSheetOpen} onOpenChange={setChatSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0">
          {chatAgent && (
            <AgentChatInterface
              agent={chatAgent}
              onClose={() => setChatSheetOpen(false)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Agent Monitoring Sheet */}
      <Sheet open={monitoringSheetOpen} onOpenChange={setMonitoringSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Agent Monitoring</SheetTitle>
          </SheetHeader>
          {monitoringAgent && workspace?.workspace_id && (
            <div className="mt-6">
              <AgentMonitoringView
                agentId={monitoringAgent.id}
                agentName={monitoringAgent.name}
                workspaceId={workspace.workspace_id}
                agent={monitoringAgent}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* AI Agent Creator Assistant */}
      {workspace?.workspace_id && (
        <AgentCreatorAssistant
          open={aiCreatorOpen}
          onOpenChange={setAiCreatorOpen}
          workspaceId={workspace.workspace_id}
        />
      )}
    </div>
  );
};

export default AIAgents;
