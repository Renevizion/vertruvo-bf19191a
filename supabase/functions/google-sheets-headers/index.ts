import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { integrationId, sheetId, tabName } = await req.json();
    
    if (!integrationId || !sheetId || !tabName) {
      throw new Error('Missing required parameters: integrationId, sheetId, and tabName are required');
    }

    console.log('[google-sheets-headers] Fetching headers for:', { integrationId, sheetId, tabName });

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get integration
    const { data: integration, error: integrationError } = await supabase
      .from('google_sheet_integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (integrationError || !integration) {
      throw new Error('Integration not found');
    }

    console.log('[google-sheets-headers] Integration found');

    // Fetch first row (headers) from Google Sheets
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tabName)}!1:1`,
      {
        headers: {
          'Authorization': `Bearer ${integration.google_access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[google-sheets-headers] Google API error:', errorData);
      throw new Error(`Failed to fetch headers: ${response.statusText}`);
    }

    const data = await response.json();
    const headers = data.values?.[0] || [];
    
    console.log('[google-sheets-headers] Found headers:', headers);

    // Auto-detect mappings based on header names
    const autoMappings: Record<string, string> = {};
    const crmFields = ['name', 'email', 'phone', 'company', 'source', 'notes', 'value', 'status'];
    
    headers.forEach((header: string, index: number) => {
      const headerLower = header.toLowerCase().trim();
      const columnLetter = String.fromCharCode(65 + index); // A, B, C, etc.
      
      // Try to match with CRM fields
      for (const field of crmFields) {
        if (headerLower.includes(field) || field.includes(headerLower)) {
          if (!autoMappings[field]) { // Only set if not already mapped
            autoMappings[field] = columnLetter;
          }
        }
      }
      
      // Special cases
      if (headerLower.includes('full') && headerLower.includes('name')) {
        autoMappings['name'] = columnLetter;
      }
      if (headerLower.includes('business') || headerLower.includes('organization')) {
        autoMappings['company'] = columnLetter;
      }
      if (headerLower.includes('amount') || headerLower.includes('deal')) {
        autoMappings['value'] = columnLetter;
      }
    });

    console.log('[google-sheets-headers] Auto-detected mappings:', autoMappings);

    return new Response(
      JSON.stringify({ 
        headers,
        autoMappings,
        success: true 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[google-sheets-headers] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
