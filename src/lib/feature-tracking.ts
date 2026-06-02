import { supabase } from "@/integrations/supabase/client";

export interface FeatureDefinition {
  step_name: string;
  step_order: number;
  description?: string;
  category?: string;
}

// Define all platform features
export const PLATFORM_FEATURES: FeatureDefinition[] = [
  // Workflow Templates
  {
    step_name: "Workflow Templates:Template Library",
    step_order: 1,
    description: "Browse and use pre-built workflow templates",
    category: "automation"
  },
  {
    step_name: "Workflow Templates:Template Usage Tracking",
    step_order: 2,
    description: "Track which templates are most popular",
    category: "automation"
  },
  
  // Agent Memory
  {
    step_name: "Agent Memory:Memory Storage",
    step_order: 3,
    description: "AI agents store business-specific context",
    category: "ai"
  },
  {
    step_name: "Agent Memory:Memory Retrieval",
    step_order: 4,
    description: "Agents access and use stored memories",
    category: "ai"
  },
  
  // Insights Dashboard
  {
    step_name: "Insights:AI-Generated Insights",
    step_order: 5,
    description: "Generate business insights from workflow data",
    category: "analytics"
  },
  {
    step_name: "Insights:Recommendations",
    step_order: 6,
    description: "AI recommendations for optimization",
    category: "analytics"
  },
  
  // Enhanced Onboarding
  {
    step_name: "Onboarding:Business Profiling",
    step_order: 7,
    description: "Profile business type during signup",
    category: "setup"
  },
  {
    step_name: "Onboarding:Auto-Configuration",
    step_order: 8,
    description: "Auto-configure based on business type",
    category: "setup"
  },
  
  // Feature Gating
  {
    step_name: "Access Control:Feature Limits",
    step_order: 9,
    description: "Enforce feature limits based on plan",
    category: "billing"
  },
  {
    step_name: "Access Control:Usage Tracking",
    step_order: 10,
    description: "Track feature usage per workspace",
    category: "billing"
  },
  
  // Workflow Analytics
  {
    step_name: "Workflow Analytics:Performance Metrics",
    step_order: 11,
    description: "Track workflow execution metrics",
    category: "automation"
  },
  {
    step_name: "Workflow Analytics:Optimization Suggestions",
    step_order: 12,
    description: "AI-powered workflow improvements",
    category: "automation"
  },
  
  // Enhanced Webhooks
  {
    step_name: "Webhooks:Integration Marketplace",
    step_order: 13,
    description: "Pre-built webhook integrations",
    category: "integrations"
  },
  {
    step_name: "Webhooks:Testing Playground",
    step_order: 14,
    description: "Test and debug webhook configurations",
    category: "integrations"
  },
  
  // Lead Scoring
  {
    step_name: "Lead Scoring:Auto-Scoring",
    step_order: 15,
    description: "Automatic lead scoring based on behavior",
    category: "sales"
  },
  {
    step_name: "Lead Scoring:Custom Rules",
    step_order: 16,
    description: "Configurable scoring rules",
    category: "sales"
  },
  
  // Multi-Channel Inbox
  {
    step_name: "Inbox:Unified Communications",
    step_order: 17,
    description: "SMS, Email, Voice in one inbox",
    category: "communication"
  },
  {
    step_name: "Inbox:AI Response Suggestions",
    step_order: 18,
    description: "AI-powered message suggestions",
    category: "communication"
  },
  
  // Form Analytics
  {
    step_name: "Forms:Analytics & Metrics",
    step_order: 19,
    description: "Track form performance and conversion",
    category: "forms"
  },
  {
    step_name: "Forms:A/B Testing",
    step_order: 20,
    description: "Test form variants for optimization",
    category: "forms"
  },
];

/**
 * Initialize feature tracking for a workspace
 */
export async function initializeFeatureTracking(workspaceId: string) {
  try {
    // Check if already initialized
    const { data: existing } = await supabase
      .from('onboarding_progress')
      .select('id')
      .eq('workspace_id', workspaceId)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('[FeatureTracking] Already initialized for workspace:', workspaceId);
      return { success: true, message: 'Already initialized' };
    }

    // Insert all features as incomplete
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

    const { error } = await supabase
      .from('onboarding_progress')
      .insert(progressRecords);

    if (error) throw error;

    console.log('[FeatureTracking] Initialized', PLATFORM_FEATURES.length, 'features for workspace:', workspaceId);
    return { success: true, message: 'Initialized successfully' };
  } catch (error) {
    console.error('[FeatureTracking] Error initializing:', error);
    return { success: false, error };
  }
}

/**
 * Mark a feature as complete
 */
