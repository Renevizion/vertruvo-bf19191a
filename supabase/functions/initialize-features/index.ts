import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Define all platform features
const PLATFORM_FEATURES = [
  // Workflow Templates
  { step_name: "Workflow Templates:Template Library", step_order: 1, category: "automation", description: "Browse and use pre-built workflow templates" },
  { step_name: "Workflow Templates:Template Usage Tracking", step_order: 2, category: "automation", description: "Track which templates are most popular" },
  
  // Agent Memory
  { step_name: "Agent Memory:Memory Storage", step_order: 3, category: "ai", description: "AI agents store business-specific context" },
  { step_name: "Agent Memory:Memory Retrieval", step_order: 4, category: "ai", description: "Agents access and use stored memories" },
  
  // Insights Dashboard
  { step_name: "Insights:AI-Generated Insights", step_order: 5, category: "analytics", description: "Generate business insights from workflow data" },
  { step_name: "Insights:Recommendations", step_order: 6, category: "analytics", description: "AI recommendations for optimization" },
  
  // Enhanced Onboarding
  { step_name: "Onboarding:Business Profiling", step_order: 7, category: "setup", description: "Profile business type during signup" },
  { step_name: "Onboarding:Auto-Configuration", step_order: 8, category: "setup", description: "Auto-configure based on business type" },
  
  // Feature Gating
  { step_name: "Access Control:Feature Limits", step_order: 9, category: "billing", description: "Enforce feature limits based on plan" },
  { step_name: "Access Control:Usage Tracking", step_order: 10, category: "billing", description: "Track feature usage per workspace" },
  
  // Workflow Analytics
  { step_name: "Workflow Analytics:Performance Metrics", step_order: 11, category: "automation", description: "Track workflow execution metrics" },
  { step_name: "Workflow Analytics:Optimization Suggestions", step_order: 12, category: "automation", description: "AI-powered workflow improvements" },
  
  // Enhanced Webhooks
  { step_name: "Webhooks:Integration Marketplace", step_order: 13, category: "integrations", description: "Pre-built webhook integrations" },
  { step_name: "Webhooks:Testing Playground", step_order: 14, category: "integrations", description: "Test and debug webhook configurations" },
  
  // Lead Scoring
  { step_name: "Lead Scoring:Auto-Scoring", step_order: 15, category: "sales", description: "Automatic lead scoring based on behavior" },
  { step_name: "Lead Scoring:Custom Rules", step_order: 16, category: "sales", description: "Configurable scoring rules" },
  
  // Multi-Channel Inbox
  { step_name: "Inbox:Unified Communications", step_order: 17, category: "communication", description: "SMS, Email, Voice in one inbox" },
  { step_name: "Inbox:AI Response Suggestions", step_order: 18, category: "communication", description: "AI-powered message suggestions" },
  
  // Form Analytics
  { step_name: "Forms:Analytics & Metrics", step_order: 19, category: "forms", description: "Track form performance and conversion" },
  { step_name: "Forms:A/B Testing", step_order: 20, category: "forms", description: "Test form variants for optimization" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { workspaceId, autoDetect = false } = await req.json();

    if (!workspaceId) {
      throw new Error("workspace_id is required");
    }

    // Check if already initialized
    const { data: existing, error: existingError } = await supabaseClient
      .from('onboarding_progress')
      .select('id')
      .eq('workspace_id', workspaceId)
      .limit(1);

    if (existingError) throw existingError;

    if (!existing || existing.length === 0) {
      // Initialize all features
      const progressRecords = PLATFORM_FEATURES.map(feature => ({
        workspace_id: workspaceId,
        step_name: feature.step_name,
        step_order: feature.step_order,
        completed: false,
        data: {
          description: feature.description,
          category: feature.category
        }
      }));

      const { error: insertError } = await supabaseClient
        .from('onboarding_progress')
        .insert(progressRecords);

      if (insertError) throw insertError;

      console.log(`Initialized ${PLATFORM_FEATURES.length} features for workspace: ${workspaceId}`);
    }

    // Auto-detect completed features if requested
    if (autoDetect) {
      const completions: string[] = [];

      // Check Workflow Templates
      const { data: templates } = await supabaseClient
        .from('workflow_templates')
        .select('id')
        .limit(1);
      
      if (templates && templates.length > 0) {
        completions.push("Workflow Templates:Template Library");
      }

      // Check Agent Memory
      const { data: agentMemory } = await supabaseClient
        .from('agent_memory')
        .select('id')
        .eq('workspace_id', workspaceId)
        .limit(1);
      
      if (agentMemory && agentMemory.length > 0) {
        completions.push("Agent Memory:Memory Storage");
      }

      // Check Insights
      const { data: insights } = await supabaseClient
        .from('workspace_insights')
        .select('id')
        .eq('workspace_id', workspaceId)
        .limit(1);
      
      if (insights && insights.length > 0) {
        completions.push("Insights:AI-Generated Insights");
      }

      // Check Lead Scoring
      const { data: scoringRules } = await supabaseClient
        .from('lead_scoring_rules')
        .select('id')
        .eq('workspace_id', workspaceId)
        .limit(1);
      
      if (scoringRules && scoringRules.length > 0) {
        completions.push("Lead Scoring:Custom Rules");
      }

      // Check Workflows
      const { data: workflows } = await supabaseClient
        .from('workflows')
        .select('id')
        .eq('workspace_id', workspaceId)
        .limit(1);
      
      if (workflows && workflows.length > 0) {
        completions.push("Workflow Analytics:Performance Metrics");
      }

      // Check Forms
      const { data: forms } = await supabaseClient
        .from('forms')
        .select('id')
        .eq('workspace_id', workspaceId)
        .limit(1);
      
      if (forms && forms.length > 0) {
        completions.push("Forms:Analytics & Metrics");
      }

      // Check Webhooks
      const { data: webhooks } = await supabaseClient
        .from('webhook_configs')
        .select('id')
        .eq('workspace_id', workspaceId)
        .limit(1);
      
      if (webhooks && webhooks.length > 0) {
        completions.push("Webhooks:Integration Marketplace");
      }

      // Check Conversations
      const { data: conversations } = await supabaseClient
        .from('conversations')
        .select('id')
        .eq('workspace_id', workspaceId)
        .limit(1);
      
      if (conversations && conversations.length > 0) {
        completions.push("Inbox:Unified Communications");
      }

      // Check AI Agents
      const { data: aiAgents } = await supabaseClient
        .from('ai_agents')
        .select('id')
        .eq('workspace_id', workspaceId)
        .limit(1);
      
      if (aiAgents && aiAgents.length > 0) {
        completions.push("Agent Memory:Memory Retrieval");
      }

      // Mark all detected features as complete
      for (const featureName of completions) {
        await supabaseClient
          .from('onboarding_progress')
          .update({
            completed: true,
            completed_at: new Date().toISOString()
          })
          .eq('workspace_id', workspaceId)
          .eq('step_name', featureName);
      }

      console.log(`Auto-detected ${completions.length} completed features`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          initialized: true,
          detected: completions.length,
          features: completions
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, initialized: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
