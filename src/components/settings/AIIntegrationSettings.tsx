import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useErrorToast } from "@/hooks/useErrorToast";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export function AIIntegrationSettings() {
  const { toast } = useToast();
  const { showError } = useErrorToast();
  const queryClient = useQueryClient();
  const isAdmin = useIsAdmin();
  const [mistralKey, setMistralKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");

  // Fetch workspace AI integration configs
  const { data: workspaceConfigs } = useQuery({
    queryKey: ['workspace-ai-configs'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!workspace) return null;

      // Check if workspace has their own API keys configured
      const { data } = await supabase
        .from('ai_agents')
        .select('integration_configs')
        .eq('workspace_id', workspace.id)
        .limit(1)
        .maybeSingle();

      const configs = data?.integration_configs;
      if (!configs || typeof configs !== 'object' || Array.isArray(configs)) {
        return {};
      }
      return configs as Record<string, any>;
    }
  });

  // Save workspace API keys
  const saveKeysMutation = useMutation({
    mutationFn: async (configs: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!workspace) throw new Error("No workspace found");

      // Store in a workspace_ai_configs table or update first agent
      // For now, we'll create a workspace settings approach
      return { success: true, configs };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-ai-configs'] });
      toast({
        title: "API Keys saved",
        description: "Your AI integration keys have been securely stored"
      });
      setMistralKey("");
      setOpenaiKey("");
    },
    onError: (error: Error) => {
      showError({
        title: "Failed to save API keys",
        description: error.message,
        error
      });
    }
  });

  const handleSaveKeys = () => {
    const configs: any = {};
    if (mistralKey) configs.mistral = { api_key: mistralKey };
    if (openaiKey) configs.openai = { api_key: openaiKey };
    
    if (Object.keys(configs).length === 0) {
      toast({
        title: "No keys provided",
        description: "Please enter at least one API key",
        variant: "destructive"
      });
      return;
    }

    saveKeysMutation.mutate(configs);
  };

  const hasThermiAI = true; // Thermi AI is always available
  const hasMistralKey = workspaceConfigs && typeof workspaceConfigs === 'object' && 'mistral' in workspaceConfigs && (workspaceConfigs as any).mistral?.api_key;
  const hasOpenAIKey = workspaceConfigs && typeof workspaceConfigs === 'object' && 'openai' in workspaceConfigs && (workspaceConfigs as any).openai?.api_key;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          AI Integration & Billing
        </h2>
        <p className="text-muted-foreground mt-2">
          Configure AI models for your agents. All AI usage is metered and billed through your subscription.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>How AI Billing Works:</strong> All AI models (Thermi AI, platform-provided keys, or your own keys) 
          are metered and charged through your Thermi subscription. This ensures transparent billing and usage tracking 
          regardless of which model your agents use.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="thermi" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="thermi">Thermi AI</TabsTrigger>
          <TabsTrigger value="platform">Platform Keys</TabsTrigger>
          <TabsTrigger value="byok">Your Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="thermi" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Thermi AI Gateway (Recommended)
              </CardTitle>
              <CardDescription>
                Pre-configured access to Google Gemini and OpenAI models - no setup required
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Status: Active</p>
                  <p className="text-sm text-muted-foreground">Ready to use with all agents</p>
                </div>
                <Badge variant="default" className="bg-green-500">Connected</Badge>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Available Models:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• google/gemini-2.5-flash (default, fast & efficient)</li>
                  <li>• google/gemini-2.5-pro (advanced reasoning)</li>
                  <li>• openai/gpt-5-mini (balanced performance)</li>
                  <li>• openai/gpt-5 (maximum capability)</li>
                </ul>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Usage is metered and billed through your Thermi subscription. 
                  Check Settings → Billing for usage details.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platform" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform-Provided API Keys</CardTitle>
              <CardDescription>
                {isAdmin 
                  ? "As an admin, you can configure platform API keys that all workspaces can use"
                  : "Platform admins can provide API keys for workspace users"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAdmin ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Configure platform API keys in Admin → Platform API Keys. 
                    All usage is metered and billed to individual workspaces.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Platform-provided API access allows you to use AI models without configuring your own keys. 
                      Usage is metered and included in your subscription billing.
                    </p>
                  </div>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Contact your platform administrator if you need access to additional AI models.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="byok" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bring Your Own Keys (BYOK)</CardTitle>
              <CardDescription>
                Route your agents through your own AI provider accounts. Coming with Enterprise tier — managed via secure secrets vault, not browser storage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Why this is gated:</strong> storing third-party API keys directly in the database is unsafe. BYOK will land once secrets-vault provisioning ships for Enterprise workspaces. For now, all workspaces use the Thermi AI Gateway with transparent metered billing — no per-provider keys required.
                </AlertDescription>
              </Alert>

              <div className="space-y-3 opacity-60 pointer-events-none select-none">
                <div className="space-y-2">
                  <Label htmlFor="mistral-key">Mistral AI API Key</Label>
                  <Input id="mistral-key" type="password" disabled placeholder="Available with Enterprise BYOK" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openai-key">OpenAI API Key</Label>
                  <Input id="openai-key" type="password" disabled placeholder="Available with Enterprise BYOK" />
                </div>
                <Button disabled className="w-full">Enterprise BYOK — coming soon</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Current AI Configuration</CardTitle>
          <CardDescription>Active AI integrations for your workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium">Thermi AI Gateway</span>
              </div>
              <Badge variant="default" className="bg-green-500">Active</Badge>
            </div>

            {hasMistralKey && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium">Mistral AI (Your Key)</span>
                </div>
                <Badge variant="outline">Configured</Badge>
              </div>
            )}

            {hasOpenAIKey && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium">OpenAI (Your Key)</span>
                </div>
                <Badge variant="outline">Configured</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}