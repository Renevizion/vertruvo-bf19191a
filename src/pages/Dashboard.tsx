import { useEffect } from "react";
import { DollarSign, TrendingUp, Target, Inbox } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { PipelineCharts } from "@/components/dashboard/PipelineCharts";
import { useDashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { WelcomeEmptyState } from "@/components/dashboard/WelcomeEmptyState";
import { TodayHub } from "@/components/dashboard/TodayHub";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import { toast as sonnerToast } from "sonner";
import { BookingShareWidget } from "@/components/dashboard/BookingShareWidget";
import { TwilioTrialBanner } from "@/components/admin/TwilioTrialBanner";

const LANDING_OPTIONS = [
  { value: "dashboard", label: "Dashboard" },
  { value: "leads", label: "Opportunities" },
  { value: "booking-sheet", label: "Booking Sheet" },
  { value: "calendar", label: "Calendar" },
  { value: "inbox", label: "Inbox" },
];

const Dashboard = () => {
  const { data: metrics } = useDashboardMetrics();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Post-checkout: force subscription refresh when returning from Stripe
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      queryClient.invalidateQueries({ queryKey: ['subscription-tier'] });
      queryClient.invalidateQueries({ queryKey: ['usage-counts'] });
      sonnerToast.success("Welcome! Your subscription is now active.");
      searchParams.delete('success');
      searchParams.delete('session_id');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, queryClient, setSearchParams]);

  const { data: setupStatus } = useQuery({
    queryKey: ['setup-status'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Resolve the *current* workspace (not stale profile.business_name from a prior workspace)
      const { data: member } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      const workspaceId = member?.workspace_id;

      const [leadsResult, workflowsResult, formsResult, agentsResult, settingsResult, twilioResult, kbResult] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }),
        supabase.from('workflows').select('id', { count: 'exact', head: true }),
        supabase.from('forms').select('id', { count: 'exact', head: true }),
        supabase.from('ai_agents').select('id', { count: 'exact', head: true }),
        workspaceId
          ? supabase.from('business_settings').select('business_name, enabled_modules').eq('workspace_id', workspaceId).maybeSingle()
          : Promise.resolve({ data: null } as any),
        // Check both legacy twilio_phone_numbers table AND new OAuth platform_config flag
        (async () => {
          const r = await supabase.from('twilio_phone_numbers').select('id', { count: 'exact', head: true });
          if ((r.count || 0) > 0) return r;
          const { data: cfg } = await supabase.from('platform_config').select('value').eq('key', 'twilio_connected').maybeSingle();
          return { ...r, count: cfg?.value === 'true' ? 1 : 0 };
        })(),
        supabase.from('knowledge_bases').select('id', { count: 'exact', head: true }),
      ]);

      const wsName = (settingsResult as any)?.data?.business_name?.trim() || null;
      const modules = (settingsResult as any)?.data?.enabled_modules;

      return {
        hasLeads: (leadsResult.count || 0) > 0,
        hasWorkflows: (workflowsResult.count || 0) > 0,
        hasForms: (formsResult.count || 0) > 0,
        hasAgents: (agentsResult.count || 0) > 0,
        hasTwilio: (twilioResult.count || 0) > 0,
        hasKnowledgeBase: (kbResult.count || 0) > 0,
        hasBookingConfig: !!(modules && (Array.isArray(modules) ? modules.includes('bookings') : false)),
        // Workspace-scoped name only. Never the stale profile field that caused "Renny" to leak.
        businessName: wsName,
        leadCount: leadsResult.count || 0,
      };
    },
  });


  // Landing page preference
  const { data: landingPref } = useQuery({
    queryKey: ['landing-page-pref-dashboard'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'dashboard';

      const { data: profile } = await supabase
        .from('profiles')
        .select('default_landing_page')
        .eq('id', user.id)
        .single();
      if (profile?.default_landing_page) return profile.default_landing_page;

      const { data: member } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      if (!member) return 'dashboard';
      const { data: settings } = await supabase
        .from('business_settings')
        .select('default_landing_page')
        .eq('workspace_id', member.workspace_id)
        .single();
      return settings?.default_landing_page || 'dashboard';
    },
  });

  const updateLanding = useMutation({
    mutationFn: async (value: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      await supabase
        .from('profiles')
        .update({ default_landing_page: value })
        .eq('id', user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-page-pref-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['landing-page-pref'] });
      toast({ title: "Landing page updated" });
    },
  });

  const showWelcome = setupStatus && (!setupStatus.hasTwilio || !setupStatus.hasBookingConfig || !setupStatus.hasKnowledgeBase || !setupStatus.hasWorkflows);
  const isNewAccount = setupStatus && setupStatus.leadCount === 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Admin-only: Twilio trial-mode warning (silent for non-admins and when healthy on dashboard) */}
      <TwilioTrialBanner compact />
      <div className="rounded-xl border border-border/70 bg-card px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 max-w-2xl">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              {(() => {
                const h = new Date().getHours();
                return h < 5 ? "Late night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
              })()}
              <span className="text-muted-foreground/70"> · {format(new Date(), "EEEE, MMM d")}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-normal text-foreground">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              {setupStatus?.businessName ? `${setupStatus.businessName} · ` : ""}Your current pipeline, schedule, and activity.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:block">Start on</span>
            <Select value={landingPref || 'dashboard'} onValueChange={(v) => updateLanding.mutate(v)}>
              <SelectTrigger className="w-[150px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANDING_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Quick-share booking link */}
      <BookingShareWidget />

      {/* Onboarding */}
      {showWelcome && setupStatus && (
        <WelcomeEmptyState
          businessName={setupStatus.businessName}
          hasLeads={setupStatus.hasLeads}
          hasWorkflows={setupStatus.hasWorkflows}
          hasForms={setupStatus.hasForms}
          hasAgents={setupStatus.hasAgents}
          hasTwilio={setupStatus.hasTwilio}
          hasKnowledgeBase={setupStatus.hasKnowledgeBase}
          hasBookingConfig={setupStatus.hasBookingConfig}
        />
      )}

      {isNewAccount ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <KPICard
            title="Pipeline Value"
            value="—"
            change="Add your first lead to start tracking"
            changeType="neutral"
            icon={DollarSign}
          />
          <KPICard
            title="Pipeline"
            value="Ready"
            change="Your pipeline is set up and waiting"
            changeType="positive"
            icon={Inbox}
          />
          <KPICard
            title="Conversion Rate"
            value="—"
            change="Starts tracking as leads progress"
            changeType="neutral"
            icon={TrendingUp}
          />
          <KPICard
            title="Active Tasks"
            value={`${metrics?.activeTasksCount || 0}`}
            change={metrics?.activeTasksCount ? `${metrics.activeTasksCount} pending` : "Create tasks to stay organized"}
            changeType="neutral"
            icon={Target}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <KPICard
            title="Pipeline Value"
            value={`$${(metrics?.totalValue || 0).toLocaleString()}`}
            change={`${metrics?.totalLeads || 0} total opportunities`}
            changeType="neutral"
            icon={DollarSign}
          />
          <KPICard
            title="First Stage"
            value={`${metrics?.newInquiries || 0}`}
            change={`of ${metrics?.totalLeads || 0} total — still in first stage`}
            changeType={metrics?.newLeadsToday ? "positive" : "neutral"}
            icon={Inbox}
          />
          <KPICard
            title="Conversion Rate"
            value={`${metrics?.conversionRate || 0}%`}
            change="Based on won opportunities"
            changeType={Number(metrics?.conversionRate) > 30 ? "positive" : "neutral"}
            icon={TrendingUp}
          />
          <KPICard
            title="Active Tasks"
            value={`${metrics?.activeTasksCount || 0}`}
            change={`${metrics?.contactsCount || 0} contacts`}
            changeType="neutral"
            icon={Target}
          />
        </div>
      )}

      {/* Pipeline Charts */}
      <PipelineCharts />

      {/* Today's Schedule + Tasks */}
      <TodayHub />

      {/* Recent Activity — full width */}
      <ActivityTimeline />
    </div>
  );
};

export default Dashboard;
