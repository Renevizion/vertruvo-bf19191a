import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Wand2, Loader2, Check, X, Sparkles, Database, Brain, Wrench, Plug, Settings2, Plus, Star, Hammer, ExternalLink, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgentType, INTEGRATION_TEMPLATES } from "@/types/agent-integrations";
import { useAgentTools, RecommendedTool } from "@/hooks/useAgentTools";
import { ToolBuilderDialog, NewToolConfig } from "./ToolBuilderDialog";

interface ToolConfig {
  name: string;
  description: string;
  enabled: boolean;
  reasoning?: string;
  is_recommended?: boolean;
  exists_in_system?: boolean;
}

interface DetectedDataSource {
  name: string;
  display_name: string;
  has_api: boolean;
  api_type: 'public' | 'private' | 'affiliate' | 'scrape_only' | 'none';
  integration_method: string;
  requires_credentials: boolean;
  setup_notes: string;
}

interface GeneratedAgentConfig {
  name: string;
  type: AgentType;
  description: string;
  greeting: string;
  instructions: string;
  voice?: string;
  category: string;
  suggestedIntegrations: string[];
  integration_reasoning?: Record<string, string>;
  data_access: {
    scopes: string[];
    scope_reasoning?: Record<string, string>;
    read_only: boolean;
    read_only_reasoning?: string;
    filter_by_workspace: boolean;
    max_records: number;
  };
  behavior: {
    mode: string;
    mode_reasoning?: string;
    personality: string;
    response_style: string;
    temperature: number;
    max_response_tokens: number;
    custom_rules: string[];
  };
  tools: ToolConfig[];
  recommended_tools?: RecommendedTool[];
  use_memory: boolean;
  memory_reasoning?: string;
  memory_retention_days: number;
  input_schema: {
    type: string;
    required_fields: string[];
    example: string;
  };
  output_schema: {
    type: string;
    format: string;
    example: string;
  };
  // New fields for data source detection
  detected_data_sources?: DetectedDataSource[];
  has_external_dependencies?: boolean;
}

interface AdminAgentCreatorProps {
  onAgentGenerated: (config: GeneratedAgentConfig) => void;
}

const ALL_SCOPES = ['leads', 'contacts', 'tasks', 'activities', 'forms', 'pipelines', 'opportunities', 'messages', 'emails', 'workflows'];
const BEHAVIOR_MODES = ['assistant', 'executor', 'analyzer', 'validator', 'custom'];
const RESPONSE_STYLES = ['concise', 'detailed', 'technical', 'friendly'];
const VOICE_OPTIONS = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

