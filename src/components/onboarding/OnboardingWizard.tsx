import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, CheckCircle2, ArrowRight, ArrowLeft, Loader2, X, LogOut } from "lucide-react";
import { SheetSelectionModal } from "./SheetSelectionModal";
import { CSVImportDialog } from "./CSVImportDialog";
import { BusinessInfoStep, inferBusinessTypes, type BusinessTypeValue } from "./steps/BusinessInfoStep";
import { PipelineStep } from "./steps/PipelineStep";
import { ImportStep } from "./steps/ImportStep";
import { CompleteStep } from "./steps/CompleteStep";
import { VERTICAL_PRESETS, resolveVerticalId } from "@/lib/vertical-presets";

interface OnboardingWizardProps {
  onComplete: () => void;
}




export const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [scrapingWebsite, setScrapingWebsite] = useState(false);

  // Business Info
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessType, setBusinessType] = useState<BusinessTypeValue | null>(null);
  const [suggestedBusinessTypes, setSuggestedBusinessTypes] = useState<BusinessTypeValue[]>(["Professional Services"]);
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [country, setCountry] = useState("");

  // Import options
  const [importMethod, setImportMethod] = useState<'sheets' | 'csv' | 'skip' | null>(null);

  // Google Sheets
  const [sheetsConnected, setSheetsConnected] = useState(false);
  const [integrationId, setIntegrationId] = useState("");
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<any[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState("");
  const [selectedSheetName, setSelectedSheetName] = useState("");
  const [availableTabs, setAvailableTabs] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [showSheetModal, setShowSheetModal] = useState(false);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [autoMappings, setAutoMappings] = useState<Record<string, string>>({});

  // CSV Import
  const [showCSVDialog, setShowCSVDialog] = useState(false);

  // Pipeline defaults are sourced from the centralized vertical-presets module
  // so adding a vertical there propagates to onboarding automatically.
  const getPipelineDefaults = (label: string | null) => {
    const id = resolveVerticalId(label);
    const p = VERTICAL_PRESETS[id].pipeline;
    return { name: p.name, stages: p.stages.map((s) => ({ ...s })) };
  };

  const initialPipeline = getPipelineDefaults("Professional Services");
  const [pipelineName, setPipelineName] = useState(initialPipeline.name);
  const [pipelineStages, setPipelineStages] = useState(initialPipeline.stages);
  const [pipelineDefaultsApplied, setPipelineDefaultsApplied] = useState<string | null>(null);

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  // Infer business type from inputs
  useEffect(() => {
    const inferred = inferBusinessTypes({
      businessName,
      website,
      phone,
      businessDescription,
    });

    setSuggestedBusinessTypes(inferred);
    if (!businessType) {
      setBusinessType(inferred[0]);
    }
  }, [businessName, website, phone, businessDescription, businessType]);

  // Apply pipeline defaults when business type changes
  useEffect(() => {
    if (businessType && businessType !== pipelineDefaultsApplied) {
      const defaults = getPipelineDefaults(businessType);
      setPipelineName(defaults.name);
      setPipelineStages(defaults.stages);
      setPipelineDefaultsApplied(businessType);
    }
  }, [businessType, pipelineDefaultsApplied]);

  const handleExit = async () => {
    await saveOnboardingState();
    await completeOnboarding();
  };

  const handleSignOut = async () => {
    await saveOnboardingState();
    await supabase.auth.signOut();
    navigate('/auth');
  };

  // Save onboarding state to both localStorage (temp) and database (persistent)
  const saveOnboardingState = async (stepToSave?: number) => {
    const currentStep = stepToSave ?? step; // Use provided step or current
    const state = {
      step: currentStep,
      businessName,
      website,
      phone,
      businessDescription,
      businessType,
      city,
      stateProvince,
      country,
      pipelineName,
      timestamp: Date.now(),
    };
    
    console.log('[OnboardingWizard] 💾 SAVING STATE - Current step:', currentStep, 'Full state:', state);
    
    // Save to localStorage for immediate OAuth redirect
    localStorage.setItem('onboarding_state', JSON.stringify(state));
    console.log('[OnboardingWizard] ✓ Saved to localStorage');

    // Save to database for cross-device persistence
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({
            onboarding_step: currentStep,
            onboarding_data: state,
          })
          .eq('id', user.id);
        
        if (error) {
          console.error('[OnboardingWizard] ❌ Database save error:', error);
        } else {
          console.log('[OnboardingWizard] ✓ Saved to database - step:', currentStep);
        }
      } else {
        console.warn('[OnboardingWizard] ⚠️ No user found for database save');
      }
    } catch (error) {
      console.error('[OnboardingWizard] ❌ Failed to save to database:', error);
    }
  };

  // Restore onboarding state from localStorage or database
  const restoreOnboardingState = async () => {
    console.log('[OnboardingWizard] 🔍 Attempting to restore state...');
    
    // First check localStorage (faster, for same-session OAuth flow)
    const savedState = localStorage.getItem('onboarding_state');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        
        // Only restore if saved within last 30 minutes
        const age = Date.now() - state.timestamp;
        console.log('[OnboardingWizard] 📦 Found localStorage state:', state, 'Age:', age, 'ms');
        
        if (age < 30 * 60 * 1000) {
          console.log('[OnboardingWizard] ♻️ RESTORING from localStorage - setting step to:', state.step);
          
          setStep(state.step || 2);
          setBusinessName(state.businessName || '');
          setWebsite(state.website || '');
          setPhone(state.phone || '');
          setBusinessDescription(state.businessDescription || '');
          setBusinessType((state.businessType as BusinessTypeValue) || 'Professional Services');
          setCity(state.city || '');
          setStateProvince(state.stateProvince || '');
          setCountry(state.country || '');
          setPipelineName(state.pipelineName || 'Sales Pipeline');
          
          localStorage.removeItem('onboarding_state');
          console.log('[OnboardingWizard] ✓ Restored from localStorage, step is now:', state.step);
          return true;
        } else {
          console.log('[OnboardingWizard] ⏰ State too old, clearing');
          localStorage.removeItem('onboarding_state');
        }
      } catch (error) {
        console.error('[OnboardingWizard] ❌ Error restoring from localStorage:', error);
        localStorage.removeItem('onboarding_state');
      }
    } else {
      console.log('[OnboardingWizard] 📭 No localStorage state found');
    }

    // If not in localStorage, check database (cross-device/session)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_step, onboarding_data')
          .eq('id', user.id)
          .maybeSingle();

        console.log('[OnboardingWizard] 📦 Database state:', profile);

        if (profile?.onboarding_data && typeof profile.onboarding_data === 'object') {
          const state = profile.onboarding_data as any;
          console.log('[OnboardingWizard] ♻️ RESTORING from database - setting step to:', profile.onboarding_step);
          
          setStep(profile.onboarding_step || 1);
          setBusinessName(state.businessName || '');
          setWebsite(state.website || '');
          setPhone(state.phone || '');
          setBusinessDescription(state.businessDescription || '');
          setBusinessType((state.businessType as BusinessTypeValue) || 'Professional Services');
          setCity(state.city || '');
          setStateProvince(state.stateProvince || '');
          setCountry(state.country || '');
          setPipelineName(state.pipelineName || 'Sales Pipeline');
          
          console.log('[OnboardingWizard] ✓ Restored from database, step is now:', profile.onboarding_step);
          return true;
        }
      }
    } catch (error) {
      console.error('[OnboardingWizard] ❌ Error restoring from database:', error);
    }
    
    console.log('[OnboardingWizard] ℹ️ No state to restore');
    return false;
  };

  // Load business name from user metadata if not already set
  const loadBusinessNameFromMetadata = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.business_name && !businessName) {
        console.log('[OnboardingWizard] 📦 Found business name in user metadata:', user.user_metadata.business_name);
        setBusinessName(user.user_metadata.business_name);
      }
    } catch (error) {
      console.error('[OnboardingWizard] Error loading business name from metadata:', error);
    }
  };

  // Restore state on mount ONLY if not an OAuth callback
  useEffect(() => {
    // Check URL directly (searchParams might not be ready)
    const urlParams = new URLSearchParams(window.location.search);
    const isOAuthCallback = urlParams.get('sheets_connected') === 'true';
    
    if (!isOAuthCallback) {
      console.log('[OnboardingWizard] 🔄 Normal mount - restoring state');
      restoreOnboardingState().then((restored) => {
        // If no state was restored, try to load business name from signup metadata
        if (!restored) {
          loadBusinessNameFromMetadata();
        }
      });
    } else {
      console.log('[OnboardingWizard] 🔄 OAuth callback detected - will restore in OAuth effect');
    }
  }, []);

  // Check for OAuth callback via URL parameters
  useEffect(() => {
    const sheetsConnectedParam = searchParams.get('sheets_connected');
    const integrationIdParam = searchParams.get('integration_id');
    const onboardingParam = searchParams.get('onboarding');

    console.log('[OnboardingWizard] URL params check:', {
      sheetsConnectedParam,
      integrationIdParam,
      onboardingParam,
    });

    if (sheetsConnectedParam === 'true' && integrationIdParam && onboardingParam === 'true') {
      console.log('[OnboardingWizard] ✓ Detected OAuth success via URL params');
      
      // RESTORE state first!
      restoreOnboardingState().then(() => {
        // Set Google Sheets connection
        setSheetsConnected(true);
        setIntegrationId(integrationIdParam);
        
        // Load sheets and open modal
        loadAvailableSheets(integrationIdParam).then(() => {
          console.log('[OnboardingWizard] Sheets loaded, opening modal');
          setShowSheetModal(true);
        });
      });
      
      toast({
        title: "✓ Google Sheets connected!",
        description: "Now select a spreadsheet to import",
      });
      
      // Clean up URL parameters
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('sheets_connected');
      newUrl.searchParams.delete('integration_id');
      newUrl.searchParams.delete('onboarding');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams, toast]);

  const loadAvailableSheets = async (intId: string) => {
    setLoadingSheets(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets-list', {
        body: { integrationId: intId },
      });

      if (error) throw error;
      setAvailableSheets(data.sheets || []);
    } catch (error) {
      console.error('Error loading sheets:', error);
      toast({
        title: "Error",
        description: "Failed to load spreadsheets",
        variant: "destructive",
      });
    } finally {
      setLoadingSheets(false);
    }
  };

  const loadSheetTabs = async (sheetId: string) => {
    setLoadingSheets(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets-tabs', {
        body: { integrationId, sheetId },
      });

      if (error) throw error;
      setAvailableTabs(data.tabs || []);
      if (data.tabs && data.tabs.length > 0) {
        setSelectedTab(data.tabs[0].title);
      }
    } catch (error) {
      console.error('Error loading tabs:', error);
      toast({
        title: "Error",
        description: "Failed to load sheet tabs",
        variant: "destructive",
      });
    } finally {
      setLoadingSheets(false);
    }
  };

  const loadSheetHeaders = async (sheetId: string, tabName: string) => {
    try {
      console.log('[OnboardingWizard] Loading headers for:', { sheetId, tabName, integrationId });
      const { data, error } = await supabase.functions.invoke('google-sheets-headers', {
        body: { integrationId, sheetId, tabName },
      });

      if (error) throw error;
      
      console.log('[OnboardingWizard] Received headers:', data);
      setSheetHeaders(data.headers || []);
      setAutoMappings(data.autoMappings || {});
      
      toast({
        title: data.autoMappings && Object.keys(data.autoMappings).length > 0 ? "✨ Columns auto-mapped!" : "Headers loaded",
        description: data.autoMappings && Object.keys(data.autoMappings).length > 0 
          ? `Detected ${Object.keys(data.autoMappings).length} matching columns` 
          : "Please map your columns manually",
      });
    } catch (error) {
      console.error('Error loading headers:', error);
      toast({
        title: "Couldn't load headers",
        description: "You can still import using default mappings",
        variant: "destructive",
      });
    }
  };

  const handleSheetSelect = (sheetId: string, sheetName: string) => {
    setSelectedSheetId(sheetId);
    setSelectedSheetName(sheetName);
    loadSheetTabs(sheetId);
  };

  const handleTabSelect = (tabName: string) => {
    setSelectedTab(tabName);
    // Load headers when both sheet and tab are selected
    if (selectedSheetId && tabName) {
      loadSheetHeaders(selectedSheetId, tabName);
    }
  };

  const saveSheetConfig = async (columnMappings: Record<string, string> = {}) => {
    if (!selectedSheetId || !selectedTab) {
      toast({
        title: "Missing information",
        description: "Please select a spreadsheet and tab",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);
    setSyncing(true);
    try {
      // Use custom mappings if provided, otherwise use defaults
      const mappings = Object.keys(columnMappings).length > 0 
        ? columnMappings 
        : {
            name: 'A',
            email: 'B',
            phone: 'C',
            company: 'D',
            source: 'E',
            notes: 'F',
            value: 'G',
            status: 'H',
          };

      console.log('[OnboardingWizard] Saving with mappings:', mappings);

      // Save configuration with column mappings
      const { error } = await supabase
        .from('google_sheet_integrations')
        .update({
          sheet_id: selectedSheetId,
          sheet_tab: selectedTab,
          column_mappings: mappings,
        })
        .eq('id', integrationId);

      if (error) throw error;

      // Trigger initial sync immediately
      const { data: syncData, error: syncError } = await supabase.functions.invoke('google-sheets-sync', {
        body: { integrationId },
      });

      if (syncError) throw syncError;

      const syncedCount = syncData?.synced || 0;
      const skippedCount = syncData?.skipped || 0;

      toast({
        title: "✓ Leads imported successfully!",
        description: `Synced ${syncedCount} leads${skippedCount > 0 ? `, skipped ${skippedCount}` : ''}`,
      });

      // Close modal
      setShowSheetModal(false);

      return true;
    } catch (error) {
      console.error('Error saving config:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to configure integration';
      toast({
        title: "Sync failed",
        description: errorMsg,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const scrapeWebsiteInfo = async () => {
    if (!website) return;
    
    setScrapingWebsite(true);
    try {
      // Simple free website scraping using fetch
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(website)}`);
      const data = await response.json();
      const html = data.contents;
      
      // Parse meta tags
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Try to get business name from title or og:site_name
      const title = doc.querySelector('title')?.textContent || '';
      const ogSiteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || '';
      const suggestedName = ogSiteName || title.split('|')[0].trim() || title.split('-')[0].trim();
      
      // Try to get description
      const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
      const suggestedDesc = metaDesc || ogDesc;
      
      if (suggestedName && !businessName) {
        setBusinessName(suggestedName);
      }
      if (suggestedDesc && !businessDescription) {
        setBusinessDescription(suggestedDesc);
      }
      
      toast({
        title: "Website scanned!",
        description: "We've pre-filled some information from your website",
      });
    } catch (error) {
      console.error('Error scraping website:', error);
      // Silently fail - not critical
    } finally {
      setScrapingWebsite(false);
    }
  };

  const handleWebsiteBlur = () => {
    if (website && website.startsWith('http')) {
      scrapeWebsiteInfo();
    }
  };

  const saveBusinessInfo = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      console.log('[OnboardingWizard] 💾 Saving business info:', {
        businessName,
        website,
        phone,
        businessType,
        city,
        stateProvince,
        country,
      });

      // Get user's workspace_id
      const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (workspaceError || !workspace) {
        console.error('[OnboardingWizard] ❌ Workspace error:', workspaceError);
        throw new Error("Workspace not found");
      }

      console.log('[OnboardingWizard] Found workspace:', workspace.id);

      // Save to profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          business_name: businessName,
          website: website,
          phone: phone,
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('[OnboardingWizard] ❌ Profile save error:', profileError);
        throw profileError;
      }

      console.log('[OnboardingWizard] ✓ Profile saved');

      // Save to business_settings table with workspace_id
      const { data: existingSettings, error: checkError } = await supabase
        .from('business_settings')
        .select('id')
        .eq('workspace_id', workspace.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('[OnboardingWizard] ❌ Check error:', checkError);
        throw checkError;
      }

      // Resolve vertical preset → default enabled modules. CRM is always on.
      const verticalId = resolveVerticalId(businessType || 'Professional Services');
      const defaultModules = VERTICAL_PRESETS[verticalId].defaultModules;

      if (existingSettings) {
        console.log('[OnboardingWizard] Updating existing settings:', existingSettings.id);
        const { error: settingsError } = await supabase
          .from('business_settings')
          .update({
            business_name: businessName,
            website: website,
            business_phone: phone,
            business_category: businessType || 'Professional Services',
            city,
            state_province: stateProvince,
            country,
            workspace_id: workspace.id,
            enabled_modules: defaultModules,
          })
          .eq('id', existingSettings.id);

        if (settingsError) {
          console.error('[OnboardingWizard] ❌ Settings update error:', settingsError);
          throw settingsError;
        }
        console.log('[OnboardingWizard] ✓ Settings updated');
      } else {
        console.log('[OnboardingWizard] Creating new settings');
        const { error: settingsError } = await supabase
          .from('business_settings')
          .insert({
            business_name: businessName,
            website: website,
            business_phone: phone,
            business_category: businessType || 'Professional Services',
            city,
            state_province: stateProvince,
            country,
            workspace_id: workspace.id,
            enabled_modules: defaultModules,
          });

        if (settingsError) {
          console.error('[OnboardingWizard] ❌ Settings insert error:', settingsError);
          throw settingsError;
        }
        console.log('[OnboardingWizard] ✓ Settings created');
      }
      
      console.log('[OnboardingWizard] ✅ Business info saved successfully');
      
      toast({
        title: "Saved!",
        description: "Business information saved",
      });
    } catch (error) {
      console.error('[OnboardingWizard] ❌ Error saving business info:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save business information",
        variant: "destructive",
      });
      throw error; // Re-throw to prevent advancing to next step
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPipeline = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Get user's workspace_id
      const { data: workspaceMember } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (!workspaceMember?.workspace_id) {
        throw new Error('Workspace not found');
      }

      // Check if pipeline with this name already exists to prevent duplicates
      const { data: existingPipeline } = await supabase
        .from('pipelines')
        .select('id')
        .eq('workspace_id', workspaceMember.workspace_id)
        .eq('name', pipelineName)
        .maybeSingle();

      if (existingPipeline) {
        console.log('[OnboardingWizard] Pipeline already exists, skipping creation');
        toast({
          title: "Pipeline exists",
          description: `Using existing "${pipelineName}" pipeline`,
        });
        return;
      }

      // Create pipeline
      const { data: pipeline, error: pipelineError } = await supabase
        .from('pipelines')
        .insert({
          name: pipelineName,
          workspace_id: workspaceMember.workspace_id,
          is_default: true,
        })
        .select()
        .single();

      if (pipelineError) throw pipelineError;

      // Create stages from editable state
      const { error: stagesError } = await supabase
        .from('pipeline_stages')
        .insert(
          pipelineStages.map((stage, index) => ({
            name: stage.name,
            position: index,
            color: stage.color,
            pipeline_id: pipeline.id,
          }))
        );

      if (stagesError) throw stagesError;
    } catch (error) {
      console.error('Error creating pipeline:', error);
      toast({
        title: "Error",
        description: "Failed to create pipeline",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (error) throw error;

      // Seed workspace with demo data, default workflow & AI agent
      const { data: member } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (member) {
        const seedWithRetry = async (attempt = 1) => {
          try {
            const { error } = await supabase.functions.invoke('seed-workspace', {
              body: {
                workspaceId: member.workspace_id,
                businessName: businessName || undefined,
                businessCategory: businessType || undefined,
              },
            });
            if (error && attempt < 3) {
              console.warn(`[OnboardingWizard] seed-workspace attempt ${attempt} failed, retrying...`);
              await new Promise(r => setTimeout(r, 1000 * attempt));
              return seedWithRetry(attempt + 1);
            }
          } catch (e) {
            if (attempt < 3) {
              console.warn(`[OnboardingWizard] seed-workspace attempt ${attempt} error, retrying...`);
              await new Promise(r => setTimeout(r, 1000 * attempt));
              return seedWithRetry(attempt + 1);
            }
            console.error('[OnboardingWizard] seed-workspace failed after 3 attempts:', e);
          }
        };
        seedWithRetry();
      }

      const shouldOpenForms = importMethod === 'skip';

      toast({
        title: "Welcome aboard! 🎉",
        description: "Let's get you set up with a plan — your 14-day free trial starts now.",
      });

      onComplete();

      // Always redirect to pricing so new users start their trial
      navigate('/pricing?from=onboarding', { replace: true });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };



  const handleNext = async () => {
    if (step === 1) {
      if (!businessName) {
        toast({
          title: "Business name required",
          description: "Please enter your business name",
          variant: "destructive",
        });
        return;
      }
      try {
        await saveBusinessInfo();
      } catch (error) {
        console.error('[OnboardingWizard] Failed to save business info, not advancing');
        return;
      }
    } else if (step === 2) {
      // Step 2: Pipeline
      await createDefaultPipeline();
    } else if (step === 3) {
      // Step 3: Import leads (optional)
      if (sheetsConnected && selectedSheetId && selectedTab) {
        const success = await saveSheetConfig();
        if (!success) return;
      }
    } else if (step === 4) {
      await completeOnboarding();
      return;
    }
    
    const newStep = step + 1;
    setStep(newStep);
    
    // Save progress with the NEW step value (not the old closure value!)
    await saveOnboardingState(newStep);
  };

  const handleBack = async () => {
    if (step > 1) {
      const newStep = step - 1;
      setStep(newStep);
      await saveOnboardingState(newStep);
    }
  };

  const handleConnectSheets = async () => {
    // Save onboarding state before redirecting to OAuth (must await to ensure it completes!)
    await saveOnboardingState();
    
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to continue",
        variant: "destructive",
      });
      return;
    }
    
    // Call edge function to get OAuth URL with userId in state
    const { data, error } = await supabase.functions.invoke('google-sheets-oauth', {
      body: { 
        userId: user.id, 
        type: 'onboarding',
        origin: window.location.origin 
      }
    });

    if (error || !data?.authUrl) {
      toast({
        title: "Error",
        description: "Failed to initiate Google connection",
        variant: "destructive",
      });
      return;
    }

    console.log('[OnboardingWizard] 🔄 Redirecting to Google OAuth in same window');
    
    toast({
      title: "Connecting to Google",
      description: "Redirecting to Google authorization...",
    });
    
    // Redirect SAME window to OAuth
    window.location.href = data.authUrl;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <CardTitle>Welcome to Thermi</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Step {step} of {totalSteps}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                title="Sign out (progress will be saved)"
              >
                <LogOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExit}
                title="Exit onboarding (you can resume later)"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 && (
            <BusinessInfoStep
              businessName={businessName}
              setBusinessName={setBusinessName}
              website={website}
              setWebsite={setWebsite}
              phone={phone}
              setPhone={setPhone}
              businessDescription={businessDescription}
              setBusinessDescription={setBusinessDescription}
              businessType={businessType}
              setBusinessType={setBusinessType}
              suggestedBusinessTypes={suggestedBusinessTypes}
              city={city}
              setCity={setCity}
              stateProvince={stateProvince}
              setStateProvince={setStateProvince}
              country={country}
              setCountry={setCountry}
              scrapingWebsite={scrapingWebsite}
              onWebsiteBlur={handleWebsiteBlur}
            />
          )}

          {step === 2 && (
            <PipelineStep
              pipelineName={pipelineName}
              setPipelineName={setPipelineName}
              pipelineStages={pipelineStages}
              setPipelineStages={setPipelineStages}
            />
          )}

          {step === 3 && (
            <ImportStep
              importMethod={importMethod}
              setImportMethod={setImportMethod}
              sheetsConnected={sheetsConnected}
              selectedSheetId={selectedSheetId}
              selectedSheetName={selectedSheetName}
              selectedTab={selectedTab}
              syncing={syncing}
              onConnectSheets={handleConnectSheets}
              onOpenSheetModal={() => setShowSheetModal(true)}
              onOpenCSVDialog={() => setShowCSVDialog(true)}
              onSkipToast={() => {
                toast({
                  title: "✓ Ready to capture leads",
                  description: "Create forms to embed on your website and capture leads automatically",
                });
              }}
            />
          )}

          {step === 4 && (
            <CompleteStep importMethod={importMethod} />
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1 || loading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={loading || syncing}
              className={selectedSheetId && selectedTab && step === 3 ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {loading || syncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {syncing ? "Importing leads..." : "Loading..."}
                </>
              ) : step === 3 && selectedSheetId && selectedTab ? (
                <>
                  Import & Continue
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                </>
              ) : step === 4 ? (
                <>
                  Get Started
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  {step === 3 && !importMethod ? "Skip for now" : step === 3 ? "Continue" : "Next"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
      <CSVImportDialog 
        open={showCSVDialog}
        onOpenChange={setShowCSVDialog}
        onImportComplete={() => {
          toast({
            title: "✓ Import successful!",
            description: "Your leads have been imported",
          });
        }}
      />
    </div>
        </CardContent>
      </Card>

      <SheetSelectionModal
        open={showSheetModal}
        onOpenChange={setShowSheetModal}
        sheets={availableSheets}
        tabs={availableTabs}
        selectedSheetId={selectedSheetId}
        selectedTab={selectedTab}
        onSheetSelect={handleSheetSelect}
        onTabSelect={handleTabSelect}
        onConfirm={async (mappings) => {
          const success = await saveSheetConfig(mappings);
          if (success) {
            setShowSheetModal(false);
          }
        }}
        loading={loadingSheets}
        syncing={syncing}
        sheetHeaders={sheetHeaders}
        autoMappings={autoMappings}
      />
    </div>
  );
};