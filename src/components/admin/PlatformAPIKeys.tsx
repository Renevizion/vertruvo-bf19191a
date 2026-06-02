import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Key, Save, Trash2 } from "lucide-react";

interface PlatformAPIConfig {
  id: string;
  integration_type: string;
  config: Record<string, string>;
  is_active: boolean;
}

const INTEGRATION_TYPES = [
  { value: 'openai', label: 'OpenAI', fields: ['api_key'] },
  { value: 'mistral', label: 'Mistral AI', fields: ['api_key'] },
  { value: 'anthropic', label: 'Anthropic', fields: ['api_key'] },
  { value: 'twilio', label: 'Twilio', fields: ['account_sid', 'auth_token'] },
  { value: 'serp', label: 'Serp API', fields: ['api_key'] },
];

export function PlatformAPIKeys() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState("");
  const [configData, setConfigData] = useState<Record<string, string>>({});

  const { data: configs, isLoading } = useQuery({
    queryKey: ['platform-api-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_api_configs')
        .select('*')
        .order('integration_type');
      
      if (error) throw error;
      return data as PlatformAPIConfig[];
    }
  });

  const saveConfig = useMutation({
    mutationFn: async () => {
      if (!selectedType || Object.keys(configData).length === 0) {
        throw new Error("Please select an integration type and provide configuration");
      }

      const { error } = await supabase
        .from('platform_api_configs')
        .upsert({
          integration_type: selectedType,
          config: configData,
          is_active: true
        }, { onConflict: 'integration_type' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-api-configs'] });
      toast({ title: "Platform API keys saved successfully" });
      setSelectedType("");
      setConfigData({});
    },
    onError: (error: any) => {
      toast({
        title: "Error saving API keys",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteConfig = useMutation({
    mutationFn: async (integrationType: string) => {
      const { error } = await supabase
        .from('platform_api_configs')
        .delete()
        .eq('integration_type', integrationType);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-api-configs'] });
      toast({ title: "API configuration deleted" });
    }
  });

  const selectedIntegration = INTEGRATION_TYPES.find(t => t.value === selectedType);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Platform API Keys</h2>
        <p className="text-muted-foreground">
          Configure your API keys for platform-provided agent integrations. Users will be charged based on usage.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Platform API Configuration</CardTitle>
          <CardDescription>
            Add API keys that will be used for all agents with platform-provided integrations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Integration Type</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Select integration type..." />
              </SelectTrigger>
              <SelectContent>
                {INTEGRATION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedIntegration && (
            <div className="space-y-3 pt-2">
              {selectedIntegration.fields.map((field) => (
                <div key={field} className="space-y-2">
                  <Label className="capitalize">
                    {field.replace('_', ' ')}
                  </Label>
                  <Input
                    type="password"
                    value={configData[field] || ""}
                    onChange={(e) => setConfigData({ ...configData, [field]: e.target.value })}
                    placeholder={`Enter ${field.replace('_', ' ')}...`}
                  />
                </div>
              ))}

              <Button
                onClick={() => saveConfig.mutate()}
                disabled={saveConfig.isPending}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Configured Platform APIs</h3>
        
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Loading configurations...
            </CardContent>
          </Card>
        ) : configs && configs.length > 0 ? (
          <div className="grid gap-4">
            {configs.map((config) => (
              <Card key={config.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Key className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium capitalize">
                        {INTEGRATION_TYPES.find(t => t.value === config.integration_type)?.label || config.integration_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Object.keys(config.config).length} credential(s) configured
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={config.is_active ? "default" : "secondary"}>
                      {config.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteConfig.mutate(config.integration_type)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No platform API configurations yet</p>
              <p className="text-sm mt-1">Add API keys above to enable platform-provided integrations</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}