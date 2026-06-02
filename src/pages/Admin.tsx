import { useState } from "react";
import { useIsPlatformAdmin } from "@/hooks/useIsAdmin";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Settings, Webhook, Database, Shield, Users, Key, MessageCircle, CreditCard, CheckSquare, Mail } from "lucide-react";
import { MonitoringDashboard } from "@/components/admin/MonitoringDashboard";
import { AuditLogsViewer } from "@/components/admin/AuditLogsViewer";
import { WebhookManager } from "@/components/admin/WebhookManager";
import { PlatformConfig } from "@/components/admin/PlatformConfig";
import { UserRoleManagement } from "@/components/admin/UserRoleManagement";
import { HealthAlertsConfig } from "@/components/admin/HealthAlertsConfig";
import { WorkflowTemplateLibrary } from "@/components/admin/WorkflowTemplateLibrary";
import { TemplateLibraryAnalytics } from "@/components/admin/TemplateLibraryAnalytics";
import { AgentTemplateLibrary } from "@/components/admin/AgentTemplateLibrary";
import { DataExportTools } from "@/components/admin/DataExportTools";

import { FeatureFlagDashboard } from "@/components/admin/FeatureFlagDashboard";
import { AutomatedBackups } from "@/components/admin/AutomatedBackups";
import { PlatformAPIKeys } from "@/components/admin/PlatformAPIKeys";
import { FeedbackManager } from "@/components/admin/FeedbackManager";
import { SubscriptionOverridesManager } from "@/components/admin/SubscriptionOverridesManager";
import { FeatureProgressWidget } from "@/components/dashboard/FeatureProgressWidget";
import { EmailMonitoringDashboard } from "@/components/admin/EmailMonitoringDashboard";
import { TwilioTrialBanner } from "@/components/admin/TwilioTrialBanner";
import { PageHeader } from "@/components/layout/PageHeader";

