import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save } from "lucide-react";

export const PlatformConfig = () => {
  const queryClient = useQueryClient();
  const [configs, setConfigs] = useState<Record<string, any>>({});

  const { data: platformConfigs } = useQuery({
    queryKey: ["platform-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_config")
        .select("*")
        .order("key");
      if (error) throw error;
      
      const configMap: Record<string, any> = {};
      data?.forEach((config) => {
        configMap[config.key] = config.value;
      });
      setConfigs(configMap);
      return data;
    },
  });

  const updateConfig = useMutation({
    mutationFn: async ({ key, value, description }: { key: string; value: any; description?: string }) => {
      const { error } = await supabase
        .from("platform_config")
        .upsert({
          key,
          value,
          description,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-config"] });
      toast.success("Configuration updated");
    },
    onError: (error) => {
      toast.error("Failed to update configuration: " + error.message);
    },
  });

  const defaultConfigs = [
    {
      key: "max_workflows_per_workspace",
      label: "Max Workflows per Workspace",
      description: "Maximum number of workflows a workspace can create",
      type: "number",
      defaultValue: 50,
    },
    {
      key: "max_workflow_runs_per_day",
      label: "Max Workflow Runs per Day",
      description: "Rate limit for workflow executions per workspace",
      type: "number",
      defaultValue: 1000,
    },
    {
      key: "enable_ai_features",
      label: "Enable AI Features",
      description: "Toggle AI-powered workflow suggestions and optimizations",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "webhook_timeout_seconds",
      label: "Webhook Timeout (seconds)",
      description: "Timeout for webhook HTTP requests",
      type: "number",
      defaultValue: 30,
    },
    {
      key: "audit_log_retention_days",
      label: "Audit Log Retention (days)",
      description: "How long to keep audit logs before cleanup",
      type: "number",
      defaultValue: 90,
    },
  ];

  const handleSave = (configKey: string, description: string) => {
    updateConfig.mutate({
      key: configKey,
      value: configs[configKey],
      description,
    });
  };

  return (
    <div className="space-y-6">
      {defaultConfigs.map((config) => (
        <Card key={config.key}>
          <CardHeader>
            <CardTitle>{config.label}</CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.type === "number" && (
              <div className="space-y-2">
                <Label htmlFor={config.key}>Value</Label>
                <Input
                  id={config.key}
                  type="number"
                  value={configs[config.key] ?? config.defaultValue}
                  onChange={(e) =>
                    setConfigs({ ...configs, [config.key]: parseInt(e.target.value) })
                  }
                />
              </div>
            )}
            {config.type === "boolean" && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={config.key}
                  checked={configs[config.key] ?? config.defaultValue}
                  onChange={(e) =>
                    setConfigs({ ...configs, [config.key]: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor={config.key}>Enabled</Label>
              </div>
            )}
            <Button
              onClick={() => handleSave(config.key, config.description)}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
