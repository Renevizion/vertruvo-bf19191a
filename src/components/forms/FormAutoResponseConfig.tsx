import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Sparkles, FileText, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AutoResponseConfig {
  enabled: boolean;
  mode: 'template' | 'ai';
  templateMessage: string;
  aiPrompt: string;
  aiLength: 'short' | 'medium';
  aiStrictMode: boolean;
}

interface FormAutoResponseConfigProps {
  formId: string;
  initialConfig?: AutoResponseConfig | null;
}

const DEFAULT_TEMPLATE = `Hi {{name}},

Thank you for reaching out! We received your submission and will get back to you as soon as possible.

Best regards,
{{business_name}}`;

const DEFAULT_AI_PROMPT = "Thank them for their inquiry. Mention we'll follow up soon.";

export function FormAutoResponseConfig({ formId, initialConfig }: FormAutoResponseConfigProps) {
  const [config, setConfig] = useState<AutoResponseConfig>({
    enabled: initialConfig?.enabled ?? false,
    mode: initialConfig?.mode ?? 'template',
    templateMessage: initialConfig?.templateMessage ?? DEFAULT_TEMPLATE,
    aiPrompt: initialConfig?.aiPrompt ?? DEFAULT_AI_PROMPT,
    aiLength: initialConfig?.aiLength ?? 'short',
    aiStrictMode: initialConfig?.aiStrictMode ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('forms')
        .update({ auto_response_config: config as any })
        .eq('id', formId);

      if (error) throw error;
      toast.success("Auto-response settings saved");
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm">Auto-Response Email</h3>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
        />
      </div>

      {config.enabled && (
        <>
          {/* Mode selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setConfig(prev => ({ ...prev, mode: 'template' }))}
              className={`p-3 rounded-lg border text-left transition-all ${
                config.mode === 'template'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <FileText className="w-4 h-4" />
                <span className="font-medium text-xs">Template</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Merge variables, no AI cost</p>
            </button>

            <button
              onClick={() => setConfig(prev => ({ ...prev, mode: 'ai' }))}
              className={`p-3 rounded-lg border text-left transition-all ${
                config.mode === 'ai'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-4 h-4" />
                <span className="font-medium text-xs">AI-Crafted</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Personalized per submission</p>
            </button>
          </div>

          {config.mode === 'template' ? (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Template Message</Label>
              <div className="flex flex-wrap gap-1 mb-1">
                {['name', 'email', 'company', 'business_name', 'phone'].map(v => (
                  <Badge
                    key={v}
                    variant="outline"
                    className="text-[10px] cursor-pointer hover:bg-accent"
                    onClick={() => setConfig(prev => ({
                      ...prev,
                      templateMessage: prev.templateMessage + ` {{${v}}}`
                    }))}
                  >
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
              <Textarea
                value={config.templateMessage}
                onChange={(e) => setConfig(prev => ({ ...prev, templateMessage: e.target.value }))}
                rows={5}
                className="text-xs font-mono"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Instructions for AI</Label>
                <Textarea
                  value={config.aiPrompt}
                  onChange={(e) => setConfig(prev => ({ ...prev, aiPrompt: e.target.value }))}
                  rows={3}
                  className="text-xs"
                  placeholder="e.g. Thank them, mention we'll follow up within 24 hours..."
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="space-y-1 flex-1">
                  <Label className="text-xs font-medium">Length</Label>
                  <Select
                    value={config.aiLength}
                    onValueChange={(v) => setConfig(prev => ({ ...prev, aiLength: v as 'short' | 'medium' }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short (1-2 sentences)</SelectItem>
                      <SelectItem value="medium">Medium (2-4 sentences)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Strict Mode
                  </Label>
                  <div className="flex items-center gap-2 h-8">
                    <Switch
                      checked={config.aiStrictMode}
                      onCheckedChange={(v) => setConfig(prev => ({ ...prev, aiStrictMode: v }))}
                    />
                    <span className="text-[11px] text-muted-foreground">
                      {config.aiStrictMode ? "On" : "Off"}
                    </span>
                  </div>
                </div>
              </div>

              {config.aiStrictMode && (
                <p className="text-[11px] text-muted-foreground bg-muted/50 rounded p-2">
                  Strict mode prevents the AI from inventing details — it will only reference information the submitter actually provided.
                </p>
              )}
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} size="sm" className="w-full">
            {saving ? "Saving..." : "Save Auto-Response Settings"}
          </Button>
        </>
      )}
    </Card>
  );
}
