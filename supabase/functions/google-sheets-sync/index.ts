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
    const { integrationId, previewOnly } = await req.json();

    if (!integrationId) {
      throw new Error('Integration ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!supabaseUrl || !supabaseServiceKey || !clientId || !clientSecret) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch integration details
    const { data: integration, error: fetchError } = await supabase
      .from('google_sheet_integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (fetchError || !integration) {
      console.error('Integration fetch error:', fetchError);
      throw new Error('Integration not found');
    }

    // Get the user_id from the integration
    const userId = integration.user_id;
    if (!userId) {
      throw new Error('User ID not found for integration');
    }

    // Get the user's workspace_id
    const { data: workspaceMember } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
      .single();
    
    if (!workspaceMember) {
      throw new Error('User workspace not found');
    }
    
    const workspaceId = workspaceMember.workspace_id;

    if (!integration.sheet_id) {
      throw new Error('Sheet ID not configured');
    }

    console.log('Starting sync for integration:', integrationId);

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
        .eq('id', integrationId);
      
      console.log('Token refreshed successfully');
    }

    // Fetch data from Google Sheets
    const sheetTab = integration.sheet_tab || 'Sheet1';
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${integration.sheet_id}/values/${sheetTab}`;
    
    const sheetsResponse = await fetch(sheetsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!sheetsResponse.ok) {
      const errorText = await sheetsResponse.text();
      console.error('Sheets API error:', errorText);
      
      let errorMessage = 'Failed to fetch data from Google Sheets';
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = `Google Sheets API error: ${errorJson.error.message}`;
        }
      } catch (e) {
        // If parsing fails, use the raw error text
        errorMessage = `Google Sheets API error: ${errorText}`;
      }
      
      throw new Error(errorMessage);
    }

    const sheetsData = await sheetsResponse.json();
    const rows = sheetsData.values || [];
    
    console.log(`Fetched ${rows.length} rows from sheet`);

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No data found in sheet', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get column mappings
    const mappings = integration.column_mappings || {};
    
    // Convert column letters to indices (A=0, B=1, etc.)
    const columnToIndex = (col: string) => {
      let index = 0;
      for (let i = 0; i < col.length; i++) {
        index = index * 26 + (col.charCodeAt(i) - 65 + 1);
      }
      return index - 1;
    };
    
    // Get default pipeline FIRST
    let selectedPipeline = await supabase
      .from('pipelines')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('is_default', true)
      .maybeSingle();
    
    if (!selectedPipeline.data) {
      // If no default pipeline, get the first one for this workspace
      selectedPipeline = await supabase
        .from('pipelines')
        .select('id')
        .eq('workspace_id', workspaceId)
        .order('created_at')
        .limit(1)
        .maybeSingle();
      
      if (!selectedPipeline.data) {
        throw new Error('No pipeline found for this workspace');
      }
    }
    
    const pipelineId = selectedPipeline.data.id;
    
    // Fetch pipeline stages ONLY for the selected pipeline
    const { data: stages } = await supabase
      .from('pipeline_stages')
      .select('id, name, position')
      .eq('pipeline_id', pipelineId)
      .order('position');
    
    const stageMap = new Map(stages?.map(s => [s.name.toLowerCase(), s.id]) || []);
    const firstStageId = stages?.[0]?.id || null;
    
    // Map status to stage with intelligent fallbacks for THIS pipeline only
    const statusToStage = (status: string | null): string | null => {
      if (!status) return firstStageId;
      
      const normalized = status.toLowerCase().trim();
      
      // Direct match from current pipeline's stages
      if (stageMap.has(normalized)) return stageMap.get(normalized)!;
      
      // Common variations - check if any exist in current pipeline
      const variations = [
        { patterns: ['new', 'lead', 'new inquiry', 'new inquiries'], matches: ['new inquiries', 'new lead', 'new'] },
        { patterns: ['contacted', 'contact', 'in progress'], matches: ['in progress', 'contacted', 'contact'] },
        { patterns: ['qualified', 'qualified lead', 'follow up'], matches: ['follow up later', 'qualified', 'follow up'] },
        { patterns: ['proposal', 'quote', 'quoted'], matches: ['proposal', 'quote'] },
        { patterns: ['won', 'closed won', 'done won'], matches: ['done won', 'won', 'closed won'] },
        { patterns: ['lost', 'closed lost', 'done lost'], matches: ['done lost', 'lost', 'closed lost'] }
      ];
      
      for (const { patterns, matches } of variations) {
        if (patterns.includes(normalized)) {
          for (const match of matches) {
            if (stageMap.has(match)) return stageMap.get(match)!;
          }
        }
      }
      
      // No match found - assign to first stage as fallback
      console.log(`No stage match for status "${status}", assigning to first stage`);
      return firstStageId;
    };

    // Skip header row and process data
    const dataRows = rows.slice(1);
    let syncedCount = 0;
    let skippedCount = 0;
    let newCount = 0;
    let existingCount = 0;

    // Track emails from sheet to detect deletions
    const sheetEmails = new Set<string>();

    // If preview mode, just count without syncing
    if (previewOnly) {
      for (const row of dataRows) {
        const leadData: any = {};
        
        for (const [field, column] of Object.entries(mappings)) {
          if (!column) continue;
          const index = columnToIndex(column as string);
          const value = row[index];
          if (value) leadData[field] = value;
        }

        if (!leadData.name || !leadData.email) {
          skippedCount++;
          continue;
        }

        const normalizedEmail = leadData.email.toLowerCase().trim();
        
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .ilike('email', normalizedEmail)
          .eq('workspace_id', workspaceId)
          .maybeSingle();

        if (existingLead) {
          existingCount++;
        } else {
          newCount++;
        }
      }

      return new Response(
        JSON.stringify({ 
          message: 'Preview completed',
          total: dataRows.length,
          new: newCount,
          existing: existingCount,
          skipped: skippedCount
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    for (const row of dataRows) {
      try {
        // Map row data to lead fields
        const leadData: any = {};
        let statusValue: string | null = null;
        
        for (const [field, column] of Object.entries(mappings)) {
          if (!column) continue;
          
          const index = columnToIndex(column as string);
          const value = row[index];
          
          if (value) {
            if (field === 'status') {
              statusValue = value;
            } else {
              leadData[field] = value;
            }
          }
        }

        // Skip if no name or email
        if (!leadData.name || !leadData.email) {
          skippedCount++;
          continue;
        }

        // Normalize email for duplicate checking
        const normalizedEmail = leadData.email.toLowerCase().trim();
        sheetEmails.add(normalizedEmail);

        // Map status to stage_id (always assigns a stage now)
        const stageId = statusToStage(statusValue);
        leadData.stage_id = stageId;

        // Mark as sheet-sourced and set workspace_id and pipeline_id
        leadData.source = leadData.source || 'Google Sheets';
        leadData.workspace_id = workspaceId;
        leadData.pipeline_id = pipelineId;
        
        // Check if lead already exists by email AND workspace (case-insensitive)
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .ilike('email', normalizedEmail)
          .eq('workspace_id', workspaceId)
          .maybeSingle();

        if (existingLead) {
          // Update existing lead
          const { error: updateError } = await supabase
            .from('leads')
            .update({
              ...leadData,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingLead.id);
          
          if (updateError) {
            console.error('Error updating lead:', updateError);
            skippedCount++;
            continue;
          }
          
          // Also ensure contact exists for updated leads
          const { data: existingContact } = await supabase
            .from('contacts')
            .select('id')
            .ilike('email', normalizedEmail)
            .eq('workspace_id', workspaceId)
            .maybeSingle();

          if (!existingContact) {
            const contactData = {
              name: leadData.name,
              email: leadData.email,
              phone: leadData.phone,
              company: leadData.company,
              workspace_id: workspaceId
            };
            
            const { error: contactError } = await supabase
              .from('contacts')
              .insert(contactData);
            
            if (contactError) {
              console.error('Error creating contact from updated lead:', contactError);
            }
          }
          
          syncedCount++;
        } else {
          // Insert new lead
          const { error: insertError } = await supabase
            .from('leads')
            .insert(leadData);
          
          if (insertError) {
            console.error('Error inserting lead:', insertError, 'Data:', leadData);
            skippedCount++;
            continue;
          }
          
          // Check if contact exists before creating
          const { data: existingContact } = await supabase
            .from('contacts')
            .select('id')
            .ilike('email', normalizedEmail)
            .eq('workspace_id', workspaceId)
            .maybeSingle();

          if (!existingContact) {
            const contactData = {
              name: leadData.name,
              email: leadData.email,
              phone: leadData.phone,
              company: leadData.company,
              workspace_id: workspaceId
            };
            
            const { error: contactError } = await supabase
              .from('contacts')
              .insert(contactData);
            
            if (contactError) {
              console.error('Error creating contact from lead:', contactError);
            }
          }
          
          syncedCount++;
        }
      } catch (error) {
        console.error('Error processing row:', error);
        skippedCount++;
      }
    }

    // Handle deletions: remove leads that are no longer in the sheet (case-insensitive)
    const { data: sheetSourcedLeads } = await supabase
      .from('leads')
      .select('id, email')
      .eq('source', 'Google Sheets')
      .eq('workspace_id', workspaceId);
    
    const leadsToDelete = (sheetSourcedLeads || [])
      .filter(lead => lead.email && !sheetEmails.has(lead.email.toLowerCase().trim()))
      .map(lead => lead.id);
    
    let deletedCount = 0;
    if (leadsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .in('id', leadsToDelete);
      
      if (deleteError) {
        console.error('Error deleting leads:', deleteError);
      } else {
        deletedCount = leadsToDelete.length;
        console.log(`Deleted ${deletedCount} leads no longer in sheet`);
      }
    }

    // Update last synced timestamp
    await supabase
      .from('google_sheet_integrations')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', integrationId);

    console.log(`Sync completed: ${syncedCount} synced, ${skippedCount} skipped, ${deletedCount} deleted`);

    return new Response(
      JSON.stringify({ 
        message: 'Sync completed successfully',
        synced: syncedCount,
        skipped: skippedCount,
        deleted: deletedCount,
        total: dataRows.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in google-sheets-sync:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred syncing with Google Sheets' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
