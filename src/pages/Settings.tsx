import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Plus, Bot, FileText, Phone, Mail, Users, Building2, User, CreditCard, Sparkles, Package, Tag, Mic, Voicemail, Radio, FileAudio, Gift, Zap, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from 'react-router-dom';
import { CreateAgentDialog } from "@/components/ai-agents/CreateAgentDialog";
import { AgentCard } from "@/components/ai-agents/AgentCard";
import { CreateKnowledgeBaseDialog } from "@/components/knowledge-base/CreateKnowledgeBaseDialog";
import { KnowledgeBaseCard } from "@/components/knowledge-base/KnowledgeBaseCard";
import { BusinessProfileForm } from "@/components/settings/BusinessProfileForm";
import { MyProfileForm } from "@/components/settings/MyProfileForm";
import { StaffManagement } from "@/components/settings/StaffManagement";
import { PermissionsManagement } from "@/components/settings/PermissionsManagement";
import { OpportunitySettings } from "@/components/settings/OpportunitySettings";

import { AIIntegrationSettings } from "@/components/settings/AIIntegrationSettings";
import { ElevenLabsConnectPanel } from "@/components/settings/ElevenLabsConnectPanel";
import { TwilioSettings } from "@/components/settings/TwilioSettings";
import { TwilioConnectPanel } from "@/components/settings/TwilioConnectPanel";
import { BillingSection } from "@/components/settings/BillingSection";
import { StripeConnectSetup } from "@/components/settings/StripeConnectSetup";
import { CustomFieldsManager } from "@/components/settings/CustomFieldsManager";
import { IntegrationEcosystem } from "@/components/settings/IntegrationEcosystem";
import { EmailSettings } from "@/components/settings/EmailSettings";
import { WebhookMarketplace } from "@/components/webhooks/WebhookMarketplace";
import { useIsPlatformAdmin } from "@/hooks/useIsAdmin";
import PipelinesSettings from "./PipelinesSettings";
import { ItemsManager } from "@/components/pos/ItemsManager";
import { PromotionsManager } from "@/components/pos/PromotionsManager";
import { VoiceConversationHistory } from "@/components/voice/VoiceConversationHistory";
import { VoicemailDropsManager } from "@/components/voice/VoicemailDropsManager";
import { VoiceBroadcastManager } from "@/components/voice/VoiceBroadcastManager";
import { CallSummaryManager } from "@/components/voice/CallSummaryManager";
import { ReferralProgram } from "@/components/settings/ReferralProgram";
import { PageHeader } from "@/components/layout/PageHeader";

interface SettingsGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  tabs: { value: string; label: string; icon: React.ElementType }[];
}