export async function markFeatureComplete(workspaceId: string, featureName: string) {
  try {
    const { error } = await supabase
      .from('onboarding_progress')
      .update({
        completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('workspace_id', workspaceId)
      .eq('step_name', featureName);

    if (error) throw error;

    console.log('[FeatureTracking] Marked complete:', featureName);
    return { success: true };
  } catch (error) {
    console.error('[FeatureTracking] Error marking complete:', error);
    return { success: false, error };
  }
}

/**
 * Auto-detect and mark features as complete based on data
 */
export async function autoDetectCompletedFeatures(workspaceId: string) {
  try {
    const completions: string[] = [];

    // Check Workflow Templates (global table)
    const { error: templatesError } = await supabase
      .from('workflow_templates')
      .select('id')
      .limit(1);
    
    if (!templatesError) {
      completions.push("Workflow Templates:Template Library", "Workflow Templates:Template Usage Tracking");
    }

    // Check Agent Memory
    const { error: memoryError } = await supabase
      .from('agent_memory')
      .select('id')
      .limit(1);
    
    if (!memoryError) {
      completions.push("Agent Memory:Memory Storage", "Agent Memory:Memory Retrieval");
    }

    // Check Insights
    const { error: insightsError } = await supabase
      .from('agent_insights')
      .select('id')
      .limit(1);
    
    if (!insightsError) {
      completions.push("Insights:AI-Generated Insights", "Insights:Recommendations");
    }

    // Check Lead Scoring Rules
    const { error: scoringError } = await supabase
      .from('lead_scoring_rules')
      .select('id')
      .limit(1);
    
    if (!scoringError) {
      completions.push("Lead Scoring:Auto-Scoring", "Lead Scoring:Custom Rules");
    }

    // Check Workflows
    const { data: workflows } = await supabase
      .from('workflows')
      .select('id')
      .eq('workspace_id', workspaceId)
      .limit(1);
    
    if (workflows && workflows.length > 0) {
      completions.push("Workflow Analytics:Performance Metrics");
    }

    // Check Workflow Recommendations
    const { error: recommendationsError } = await supabase
      .from('workflow_recommendations')
      .select('id')
      .limit(1);
    
    if (!recommendationsError) {
      completions.push("Workflow Analytics:Optimization Suggestions");
    }

    // Check Forms
    const { data: forms } = await supabase
      .from('forms')
      .select('id')
      .eq('workspace_id', workspaceId)
      .limit(1);
    
    if (forms && forms.length > 0) {
      completions.push("Forms:Analytics & Metrics");
    }

    // Check Form A/B Testing
    const { error: abTestError } = await supabase
      .from('form_ab_tests')
      .select('id')
      .limit(1);
    
    if (!abTestError) {
      completions.push("Forms:A/B Testing");
    }

    // Check Webhook Integrations
    const { error: webhooksError } = await supabase
      .from('webhook_integrations')
      .select('id')
      .limit(1);
    
    if (!webhooksError) {
      completions.push("Webhooks:Integration Marketplace", "Webhooks:Testing Playground");
    }

    // Check Conversations (Inbox)
    const { error: conversationsError } = await supabase
      .from('conversations')
      .select('id')
      .limit(1);
    
    if (!conversationsError) {
      completions.push("Inbox:Unified Communications", "Inbox:AI Response Suggestions");
    }

    // Check Onboarding (business profiling)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('onboarding_business_type')
      .not('onboarding_business_type', 'is', null)
      .limit(1);
    
    if (profiles && profiles.length > 0) {
      completions.push("Onboarding:Business Profiling", "Onboarding:Auto-Configuration");
    }

    // Check Feature Usage Tracking
    const { error: usageError } = await supabase
      .from('workspace_feature_usage')
      .select('id')
      .limit(1);
    
    if (!usageError) {
      completions.push("Access Control:Feature Limits", "Access Control:Usage Tracking");
    }

    // Mark all detected features as complete
    for (const featureName of completions) {
      await markFeatureComplete(workspaceId, featureName);
    }

    console.log('[FeatureTracking] Auto-detected', completions.length, 'completed features');
    return { success: true, detected: completions.length };
  } catch (error) {
    console.error('[FeatureTracking] Error auto-detecting:', error);
    return { success: false, error };
  }
}

/**
 * Get completion status for all features
 */
export async function getFeatureStatus(workspaceId: string) {
  try {
    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('step_order');

    if (error) throw error;

    const total = data?.length || 0;
    const completed = data?.filter(f => f.completed).length || 0;

    return {
      success: true,
      data,
      stats: {
        total,
        completed,
        percentage: total > 0 ? (completed / total) * 100 : 0
      }
    };
  } catch (error) {
    console.error('[FeatureTracking] Error getting status:', error);
    return { success: false, error };
  }
}