const Admin = () => {
  const { isPlatformAdmin, isLoading } = useIsPlatformAdmin();
  const [activeTab, setActiveTab] = useState("monitoring");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto py-4 md:py-6 px-0 md:px-2 space-y-4 md:space-y-6">
      <PageHeader
        eyebrow="System"
        title="Admin"
        description="System-wide monitoring, configuration, and audit tools."
        actions={<Shield className="h-6 w-6 md:h-8 md:w-8 text-primary flex-shrink-0" />}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
        {/* Mobile: Dropdown selector, Desktop: Scrollable tabs */}
        <div className="md:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monitoring">
                <div className="flex items-center gap-2"><Activity className="h-4 w-4" /> Monitor</div>
              </SelectItem>
              <SelectItem value="users">
                <div className="flex items-center gap-2"><Users className="h-4 w-4" /> Users</div>
              </SelectItem>
              <SelectItem value="audit">
                <div className="flex items-center gap-2"><Database className="h-4 w-4" /> Audit</div>
              </SelectItem>
              <SelectItem value="webhooks">
                <div className="flex items-center gap-2"><Webhook className="h-4 w-4" /> Webhooks</div>
              </SelectItem>
              <SelectItem value="flags">
                <div className="flex items-center gap-2"><Shield className="h-4 w-4" /> Flags</div>
              </SelectItem>
              <SelectItem value="backups">
                <div className="flex items-center gap-2"><Database className="h-4 w-4" /> Backups</div>
              </SelectItem>
              <SelectItem value="workflow-templates">
                <div className="flex items-center gap-2"><Activity className="h-4 w-4" /> Workflows</div>
              </SelectItem>
              <SelectItem value="agent-templates">
                <div className="flex items-center gap-2"><Activity className="h-4 w-4" /> Agents</div>
              </SelectItem>
              <SelectItem value="api-keys">
                <div className="flex items-center gap-2"><Key className="h-4 w-4" /> API Keys</div>
              </SelectItem>
              <SelectItem value="analytics">
                <div className="flex items-center gap-2"><Activity className="h-4 w-4" /> Analytics</div>
              </SelectItem>
              <SelectItem value="export">
                <div className="flex items-center gap-2"><Database className="h-4 w-4" /> Export</div>
              </SelectItem>
              <SelectItem value="feedback">
                <div className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Feedback</div>
              </SelectItem>
              <SelectItem value="subscriptions">
                <div className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Subscriptions</div>
              </SelectItem>
              <SelectItem value="features">
                <div className="flex items-center gap-2"><CheckSquare className="h-4 w-4" /> Features</div>
              </SelectItem>
              <SelectItem value="emails">
                <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> Emails</div>
              </SelectItem>
              <SelectItem value="config">
                <div className="flex items-center gap-2"><Settings className="h-4 w-4" /> Config</div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Desktop: Vertical sidebar like Settings */}
        <div className="hidden md:flex gap-4">
          <div className="w-36 flex-shrink-0 border-r border-border pr-2">
            <TabsList className="flex flex-col h-auto bg-transparent gap-0.5 w-full">
              {[
                { value: "monitoring", icon: Activity, label: "Monitor" },
                { value: "users", icon: Users, label: "Users" },
                { value: "audit", icon: Database, label: "Audit" },
                { value: "webhooks", icon: Webhook, label: "Webhooks" },
                { value: "flags", icon: Shield, label: "Flags" },
                { value: "backups", icon: Database, label: "Backups" },
                { value: "workflow-templates", icon: Activity, label: "Workflows" },
                { value: "agent-templates", icon: Activity, label: "Agents" },
                { value: "api-keys", icon: Key, label: "API Keys" },
                { value: "analytics", icon: Activity, label: "Analytics" },
                { value: "export", icon: Database, label: "Export" },
                { value: "feedback", icon: MessageCircle, label: "Feedback" },
                { value: "subscriptions", icon: CreditCard, label: "Subscriptions" },
                { value: "features", icon: CheckSquare, label: "Features" },
                { value: "emails", icon: Mail, label: "Emails" },
                { value: "config", icon: Settings, label: "Config" },
              ].map(({ value, icon: Icon, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="w-full justify-start gap-2 text-xs px-2 py-1.5 h-auto data-[state=active]:bg-primary/10"
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div className="flex-1 min-w-0">
            <TabsContent value="monitoring" className="space-y-6 mt-0">
              <TwilioTrialBanner />
              <MonitoringDashboard />
            </TabsContent>

            <TabsContent value="users" className="space-y-6 mt-0">
              <UserRoleManagement />
            </TabsContent>

            <TabsContent value="audit" className="space-y-6 mt-0">
              <AuditLogsViewer />
            </TabsContent>

            <TabsContent value="webhooks" className="space-y-6 mt-0">
              <WebhookManager />
            </TabsContent>

            <TabsContent value="alerts" className="space-y-6 mt-0">
              <HealthAlertsConfig />
            </TabsContent>

            <TabsContent value="flags" className="space-y-6 mt-0">
              <FeatureFlagDashboard />
            </TabsContent>

            <TabsContent value="backups" className="space-y-6 mt-0">
              <AutomatedBackups />
            </TabsContent>

            <TabsContent value="workflow-templates" className="space-y-6 mt-0">
              <WorkflowTemplateLibrary />
            </TabsContent>

            <TabsContent value="agent-templates" className="space-y-6 mt-0">
              <AgentTemplateLibrary />
            </TabsContent>

            <TabsContent value="api-keys" className="space-y-6 mt-0">
              <PlatformAPIKeys />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6 mt-0">
              <TemplateLibraryAnalytics />
            </TabsContent>

            <TabsContent value="export" className="space-y-6 mt-0">
              <DataExportTools />
            </TabsContent>

            <TabsContent value="feedback" className="space-y-6 mt-0">
              <FeedbackManager />
            </TabsContent>

            <TabsContent value="subscriptions" className="space-y-6 mt-0">
              <SubscriptionOverridesManager />
            </TabsContent>

            <TabsContent value="features" className="space-y-6 mt-0">
              <FeatureProgressWidget />
            </TabsContent>

            <TabsContent value="config" className="space-y-6 mt-0">
              <PlatformConfig />
            </TabsContent>

            <TabsContent value="emails" className="space-y-6 mt-0">
              <EmailMonitoringDashboard />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default Admin;
