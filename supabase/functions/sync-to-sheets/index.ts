import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId } = await req.json();

    if (!leadId) {
      throw new Error('Lead ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!supabaseUrl || !supabaseServiceKey || !clientId || !clientSecret) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      throw new Error('Lead not found');
    }

    // Fetch active integration
    const { data: integration, error: integrationError } = await supabase
      .from('google_sheet_integrations')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (integrationError || !integration) {
      console.log('No active integration found, skipping sync to sheets');
      return new Response(
        JSON.stringify({ message: 'No active integration' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!integration.sheet_id) {
      throw new Error('Sheet ID not configured');
    }

    console.log('Syncing lead to Google Sheets:', leadId);

    // Check if token needs refresh
    let accessToken = integration.google_access_token;
    const tokenExpiry = new Date(integration.token_expires_at);
    
    if (tokenExpiry < new Date()) {
      console.log('Token expired, refreshing...');
      
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: integration.google_refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh access token');
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;
      
      const newExpiry = new Date(Date.now() + (refreshData.expires_in * 1000));
      
      await supabase
        .from('google_sheet_integrations')
        .update({
          google_access_token: accessToken,
          token_expires_at: newExpiry.toISOString(),
        })
        .eq('id', integration.id);
    }

    const mappings = integration.column_mappings || {};
    const sheetTab = integration.sheet_tab || 'Sheet1';

    // Convert column letter to index
    const columnToIndex = (col: string) => {
      let index = 0;
      for (let i = 0; i < col.length; i++) {
        index = index * 26 + (col.charCodeAt(i) - 65 + 1);
      }
      return index - 1;
    };

    // Fetch all data to find the row
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${integration.sheet_id}/values/${sheetTab}`;
    
    const sheetsResponse = await fetch(sheetsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!sheetsResponse.ok) {
      throw new Error('Failed to fetch sheet data');
    }

    const sheetsData = await sheetsResponse.json();
    const rows = sheetsData.values || [];

    // Find row by email
    let rowIndex = -1;
    const emailCol = mappings.email;
    if (emailCol && lead.email) {
      const emailColIndex = columnToIndex(emailCol);
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][emailColIndex] === lead.email) {
          rowIndex = i + 1; // +1 because sheets are 1-indexed
          break;
        }
      }
    }

    // Build the row data
    const rowData: any[] = [];
    const maxCol = Math.max(
      ...Object.values(mappings)
        .filter(Boolean)
        .map(col => columnToIndex(col as string))
    );

    for (let i = 0; i <= maxCol; i++) {
      rowData.push('');
    }

    for (const [field, column] of Object.entries(mappings)) {
      if (!column) continue;
      const index = columnToIndex(column as string);
      
      if (field === 'status' && lead.stage_id) {
        // Fetch stage name
        const { data: stage } = await supabase
          .from('pipeline_stages')
          .select('name')
          .eq('id', lead.stage_id)
          .single();
        
        if (stage) {
          rowData[index] = stage.name;
        }
      } else if (lead[field]) {
        rowData[index] = String(lead[field]);
      }
    }

    // Update or append the row
    const range = rowIndex > 0 
      ? `${sheetTab}!A${rowIndex}` 
      : `${sheetTab}!A${rows.length + 1}`;

    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${integration.sheet_id}/values/${range}?valueInputOption=RAW`;
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowData]
      }),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Sheets API error:', errorText);
      throw new Error('Failed to update Google Sheets');
    }

    console.log(`Lead ${rowIndex > 0 ? 'updated' : 'added'} in Google Sheets`);

    return new Response(
      JSON.stringify({ 
        message: 'Lead synced to Google Sheets successfully',
        action: rowIndex > 0 ? 'updated' : 'added'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error syncing to sheets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});