import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bot, Phone, MessageSquare, Star, BookOpen, Copy, Workflow, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { IntegrationConfig, AgentType } from "@/types/agent-integrations";
import { DataAccessConfig, BehaviorConfig, ToolConfig } from "@/types/agent-configuration";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  voice?: string;
  greeting: string;
  instructions: string;
  category: string;
  is_featured: boolean;
  is_system?: boolean; // System templates vs admin-published
  integrations?: IntegrationConfig[];
  usage_count: number;
  // Enhanced configuration
  data_access?: DataAccessConfig;
  behavior?: BehaviorConfig;
  tools?: ToolConfig[];
  use_memory?: boolean;
  memory_retention_days?: number;
  use_cases?: string[];
}

export function AgentTemplates({ workspaceId }: { workspaceId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [knowledgeBaseId, setKnowledgeBaseId] = useState("");
  const [integrationConfigs, setIntegrationConfigs] = useState<Record<string, Record<string, string>>>({});

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
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
        // Only show templates explicitly marked as featured/published.
        // Internal test entries default to is_featured=false and stay hidden.
        return (rawValue as unknown as AgentTemplate[]).filter(
          (t) => t?.is_featured === true
        );
      }
      return [];
    }
  });

  // Fetch knowledge bases
  const { data: knowledgeBases } = useQuery({
    queryKey: ['knowledge-bases', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_bases')
        .select('id, name')
        .eq('workspace_id', workspaceId)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const copyTemplate = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) return;

      // Validate integration configs if needed
      if (selectedTemplate.integrations && selectedTemplate.integrations.length > 0) {
        for (const integration of selectedTemplate.integrations) {
          const configForIntegration = integrationConfigs[integration.id];
          if (!configForIntegration) {
            throw new Error(`Missing configuration for ${integration.name}`);
          }
          
          // Validate required fields
          const missingFields = integration.fields
            .filter(field => field.required)
            .filter(field => !configForIntegration[field.name]);
          
          if (missingFields.length > 0) {
            throw new Error(
              `Missing required fields for ${integration.name}: ${missingFields.map(f => f.label).join(", ")}`
            );
          }
        }
      }

      // Build comprehensive payload including all enhanced config fields
      const payload: Record<string, any> = {
        name: agentName,
        type: selectedTemplate.type,
        voice: selectedTemplate.voice,
        greeting: selectedTemplate.greeting,
        instructions: selectedTemplate.instructions,
        description: selectedTemplate.description,
        knowledge_base_id: knowledgeBaseId || null,
        workspace_id: workspaceId,
        status: 'active',
        template_id: selectedTemplate.id,
        integration_configs: integrationConfigs,
      };
      
      // Copy enhanced configuration fields if they exist
      if (selectedTemplate.data_access) {
        payload.data_access = selectedTemplate.data_access;
      }
      if (selectedTemplate.behavior) {
        payload.behavior = selectedTemplate.behavior;
      }
      if (selectedTemplate.tools) {
        payload.tools = selectedTemplate.tools;
      }
      if (selectedTemplate.use_memory !== undefined) {
        payload.use_memory = selectedTemplate.use_memory;
      }
      if (selectedTemplate.memory_retention_days !== undefined) {
        payload.memory_retention_days = selectedTemplate.memory_retention_days;
      }

      const { error } = await supabase
        .from('ai_agents')
        .insert(payload as any);

      if (error) throw error;

      // Update usage count
      const updatedTemplates = templates?.map(t =>
        t.id === selectedTemplate.id
          ? { ...t, usage_count: t.usage_count + 1 }
          : t
      );

      await supabase
        .from('platform_config')
        .update({ value: updatedTemplates as any })
        .eq('key', 'agent_templates');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent-templates'] });
      toast({ title: "Agent created from template successfully" });
      setCopyDialogOpen(false);
      setSelectedTemplate(null);
      setAgentName("");
      setKnowledgeBaseId("");
      setIntegrationConfigs({});
    },
    onError: (error: any) => {
      toast({
        title: "Error creating agent",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleCopyTemplate = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setAgentName(template.name);
    setCopyDialogOpen(true);
    
    // Initialize integration configs
    if (template.integrations && template.integrations.length > 0) {
      const initialConfigs: Record<string, Record<string, string>> = {};
      template.integrations.forEach(integration => {
        initialConfigs[integration.id] = {};
        integration.fields.forEach(field => {
          initialConfigs[integration.id][field.name] = "";
        });
      });
      setIntegrationConfigs(initialConfigs);
    }
  };
  
  const updateIntegrationField = (integrationId: string, fieldName: string, value: string) => {
    setIntegrationConfigs(prev => ({
      ...prev,
      [integrationId]: {
        ...(prev[integrationId] || {}),
        [fieldName]: value
      }
    }));
  };

  const getAgentIcon = (type: AgentType) => {
    if (type === "voice") return Phone;
    if (type === "conversation") return MessageSquare;
    return Workflow;
  };

  // Only show published (is_featured) templates in the All tab.
  // This prevents internal test/draft entries from being visible to users.
  const publishedTemplates = templates?.filter(t => t.is_featured) || [];
  const featuredTemplates = publishedTemplates;

  const renderTemplateCard = (template: AgentTemplate) => {
    const Icon = getAgentIcon(template.type);
    const isVoice = template.type === "voice";
    return (
      <TooltipProvider key={template.id}>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Card className={`group cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${template.is_featured ? "border-primary/40 bg-gradient-to-br from-primary/5 to-transparent" : "hover:border-primary/30"}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isVoice ? "bg-violet-500/10 text-violet-500" : "bg-blue-500/10 text-blue-500"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-semibold text-sm leading-tight">{template.name}</h3>
                      {template.is_featured && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground capitalize mt-0.5">{template.category.replace(/_/g, " ")}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{template.description}</p>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 capitalize">
                      {template.type === "workflow" ? "Workflow" : template.type}
                    </Badge>
                    {template.integrations && template.integrations.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {template.integrations.length} integration{template.integrations.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                    {template.usage_count > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-emerald-600 border-emerald-200">
                        {template.usage_count} {template.usage_count === 1 ? "user" : "users"}
                      </Badge>
                    )}
                  </div>
                  <Button size="sm" className="h-7 text-xs flex-shrink-0" onClick={() => handleCopyTemplate(template)}>
                    <Copy className="h-3 w-3 mr-1" />Deploy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-sm font-medium mb-1">{template.name}</p>
            <p className="text-xs text-muted-foreground">{template.description}</p>
            {template.use_cases && template.use_cases.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium mb-1">Use cases:</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {template.use_cases.slice(0, 3).map((uc: string, i: number) => (
                    <li key={i}>• {uc}</li>
                  ))}
                </ul>
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Agent Templates</h2>
        <p className="text-muted-foreground">Browse and use pre-built AI agent templates to get started quickly</p>
      </div>

      <Sheet open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Use Agent Template: {selectedTemplate?.name}</SheetTitle>
            <SheetDescription>
              Configure your new agent from this template
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Agent Name *</Label>
              <Input
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Give your agent a name..."
              />
            </div>

            <div className="space-y-2">
              <Label>Knowledge Base (Optional)</Label>
              <Select
                value={knowledgeBaseId}
                onValueChange={setKnowledgeBaseId}
              >
                <SelectTrigger>
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

            {selectedTemplate?.integrations && selectedTemplate.integrations.length > 0 && (
              <div className="space-y-4">
                {selectedTemplate.integrations.filter(i => !i.platform_provided).length > 0 && (
                  <>
                    <Alert>
                      <AlertDescription>
                        This agent requires {selectedTemplate.integrations.filter(i => !i.platform_provided).length} integration configuration{selectedTemplate.integrations.filter(i => !i.platform_provided).length > 1 ? 's' : ''}
                      </AlertDescription>
                    </Alert>
                    
                    {selectedTemplate.integrations.filter(i => !i.platform_provided).map((integration, idx) => (
                      <div key={integration.id} className="space-y-3">
                        {idx > 0 && <Separator />}
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{integration.name}</Badge>
                          <span className="text-sm text-muted-foreground">{integration.type}</span>
                        </div>
                        
                        {integration.fields.map((field) => (
                          <div key={field.name} className="space-y-2">
                            <Label className="flex items-center gap-1">
                              {field.label}
                              {field.required && (
                                <span className="text-destructive font-bold">*</span>
                              )}
                            </Label>
                            {field.type === 'select' && field.options ? (
                              <Select
                                value={integrationConfigs[integration.id]?.[field.name] || ""}
                                onValueChange={(value) => 
                                  updateIntegrationField(integration.id, field.name, value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}...`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {field.options.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                type={field.type === 'password' ? 'password' : field.type === 'url' ? 'url' : 'text'}
                                value={integrationConfigs[integration.id]?.[field.name] || ""}
                                onChange={(e) => 
                                  updateIntegrationField(integration.id, field.name, e.target.value)
                                }
                                placeholder={field.placeholder}
                                required={field.required}
                              />
                            )}
                            {field.description && (
                              <p className="text-xs text-muted-foreground">{field.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </>
                )}
                
                {selectedTemplate.integrations.filter(i => i.platform_provided).length > 0 && (
                  <Alert>
                    <AlertDescription className="text-sm">
                      ✓ This agent uses platform-provided API keys for: {selectedTemplate.integrations.filter(i => i.platform_provided).map(i => i.name).join(", ")}. You'll be charged based on usage.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <SheetFooter className="gap-2 pt-4 sm:gap-2">
              <Button
                onClick={() => copyTemplate.mutate()}
                disabled={!agentName || copyTemplate.isPending}
                className="flex-1"
              >
                <Copy className="h-4 w-4 mr-2" />
                Create Agent
              </Button>
              <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
                Cancel
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>

      {isLoading ? (
        <div className="text-muted-foreground">Loading templates...</div>
      ) : !templates || templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No agent templates available yet</p>
            <p className="text-xs text-muted-foreground mt-1">Templates will appear here once published</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={featuredTemplates.length > 0 ? "featured" : "all"} className="w-full">
          <TabsList>
            <TabsTrigger value="all">All ({publishedTemplates.length})</TabsTrigger>
            {featuredTemplates.length > 0 && (
              <TabsTrigger value="featured">
                <Star className="h-3 w-3 mr-1 text-yellow-500 fill-yellow-500" />
                Featured ({featuredTemplates.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {publishedTemplates.length === 0 ? (
              <Card className="p-8 text-center">
                <CardContent>
                  <p className="text-muted-foreground">No templates available yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Templates will appear here once published.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {publishedTemplates.map((template) => renderTemplateCard(template))}
              </div>
            )}
          </TabsContent>

          {featuredTemplates.length > 0 && (
            <TabsContent value="featured" className="mt-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Recommended templates to help you get started
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {featuredTemplates.map((template) => renderTemplateCard(template))}
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
