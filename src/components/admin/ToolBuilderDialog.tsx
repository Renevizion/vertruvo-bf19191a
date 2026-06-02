import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Wrench, Code, Globe, Zap, Info, AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required: boolean;
  default_value?: string;
}

export interface NewToolConfig {
  name: string;
  display_name: string;
  description: string;
  executor_type: "internal" | "edge_function" | "webhook" | "integration";
  executor_config: {
    endpoint_url?: string;
    method?: string;
    headers?: Record<string, string>;
    integration_type?: string;
    function_name?: string;
    auth_type?: "none" | "api_key" | "bearer" | "basic";
    auth_config?: Record<string, string>;
    capability?: string; // The specific capability being used (e.g., image_generation)
  };
  parameters: ToolParameter[];
  reasoning?: string;
  capability_category?: string;
}

interface ToolBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTool?: Partial<NewToolConfig>;
  onToolCreated: (tool: NewToolConfig) => void;
}

const EXECUTOR_TYPES = [
  { 
    value: "internal", 
    label: "Internal Function", 
    description: "Built-in platform capability",
    icon: Zap,
    requiresConfig: false
  },
  { 
    value: "edge_function", 
    label: "Edge Function", 
    description: "Custom serverless function",
    icon: Code,
    requiresConfig: true
  },
  { 
    value: "webhook", 
    label: "Webhook / API", 
    description: "External HTTP endpoint",
    icon: Globe,
    requiresConfig: true
  },
  { 
    value: "integration", 
    label: "Integration", 
    description: "Connected service (OpenAI, Twilio, etc.)",
    icon: Wrench,
    requiresConfig: true
  },
];

const INTEGRATION_OPTIONS = [
  { value: "openai", label: "OpenAI", capabilities: ["text_generation", "image_generation", "embeddings", "vision"], defaultEndpoint: "https://api.openai.com/v1", authType: "bearer" as const },
  { value: "mistral", label: "Mistral AI", capabilities: ["text_generation"], defaultEndpoint: "https://api.mistral.ai/v1", authType: "bearer" as const },
  { value: "twilio", label: "Twilio", capabilities: ["sms", "voice_call", "whatsapp"], defaultEndpoint: "https://api.twilio.com", authType: "basic" as const },
  { value: "elevenlabs", label: "ElevenLabs", capabilities: ["voice_synthesis", "audio_generation"], defaultEndpoint: "https://api.elevenlabs.io/v1", authType: "api_key" as const },
  { value: "huggingface", label: "HuggingFace", capabilities: ["image_generation", "text_generation", "video_generation"], defaultEndpoint: "https://api-inference.huggingface.co/models", authType: "bearer" as const },
  { value: "replicate", label: "Replicate", capabilities: ["image_generation", "video_generation", "audio_generation"], defaultEndpoint: "https://api.replicate.com/v1", authType: "bearer" as const },
  { value: "stability", label: "Stability AI", capabilities: ["image_generation", "video_generation"], defaultEndpoint: "https://api.stability.ai/v1", authType: "bearer" as const },
  { value: "resend", label: "Resend", capabilities: ["email"], defaultEndpoint: "https://api.resend.com", authType: "bearer" as const },
  { value: "serp", label: "SERP API", capabilities: ["web_search", "image_search"], defaultEndpoint: "https://serpapi.com/search", authType: "api_key" as const },
  { value: "google_maps", label: "Google Maps", capabilities: ["geocoding", "places", "directions"], defaultEndpoint: "https://maps.googleapis.com/maps/api", authType: "api_key" as const },
  { value: "custom", label: "Custom API", capabilities: ["any"], defaultEndpoint: "", authType: "api_key" as const },
];

// Map capability categories to relevant integrations
const CAPABILITY_TO_INTEGRATIONS: Record<string, string[]> = {
  "image_generation": ["openai", "huggingface", "replicate", "stability"],
  "video_generation": ["replicate", "huggingface", "stability"],
  "audio_generation": ["elevenlabs", "replicate"],
  "voice_synthesis": ["elevenlabs"],
  "text_generation": ["openai", "mistral", "huggingface"],
  "email": ["resend"],
  "sms": ["twilio"],
  "voice_call": ["twilio"],
  "web_search": ["serp"],
  "geocoding": ["google_maps"],
  "general": [], // Show all
};

