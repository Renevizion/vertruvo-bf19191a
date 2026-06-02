import { Card } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Zap, CheckCircle2, AlertCircle, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { GoogleSheetsIntegration } from "./GoogleSheetsIntegration";
import { EmailSettings } from "./EmailSettings";
import { WebhookManager } from "../admin/WebhookManager";

export const IntegrationEcosystem = () => {
  const navigate = useNavigate();
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  
  // Check Google Sheets integration
  const { data: googleSheetsStatus, refetch: refetchSheets } = useQuery({
    queryKey: ['google-sheets-status'],
    queryFn: async () => {
      const { data } = await supabase
        .from('google_sheet_integrations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        active: !!data, // Any integration record means connected
        configured: !!data?.sheet_id,
        lastSync: data?.last_synced_at ? new Date(data.last_synced_at).toLocaleDateString() : null,
      };
    },
  });

  // Check Twilio integration
  const { data: twilioStatus } = useQuery({
    queryKey: ['twilio-status'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { active: false, numbers: 0 };

      const { data: workspaceData } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', session.user.id)
        .single();

      if (!workspaceData) return { active: false, numbers: 0 };

      const { data: numbers, count } = await supabase
        .from('twilio_phone_numbers')
        .select('*', { count: 'exact' })
        .eq('workspace_id', workspaceData.workspace_id)
        .eq('is_active', true);

      return {
        active: (count || 0) > 0,
        numbers: count || 0,
      };
    },
  });

  // Check workflows
  const { data: workflowStatus } = useQuery({
    queryKey: ['workflow-status'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { active: 0, total: 0 };

      const { data: workspaceData } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', session.user.id)
        .single();

      if (!workspaceData) return { active: 0, total: 0 };

      const { data: workflows } = await supabase
        .from('workflows')
        .select('is_active')
        .eq('workspace_id', workspaceData.workspace_id);

      const active = workflows?.filter(w => w.is_active).length || 0;
      const total = workflows?.length || 0;

      return { active, total };
    },
  });

  // Check AI agents
  const { data: agentStatus } = useQuery({
    queryKey: ['agent-status'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { active: 0, total: 0 };

      const { data: workspaceData } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', session.user.id)
        .single();

      if (!workspaceData) return { active: 0, total: 0 };

      const { data: agents } = await supabase
        .from('ai_agents')
        .select('status')
        .eq('workspace_id', workspaceData.workspace_id);

      const active = agents?.filter(a => a.status === 'active').length || 0;
      const total = agents?.length || 0;

      return { active, total };
    },
  });

  const integrations = {
    communication: [
      {
        name: "Twilio",
        status: twilioStatus?.active ? "Active" : "Not Connected",
        syncs: twilioStatus?.active ? `${twilioStatus.numbers} numbers` : "No numbers",
        active: twilioStatus?.active || false,
        action: () => navigate('/settings?tab=phone-numbers'),
        enabled: true,
      },
      {
        name: "Email Services",
        status: "Available",
        syncs: "Not configured",
        active: false,
        action: () => setOpenDialog('email'),
        enabled: true,
      },
      {
        name: "Messaging",
        status: "Coming Soon",
        syncs: "Not configured",
        active: false,
        action: null,
        enabled: false,
      },
    ],
    data: [
      {
        name: "Google Sheets",
        status: googleSheetsStatus?.active ? "Active" : "Not Connected",
        syncs: googleSheetsStatus?.active ? (googleSheetsStatus.configured ? `Sheet configured` : 'Connected') : "Not syncing",
        active: googleSheetsStatus?.active || false,
        action: () => setOpenDialog('sheets'),
        enabled: true,
      },
      {
        name: "Webhooks",
        status: "Available",
        syncs: "Configure webhooks",
        active: false,
        action: () => setOpenDialog('webhooks'),
        enabled: true,
      },
      {
        name: "API Access",
        status: "Enabled",
        syncs: "Full control",
        active: true,
        action: null,
        enabled: true,
      },
    ],
    automation: [
      {
        name: "Custom Workflows",
        status: workflowStatus?.active ? `${workflowStatus.active} Active` : "No workflows",
        syncs: workflowStatus?.total ? `${workflowStatus.total} total` : "Create first workflow",
        active: (workflowStatus?.active || 0) > 0,
        action: () => navigate('/automations'),
        enabled: true,
      },
      {
        name: "AI Assistants",
        status: agentStatus?.active ? `${agentStatus.active} Active` : "No agents",
        syncs: agentStatus?.total ? `${agentStatus.total} deployed` : "Create first agent",
        active: (agentStatus?.active || 0) > 0,
        action: () => navigate('/settings?tab=conversations-ai'),
        enabled: true,
      },
      {
        name: "Calendars",
        status: "Coming Soon",
        syncs: "Not configured",
        active: false,
        action: null,
        enabled: false,
      },
    ],
  };

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-6 flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary" />
        Connected Workspace
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <h4 className="text-sm font-medium mb-3">Communication</h4>
          <div className="space-y-2">
            {integrations.communication.map((integration, idx) => (
              <div 
                key={idx} 
                className={`p-3 border rounded-lg transition-all ${
                  integration.enabled ? 'cursor-pointer hover:shadow-md' : 'opacity-50 cursor-not-allowed'
                }`}
                onClick={() => integration.enabled && integration.action && integration.action()}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-sm">{integration.name}</div>
                  <Badge 
                    variant={integration.active ? "default" : "secondary"}
                    className={integration.active ? "bg-green-600" : ""}
                  >
                    {integration.active ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                    {integration.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">{integration.syncs}</div>
                  {integration.enabled && integration.action && (
                    <Settings className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-3">Data & Analytics</h4>
          <div className="space-y-2">
            {integrations.data.map((integration, idx) => (
              <div 
                key={idx} 
                className={`p-3 border rounded-lg transition-all ${
                  integration.enabled ? 'cursor-pointer hover:shadow-md' : 'opacity-50 cursor-not-allowed'
                }`}
                onClick={() => integration.enabled && integration.action && integration.action()}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-sm">{integration.name}</div>
                  <Badge 
                    variant={integration.active ? "default" : "secondary"}
                    className={integration.active ? "bg-green-600" : ""}
                  >
                    {integration.active ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                    {integration.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">{integration.syncs}</div>
                  {integration.enabled && integration.action && (
                    <Settings className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-3">Workflow Automation</h4>
          <div className="space-y-2">
            {integrations.automation.map((integration, idx) => (
              <div 
                key={idx} 
                className={`p-3 border rounded-lg transition-all ${
                  integration.enabled ? 'cursor-pointer hover:shadow-md' : 'opacity-50 cursor-not-allowed'
                }`}
                onClick={() => integration.enabled && integration.action && integration.action()}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-sm">{integration.name}</div>
                  <Badge 
                    variant={integration.active ? "default" : "secondary"}
                    className={integration.active ? "bg-blue-600" : ""}
                  >
                    {integration.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">{integration.syncs}</div>
                  {integration.enabled && integration.action && (
                    <Settings className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-sm mb-1">Seamless Data Flow</h4>
            <p className="text-xs text-muted-foreground">
              All your tools work together automatically. Data syncs in real-time across platforms, 
              triggers workflows based on events, and keeps your team productive without manual work.
            </p>
          </div>
        </div>
      </div>

      {/* Google Sheets Dialog */}
      <Dialog open={openDialog === 'sheets'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Google Sheets Integration</DialogTitle>
          </DialogHeader>
          <GoogleSheetsIntegration />
        </DialogContent>
      </Dialog>

      {/* Email Settings Dialog */}
      <Dialog open={openDialog === 'email'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Settings</DialogTitle>
          </DialogHeader>
          <EmailSettings />
        </DialogContent>
      </Dialog>

      {/* Webhooks Dialog */}
      <Dialog open={openDialog === 'webhooks'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Webhook Configuration</DialogTitle>
          </DialogHeader>
          <WebhookManager />
        </DialogContent>
      </Dialog>
    </Card>
  );
};