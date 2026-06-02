import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Webhook, ExternalLink, Check, Copy, CheckCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { WebhookTestPanel } from './WebhookTestPanel';

interface WebhookIntegration {
  id: string;
  name: string;
  description: string;
  provider: string;
  logo_url: string;
  is_premium: boolean;
  is_active: boolean;
}

interface WebhookConfig {
  id: string;
  integration_id: string;
  name: string;
  url: string;
  is_active: boolean;
  is_verified: boolean;
}

const THERMI_INBOUND_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-inbound`;

export function WebhookMarketplace() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIntegration, setSelectedIntegration] = useState<WebhookIntegration | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookName, setWebhookName] = useState("");
  const [copied, setCopied] = useState(false);

  const copyInboundUrl = () => {
    navigator.clipboard.writeText(THERMI_INBOUND_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { data: integrations } = useQuery({
    queryKey: ['webhook-integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_integrations')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as WebhookIntegration[];
    }
  });

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    }
  });

  const { data: workspace } = useQuery({
    queryKey: ['user-workspace', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', session.user.id)
        .single();
      return data;
    },
    enabled: !!session?.user?.id
  });

  const { data: configs } = useQuery({
    queryKey: ['webhook-configs', workspace?.workspace_id],
    queryFn: async () => {
      if (!workspace?.workspace_id) return [];
      const { data, error } = await supabase
        .from('webhook_configs')
        .select('*')
        .eq('workspace_id', workspace.workspace_id);
      
      if (error) throw error;
      return data as WebhookConfig[];
    },
    enabled: !!workspace?.workspace_id
  });

  const createWebhookMutation = useMutation({
    mutationFn: async () => {
      if (!workspace?.workspace_id || !selectedIntegration) throw new Error("Missing data");
      
      const { error } = await supabase
        .from('webhook_configs')
        .insert({
          workspace_id: workspace.workspace_id,
          integration_id: selectedIntegration.id,
          name: webhookName || selectedIntegration.name,
          url: webhookUrl,
          is_active: true,
          events: ['*']
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-configs'] });
      setSelectedIntegration(null);
      setWebhookUrl("");
      setWebhookName("");
      toast({ title: "Webhook configured successfully" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to configure webhook",
        variant: "destructive"
      });
    }
  });

  const isIntegrationConfigured = (integrationId: string) => {
    return configs?.some(c => c.integration_id === integrationId && c.is_active);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <h2 className="text-2xl font-bold">Webhook Integrations</h2>
          <p className="text-muted-foreground">Connect with popular services and automation tools</p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Thermi Inbound Webhook URL</p>
          <p className="text-xs text-muted-foreground">Give this URL to external services (Zapier, Make, etc.) to send data into Thermi.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-background border rounded px-3 py-2 font-mono truncate">{THERMI_INBOUND_URL}</code>
            <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={copyInboundUrl}>
              {copied ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {!integrations || integrations.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <Webhook className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">No integrations available yet</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          integrations.map((integration) => {
            const isConfigured = isIntegrationConfigured(integration.id);
            return (
              <Card key={integration.id} className={isConfigured ? 'border-primary' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {integration.name}
                        {integration.is_premium && (
                          <Badge variant="secondary" className="text-xs">Premium</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {integration.description}
                      </CardDescription>
                    </div>
                    {isConfigured && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant={isConfigured ? "outline" : "default"}
                        size="sm"
                        className="w-full"
                        onClick={() => setSelectedIntegration(integration)}
                      >
                        {isConfigured ? 'Reconfigure' : 'Connect'}
                        <ExternalLink className="h-3 w-3 ml-2" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Configure {integration.name}</DialogTitle>
                        <DialogDescription>
                          Set up your {integration.name} webhook to receive events from Thermi
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="webhook-name">Webhook Name</Label>
                          <Input
                            id="webhook-name"
                            placeholder={`${integration.name} Webhook`}
                            value={webhookName}
                            onChange={(e) => setWebhookName(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="webhook-url">Webhook URL</Label>
                          <Input
                            id="webhook-url"
                            placeholder="https://your-webhook-url.com/endpoint"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Get this URL from your {integration.name} account
                          </p>
                      </div>
                      <Button
                        onClick={() => createWebhookMutation.mutate()}
                        disabled={!webhookUrl}
                        className="w-full"
                      >
                        Save Configuration
                      </Button>
                      
                      {webhookUrl && (
                        <div className="pt-4 border-t mt-4">
                          <p className="text-xs font-medium mb-2">Test this webhook before saving:</p>
                          <WebhookTestPanel webhookId={selectedIntegration?.id || ''} webhookUrl={webhookUrl} />
                        </div>
                      )}
                    </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
