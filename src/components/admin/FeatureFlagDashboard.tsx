import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Flag, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  rolloutPercentage: number;
}

export const FeatureFlagDashboard = () => {
  const queryClient = useQueryClient();
  const [newFlag, setNewFlag] = useState<Partial<FeatureFlag>>({
    enabled: false,
    rolloutPercentage: 100,
  });

  const { data: flags } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_config")
        .select("*")
        .eq("key", "feature_flags")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return (data?.value as any)?.flags || [];
    },
  });

  const saveFlags = useMutation({
    mutationFn: async (updatedFlags: FeatureFlag[]) => {
      const { error } = await supabase
        .from("platform_config")
        .upsert({
          key: "feature_flags",
          value: { flags: updatedFlags } as any,
          description: "Feature flags configuration",
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
      toast.success("Feature flags updated");
    },
  });

  const addFlag = () => {
    if (!newFlag.name || !newFlag.description) {
      toast.error("Please fill in name and description");
      return;
    }

    const flag: FeatureFlag = {
      name: newFlag.name!,
      description: newFlag.description!,
      enabled: newFlag.enabled!,
      rolloutPercentage: newFlag.rolloutPercentage!,
    };

    saveFlags.mutate([...(flags || []), flag]);
    setNewFlag({ enabled: false, rolloutPercentage: 100 });
  };

  const toggleFlag = (name: string) => {
    const updated = (flags || []).map((f: FeatureFlag) =>
      f.name === name ? { ...f, enabled: !f.enabled } : f
    );
    saveFlags.mutate(updated);
  };

  const updateRollout = (name: string, percentage: number) => {
    const updated = (flags || []).map((f: FeatureFlag) =>
      f.name === name ? { ...f, rolloutPercentage: percentage } : f
    );
    saveFlags.mutate(updated);
  };

  const deleteFlag = (name: string) => {
    const updated = (flags || []).filter((f: FeatureFlag) => f.name !== name);
    saveFlags.mutate(updated);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-5 w-5" />
          Feature Flag Dashboard
        </CardTitle>
        <CardDescription>
          Control feature availability across your platform with gradual rollouts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* New Flag Form */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Create New Feature Flag</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="flag-name">Flag Name</Label>
                <Input
                  id="flag-name"
                  placeholder="new_dashboard_ui"
                  value={newFlag.name || ""}
                  onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="flag-description">Description</Label>
                <Textarea
                  id="flag-description"
                  placeholder="Enable the redesigned dashboard interface"
                  value={newFlag.description || ""}
                  onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rollout">Rollout Percentage: {newFlag.rolloutPercentage}%</Label>
                <Slider
                  id="rollout"
                  value={[newFlag.rolloutPercentage || 100]}
                  onValueChange={([value]) =>
                    setNewFlag({ ...newFlag, rolloutPercentage: value })
                  }
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">Enabled by default</Label>
                <Switch
                  id="enabled"
                  checked={newFlag.enabled}
                  onCheckedChange={(checked) => setNewFlag({ ...newFlag, enabled: checked })}
                />
              </div>
            </div>

            <Button onClick={addFlag} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Feature Flag
            </Button>
          </CardContent>
        </Card>

        {/* Existing Flags */}
        <div className="space-y-3">
          <h3 className="font-semibold">Active Feature Flags</h3>
          {flags && flags.length > 0 ? (
            flags.map((flag: FeatureFlag) => (
              <Card key={flag.name}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium font-mono text-sm">{flag.name}</h4>
                          {flag.enabled ? (
                            <Badge className="bg-success text-success-foreground">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Disabled</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{flag.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={flag.enabled}
                          onCheckedChange={() => toggleFlag(flag.name)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteFlag(flag.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <Label>Rollout: {flag.rolloutPercentage}%</Label>
                        <span className="text-muted-foreground">
                          {flag.rolloutPercentage < 100
                            ? `${flag.rolloutPercentage}% of users`
                            : "All users"}
                        </span>
                      </div>
                      <Slider
                        value={[flag.rolloutPercentage]}
                        onValueChange={([value]) => updateRollout(flag.name, value)}
                        max={100}
                        step={5}
                        disabled={!flag.enabled}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No feature flags configured yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
