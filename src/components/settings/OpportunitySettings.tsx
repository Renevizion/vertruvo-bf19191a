import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export function OpportunitySettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    allow_different_contact_opportunity_names: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("opportunity_settings")
      .select("*")
      .single();

    if (data) {
      setSettings({
        allow_different_contact_opportunity_names: data.allow_different_contact_opportunity_names || false,
      });
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { data: existing } = await supabase
        .from("opportunity_settings")
        .select("id")
        .single();

      if (existing) {
        await supabase
          .from("opportunity_settings")
          .update(settings)
          .eq("id", existing.id);
      } else {
        await supabase.from("opportunity_settings").insert(settings);
      }

      toast({
        title: "Success",
        description: "Opportunity settings updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Opportunity Settings</h3>

      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <Switch
            checked={settings.allow_different_contact_opportunity_names}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, allow_different_contact_opportunity_names: checked })
            }
          />
          <div className="space-y-1">
            <Label className="text-base">
              Allow different names for Contacts and Opportunities
            </Label>
            <p className="text-sm text-muted-foreground">
              When enabled, contacts and their associated opportunities can have different names.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}