// Common parameter templates based on integration/capability
const PARAMETER_TEMPLATES: Record<string, ToolParameter[]> = {
  "openai_image_generation": [
    { name: "prompt", type: "string", description: "Text description of the image to generate", required: true },
    { name: "size", type: "string", description: "Image size (1024x1024, 1792x1024, 1024x1792)", required: false, default_value: "1024x1024" },
    { name: "quality", type: "string", description: "Image quality (standard, hd)", required: false, default_value: "standard" },
  ],
  "openai_text_generation": [
    { name: "prompt", type: "string", description: "The prompt/question to send", required: true },
    { name: "system_message", type: "string", description: "System instructions for the AI", required: false },
    { name: "max_tokens", type: "number", description: "Maximum response length", required: false, default_value: "500" },
  ],
  "twilio_sms": [
    { name: "to", type: "string", description: "Recipient phone number (E.164 format)", required: true },
    { name: "body", type: "string", description: "SMS message content", required: true },
  ],
  "twilio_voice_call": [
    { name: "to", type: "string", description: "Phone number to call (E.164 format)", required: true },
    { name: "message", type: "string", description: "Message to speak or TwiML URL", required: true },
  ],
  "elevenlabs_voice_synthesis": [
    { name: "text", type: "string", description: "Text to convert to speech", required: true },
    { name: "voice_id", type: "string", description: "ElevenLabs voice ID", required: true },
    { name: "model_id", type: "string", description: "Model to use", required: false, default_value: "eleven_monolingual_v1" },
  ],
  "resend_email": [
    { name: "to", type: "string", description: "Recipient email address", required: true },
    { name: "subject", type: "string", description: "Email subject line", required: true },
    { name: "body", type: "string", description: "Email body (HTML supported)", required: true },
    { name: "from", type: "string", description: "Sender email", required: false },
  ],
  "replicate_image_generation": [
    { name: "prompt", type: "string", description: "Text description of the image", required: true },
    { name: "model", type: "string", description: "Replicate model version", required: false, default_value: "stability-ai/sdxl" },
    { name: "negative_prompt", type: "string", description: "What to avoid in the image", required: false },
  ],
  "replicate_video_generation": [
    { name: "prompt", type: "string", description: "Text description of the video", required: true },
    { name: "model", type: "string", description: "Video model (e.g., runway-ml/gen-2)", required: false },
    { name: "duration", type: "number", description: "Video duration in seconds", required: false, default_value: "4" },
  ],
  "serp_web_search": [
    { name: "query", type: "string", description: "Search query", required: true },
    { name: "num_results", type: "number", description: "Number of results to return", required: false, default_value: "10" },
  ],
  "default": [
    { name: "input", type: "string", description: "Primary input for this tool", required: true },
  ],
};

const PARAMETER_TYPES = ["string", "number", "boolean", "array", "object"];

