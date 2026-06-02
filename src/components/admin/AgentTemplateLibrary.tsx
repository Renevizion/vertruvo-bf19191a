import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Bot, Phone, MessageSquare, Star, Trash2, BookOpen, Wand2, X, Workflow, Sparkles } from "lucide-react";
import { AdminAgentCreator } from "./AdminAgentCreator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntegrationConfig, INTEGRATION_TEMPLATES, AgentType } from "@/types/agent-integrations";
import { 
  EnhancedAgentConfig, 
  DataScope, 
  BehaviorMode,
  DataAccessConfig,
  BehaviorConfig,
  ToolConfig 
} from "@/types/agent-configuration";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";

interface AgentTemplate extends Partial<EnhancedAgentConfig> {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  voice?: string;
  greeting: string;
  instructions: string;
  category: string;
  is_featured: boolean;
  integrations?: IntegrationConfig[];
  usage_count: number;
}

export function AgentTemplateLibrary() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogMode, setDialogMode] = useState<'create' | 'publish' | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  
  // Agent creation state
  const [agentData, setAgentData] = useState({
    name: "",
    type: "workflow" as AgentType,
    voice: "alloy",
    greeting: "",
    instructions: "",
    description: "",
    category: "general",
  });
  
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [selectedIntegrationType, setSelectedIntegrationType] = useState<string>("");
  
  // Enhanced configuration state
  const [dataAccess, setDataAccess] = useState<DataAccessConfig>({
    scopes: [],
    read_only: false,
    filter_by_workspace: true,
    max_records: 100
  });
  
  const [behavior, setBehavior] = useState<BehaviorConfig>({
    mode: 'assistant',
    response_style: 'friendly',
    max_response_tokens: 800,
    temperature: 0.7,
    custom_rules: []
  });
  
  const [tools, setTools] = useState<ToolConfig[]>([]);
  const [useMemory, setUseMemory] = useState(false);
  const [memoryRetentionDays, setMemoryRetentionDays] = useState(30);

  // Fetch existing agents to publish (exclude template-based agents)
  const { data: allAgents } = useQuery({
    queryKey: ['admin-agents-raw'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .is('template_id', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch published templates
  const { data: templatesConfig, isLoading } = useQuery({
    queryKey: ['agent-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_config')
        .select('value')
        .eq('key', 'agent_templates')
        .maybeSingle();
      
      if (error) throw error;
      const rawValue = data?.value;
      if (Array.isArray(rawValue)) {
        return rawValue as unknown as AgentTemplate[];
      }
      return [];
    }
  });

  // Fetch agent usage data to show which templates have been implemented
  const { data: agentUsageData } = useQuery({
    queryKey: ['agent-template-usage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('template_id')
        .not('template_id', 'is', null);
      
      if (error) throw error;
      
      // Count usage per template
      const usageMap: Record<string, number> = {};
      data.forEach(agent => {
        if (agent.template_id) {
          usageMap[agent.template_id] = (usageMap[agent.template_id] || 0) + 1;
        }
      });
      
      return usageMap;
    }
  });

  // Filter out agents whose names match existing templates
  const agents = useMemo(() => {
    if (!allAgents) return [];
    return allAgents.filter(agent => {
      const nameExists = templatesConfig?.some(
        template => template.name.toLowerCase() === agent.name.toLowerCase()
      );
      return !nameExists;
    });
  }, [allAgents, templatesConfig]);

  const addIntegration = () => {
    if (!selectedIntegrationType) return;
    
    const template = INTEGRATION_TEMPLATES[selectedIntegrationType];
    if (!template) return;
    
    const newIntegration: IntegrationConfig = {
      id: crypto.randomUUID(),
      ...template
    };
    
    setIntegrations([...integrations, newIntegration]);
    setSelectedIntegrationType("");
  };
  
  const removeIntegration = (id: string) => {
    setIntegrations(integrations.filter(i => i.id !== id));
  };

  const createAndPublishTemplate = useMutation({
    mutationFn: async () => {
      const existingTemplates = templatesConfig || [];
      
      // Check for duplicate name
      const duplicate = existingTemplates.find(t => 
        t.name.toLowerCase() === agentData.name.toLowerCase()
      );
      if (duplicate) {
        throw new Error("An agent template with this name already exists");
      }

      const newTemplate: AgentTemplate = {
        id: crypto.randomUUID(),
        name: agentData.name,
        description: agentData.description,
        type: agentData.type,
        voice: agentData.voice,
        greeting: agentData.greeting,
        instructions: agentData.instructions,
        category: agentData.category,
        is_featured: false,
        integrations: integrations.length > 0 ? integrations : undefined,
        usage_count: 0,
        data_access: dataAccess,
        behavior: behavior,
        tools: tools,
        use_memory: useMemory,
        memory_retention_days: memoryRetentionDays,
      };

      const updatedTemplates = [...existingTemplates, newTemplate];

      const { error } = await supabase
        .from('platform_config')
        .upsert({
          key: 'agent_templates',
          value: updatedTemplates as any,
          description: 'Published AI agent templates for all users'
        }, { onConflict: 'key' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-templates'] });
      toast({ title: "Agent template created and published successfully" });
      setDialogMode(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating template",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const publishExistingAgent = useMutation({
    mutationFn: async () => {
      if (!selectedAgent) return;
      
      const existingTemplates = templatesConfig || [];
      
      // Check for duplicate name
      const duplicate = existingTemplates.find(t => 
        t.name.toLowerCase() === selectedAgent.name.toLowerCase()
      );
      if (duplicate) {
        throw new Error("An agent template with this name already exists");
      }

      const newTemplate: AgentTemplate = {
        id: crypto.randomUUID(),
        name: selectedAgent.name,
        description: agentData.description,
        type: selectedAgent.type,
        voice: selectedAgent.voice,
        greeting: selectedAgent.greeting,
        instructions: selectedAgent.instructions,
        category: agentData.category,
        is_featured: false,
        integrations: integrations.length > 0 ? integrations : undefined,
        usage_count: 0,
      };

      const updatedTemplates = [...existingTemplates, newTemplate];

      const { error } = await supabase
        .from('platform_config')
        .upsert({
          key: 'agent_templates',
          value: updatedTemplates as any,
          description: 'Published AI agent templates for all users'
        }, { onConflict: 'key' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-templates'] });
      toast({ title: "Agent published as template successfully" });
      setDialogMode(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error publishing template",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setSelectedAgent(null);
    setAgentData({
      name: "",
      type: "workflow",
      voice: "alloy",
      greeting: "",
      instructions: "",
      description: "",
      category: "general",
    });
    setIntegrations([]);
    setSelectedIntegrationType("");
    setDataAccess({
      scopes: [],
      read_only: false,
      filter_by_workspace: true,
      max_records: 100
    });
    setBehavior({
      mode: 'assistant',
      response_style: 'friendly',
      max_response_tokens: 800,
      temperature: 0.7,
      custom_rules: []
    });
    setTools([]);
    setUseMemory(false);
    setMemoryRetentionDays(30);
  };

  const getAgentIcon = (type: AgentType) => {
    if (type === "voice") return Phone;
    if (type === "conversation") return MessageSquare;
    return Workflow;
  };

  const toggleFeatured = useMutation({
    mutationFn: async (templateId: string) => {
      const updatedTemplates = (templatesConfig || []).map(t =>
        t.id === templateId ? { ...t, is_featured: !t.is_featured } : t
      );

      const { error } = await supabase
        .from('platform_config')
        .update({ value: updatedTemplates as any })
        .eq('key', 'agent_templates');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-templates'] });
      toast({ title: "Template updated" });
    }
  });

  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const updatedTemplates = (templatesConfig || []).filter(t => t.id !== templateId);

      const { error } = await supabase
        .from('platform_config')
        .update({ value: updatedTemplates as any })
        .eq('key', 'agent_templates');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-templates'] });
      toast({ title: "Template deleted" });
    }
  });

  const handleAIGenerated = (config: any) => {
    // Set basic agent data
    setAgentData({
      name: config.name || "",
      type: config.type || "workflow",
      voice: config.voice || "alloy",
      greeting: config.greeting || "",
      instructions: config.instructions || "",
      description: config.description || "",
      category: config.category || "general",
    });
    
    // Set enhanced data access configuration
    if (config.data_access) {
      setDataAccess({
        scopes: config.data_access.scopes || [],
        read_only: config.data_access.read_only ?? false,
        filter_by_workspace: true,
        max_records: config.data_access.max_records || 100
      });
    }
    
    // Set behavior configuration
    if (config.behavior) {
      setBehavior({
        mode: config.behavior.mode || 'assistant',
        personality: config.behavior.personality,
        response_style: config.behavior.response_style || 'friendly',
        temperature: config.behavior.temperature || 0.7,
        max_response_tokens: config.behavior.max_response_tokens || 500,
        custom_rules: config.behavior.custom_rules || []
      });
    }
    
    // Set tools configuration
    if (config.tools?.length) {
      setTools(config.tools.map((t: any) => ({
        name: t.name,
        description: t.description,
        enabled: t.enabled ?? true
      })));
    }
    
    // Set memory settings
    setUseMemory(config.use_memory ?? false);
    setMemoryRetentionDays(config.memory_retention_days || 30);
    
    // Add suggested integrations
    if (config.suggestedIntegrations?.length) {
      const newIntegrations: IntegrationConfig[] = config.suggestedIntegrations
        .filter((type: string) => INTEGRATION_TEMPLATES[type])
        .map((type: string) => ({
          id: crypto.randomUUID(),
          ...INTEGRATION_TEMPLATES[type]
        }));
      setIntegrations(newIntegrations);
    }
    
    setDialogMode('create');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">AI Agent Template Library</h2>
          <p className="text-muted-foreground">Create and manage AI agent templates for all users</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setDialogMode('create')}>
            <Wand2 className="h-4 w-4 mr-2" />
            Create New Agent
          </Button>
          <Button variant="outline" onClick={() => setDialogMode('publish')}>
            <Plus className="h-4 w-4 mr-2" />
            Publish Existing
          </Button>
        </div>
      </div>

      {/* AI Agent Creator - Admin Only */}
      <AdminAgentCreator onAgentGenerated={handleAIGenerated} />

      <Dialog open={dialogMode === 'create'} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create AI Agent Template</DialogTitle>
            <DialogDescription>
              Build a new agent template from scratch with optional integrations
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="data">Data Access</TabsTrigger>
              <TabsTrigger value="behavior">Behavior</TabsTrigger>
              <TabsTrigger value="tools">Tools & Memory</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Agent Name *</Label>
                  <Input
                    value={agentData.name}
                    onChange={(e) => setAgentData({ ...agentData, name: e.target.value })}
                    placeholder="e.g., Lead Qualifier Assistant"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={agentData.category}
                    onValueChange={(value) => setAgentData({ ...agentData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Purpose</SelectItem>
                      <SelectItem value="sales">Sales & Marketing</SelectItem>
                      <SelectItem value="support">Customer Support</SelectItem>
                      <SelectItem value="lead_management">Lead Management</SelectItem>
                      <SelectItem value="automation">Automation & Workflow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Agent Type *</Label>
                  <Select
                    value={agentData.type}
                    onValueChange={(value: AgentType) => 
                      setAgentData({ ...agentData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="workflow">
                        <div className="flex items-center gap-2">
                          <Workflow className="h-3 w-3" />
                          Workflow/Integration Agent
                        </div>
                      </SelectItem>
                      <SelectItem value="conversation">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-3 w-3" />
                          Conversation AI
                        </div>
                      </SelectItem>
                      <SelectItem value="voice">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          Voice AI
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Workflow agents are flexible and can integrate with multiple systems
                  </p>
                </div>
                
                {agentData.type === "voice" && (
                  <div className="space-y-2">
                    <Label>Voice</Label>
                    <Select
                      value={agentData.voice}
                      onValueChange={(value) => setAgentData({ ...agentData, voice: value })}
                    >
                      <SelectTrigger>
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
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  value={agentData.description}
                  onChange={(e) => setAgentData({ ...agentData, description: e.target.value })}
                  placeholder="Describe what this agent does and when to use it..."
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Greeting Message</Label>
                <Textarea
                  value={agentData.greeting}
                  onChange={(e) => setAgentData({ ...agentData, greeting: e.target.value })}
                  placeholder="Initial greeting message..."
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Instructions</Label>
                <Textarea
                  value={agentData.instructions}
                  onChange={(e) => setAgentData({ ...agentData, instructions: e.target.value })}
                  placeholder="Agent instructions and personality..."
                  rows={4}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="data" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label>Data Scopes</Label>
                <p className="text-xs text-muted-foreground">Select which data this agent can access</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['workflows', 'leads', 'contacts', 'tasks', 'activities', 'forms', 'pipelines', 'opportunities', 'messages', 'emails'] as DataScope[]).map(scope => (
                    <div key={scope} className="flex items-center space-x-2">
                      <Checkbox
                        id={scope}
                        checked={dataAccess.scopes.includes(scope)}
                        onCheckedChange={(checked) => {
                          setDataAccess({
                            ...dataAccess,
                            scopes: checked 
                              ? [...dataAccess.scopes, scope]
                              : dataAccess.scopes.filter(s => s !== scope)
                          });
                        }}
                      />
                      <label htmlFor={scope} className="text-sm capitalize cursor-pointer">
                        {scope}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="read_only"
                    checked={dataAccess.read_only}
                    onCheckedChange={(checked) => setDataAccess({ ...dataAccess, read_only: !!checked })}
                  />
                  <label htmlFor="read_only" className="text-sm cursor-pointer">
                    Read-only access
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="filter_workspace"
                    checked={dataAccess.filter_by_workspace}
                    onCheckedChange={(checked) => setDataAccess({ ...dataAccess, filter_by_workspace: !!checked })}
                  />
                  <label htmlFor="filter_workspace" className="text-sm cursor-pointer">
                    Filter by workspace
                  </label>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Max Records</Label>
                <Input
                  type="number"
                  value={dataAccess.max_records}
                  onChange={(e) => setDataAccess({ ...dataAccess, max_records: parseInt(e.target.value) || 100 })}
                  placeholder="100"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="behavior" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Behavior Mode</Label>
                <Select
                  value={behavior.mode}
                  onValueChange={(value: BehaviorMode) => setBehavior({ ...behavior, mode: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assistant">Assistant - Helpful, conversational</SelectItem>
                    <SelectItem value="executor">Executor - Action-focused, minimal talk</SelectItem>
                    <SelectItem value="analyzer">Analyzer - Data analysis and insights</SelectItem>
                    <SelectItem value="validator">Validator - Checks and validates data</SelectItem>
                    <SelectItem value="custom">Custom - User-defined behavior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Response Style</Label>
                <Select
                  value={behavior.response_style}
                  onValueChange={(value: any) => setBehavior({ ...behavior, response_style: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concise">Concise</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Personality</Label>
                <Textarea
                  value={behavior.personality || ""}
                  onChange={(e) => setBehavior({ ...behavior, personality: e.target.value })}
                  placeholder="Describe the agent's personality..."
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Temperature: {behavior.temperature}</Label>
                <Slider
                  value={[behavior.temperature || 0.7]}
                  onValueChange={([value]) => setBehavior({ ...behavior, temperature: value })}
                  min={0}
                  max={1}
                  step={0.1}
                />
                <p className="text-xs text-muted-foreground">Higher = more creative, Lower = more focused</p>
              </div>
              
              <div className="space-y-2">
                <Label>Max Response Tokens</Label>
                <Input
                  type="number"
                  value={behavior.max_response_tokens}
                  onChange={(e) => setBehavior({ ...behavior, max_response_tokens: parseInt(e.target.value) || 800 })}
                  placeholder="800"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="tools" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label>Available Tools</Label>
                <p className="text-xs text-muted-foreground">Select which tools this agent can use</p>
                <div className="space-y-2">
                  {[
                    { name: 'search_knowledge', description: 'Search knowledge base' },
                    { name: 'query_database', description: 'Run data queries' },
                    { name: 'send_email', description: 'Send automated emails' },
                    { name: 'create_task', description: 'Create follow-up tasks' },
                    { name: 'update_lead', description: 'Update lead information' },
                    { name: 'score_lead', description: 'Calculate lead scores' },
                    { name: 'execute_workflow', description: 'Run workflow steps' },
                  ].map(tool => (
                    <div key={tool.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{tool.name.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground">{tool.description}</p>
                      </div>
                      <Checkbox
                        checked={tools.some(t => t.name === tool.name)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setTools([...tools, { ...tool, enabled: true }]);
                          } else {
                            setTools(tools.filter(t => t.name !== tool.name));
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Agent Memory</Label>
                    <p className="text-xs text-muted-foreground">Store context across interactions</p>
                  </div>
                  <Switch
                    checked={useMemory}
                    onCheckedChange={setUseMemory}
                  />
                </div>
                
                {useMemory && (
                  <div className="space-y-2">
                    <Label>Memory Retention (days)</Label>
                    <Input
                      type="number"
                      value={memoryRetentionDays}
                      onChange={(e) => setMemoryRetentionDays(parseInt(e.target.value) || 30)}
                      placeholder="30"
                    />
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="integrations" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label>Add Integration (Optional)</Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedIntegrationType}
                    onValueChange={setSelectedIntegrationType}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Choose integration type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI API</SelectItem>
                      <SelectItem value="mistral">Mistral AI</SelectItem>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="serp">Serp API (Web Search)</SelectItem>
                      <SelectItem value="google_maps">Google Maps</SelectItem>
                      <SelectItem value="mcp">MCP Server</SelectItem>
                      <SelectItem value="custom">Custom API Endpoint</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={addIntegration}
                    disabled={!selectedIntegrationType}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Users will be prompted to configure these integrations when they use this template
                </p>
              </div>
              
              {integrations.length > 0 && (
                <div className="space-y-2">
                  <Label>Configured Integrations ({integrations.length})</Label>
                  <div className="space-y-2">
                    {integrations.map((integration) => (
                      <div key={integration.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{integration.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Required fields: {integration.fields.map(f => f.label).join(", ")}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Switch
                              checked={integration.platform_provided || false}
                              onCheckedChange={(checked) => {
                                setIntegrations(integrations.map(i => 
                                  i.id === integration.id 
                                    ? { ...i, platform_provided: checked }
                                    : i
                                ));
                              }}
                            />
                            <Label className="text-xs text-muted-foreground cursor-pointer">
                              Platform-provided (use your API keys, charge users for usage)
                            </Label>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeIntegration(integration.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {integrations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No integrations configured yet</p>
                  <p className="text-sm">This agent will work standalone</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={() => createAndPublishTemplate.mutate()}
              disabled={!agentData.name || !agentData.description || createAndPublishTemplate.isPending}
              className="flex-1"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              {createAndPublishTemplate.isPending ? "Creating..." : "Create & Publish Template"}
            </Button>
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMode === 'publish'} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Publish Existing Agent</DialogTitle>
            <DialogDescription>
              Select an existing agent and configure it as a template
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Agent *</Label>
              <Select
                value={selectedAgent?.id || ""}
                onValueChange={(value) => {
                  const agent = agents?.find(a => a.id === value);
                  setSelectedAgent(agent);
                  if (agent) {
                    setAgentData({
                      ...agentData,
                      name: agent.name,
                      type: agent.type as "voice" | "conversation",
                      voice: agent.voice || "alloy",
                      greeting: agent.greeting || "",
                      instructions: agent.instructions || "",
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an agent..." />
                </SelectTrigger>
                <SelectContent>
                  {agents?.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        {agent.type === "voice" ? <Phone className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                        {agent.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={agentData.description}
                onChange={(e) => setAgentData({ ...agentData, description: e.target.value })}
                placeholder="Describe what this agent does and when to use it..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={agentData.category}
                onValueChange={(value) => setAgentData({ ...agentData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Purpose</SelectItem>
                  <SelectItem value="sales">Sales & Marketing</SelectItem>
                  <SelectItem value="support">Customer Support</SelectItem>
                  <SelectItem value="lead_management">Lead Management</SelectItem>
                  <SelectItem value="automation">Automation & Workflow</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Add Integration (Optional)</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedIntegrationType}
                  onValueChange={setSelectedIntegrationType}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose integration type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI API</SelectItem>
                    <SelectItem value="mistral">Mistral AI</SelectItem>
                    <SelectItem value="twilio">Twilio</SelectItem>
                    <SelectItem value="serp">Serp API (Web Search)</SelectItem>
                    <SelectItem value="google_maps">Google Maps</SelectItem>
                    <SelectItem value="mcp">MCP Server</SelectItem>
                    <SelectItem value="custom">Custom API Endpoint</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={addIntegration}
                  disabled={!selectedIntegrationType}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>

            {integrations.length > 0 && (
              <div className="space-y-2">
                <Label>Configured Integrations</Label>
                <div className="space-y-2">
                  {integrations.map((integration) => (
                    <div key={integration.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{integration.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {integration.fields.length} field(s) required
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeIntegration(integration.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => publishExistingAgent.mutate()}
                disabled={!selectedAgent || !agentData.description || publishExistingAgent.isPending}
                className="flex-1"
              >
                {publishExistingAgent.isPending ? "Publishing..." : "Publish Template"}
              </Button>
              <Button variant="outline" onClick={() => setDialogMode(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="text-muted-foreground">Loading templates...</div>
      ) : !templatesConfig || templatesConfig.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No agent templates published yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templatesConfig.map((template) => {
            const Icon = getAgentIcon(template.type);
            return (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {template.name}
                          {template.is_featured && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                        </CardTitle>
                        <CardDescription className="capitalize">
                          {template.category.replace(/_/g, " ")}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFeatured.mutate(template.id)}
                      >
                        <Star className={`h-4 w-4 ${template.is_featured ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTemplate.mutate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="capitalize">
                      {template.type}
                    </Badge>
                    {template.integrations && template.integrations.length > 0 && (
                      <Badge variant="secondary">
                        {template.integrations.length} Integration{template.integrations.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {agentUsageData && agentUsageData[template.id] && (
                      <Badge variant="default" className="bg-green-500">
                        {agentUsageData[template.id]} Active Implementation{agentUsageData[template.id] > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Used {template.usage_count} times
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
