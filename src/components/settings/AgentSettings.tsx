import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useAgentSettings } from "@/hooks/useAgentSettings";
import { useToast } from "@/hooks/use-toast";

export function AgentSettings() {
  const { enabled, tier, provider, loading, updateSettings } = useAgentSettings();
  const { toast } = useToast();

  const handleToggle = async (checked: boolean) => {
    await updateSettings({ enabled: checked });
    toast({
      title: checked ? "AI Intelligence Enabled" : "AI Intelligence Disabled",
      description: checked 
        ? "Automatic AI insights are now active across your CRM" 
        : "AI insights have been turned off"
    });
  };

  const handleTierChange = async (newTier: 'basic' | 'premium') => {
    await updateSettings({ tier: newTier });
    toast({
      title: "Tier Updated",
      description: `Switched to Thermi AI ${newTier === 'premium' ? 'Pro' : 'Standard'}`
    });
  };

  const handleProviderChange = async (newProvider: 'mistral' | 'gemini') => {
    await updateSettings({ provider: newProvider });
    toast({
      title: "Routing updated",
      description: `Thermi AI is now routing through ${newProvider === 'gemini' ? 'Gemini' : 'Mistral'} models`
    });
  };

  if (loading) {
    return <div className="animate-pulse h-32 bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>AI Intelligence Settings</CardTitle>
        </div>
        <CardDescription>
          Configure automatic AI insights and recommendations across your CRM
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Agent Features */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="agent-toggle" className="text-base">
              Enable AI Intelligence
            </Label>
            <p className="text-sm text-muted-foreground">
              Turn on automatic AI summaries, suggestions, and insights
            </p>
          </div>
          <Switch
            id="agent-toggle"
            checked={enabled}
            onCheckedChange={handleToggle}
          />
        </div>

        {/* Thermi AI Routing */}
        {enabled && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label htmlFor="ai-provider">Underlying model routing</Label>
              <Badge variant="outline" className="text-[10px]">Advanced</Badge>
            </div>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger id="ai-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">Thermi AI · Gemini route (default)</SelectItem>
                <SelectItem value="mistral">Thermi AI · Mistral route</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              All AI runs through the Thermi AI gateway with metered billing on your subscription. You only change which underlying model handles your insights.
            </p>
          </div>
        )}

        {/* Thermi AI Tier */}
        {enabled && (
          <div className="space-y-3 pt-4 border-t">
            <Label htmlFor="agent-tier">Thermi AI tier</Label>
            <Select value={tier} onValueChange={handleTierChange}>
              <SelectTrigger id="agent-tier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">
                  <div className="flex items-center gap-2">
                    <span>Standard</span>
                    <Badge variant="secondary" className="text-xs">Fast · Low cost</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="premium">
                  <div className="flex items-center gap-2">
                    <span>Pro</span>
                    <Badge className="text-xs">Deeper reasoning</Badge>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {tier === 'basic' 
                ? 'Thermi AI Standard — fast, cost-efficient insights for everyday workflows.' 
                : 'Thermi AI Pro — advanced reasoning for forecasting, scoring and complex analysis.'}
            </p>
          </div>
        )}

        {/* Feature List */}
        {enabled && (
          <div className="space-y-3 pt-4 border-t">
            <Label>Active Features</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-xs">Lead Intelligence</Badge>
                <span className="text-muted-foreground">Summaries, scoring & action suggestions</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-xs">Contact Insights</Badge>
                <span className="text-muted-foreground">Engagement analysis & best contact times</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-xs">KPI Analysis</Badge>
                <span className="text-muted-foreground">Trend insights & performance alerts</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-xs">Task Suggestions</Badge>
                <span className="text-muted-foreground">Smart prioritization & gap detection</span>
              </div>
              {tier === 'premium' && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge className="text-xs">Advanced Analytics</Badge>
                  <span className="text-muted-foreground">Pipeline forecasting & deep scoring</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}