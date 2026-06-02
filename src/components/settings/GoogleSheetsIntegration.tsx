import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import { SheetSelectionModal } from "@/components/onboarding/SheetSelectionModal";

interface Integration {
  id: string;
  sheet_id: string | null;
  sheet_tab: string | null;
  column_mappings: Record<string, string>;
  last_synced_at: string | null;
  is_active: boolean;
}

export const GoogleSheetsIntegration = () => {
  const { toast } = useToast();
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<any[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState("");
  const [availableTabs, setAvailableTabs] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState("");
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [autoMappings, setAutoMappings] = useState<Record<string, string>>({});
  const [showSheetModal, setShowSheetModal] = useState(false);
  const [leadCount, setLeadCount] = useState<number | null>(null);

  const loadAvailableSheets = async (integrationId: string) => {
    console.log('Loading sheets for integration:', integrationId);
    setLoadingSheets(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets-list', {
        body: { integrationId },
      });

      console.log('Sheets response:', data, error);
      if (error) throw error;
      setAvailableSheets(data.sheets || []);
      console.log('Available sheets:', data.sheets);
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

  const loadSheetTabs = async (sheetId: string, integrationId: string) => {
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

  const loadSheetHeaders = async (sheetId: string, tabName: string, integrationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets-headers', {
        body: { integrationId, sheetId, tabName },
      });

      if (error) throw error;
      
      setSheetHeaders(data.headers || []);
      setAutoMappings(data.autoMappings || {});
    } catch (error) {
      console.error('Error loading headers:', error);
      toast({
        title: "Error",
        description: "Failed to load sheet headers",
        variant: "destructive",
      });
    }
  };

  const handleSheetSelect = async (sheetId: string, _sheetName: string) => {
    setSelectedSheetId(sheetId);
    if (integration?.id) {
      await loadSheetTabs(sheetId, integration.id);
    }
  };

  const handleTabSelect = async (tabName: string) => {
    setSelectedTab(tabName);
    if (integration?.id && selectedSheetId) {
      await loadSheetHeaders(selectedSheetId, tabName, integration.id);
    }
  };

  useEffect(() => {
    fetchIntegration();
    
    // Check for OAuth callback success/error in URL
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const integrationIdParam = params.get('integration_id');
    const error = params.get('error');
    
    console.log('OAuth callback params:', { success, integrationIdParam, error });
    
    if (success && integrationIdParam) {
      console.log('OAuth success, setting up integration:', integrationIdParam);
      toast({
        title: "Successfully connected!",
        description: "Now select a spreadsheet to sync",
      });
      // Load available sheets immediately
      setIntegration({ id: integrationIdParam } as Integration);
      loadAvailableSheets(integrationIdParam);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname + '?tab=integrations');
    } else if (error) {
      toast({
        title: "Connection failed",
        description: error,
        variant: "destructive",
      });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname + '?tab=integrations');
    }
  }, []);

  const fetchIntegration = async () => {
    try {
      const { data, error } = await supabase
        .from('google_sheet_integrations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching integration:', error);
        throw error;
      }
      
      console.log('Integration data fetched:', data);
      
      if (data) {
        setIntegration(data as Integration);
        
        // If integration exists but no sheet configured, load available sheets
        if (!data.sheet_id && data.id) {
          console.log('No sheet configured, loading available sheets for:', data.id);
          loadAvailableSheets(data.id);
        }
      } else {
        console.log('No integration found');
      }
    } catch (error) {
      console.error('Error fetching integration:', error);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to continue",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('google-sheets-oauth', {
        body: { 
          userId: user.id, 
          type: 'settings',
          origin: window.location.origin 
        }
      });

      if (error) throw error;

      // Open OAuth URL in popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        data.authUrl,
        'Google OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      toast({
        title: "Opening Google OAuth",
        description: "Please authorize access to your Google Sheets",
      });
    } catch (error) {
      console.error('Error connecting to Google:', error);
      toast({
        title: "Connection failed",
        description: "Failed to initiate Google OAuth flow",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSheet = async (columnMappings: Record<string, string>) => {
    if (!integration?.id || !selectedSheetId || !selectedTab) return;

    setSyncing(true);
    try {
      // Save configuration
      const { error } = await supabase
        .from('google_sheet_integrations')
        .update({
          sheet_id: selectedSheetId,
          sheet_tab: selectedTab,
          column_mappings: columnMappings,
        })
        .eq('id', integration.id);

      if (error) throw error;

      // Register Drive API watch for real-time updates
      try {
        await supabase.functions.invoke('register-drive-watch', {
          body: { integrationId: integration.id, sheetId: selectedSheetId }
        });
      } catch (watchError) {
        console.error('Watch registration failed:', watchError);
      }

      // Sync leads
      const { data, error: syncError } = await supabase.functions.invoke('google-sheets-sync', {
        body: { integrationId: integration.id }
      });

      if (syncError) throw syncError;

      setLeadCount(data.synced || 0);
      
      toast({
        title: "Import completed!",
        description: `${data.synced || 0} leads imported successfully`,
      });
      
      setShowSheetModal(false);
      fetchIntegration();
      
      window.dispatchEvent(new CustomEvent('leads-updated'));
      window.dispatchEvent(new CustomEvent('integration-updated'));
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import leads",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!integration?.id) return;
    
    if (!confirm('Disconnect Google Sheets? Your leads will remain in the CRM.')) {
      return;
    }

    setDisconnecting(true);
    try {
      const { error } = await supabase
        .from('google_sheet_integrations')
        .delete()
        .eq('id', integration.id);

      if (error) throw error;

      toast({
        title: "Disconnected",
        description: "Google Sheets integration removed",
      });
      
      setIntegration(null);
      setLeadCount(null);
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Disconnect failed",
        description: "Failed to remove integration",
        variant: "destructive",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm('⚠️ Delete all leads? This cannot be undone.')) {
      return;
    }

    setClearingData(true);
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      toast({
        title: "Data cleared",
        description: "All leads deleted",
      });
      setLeadCount(null);
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: "Clear failed",
        description: "Failed to clear leads data",
        variant: "destructive",
      });
    } finally {
      setClearingData(false);
    }
  };

  const handleSync = async () => {
    if (!integration?.id) return;

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets-sync', {
        body: { integrationId: integration.id }
      });

      if (error) throw error;

      setLeadCount(data.synced || 0);
      
      toast({
        title: "Sync completed!",
        description: `${data.synced || 0} leads synced`,
      });
      
      fetchIntegration();
      window.dispatchEvent(new CustomEvent('leads-updated'));
    } catch (error) {
      console.error('Error syncing:', error);
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : 'Failed to sync',
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Google Sheets Import
          </CardTitle>
          <CardDescription>
            Import leads from Google Sheets into your CRM
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!integration ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your Google account to sync leads from spreadsheets.
              </p>
              <Button onClick={handleConnect} disabled={loading}>
                {loading ? "Connecting..." : "Connect Google Sheets"}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-success">✓ Connected</p>
                  {integration.sheet_id ? (
                    <p className="text-xs text-muted-foreground">
                      Sheet configured • {integration.last_synced_at ? `Last synced: ${new Date(integration.last_synced_at).toLocaleString()}` : 'Not synced yet'}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Ready to select spreadsheet
                    </p>
                  )}
                  {leadCount !== null && (
                    <p className="text-xs font-medium text-primary">
                      {leadCount} leads imported
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {integration.sheet_id && (
                    <Button onClick={handleSync} disabled={syncing} size="sm">
                      <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                      {syncing ? 'Importing...' : 'Import Now'}
                    </Button>
                  )}
                  <Button 
                    onClick={handleDisconnect} 
                    disabled={disconnecting} 
                    size="sm" 
                    variant="outline"
                  >
                    {disconnecting ? "Disconnecting..." : "Disconnect"}
                  </Button>
                  <Button 
                    onClick={handleClearData} 
                    disabled={clearingData} 
                    size="sm" 
                    variant="destructive"
                  >
                    {clearingData ? "Clearing..." : "Clear All"}
                  </Button>
                </div>
              </div>

              {!integration.sheet_id && (
                <div className="space-y-3">
                  {loadingSheets ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : availableSheets.length > 0 ? (
                    <Button onClick={() => setShowSheetModal(true)} className="w-full">
                      Select Spreadsheet & Import
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Loading your spreadsheets...
                    </p>
                  )}
                </div>
              )}

              {integration.sheet_id && (
                <Button 
                  onClick={() => {
                    loadAvailableSheets(integration.id);
                    setShowSheetModal(true);
                  }} 
                  variant="outline" 
                  className="w-full"
                >
                  Change Spreadsheet
                </Button>
              )}
            </>
          )}
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
        onConfirm={handleConfirmSheet}
        loading={loadingSheets}
        syncing={syncing}
        sheetHeaders={sheetHeaders}
        autoMappings={autoMappings}
      />
    </>
  );
};
