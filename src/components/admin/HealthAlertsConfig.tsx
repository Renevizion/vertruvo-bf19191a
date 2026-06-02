import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, MessageSquare, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  operator: ">" | "<" | "==" | ">=";
  notification_channel: "email" | "slack" | "webhook";
  notification_target: string;
  is_active: boolean;
}

export const HealthAlertsConfig = () => {
  const queryClient = useQueryClient();
  const [newAlert, setNewAlert] = useState<Partial<AlertRule>>({
    metric: "error_rate",
    operator: ">",
    threshold: 5,
    notification_channel: "email",
    is_active: true,
  });

  const { data: alerts } = useQuery({
    queryKey: ["health-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_config")
        .select("*")
        .eq("key", "health_alerts")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return (data?.value as any)?.rules || [];
    },
  });

  const saveAlerts = useMutation({
    mutationFn: async (rules: AlertRule[]) => {
      const { error } = await supabase
        .from("platform_config")
        .upsert({
          key: "health_alerts",
          value: { rules } as any,
          description: "Health monitoring alert rules",
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health-alerts"] });
      toast.success("Alert rules saved");
    },
  });

  const addAlert = () => {
    if (!newAlert.name || !newAlert.notification_target) {
      toast.error("Please fill in all required fields");
      return;
    }

    const rule: AlertRule = {
      id: crypto.randomUUID(),
      name: newAlert.name!,
      metric: newAlert.metric!,
      threshold: newAlert.threshold!,
      operator: newAlert.operator!,
      notification_channel: newAlert.notification_channel!,
      notification_target: newAlert.notification_target!,
      is_active: newAlert.is_active!,
    };

    saveAlerts.mutate([...(alerts || []), rule]);
    setNewAlert({
      metric: "error_rate",
      operator: ">",
      threshold: 5,
      notification_channel: "email",
      is_active: true,
    });
  };

  const deleteAlert = (id: string) => {
    saveAlerts.mutate((alerts || []).filter((a: AlertRule) => a.id !== id));
  };

  const toggleAlert = (id: string) => {
    saveAlerts.mutate(
      (alerts || []).map((a: AlertRule) =>
        a.id === id ? { ...a, is_active: !a.is_active } : a
      )
    );
  };

  const metricOptions = [
    { value: "error_rate", label: "Error Rate (%)" },
    { value: "workflow_failures", label: "Workflow Failures" },
    { value: "api_response_time", label: "API Response Time (ms)" },
    { value: "webhook_failures", label: "Webhook Delivery Failures" },
    { value: "active_users", label: "Active Users" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Health Alerts Configuration
        </CardTitle>
        <CardDescription>
          Set up alerts for system health monitoring and receive notifications via email or Slack
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* New Alert Form */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Create New Alert Rule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="alert-name">Alert Name</Label>
                <Input
                  id="alert-name"
                  placeholder="High Error Rate Alert"
                  value={newAlert.name || ""}
                  onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="metric">Metric</Label>
                <Select
                  value={newAlert.metric}
                  onValueChange={(value) => setNewAlert({ ...newAlert, metric: value })}
                >
                  <SelectTrigger id="metric">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {metricOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="operator">Condition</Label>
                <Select
                  value={newAlert.operator}
                  onValueChange={(value: any) => setNewAlert({ ...newAlert, operator: value })}
                >
                  <SelectTrigger id="operator">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=">">Greater than</SelectItem>
                    <SelectItem value="<">Less than</SelectItem>
                    <SelectItem value=">=">Greater or equal</SelectItem>
                    <SelectItem value="==">Equals</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold">Threshold</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={newAlert.threshold || ""}
                  onChange={(e) =>
                    setNewAlert({ ...newAlert, threshold: parseInt(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel">Notification Channel</Label>
                <Select
                  value={newAlert.notification_channel}
                  onValueChange={(value: any) =>
                    setNewAlert({ ...newAlert, notification_channel: value })
                  }
                >
                  <SelectTrigger id="channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </div>
                    </SelectItem>
                    <SelectItem value="slack">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Slack
                      </div>
                    </SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target">
                  {newAlert.notification_channel === "email"
                    ? "Email Address"
                    : newAlert.notification_channel === "slack"
                    ? "Slack Webhook URL"
                    : "Webhook URL"}
                </Label>
                <Input
                  id="target"
                  placeholder={
                    newAlert.notification_channel === "email"
                      ? "admin@example.com"
                      : "https://..."
                  }
                  value={newAlert.notification_target || ""}
                  onChange={(e) =>
                    setNewAlert({ ...newAlert, notification_target: e.target.value })
                  }
                />
              </div>
            </div>

            <Button onClick={addAlert} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Add Alert Rule
            </Button>
          </CardContent>
        </Card>

        {/* Existing Alerts */}
        <div className="space-y-3">
          <h3 className="font-semibold">Active Alert Rules</h3>
          {alerts && alerts.length > 0 ? (
            alerts.map((alert: AlertRule) => (
              <Card key={alert.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{alert.name}</h4>
                        <Switch
                          checked={alert.is_active}
                          onCheckedChange={() => toggleAlert(alert.id)}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {metricOptions.find((m) => m.value === alert.metric)?.label}{" "}
                        {alert.operator} {alert.threshold} → {alert.notification_channel} (
                        {alert.notification_target})
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAlert(alert.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No alert rules configured yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