const settingsGroups: SettingsGroup[] = [
  {
    id: "account",
    label: "Account",
    icon: User,
    tabs: [
      { value: "business-profile", label: "Business Profile", icon: Building2 },
      { value: "my-profile", label: "My Profile", icon: User },
      { value: "staff", label: "Staff & Permissions", icon: Users },
    ],
  },
  {
    id: "billing",
    label: "Billing & Payments",
    icon: CreditCard,
    tabs: [
      { value: "billing", label: "Subscription", icon: CreditCard },
      { value: "payments", label: "Payment Processing", icon: CreditCard },
      { value: "items", label: "Products & Items", icon: Package },
      { value: "promotions", label: "Promotions", icon: Tag },
    ],
  },
  {
    id: "ai",
    label: "AI & Agents",
    icon: Sparkles,
    tabs: [
      { value: "ai-intelligence", label: "AI Configuration", icon: Sparkles },
      { value: "conversations-ai", label: "Conversation Agents", icon: Bot },
      { value: "voice-ai", label: "Voice Agents", icon: Phone },
      { value: "knowledge-base", label: "Knowledge Base", icon: FileText },
    ],
  },
  {
    id: "voice",
    label: "Voice & Calling",
    icon: Phone,
    tabs: [
      { value: "phone-numbers", label: "Phone Numbers", icon: Phone },
      { value: "voice-history", label: "Call History", icon: Mic },
      { value: "voicemail-drops", label: "Voicemail Drops", icon: Voicemail },
      { value: "voice-broadcasts", label: "Broadcasts", icon: Radio },
      { value: "call-summaries", label: "Call Summaries", icon: FileAudio },
    ],
  },
  {
    id: "channels",
    label: "Channels & Email",
    icon: Mail,
    tabs: [
      { value: "email", label: "Email Settings", icon: Mail },
    ],
  },
  {
    id: "crm",
    label: "CRM & Pipeline",
    icon: Building2,
    tabs: [
      { value: "pipelines", label: "Pipelines", icon: Building2 },
      { value: "opportunities", label: "Lead Settings", icon: Building2 },
      { value: "custom-fields", label: "Custom Fields", icon: FileText },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Zap,
    tabs: [
      { value: "integrations", label: "Connected Apps", icon: Zap },
    ],
  },
  {
    id: "growth",
    label: "Growth",
    icon: Gift,
    tabs: [
      { value: "referrals", label: "Referral Program", icon: Gift },
    ],
  },
];

const Settings = () => {
  
  const { isPlatformAdmin } = useIsPlatformAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "business-profile";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [createAgentDialogOpen, setCreateAgentDialogOpen] = useState(false);
  const [createKBDialogOpen, setCreateKBDialogOpen] = useState(false);
  const [agentType, setAgentType] = useState<'voice' | 'conversation'>('conversation');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(() => {
    for (const g of settingsGroups) {
      if (g.tabs.some(t => t.value === initialTab)) return g.id;
    }
    return "account";
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value }, { replace: true });
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroup(prev => prev === groupId ? null : groupId);
  };

  const { data: agents, isLoading: agentsLoading, refetch: refetchAgents } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: knowledgeBases, isLoading: kbLoading, refetch: refetchKB } = useQuery({
    queryKey: ['knowledge-bases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_bases')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const conversationAgents = agents?.filter(a => a.type === 'conversation') || [];
  const voiceAgents = agents?.filter(a => a.type === 'voice') || [];

  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Manage your workspace, billing, integrations, and team preferences."
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Mobile horizontal scrollable - show groups */}
        <div className="md:hidden overflow-x-auto scrollbar-thin pb-2 -mx-1">
          <div className="flex gap-1 px-1 min-w-max">
            {settingsGroups.map((group) => {
              const Icon = group.icon;
              const isGroupActive = group.tabs.some(t => t.value === activeTab);
              return (
                <button
                  key={group.id}
                  onClick={() => {
                    setExpandedGroup(group.id);
                    handleTabChange(group.tabs[0].value);
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors ${
                    isGroupActive
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-3 h-3 flex-shrink-0" />
                  {group.label}
                </button>
              );
            })}
          </div>
          {/* Sub-tabs for active group on mobile */}
          {expandedGroup && (
            <div className="flex gap-1 px-1 mt-1.5 min-w-max">
              {settingsGroups.find(g => g.id === expandedGroup)?.tabs.map((tab) => {
                const isActive = activeTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => handleTabChange(tab.value)}
                    className={`px-2.5 py-1 text-[10px] rounded-full whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-foreground/10 text-foreground font-medium border border-border'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Layout wrapper */}
        <div className="flex gap-4">
          {/* Desktop sidebar with grouped navigation */}
          <div className="hidden md:block w-48 flex-shrink-0 border-r border-border pr-3">
            <nav className="space-y-1 sticky top-4 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin pr-1">
              {settingsGroups.map((group) => {
                const GroupIcon = group.icon;
                const isGroupExpanded = expandedGroup === group.id;
                const isGroupActive = group.tabs.some(t => t.value === activeTab);
                
                return (
                  <div key={group.id}>
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 text-xs rounded transition-colors ${
                        isGroupActive
                          ? 'text-foreground font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <GroupIcon className="w-3.5 h-3.5" />
                        {group.label}
                      </span>
                      <ChevronRight className={`w-3 h-3 transition-transform ${isGroupExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    {isGroupExpanded && (
                      <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-2">
                        {group.tabs.map((tab) => {
                          const TabIcon = tab.icon;
                          const isActive = activeTab === tab.value;
                          return (
                            <button
                              key={tab.value}
                              onClick={() => handleTabChange(tab.value)}
                              className={`w-full flex items-center gap-1.5 px-2 py-1 text-[11px] rounded transition-colors text-left ${
                                isActive
                                  ? 'bg-primary text-primary-foreground font-medium'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              }`}
                            >
                              <TabIcon className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{tab.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {/* Account */}
            <TabsContent value="business-profile" className="space-y-4 mt-0">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6">Business Profile Settings</h3>
                <BusinessProfileForm />
              </Card>
            </TabsContent>

            <TabsContent value="my-profile" className="space-y-4 mt-0">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6">My Profile</h3>
                <MyProfileForm />
              </Card>
            </TabsContent>

            <TabsContent value="staff" className="space-y-4 mt-0">
              <Card className="p-6">
                <StaffManagement />
              </Card>
              <Card className="p-6 mt-4">
                <h3 className="text-lg font-semibold mb-6">Roles & Permissions</h3>
                <PermissionsManagement />
              </Card>
            </TabsContent>

            {/* Billing */}
            <TabsContent value="billing" className="space-y-4 mt-0">
              {isPlatformAdmin ? (
                <BillingSection />
              ) : (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Subscription & Billing</h3>
                  <p className="text-muted-foreground">
                    Contact your workspace administrator for billing details.
                  </p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="payments" className="space-y-4 mt-0">
              <StripeConnectSetup />
            </TabsContent>

            <TabsContent value="items" className="space-y-4 mt-0">
              <ItemsManager />
            </TabsContent>

            <TabsContent value="promotions" className="space-y-4 mt-0">
              <PromotionsManager />
            </TabsContent>

            {/* AI & Agents */}
            <TabsContent value="ai-intelligence" className="space-y-6 mt-0">
              <AIIntegrationSettings />
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Voice AI</p>
                  <p className="text-lg font-bold mt-0.5">ElevenLabs</p>
                </div>
                <ElevenLabsConnectPanel />
              </div>
            </TabsContent>

            <TabsContent value="conversations-ai" className="space-y-4 mt-0">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-semibold">Conversation AI Agents</h3>
                  <p className="text-sm text-muted-foreground">Create and manage Chatbot AI Agents</p>
                </div>
                <Button onClick={() => { setAgentType('conversation'); setCreateAgentDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />Create Agent
                </Button>
              </div>
              {agentsLoading ? <p>Loading agents...</p> : conversationAgents.length === 0 ? (
                <Card className="p-12 text-center">
                  <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No Agent Created</h3>
                  <p className="text-muted-foreground mb-4">Create an Agent to get started.</p>
                  <Button onClick={() => { setAgentType('conversation'); setCreateAgentDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />Create Agent
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-4">{conversationAgents.map(agent => <AgentCard key={agent.id} agent={agent} onUpdate={refetchAgents} />)}</div>
              )}
            </TabsContent>

            <TabsContent value="voice-ai" className="space-y-4 mt-0">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-semibold">Voice AI Agents</h3>
                  <p className="text-sm text-muted-foreground">Create and manage Voice AI Agents for calls</p>
                </div>
                <Button onClick={() => { setAgentType('voice'); setCreateAgentDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />Create Agent
                </Button>
              </div>
              {agentsLoading ? <p>Loading agents...</p> : voiceAgents.length === 0 ? (
                <Card className="p-12 text-center">
                  <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No Voice Agent Created</h3>
                  <p className="text-muted-foreground mb-4">Create a Voice AI Agent to get started.</p>
                  <Button onClick={() => { setAgentType('voice'); setCreateAgentDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />Create Agent
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-4">{voiceAgents.map(agent => <AgentCard key={agent.id} agent={agent} onUpdate={refetchAgents} />)}</div>
              )}
            </TabsContent>

            <TabsContent value="knowledge-base" className="space-y-4 mt-0">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-semibold">Knowledge Base</h3>
                  <p className="text-sm text-muted-foreground">Create and manage knowledge bases for your AI Agents</p>
                </div>
                <Button onClick={() => setCreateKBDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />Create Knowledge Base
                </Button>
              </div>
              {kbLoading ? <p>Loading...</p> : knowledgeBases && knowledgeBases.length === 0 ? (
                <Card className="p-12 text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No Knowledge Base Created</h3>
                  <p className="text-muted-foreground mb-4">Create a knowledge base to give your AI agents context.</p>
                  <Button onClick={() => setCreateKBDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />Create Knowledge Base
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-4">{knowledgeBases?.map(kb => <KnowledgeBaseCard key={kb.id} knowledgeBase={kb} onUpdate={refetchKB} />)}</div>
              )}
            </TabsContent>

            {/* Voice & Calling */}
            <TabsContent value="phone-numbers" className="space-y-4 mt-0">
              <Card className="p-6"><TwilioConnectPanel /></Card>
            </TabsContent>

            <TabsContent value="voice-history" className="space-y-4 mt-0">
              <Card className="p-6"><VoiceConversationHistory /></Card>
            </TabsContent>

            <TabsContent value="voicemail-drops" className="space-y-4 mt-0">
              <Card className="p-6"><VoicemailDropsManager /></Card>
            </TabsContent>

            <TabsContent value="voice-broadcasts" className="space-y-4 mt-0">
              <Card className="p-6"><VoiceBroadcastManager /></Card>
            </TabsContent>

            <TabsContent value="call-summaries" className="space-y-4 mt-0">
              <Card className="p-6"><CallSummaryManager /></Card>
            </TabsContent>

            {/* Channels */}
            <TabsContent value="email" className="space-y-4 mt-0">
              <EmailSettings />
            </TabsContent>

            {/* CRM & Pipeline */}
            <TabsContent value="pipelines" className="space-y-4 mt-0">
              <PipelinesSettings />
            </TabsContent>

            <TabsContent value="opportunities" className="space-y-4 mt-0">
              <OpportunitySettings />
            </TabsContent>

            <TabsContent value="custom-fields" className="space-y-4 mt-0">
              <CustomFieldsManager />
            </TabsContent>

            {/* Integrations */}
            <TabsContent value="integrations" className="space-y-6 mt-0">
              <IntegrationEcosystem />
              <WebhookMarketplace />
            </TabsContent>

            {/* Growth */}
            <TabsContent value="referrals" className="space-y-4 mt-0">
              <ReferralProgram />
            </TabsContent>
          </div>
        </div>
      </Tabs>

      <CreateAgentDialog 
        open={createAgentDialogOpen} 
        onOpenChange={setCreateAgentDialogOpen}
        defaultType={agentType}
        onSuccess={refetchAgents}
      />
      <CreateKnowledgeBaseDialog 
        open={createKBDialogOpen} 
        onOpenChange={setCreateKBDialogOpen}
        onSuccess={refetchKB}
      />
    </div>
  );
};

export default Settings;
