import { useState, useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useErrorReporting } from "@/hooks/useErrorReporting";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { CommandPalette } from "@/components/search/CommandPalette";
import { VoiceAssistantButton } from "@/components/voice/VoiceAssistantButton";
import { WhisperLauncher } from "@/components/voice/WhisperLauncher";
import { SubscriptionBanner } from "@/components/subscription/SubscriptionBanner";
import { UsageLimitWatcher } from "@/components/subscription/UsageLimitWatcher";
import { AIChatDrawer } from "@/components/layout/AIChatDrawer";
import { useShellHeartbeat } from "@/lib/shell-health";

import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import { useQuery } from "@tanstack/react-query";

// Lazy load all non-critical pages
const Leads = lazy(() => import("./pages/Leads"));
const Customers = lazy(() => import("./pages/Customers"));
const Contacts = lazy(() => import("./pages/Contacts"));
const ContactDetails = lazy(() => import("./pages/ContactDetails"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Settings = lazy(() => import("./pages/Settings"));
const Pipelines = lazy(() => import("./pages/Pipelines"));
const PipelinesSettings = lazy(() => import("./pages/PipelinesSettings"));
const Forms = lazy(() => import("./pages/Forms"));
const FormBuilder = lazy(() => import("./pages/FormBuilder"));
const CallTemplates = lazy(() => import("./pages/CallTemplates"));
const CallHistory = lazy(() => import("./pages/CallHistory"));
const AIAgents = lazy(() => import("./pages/AIAgents"));
const CallAnalytics = lazy(() => import("./pages/CallAnalytics"));
const VoiceCampaigns = lazy(() => import("./pages/VoiceCampaigns"));
const AnalyticsLayout = lazy(() => import("./pages/AnalyticsLayout"));
const SocialMedia = lazy(() => import("./pages/SocialMedia"));
const Automations = lazy(() => import("./pages/Automations"));
const Admin = lazy(() => import("./pages/Admin"));
const Privacy = lazy(() => import("./pages/Privacy"));
const APIDocs = lazy(() => import("./pages/APIDocs"));
const Terms = lazy(() => import("./pages/Terms"));
const Contact = lazy(() => import("./pages/Contact"));
const Pricing = lazy(() => import("./pages/Pricing"));
// Showcase removed from nav — kept as public route only
const Activity = lazy(() => import("./pages/Activity"));
// AIChat page removed — now a drawer in header
const KnowledgeBases = lazy(() => import("./pages/KnowledgeBases"));
const Insights = lazy(() => import("./pages/Insights"));
const Inbox = lazy(() => import("./pages/Inbox"));
const EmailLists = lazy(() => import("./pages/EmailLists"));
const EmailCampaigns = lazy(() => import("./pages/EmailCampaigns"));
const ContentHub = lazy(() => import("./pages/ContentHub"));
const BookingSheet = lazy(() => import("./pages/BookingSheet"));
// FeatureProgress removed — internal dev tracker, not user-facing
const Renewals = lazy(() => import("./pages/Renewals"));
const Outreach = lazy(() => import("./pages/Outreach"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const PublicBooking = lazy(() => import("./pages/PublicBooking"));
const Portal = lazy(() => import("./pages/Portal"));
const PortalLogin = lazy(() => import("./pages/PortalLogin"));
const ShellHealth = lazy(() => import("./pages/ShellHealth"));
const CapabilityMatrix = lazy(() => import("./pages/admin/CapabilityMatrix"));
const SkillCatalog = lazy(() => import("./pages/admin/SkillCatalog"));
const RealityDashboard = lazy(() => import("./pages/admin/RealityDashboard"));
const WidgetShell = lazy(() => import("./pages/shells/WidgetShell"));
const KioskShell = lazy(() => import("./pages/shells/KioskShell"));
const AgentShell = lazy(() => import("./pages/shells/AgentShell"));
const ExtensionShell = lazy(() => import("./pages/shells/ExtensionShell"));
const WhiteLabelShell = lazy(() => import("./pages/shells/WhiteLabelShell"));
const ApiShell = lazy(() => import("./pages/shells/ApiShell"));
const PublicShellInstance = lazy(() => import("./pages/shells/PublicShellInstance"));
const ShellInstances = lazy(() => import("./pages/admin/ShellInstances"));
const ShellEditor = lazy(() => import("./pages/admin/ShellEditor"));
const AgentBlueprints = lazy(() => import("./pages/admin/AgentBlueprints"));
const AITrustCenter = lazy(() => import("./pages/AITrustCenter"));
const HandoffInbox = lazy(() => import("./pages/HandoffInbox"));

import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { ClickWrapGate } from "@/components/auth/ClickWrapGate";

import { RouteLoader } from "@/components/layout/RouteLoader";

const PageLoader = () => <RouteLoader />;
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

/** Redirects to user's preferred landing page on first load */
const InitialRedirect = () => {
  const { data: landingPage, isLoading } = useQuery({
    queryKey: ['landing-page-pref'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'dashboard';

      // 1) Check per-user preference on profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('default_landing_page')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.default_landing_page) return profile.default_landing_page;

      // 2) Fall back to workspace-level setting
      const { data: ws } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!ws?.workspace_id) return 'dashboard';
      const { data: settings } = await supabase
        .from('business_settings')
        .select('default_landing_page')
        .eq('workspace_id', ws.workspace_id)
        .maybeSingle();
      return (settings as any)?.default_landing_page || 'dashboard';
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <PageLoader />;
  return <Navigate to={`/${landingPage || 'dashboard'}`} replace />;
};

const ProtectedRoute = ({ children, skipOnboarding = false }: { children: React.ReactNode; skipOnboarding?: boolean }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsLicense, setNeedsLicense] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkOnboarding(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      if (session) {
        checkOnboarding(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkLicense = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('license_acceptances')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      setNeedsLicense(!data);
    } catch {
      // If table doesn't exist yet, don't block access
      setNeedsLicense(false);
    }
  };

  const checkOnboarding = async (userId: string, retryCount = 0) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking onboarding:', error);
        setNeedsOnboarding(true);
      } else if (!data) {
        // Profile doesn't exist yet - database trigger may be slow
        // Wait and retry a few times before assuming onboarding needed
        if (retryCount < 3) {
          console.log(`[Auth] Profile not found, retrying (${retryCount + 1}/3)...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return checkOnboarding(userId, retryCount + 1);
        }
        console.log('[Auth] Profile still not found after retries, starting onboarding');
        setNeedsOnboarding(true);
      } else {
        setNeedsOnboarding(!data.onboarding_completed);
      }
      await checkLicense(userId);
    } catch (error) {
      console.error('Error checking onboarding:', error);
      setNeedsOnboarding(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (needsOnboarding && !skipOnboarding) {
    return <OnboardingWizard onComplete={() => setNeedsOnboarding(false)} />;
  }

  if (needsLicense) {
    return (
      <ClickWrapGate
        userId={session.user.id}
        email={session.user.email || ''}
        onAccepted={() => setNeedsLicense(false)}
      />
    );
  }

  return <>{children}</>;
};

const AppLayout = () => {
  const [voiceOpen, setVoiceOpen] = useState(false);
  useShellHeartbeat("saas", null);
  return (
    <div className="thermi-app-shell h-screen max-h-screen bg-background flex w-full overflow-hidden" style={{height:'100dvh',maxHeight:'100dvh'}}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <Header onVoiceOpen={() => setVoiceOpen(true)} />
        <SubscriptionBanner />
        <UsageLimitWatcher />
        <main
          aria-label="Workspace"
          className="thermi-app-main flex-1 min-h-0 p-3 sm:p-5 lg:p-6 overflow-y-auto overflow-x-hidden overscroll-contain safe-bottom"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/home" element={<InitialRedirect />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/contacts/:id" element={<ContactDetails />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/booking-sheet" element={<BookingSheet />} />
              <Route element={<AnalyticsLayout />}>
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/call-analytics" element={<CallAnalytics />} />
                <Route path="/voice-campaigns" element={<VoiceCampaigns />} />
              </Route>
              <Route path="/pipelines" element={<Pipelines />} />
              <Route path="/pipelines-settings" element={<PipelinesSettings />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/forms" element={<Forms />} />
              <Route path="/forms/:id/edit" element={<FormBuilder />} />
              <Route path="/ai-agents" element={<AIAgents />} />
              <Route path="/call-templates" element={<CallTemplates />} />
              <Route path="/call-history" element={<Navigate to="/call-analytics" replace />} />
              <Route path="/social-media" element={<SocialMedia />} />
              <Route path="/automations" element={<Automations />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/shells" element={<ShellHealth />} />
              <Route path="/admin/capabilities" element={<CapabilityMatrix />} />
              <Route path="/admin/skills" element={<SkillCatalog />} />
              <Route path="/admin/reality" element={<RealityDashboard />} />
              <Route path="/admin/shells/manage" element={<ShellInstances />} />
              <Route path="/admin/shells/manage/:id" element={<ShellEditor />} />
              <Route path="/admin/agent-blueprints" element={<AgentBlueprints />} />
              <Route path="/activity" element={<Activity />} />
              <Route path="/ai-chat" element={<Navigate to="/dashboard" replace />} />
              <Route path="/knowledge-bases" element={<KnowledgeBases />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/ai-trust-center" element={<AITrustCenter />} />
              <Route path="/handoffs" element={<HandoffInbox />} />
              <Route path="/email-lists" element={<EmailLists />} />
              <Route path="/email-campaigns" element={<EmailCampaigns />} />
              <Route path="/content" element={<ContentHub />} />
              <Route path="/renewals" element={<Renewals />} />
              <Route path="/outreach" element={<Outreach />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <VoiceAssistantButton externalOpen={voiceOpen} onExternalClose={() => setVoiceOpen(false)} />
      <WhisperLauncher />
      <AIChatDrawer />
    </div>
  );
};

const App = () => {
  useErrorReporting();
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          {/* Showcase removed from protected routes */}
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/unsubscribe" element={<Suspense fallback={<PageLoader />}><Unsubscribe /></Suspense>} />
          <Route path="/api-docs" element={<Suspense fallback={<PageLoader />}><APIDocs /></Suspense>} />
          <Route path="/book/:slug" element={<Suspense fallback={<PageLoader />}><PublicBooking /></Suspense>} />
          <Route path="/shell/widget" element={<Suspense fallback={<PageLoader />}><WidgetShell /></Suspense>} />
          <Route path="/shell/kiosk" element={<Suspense fallback={<PageLoader />}><KioskShell /></Suspense>} />
          <Route path="/shell/agent" element={<Suspense fallback={<PageLoader />}><AgentShell /></Suspense>} />
          <Route path="/shell/extension" element={<Suspense fallback={<PageLoader />}><ExtensionShell /></Suspense>} />
          <Route path="/shell/wl" element={<Suspense fallback={<PageLoader />}><WhiteLabelShell /></Suspense>} />
          <Route path="/shell/api" element={<Suspense fallback={<PageLoader />}><ApiShell /></Suspense>} />
          <Route path="/k/:slug" element={<Suspense fallback={<PageLoader />}><PublicShellInstance /></Suspense>} />
          <Route path="/k/:slug/preview" element={<Suspense fallback={<PageLoader />}><PublicShellInstance /></Suspense>} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/portal/login/:slug" element={<Suspense fallback={<PageLoader />}><PortalLogin /></Suspense>} />
          <Route path="/portal/:slug" element={<ProtectedRoute skipOnboarding><Suspense fallback={<PageLoader />}><Portal /></Suspense></ProtectedRoute>} />
          <Route path="/portal" element={<ProtectedRoute skipOnboarding><Suspense fallback={<PageLoader />}><Portal /></Suspense></ProtectedRoute>} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <SidebarProvider>
                  <CommandPalette />
                  <AppLayout />
                </SidebarProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