export function AdminAgentCreator({ onAgentGenerated }: AdminAgentCreatorProps) {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [editableConfig, setEditableConfig] = useState<GeneratedAgentConfig | null>(null);
  const { tools: systemTools, approveTool } = useAgentTools();
  const [toolBuilderOpen, setToolBuilderOpen] = useState(false);
  const [selectedToolToBuild, setSelectedToolToBuild] = useState<RecommendedTool | null>(null);

  const generateAgent = async () => {
    if (!prompt.trim()) {
      toast({ title: "Please describe the agent you want to create", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setEditableConfig(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-creator-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          prompt,
          context: "admin_template_creation",
          availableIntegrations: Object.keys(INTEGRATION_TEMPLATES)
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate agent");
      }

      const data = await response.json();
      setEditableConfig(data);
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = () => {
    if (editableConfig) {
      onAgentGenerated(editableConfig);
      setEditableConfig(null);
      setPrompt("");
      toast({ title: "Agent configuration applied! Review and publish when ready." });
    }
  };

  const handleReject = () => {
    setEditableConfig(null);
    toast({ title: "Configuration rejected. Try a different prompt." });
  };

  const handleBuildTool = (tool: RecommendedTool) => {
    setSelectedToolToBuild(tool);
    setToolBuilderOpen(true);
  };

  const handleToolCreated = (createdTool: NewToolConfig) => {
    // Move the tool from recommended to regular tools
    if (editableConfig && selectedToolToBuild) {
      const newTool: ToolConfig = {
        name: createdTool.name.toLowerCase().replace(/\s+/g, '_'),
        description: createdTool.description,
        enabled: true,
        reasoning: selectedToolToBuild.reasoning,
        is_recommended: false,
        exists_in_system: true
      };
      setEditableConfig({
        ...editableConfig,
        tools: [...editableConfig.tools, newTool],
        recommended_tools: editableConfig.recommended_tools?.filter(t => t.name !== selectedToolToBuild.name) || []
      });
    }
    setSelectedToolToBuild(null);
  };

  const handleQuickApproveTool = async (tool: RecommendedTool) => {
    try {
      await approveTool.mutateAsync(tool);
      // Move the tool from recommended to regular tools
      if (editableConfig) {
        const newTool: ToolConfig = {
          name: tool.name.toLowerCase().replace(/\s+/g, '_'),
          description: tool.description,
          enabled: true,
          reasoning: tool.reasoning,
          is_recommended: false,
          exists_in_system: true
        };
        setEditableConfig({
          ...editableConfig,
          tools: [...editableConfig.tools, newTool],
          recommended_tools: editableConfig.recommended_tools?.filter(t => t.name !== tool.name) || []
        });
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const toggleScope = (scope: string) => {
    if (!editableConfig) return;
    const scopes = editableConfig.data_access.scopes.includes(scope)
      ? editableConfig.data_access.scopes.filter(s => s !== scope)
      : [...editableConfig.data_access.scopes, scope];
    setEditableConfig({
      ...editableConfig,
      data_access: { ...editableConfig.data_access, scopes }
    });
  };

  const toggleTool = (toolName: string) => {
    if (!editableConfig) return;
    const tools = editableConfig.tools.map(t => 
      t.name === toolName ? { ...t, enabled: !t.enabled } : t
    );
    setEditableConfig({ ...editableConfig, tools });
  };

  const toggleIntegration = (integration: string) => {
    if (!editableConfig) return;
    const integrations = editableConfig.suggestedIntegrations.includes(integration)
      ? editableConfig.suggestedIntegrations.filter(i => i !== integration)
      : [...editableConfig.suggestedIntegrations, integration];
    setEditableConfig({ ...editableConfig, suggestedIntegrations: integrations });
  };

  const addExistingTool = (tool: { name: string; description: string }) => {
    if (!editableConfig) return;
    if (editableConfig.tools.some(t => t.name === tool.name)) return;
    
    setEditableConfig({
      ...editableConfig,
      tools: [...editableConfig.tools, {
        name: tool.name,
        description: tool.description,
        enabled: true,
        is_recommended: false,
        exists_in_system: true
      }]
    });
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Agent Creator
        </CardTitle>
        <CardDescription>
          Describe the agent you want to create and AI will generate a comprehensive configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Describe your agent</Label>
          <Textarea
            placeholder="e.g., A customer support voice agent that handles appointment scheduling, integrates with calendar systems, can answer FAQs about services and pricing, remembers past customer interactions, and can create follow-up tasks for the team..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>

        <Button 
          onClick={generateAgent} 
          disabled={isGenerating || !prompt.trim()}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Comprehensive Configuration...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              Generate Agent
            </>
          )}
        </Button>

        {editableConfig && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-lg">Generated Configuration</h4>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleReject}>
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button size="sm" onClick={handleApprove}>
                  <Check className="h-4 w-4 mr-1" />
                  Apply & Edit
                </Button>
              </div>
            </div>

            {/* Data Source Warnings */}
            {editableConfig.detected_data_sources && editableConfig.detected_data_sources.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-semibold">External Data Sources Detected</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  This agent requires access to external platforms. Review the setup requirements below:
                </p>
                <div className="space-y-2">
                  {editableConfig.detected_data_sources.map((source) => (
                    <div key={source.name} className="bg-background/50 rounded p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{source.display_name}</span>
                        <div className="flex gap-2">
                          {source.has_api ? (
                            <Badge variant="outline" className="text-green-600 border-green-600/30 bg-green-500/10">
                              Has API
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600 border-red-600/30 bg-red-500/10">
                              No Public API
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {source.api_type}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{source.setup_notes}</p>
                      {source.requires_credentials && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Requires credentials: {source.integration_method}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-5 h-auto">
                <TabsTrigger value="details" className="text-xs gap-1">
                  <Settings2 className="h-3 w-3" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="data" className="text-xs gap-1">
                  <Database className="h-3 w-3" />
                  Data
                </TabsTrigger>
                <TabsTrigger value="behavior" className="text-xs gap-1">
                  <Brain className="h-3 w-3" />
                  Behavior
                </TabsTrigger>
                <TabsTrigger value="tools" className="text-xs gap-1">
                  <Wrench className="h-3 w-3" />
                  Tools
                  {(editableConfig.recommended_tools?.length || 0) > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                      {editableConfig.recommended_tools?.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="integrations" className="text-xs gap-1">
                  <Plug className="h-3 w-3" />
                  Integrations
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[400px] mt-4">
                <TabsContent value="details" className="space-y-4 pr-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={editableConfig.name}
                        onChange={(e) => setEditableConfig({ ...editableConfig, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={editableConfig.type}
                        onValueChange={(value: AgentType) => setEditableConfig({ ...editableConfig, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="workflow">Workflow</SelectItem>
                          <SelectItem value="conversation">Conversation</SelectItem>
                          <SelectItem value="voice">Voice</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={editableConfig.category}
                        onValueChange={(value) => setEditableConfig({ ...editableConfig, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Purpose</SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                          <SelectItem value="lead_management">Lead Management</SelectItem>
                          <SelectItem value="automation">Automation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {editableConfig.type === 'voice' && (
                      <div className="space-y-2">
                        <Label>Voice</Label>
                        <Select
                          value={editableConfig.voice || 'alloy'}
                          onValueChange={(value) => setEditableConfig({ ...editableConfig, voice: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VOICE_OPTIONS.map(voice => (
                              <SelectItem key={voice} value={voice}>{voice}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={editableConfig.description}
                      onChange={(e) => setEditableConfig({ ...editableConfig, description: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Greeting Message</Label>
                    <Textarea
                      value={editableConfig.greeting}
                      onChange={(e) => setEditableConfig({ ...editableConfig, greeting: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Instructions</Label>
                    <Textarea
                      value={editableConfig.instructions}
                      onChange={(e) => setEditableConfig({ ...editableConfig, instructions: e.target.value })}
                      rows={4}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="data" className="space-y-4 pr-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Data Access Scopes</Label>
                    <p className="text-xs text-muted-foreground">Select which data this agent can access. Checked items have AI-generated reasoning.</p>
                    <div className="space-y-2">
                      {ALL_SCOPES.map(scope => {
                        const isSelected = editableConfig.data_access.scopes.includes(scope);
                        const reasoning = editableConfig.data_access.scope_reasoning?.[scope];
                        return (
                          <div key={scope} className={`p-2 rounded-lg border ${isSelected ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`scope-${scope}`}
                                checked={isSelected}
                                onCheckedChange={() => toggleScope(scope)}
                              />
                              <label htmlFor={`scope-${scope}`} className="text-sm font-medium capitalize cursor-pointer flex-1">
                                {scope}
                              </label>
                            </div>
                            {isSelected && reasoning && (
                              <p className="text-xs text-muted-foreground mt-1 ml-6 italic">
                                Why: {reasoning}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2 border-t">
                    <div className="flex-1">
                      <Label>Read Only Mode</Label>
                      <p className="text-xs text-muted-foreground">Agent can only read, not modify data</p>
                      {editableConfig.data_access.read_only_reasoning && (
                        <p className="text-xs text-primary/70 mt-1 italic">
                          Why: {editableConfig.data_access.read_only_reasoning}
                        </p>
                      )}
                    </div>
                    <Switch
                      checked={editableConfig.data_access.read_only}
                      onCheckedChange={(checked) => setEditableConfig({
                        ...editableConfig,
                        data_access: { ...editableConfig.data_access, read_only: checked }
                      })}
                    />
                  </div>

                  <div className="space-y-2 border-t pt-3">
                    <Label>Max Records Limit</Label>
                    <Input
                      type="number"
                      value={editableConfig.data_access.max_records}
                      onChange={(e) => setEditableConfig({
                        ...editableConfig,
                        data_access: { ...editableConfig.data_access, max_records: parseInt(e.target.value) || 100 }
                      })}
                    />
                    <p className="text-xs text-muted-foreground">Maximum records the agent can query at once</p>
                  </div>

                  <div className="space-y-3 border-t pt-3">
                    <Label>Input Schema</Label>
                    <Select
                      value={editableConfig.input_schema.type}
                      onValueChange={(value) => setEditableConfig({
                        ...editableConfig,
                        input_schema: { ...editableConfig.input_schema, type: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="form_data">Form Data</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Example input..."
                      value={editableConfig.input_schema.example}
                      onChange={(e) => setEditableConfig({
                        ...editableConfig,
                        input_schema: { ...editableConfig.input_schema, example: e.target.value }
                      })}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-3 border-t pt-3">
                    <Label>Output Schema</Label>
                    <Select
                      value={editableConfig.output_schema.type}
                      onValueChange={(value) => setEditableConfig({
                        ...editableConfig,
                        output_schema: { ...editableConfig.output_schema, type: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="structured">Structured</SelectItem>
                        <SelectItem value="action">Action</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Example output..."
                      value={editableConfig.output_schema.example}
                      onChange={(e) => setEditableConfig({
                        ...editableConfig,
                        output_schema: { ...editableConfig.output_schema, example: e.target.value }
                      })}
                      rows={2}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="behavior" className="space-y-4 pr-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Behavior Mode</Label>
                      <Select
                        value={editableConfig.behavior.mode}
                        onValueChange={(value) => setEditableConfig({
                          ...editableConfig,
                          behavior: { ...editableConfig.behavior, mode: value }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BEHAVIOR_MODES.map(mode => (
                            <SelectItem key={mode} value={mode} className="capitalize">{mode}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Response Style</Label>
                      <Select
                        value={editableConfig.behavior.response_style}
                        onValueChange={(value) => setEditableConfig({
                          ...editableConfig,
                          behavior: { ...editableConfig.behavior, response_style: value }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RESPONSE_STYLES.map(style => (
                            <SelectItem key={style} value={style} className="capitalize">{style}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Personality</Label>
                    <Textarea
                      value={editableConfig.behavior.personality}
                      onChange={(e) => setEditableConfig({
                        ...editableConfig,
                        behavior: { ...editableConfig.behavior, personality: e.target.value }
                      })}
                      rows={2}
                      placeholder="Describe the agent's personality traits..."
                    />
                  </div>

                  <div className="space-y-3 border-t pt-3">
                    <div className="flex justify-between items-center">
                      <Label>Temperature: {editableConfig.behavior.temperature}</Label>
                      <span className="text-xs text-muted-foreground">
                        {editableConfig.behavior.temperature < 0.3 ? 'Focused' : editableConfig.behavior.temperature > 0.7 ? 'Creative' : 'Balanced'}
                      </span>
                    </div>
                    <Slider
                      value={[editableConfig.behavior.temperature]}
                      min={0.1}
                      max={1}
                      step={0.1}
                      onValueChange={([value]) => setEditableConfig({
                        ...editableConfig,
                        behavior: { ...editableConfig.behavior, temperature: value }
                      })}
                    />
                    <p className="text-xs text-muted-foreground">Lower = more predictable, Higher = more creative</p>
                  </div>

                  <div className="space-y-2 border-t pt-3">
                    <Label>Max Response Tokens</Label>
                    <Input
                      type="number"
                      value={editableConfig.behavior.max_response_tokens}
                      onChange={(e) => setEditableConfig({
                        ...editableConfig,
                        behavior: { ...editableConfig.behavior, max_response_tokens: parseInt(e.target.value) || 500 }
                      })}
                    />
                    <p className="text-xs text-muted-foreground">Maximum length of agent responses</p>
                  </div>

                  <div className="space-y-3 border-t pt-3">
                    <Label>Custom Behavioral Rules</Label>
                    <Textarea
                      value={editableConfig.behavior.custom_rules?.join('\n') || ''}
                      onChange={(e) => setEditableConfig({
                        ...editableConfig,
                        behavior: { ...editableConfig.behavior, custom_rules: e.target.value.split('\n').filter(r => r.trim()) }
                      })}
                      rows={3}
                      placeholder="Enter one rule per line..."
                    />
                    <p className="text-xs text-muted-foreground">Specific rules the agent should follow</p>
                  </div>
                </TabsContent>

                <TabsContent value="tools" className="space-y-4 pr-4">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <Label>Enable Memory</Label>
                      <p className="text-xs text-muted-foreground">Agent remembers past interactions</p>
                      {editableConfig.memory_reasoning && (
                        <p className="text-xs text-primary/70 mt-1 italic">Why: {editableConfig.memory_reasoning}</p>
                      )}
                    </div>
                    <Switch
                      checked={editableConfig.use_memory}
                      onCheckedChange={(checked) => setEditableConfig({
                        ...editableConfig,
                        use_memory: checked
                      })}
                    />
                  </div>

                  {editableConfig.use_memory && (
                    <div className="space-y-2 border-t pt-3">
                      <Label>Memory Retention (days)</Label>
                      <Input
                        type="number"
                        value={editableConfig.memory_retention_days}
                        onChange={(e) => setEditableConfig({
                          ...editableConfig,
                          memory_retention_days: parseInt(e.target.value) || 30
                        })}
                      />
                    </div>
                  )}

                  {/* Recommended New Tools Section */}
                  {editableConfig.recommended_tools && editableConfig.recommended_tools.length > 0 && (
                    <div className="space-y-3 border-t pt-3">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500" />
                        <Label className="text-amber-600">Recommended New Tools</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        AI suggests these capabilities. Build them now or quick-approve with defaults.
                      </p>
                      <div className="space-y-2">
                        {editableConfig.recommended_tools.map((tool) => (
                          <div key={tool.name} className="p-3 rounded-lg border border-amber-200 bg-amber-50/50">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-medium">{tool.display_name}</p>
                                  <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                                    NEW
                                  </Badge>
                                  {(tool as any).suggested_integration && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      {(tool as any).suggested_integration}
                                    </Badge>
                                  )}
                                  {(tool as any).capability_category && (
                                    <Badge variant="outline" className="text-[10px]">
                                      {(tool as any).capability_category}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
                                {tool.reasoning && (
                                  <p className="text-xs text-amber-700 mt-1 italic">Why: {tool.reasoning}</p>
                                )}
                                {(tool as any).implementation_notes && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    <span className="font-medium">How:</span> {(tool as any).implementation_notes}
                                  </p>
                                )}
                              </div>
                              <div className="flex shrink-0">
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  className="h-7 text-xs"
                                  onClick={() => handleBuildTool(tool)}
                                >
                                  <Hammer className="h-3 w-3 mr-1" />
                                  Configure & Add
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 border-t pt-3">
                    <Label>Active Tools</Label>
                    <p className="text-xs text-muted-foreground">These tools execute real actions in your CRM</p>
                    <div className="space-y-2">
                      {editableConfig.tools.map((tool) => (
                        <div key={tool.name} className={`p-3 rounded-lg border ${tool.enabled ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={tool.enabled}
                                onCheckedChange={() => toggleTool(tool.name)}
                              />
                              <div>
                                <p className="text-sm font-medium">{tool.name.replace(/_/g, ' ')}</p>
                                <p className="text-xs text-muted-foreground">{tool.description}</p>
                              </div>
                            </div>
                            <Badge variant={tool.enabled ? "default" : "secondary"}>
                              {tool.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                          {tool.reasoning && (
                            <p className="text-xs text-primary/70 mt-2 ml-6 italic">Why: {tool.reasoning}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    {editableConfig.tools.length === 0 && (
                      <p className="text-xs text-amber-600 p-2 bg-amber-50 rounded">
                        No tools configured. The agent will only be able to respond with text.
                      </p>
                    )}
                  </div>

                  {/* Add existing tools from system */}
                  {systemTools.length > 0 && (
                    <div className="space-y-3 border-t pt-3">
                      <Label>Add More Tools</Label>
                      <p className="text-xs text-muted-foreground">Available system tools you can add</p>
                      <div className="flex flex-wrap gap-2">
                        {systemTools
                          .filter(t => !editableConfig.tools.some(et => et.name === t.name))
                          .map(tool => (
                            <Button
                              key={tool.id}
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => addExistingTool({ name: tool.name, description: tool.description })}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {tool.display_name}
                            </Button>
                          ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="integrations" className="space-y-4 pr-4">
                  <div className="space-y-3">
                    <Label>Required Integrations</Label>
                    <p className="text-xs text-muted-foreground">External APIs this agent can connect to</p>
                    <div className="space-y-2">
                      {Object.keys(INTEGRATION_TEMPLATES).map(integration => {
                        const isSelected = editableConfig.suggestedIntegrations.includes(integration);
                        const reasoning = editableConfig.integration_reasoning?.[integration];
                        return (
                          <div 
                            key={integration} 
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                            }`}
                            onClick={() => toggleIntegration(integration)}
                          >
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleIntegration(integration)}
                              />
                              <span className="text-sm font-medium capitalize">{integration}</span>
                            </div>
                            {isSelected && reasoning && (
                              <p className="text-xs text-primary/70 mt-1 ml-6 italic">Why: {reasoning}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {editableConfig.suggestedIntegrations.length > 0 && (
                    <div className="space-y-2 border-t pt-3">
                      <Label>Selected Integrations</Label>
                      <div className="flex flex-wrap gap-2">
                        {editableConfig.suggestedIntegrations.map(integration => (
                          <Badge key={integration} variant="default" className="capitalize">
                            {integration}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Users will need to configure these when implementing this agent.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        )}
      </CardContent>

      {/* Tool Builder Dialog */}
      <ToolBuilderDialog
        open={toolBuilderOpen}
        onOpenChange={setToolBuilderOpen}
        initialTool={selectedToolToBuild ? {
          name: selectedToolToBuild.name,
          display_name: selectedToolToBuild.display_name,
          description: selectedToolToBuild.description,
          reasoning: selectedToolToBuild.reasoning,
          executor_type: (selectedToolToBuild as any).suggested_executor_type || "webhook",
          capability_category: (selectedToolToBuild as any).capability_category,
          parameters: Object.entries(selectedToolToBuild.suggested_parameters || {}).map(([name, config]: [string, any]) => ({
            name,
            type: config.type || "string",
            description: config.description || "",
            required: config.required || false
          })),
          executor_config: (selectedToolToBuild as any).suggested_integration ? {
            integration_type: (selectedToolToBuild as any).suggested_integration
          } : {}
        } : undefined}
        onToolCreated={handleToolCreated}
      />
    </Card>
  );
}