export function ToolBuilderDialog({ open, onOpenChange, initialTool, onToolCreated }: ToolBuilderDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<NewToolConfig>({
    name: "",
    display_name: "",
    description: "",
    executor_type: "webhook",
    executor_config: {},
    parameters: [],
    reasoning: "",
    capability_category: "",
  });

  // Track what's missing/needs attention
  const [validationIssues, setValidationIssues] = useState<string[]>([]);

  // Initialize from initialTool when dialog opens
  useEffect(() => {
    if (open && initialTool) {
      // Get integration from suggested_integration or executor_config
      const integration = (initialTool as any)?.suggested_integration || initialTool.executor_config?.integration_type;
      const capability = initialTool.capability_category || (initialTool as any)?.integration_capability;
      
      // Determine best parameters template
      let templateKey = "default";
      if (integration && capability) {
        templateKey = `${integration}_${capability}`;
      } else if (integration) {
        // Try to find any matching template for this integration
        const possibleKeys = Object.keys(PARAMETER_TEMPLATES).filter(k => k.startsWith(integration));
        if (possibleKeys.length > 0) templateKey = possibleKeys[0];
      }

      const templateParams = PARAMETER_TEMPLATES[templateKey] || PARAMETER_TEMPLATES.default;
      const existingParams = initialTool.parameters || [];
      
      // Merge: use existing params if provided, otherwise use template
      const mergedParams = existingParams.length > 0 ? existingParams : templateParams;

      // Get integration defaults
      const integrationInfo = INTEGRATION_OPTIONS.find(i => i.value === integration);
      
      // Determine executor type based on suggested integration
      const executorType = initialTool.executor_type || (integration ? "integration" : "webhook");
      
      setConfig({
        name: initialTool.name || "",
        display_name: initialTool.display_name || "",
        description: initialTool.description || "",
        executor_type: executorType,
        executor_config: {
          integration_type: integration,
          endpoint_url: integrationInfo?.defaultEndpoint || initialTool.executor_config?.endpoint_url || "",
          method: initialTool.executor_config?.method || "POST",
          auth_type: integrationInfo?.authType || initialTool.executor_config?.auth_type || "none",
          capability: capability, // Store capability for the executor
          ...initialTool.executor_config,
        },
        parameters: mergedParams,
        reasoning: initialTool.reasoning || "",
        capability_category: capability || "",
      });
    } else if (open && !initialTool) {
      // Reset for new tool
      setConfig({
        name: "",
        display_name: "",
        description: "",
        executor_type: "webhook",
        executor_config: {},
        parameters: [],
        reasoning: "",
        capability_category: "",
      });
    }
  }, [open, initialTool]);

  // Validate configuration
  useEffect(() => {
    const issues: string[] = [];
    
    if (!config.name) issues.push("Tool name is required");
    if (!config.display_name) issues.push("Display name is required");
    if (!config.description) issues.push("Description is required");
    
    if (config.executor_type === "webhook" && !config.executor_config.endpoint_url) {
      issues.push("Endpoint URL is required for webhooks");
    }
    if (config.executor_type === "integration" && !config.executor_config.integration_type) {
      issues.push("Select an integration service");
    }
    if (config.executor_type === "edge_function" && !config.executor_config.function_name) {
      issues.push("Function name is required");
    }
    if (config.parameters.length === 0) {
      issues.push("Add at least one parameter");
    }
    config.parameters.forEach((p, i) => {
      if (!p.name) issues.push(`Parameter ${i + 1} needs a name`);
    });

    setValidationIssues(issues);
  }, [config]);

  const updateConfig = (updates: Partial<NewToolConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const addParameter = () => {
    setConfig(prev => ({
      ...prev,
      parameters: [...prev.parameters, { name: "", type: "string", description: "", required: false }]
    }));
  };

  const updateParameter = (index: number, updates: Partial<ToolParameter>) => {
    setConfig(prev => ({
      ...prev,
      parameters: prev.parameters.map((p, i) => i === index ? { ...p, ...updates } : p)
    }));
  };

  const removeParameter = (index: number) => {
    setConfig(prev => ({
      ...prev,
      parameters: prev.parameters.filter((_, i) => i !== index)
    }));
  };

  const applyParameterTemplate = (templateKey: string) => {
    const template = PARAMETER_TEMPLATES[templateKey];
    if (template) {
      setConfig(prev => ({ ...prev, parameters: [...template] }));
    }
  };

  const handleIntegrationChange = (integrationValue: string) => {
    const integration = INTEGRATION_OPTIONS.find(i => i.value === integrationValue);
    if (integration) {
      updateConfig({
        executor_config: {
          ...config.executor_config,
          integration_type: integrationValue,
          endpoint_url: integration.defaultEndpoint,
          auth_type: integration.authType,
        }
      });

      // Auto-suggest parameters based on integration
      const capability = (initialTool as any)?.integration_capability || integration.capabilities[0];
      const templateKey = `${integrationValue}_${capability}`;
      if (PARAMETER_TEMPLATES[templateKey] && config.parameters.length === 0) {
        applyParameterTemplate(templateKey);
      }
    }
  };

  const handleSave = async () => {
    if (validationIssues.length > 0) {
      toast.error("Please fix all issues before saving", {
        description: validationIssues[0]
      });
      return;
    }

    setIsSaving(true);
    try {
      const toolName = config.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      
      const parametersSchema: Record<string, any> = {};
      config.parameters.forEach(param => {
        parametersSchema[param.name] = {
          type: param.type,
          description: param.description,
          required: param.required,
          ...(param.default_value ? { default: param.default_value } : {})
        };
      });

      const { data, error } = await supabase
        .from('agent_tools')
        .insert({
          name: toolName,
          display_name: config.display_name,
          description: config.description,
          executor_type: config.executor_type,
          executor_config: config.executor_config,
          parameters_schema: parametersSchema,
          is_system: false,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Tool "${config.display_name}" created successfully`);
      onToolCreated(config);
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to create tool", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedIntegration = INTEGRATION_OPTIONS.find(i => i.value === config.executor_config.integration_type);
  const isValid = validationIssues.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Build New Tool
            {isValid ? (
              <Badge variant="default" className="ml-2 bg-green-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Ready
              </Badge>
            ) : (
              <Badge variant="secondary" className="ml-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {validationIssues.length} issues
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Configure a new tool that agents can use. Pre-filled from AI recommendation.
          </DialogDescription>
        </DialogHeader>

        {initialTool?.reasoning && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-800">AI Recommendation</p>
              <p className="text-amber-700">{initialTool.reasoning}</p>
            </div>
          </div>
        )}

        {/* Validation Summary */}
        {validationIssues.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-red-800">Required Configuration</p>
              <ul className="text-red-700 text-xs mt-1 space-y-0.5">
                {validationIssues.slice(0, 3).map((issue, i) => (
                  <li key={i}>• {issue}</li>
                ))}
                {validationIssues.length > 3 && (
                  <li>• ...and {validationIssues.length - 3} more</li>
                )}
              </ul>
            </div>
          </div>
        )}

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic" className="relative">
              Basic Info
              {(!config.name || !config.display_name || !config.description) && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger value="executor" className="relative">
              Executor
              {(config.executor_type === "webhook" && !config.executor_config.endpoint_url) && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger value="parameters" className="relative">
              Parameters
              {config.parameters.length === 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Tool Name (ID)
                  {!config.name && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  placeholder="send_email"
                  value={config.name}
                  onChange={(e) => updateConfig({ name: e.target.value })}
                  className={!config.name ? "border-red-300 focus:border-red-500" : ""}
                />
                <p className="text-xs text-muted-foreground">Lowercase, underscores only</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Display Name
                  {!config.display_name && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  placeholder="Send Email"
                  value={config.display_name}
                  onChange={(e) => updateConfig({ display_name: e.target.value })}
                  className={!config.display_name ? "border-red-300 focus:border-red-500" : ""}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Description
                {!config.description && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                placeholder="Describe what this tool does and when agents should use it..."
                value={config.description}
                onChange={(e) => updateConfig({ description: e.target.value })}
                rows={3}
                className={!config.description ? "border-red-300 focus:border-red-500" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label>Capability Category</Label>
              <Select
                value={config.capability_category || "general"}
                onValueChange={(value) => updateConfig({ capability_category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="communication">Communication (Email, SMS)</SelectItem>
                  <SelectItem value="data">Data Operations</SelectItem>
                  <SelectItem value="media">Media (Images, Video, Audio)</SelectItem>
                  <SelectItem value="search">Search & Research</SelectItem>
                  <SelectItem value="automation">Automation & Workflows</SelectItem>
                  <SelectItem value="ai">AI & Generation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="executor" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label>Executor Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {EXECUTOR_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <div
                      key={type.value}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        config.executor_type === type.value 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => updateConfig({ executor_type: type.value as any, executor_config: {} })}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{type.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Integration Configuration */}
            {config.executor_type === "integration" && (
              <div className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Integration Service
                    {!config.executor_config.integration_type && <span className="text-red-500">*</span>}
                  </Label>
                  
                  {/* Get relevant integrations based on capability */}
                  {(() => {
                    const relevantIntegrations = config.capability_category && CAPABILITY_TO_INTEGRATIONS[config.capability_category]?.length > 0
                      ? INTEGRATION_OPTIONS.filter(opt => 
                          CAPABILITY_TO_INTEGRATIONS[config.capability_category!].includes(opt.value) || opt.value === "custom"
                        )
                      : INTEGRATION_OPTIONS;
                    
                    return (
                      <>
                        {config.capability_category && CAPABILITY_TO_INTEGRATIONS[config.capability_category]?.length > 0 && (
                          <div className="flex items-center gap-2 p-2 rounded bg-green-50 border border-green-200 text-xs text-green-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Only showing integrations that support <strong>{config.capability_category.replace(/_/g, ' ')}</strong>
                          </div>
                        )}
                        
                        <Select
                          value={config.executor_config.integration_type || ""}
                          onValueChange={handleIntegrationChange}
                        >
                          <SelectTrigger className={!config.executor_config.integration_type ? "border-red-300" : ""}>
                            <SelectValue placeholder="Select integration..." />
                          </SelectTrigger>
                          <SelectContent>
                            {relevantIntegrations.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    );
                  })()}
                </div>

                {selectedIntegration && (
                  <>
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                      <p className="text-sm font-medium text-green-800">{selectedIntegration.label} - Auto-configured</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedIntegration.capabilities.map(cap => (
                          <Badge key={cap} variant="secondary" className="text-xs bg-green-100">
                            {cap.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-green-700 mt-2">
                        Endpoint: {selectedIntegration.defaultEndpoint} • Auth: {selectedIntegration.authType}
                      </p>
                    </div>

                    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-blue-700">
                        <strong>API Key Required:</strong> Make sure you have configured the {selectedIntegration.label} API key in your platform settings or as a secret.
                      </p>
                    </div>
                  </>
                )}

                {config.executor_config.integration_type === "custom" && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Custom API Endpoint
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="https://your-api.com/endpoint"
                      value={config.executor_config.endpoint_url || ""}
                      onChange={(e) => updateConfig({ 
                        executor_config: { ...config.executor_config, endpoint_url: e.target.value }
                      })}
                      className={!config.executor_config.endpoint_url ? "border-red-300" : ""}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Webhook/API Configuration */}
            {config.executor_type === "webhook" && (
              <div className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Endpoint URL
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="https://api.example.com/action"
                    value={config.executor_config.endpoint_url || ""}
                    onChange={(e) => updateConfig({ 
                      executor_config: { ...config.executor_config, endpoint_url: e.target.value }
                    })}
                    className={!config.executor_config.endpoint_url ? "border-red-300 focus:border-red-500" : ""}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>HTTP Method</Label>
                    <Select
                      value={config.executor_config.method || "POST"}
                      onValueChange={(value) => updateConfig({ 
                        executor_config: { ...config.executor_config, method: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Authentication</Label>
                    <Select
                      value={config.executor_config.auth_type || "none"}
                      onValueChange={(value) => updateConfig({ 
                        executor_config: { ...config.executor_config, auth_type: value as any }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="api_key">API Key</SelectItem>
                        <SelectItem value="bearer">Bearer Token</SelectItem>
                        <SelectItem value="basic">Basic Auth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {config.executor_config.auth_type === "api_key" && (
                  <div className="space-y-2">
                    <Label>API Key Header Name</Label>
                    <Input
                      placeholder="X-API-Key"
                      value={config.executor_config.auth_config?.header_name || ""}
                      onChange={(e) => updateConfig({ 
                        executor_config: { 
                          ...config.executor_config, 
                          auth_config: { ...config.executor_config.auth_config, header_name: e.target.value }
                        }
                      })}
                    />
                    <p className="text-xs text-muted-foreground">The actual key will be stored securely as a secret</p>
                  </div>
                )}
              </div>
            )}

            {/* Edge Function Configuration */}
            {config.executor_type === "edge_function" && (
              <div className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Function Name
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="my-tool-function"
                    value={config.executor_config.function_name || ""}
                    onChange={(e) => updateConfig({ 
                      executor_config: { ...config.executor_config, function_name: e.target.value }
                    })}
                    className={!config.executor_config.function_name ? "border-red-300" : ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    Create this function in supabase/functions/{config.executor_config.function_name || 'function-name'}/index.ts
                  </p>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-blue-700">
                    Edge functions need to be created in code. After saving this tool, implement the function logic.
                  </p>
                </div>
              </div>
            )}

            {/* Internal Function */}
            {config.executor_type === "internal" && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <p className="text-green-700">
                    Internal functions execute built-in platform capabilities. No additional configuration needed - the platform handles execution.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="parameters" className="space-y-4 mt-4">
            {/* Explanation of what parameters are */}
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-blue-700">
                  <p className="font-medium">How Parameters Work</p>
                  <p className="text-xs mt-1">
                    Parameters define the <strong>inputs</strong> the agent needs to execute this tool. 
                    When the agent uses this tool, it will provide values for each parameter.
                  </p>
                  <ul className="text-xs mt-2 space-y-1">
                    <li>• <strong>Required</strong> = Agent MUST provide this value (e.g., "prompt" for image generation)</li>
                    <li>• <strong>Optional</strong> = Has a default value; agent can override if needed</li>
                    <li>• <strong>All parameters are used together</strong> - they're not alternatives</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="flex items-center gap-1">
                  Input Parameters
                  {config.parameters.length === 0 && <span className="text-red-500">*</span>}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {config.parameters.length > 0 
                    ? `${config.parameters.filter(p => p.required).length} required, ${config.parameters.filter(p => !p.required).length} optional`
                    : "Define what data this tool accepts"
                  }
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={addParameter}>
                <Plus className="h-3 w-3 mr-1" />
                Add Parameter
              </Button>
            </div>

            {/* Parameter Templates */}
            {config.parameters.length === 0 && selectedIntegration && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm font-medium text-amber-800">Quick Start Templates</p>
                <p className="text-xs text-amber-700 mb-2">Click to auto-fill recommended parameters:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(PARAMETER_TEMPLATES)
                    .filter(k => k.startsWith(config.executor_config.integration_type || ''))
                    .map(key => (
                      <Button
                        key={key}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => applyParameterTemplate(key)}
                      >
                        {key.replace(/_/g, ' ').replace(config.executor_config.integration_type + ' ', '')}
                      </Button>
                    ))}
                </div>
              </div>
            )}

            {config.parameters.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground border rounded-lg border-dashed border-red-300 bg-red-50/50">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                <p>No parameters defined. Click "Add Parameter" to define inputs.</p>
                <p className="text-xs mt-1">Tools need at least one parameter to be useful.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {config.parameters.map((param, index) => (
                  <div key={index} className={`p-3 rounded-lg border bg-card space-y-3 ${!param.name ? 'border-red-300' : ''}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium flex items-center gap-2">
                        {param.required ? (
                          <Badge variant="default" className="text-[10px] bg-primary">Required</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Optional</Badge>
                        )}
                        <span className="font-mono text-xs">{param.name || `param_${index + 1}`}</span>
                      </span>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 text-destructive"
                        onClick={() => removeParameter(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          Name
                          {!param.name && <span className="text-red-500">*</span>}
                        </Label>
                        <Input
                          placeholder="param_name"
                          value={param.name}
                          onChange={(e) => updateParameter(index, { name: e.target.value })}
                          className={`h-8 font-mono ${!param.name ? 'border-red-300' : ''}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={param.type}
                          onValueChange={(value) => updateParameter(index, { type: value as any })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PARAMETER_TYPES.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description (helps agent understand what to provide)</Label>
                      <Input
                        placeholder="Describe what value the agent should provide here"
                        value={param.description}
                        onChange={(e) => updateParameter(index, { description: e.target.value })}
                        className="h-8"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={param.required}
                          onCheckedChange={(checked) => updateParameter(index, { required: checked })}
                        />
                        <Label className="text-xs">Required</Label>
                      </div>
                      {!param.required && (
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Default Value (used if agent doesn't specify)</Label>
                          <Input
                            placeholder="Default value"
                            value={param.default_value || ""}
                            onChange={(e) => updateParameter(index, { default_value: e.target.value })}
                            className="h-8"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Summary of how tool will be called */}
                <div className="p-3 rounded-lg bg-muted/50 border text-xs">
                  <p className="font-medium mb-2">When agent calls this tool, it will provide:</p>
                  <code className="block bg-background p-2 rounded text-[11px] overflow-x-auto">
                    {`${config.name || 'tool_name'}({ ${config.parameters.map(p => 
                      p.required ? `${p.name}: <value>` : `${p.name}?: "${p.default_value || '...'}"`
                    ).join(', ')} })`}
                  </code>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !isValid}>
            {isSaving ? "Creating..." : isValid ? "Create Tool" : `Fix ${validationIssues.length} Issues`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
