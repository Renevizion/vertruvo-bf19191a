import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { checkUsageGate, usageLimitResponse, getWorkspaceForUser } from "../_shared/usage-gate.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkflowAnalytics {
  workflow_id: string;
  execution_count: number;
  success_count: number;
  error_count: number;
  avg_duration_ms: number;
  last_run_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await verifyAuth(req);
    if (!auth) return unauthorizedResponse(corsHeaders);
    console.log(`[Workflow Recommendations] Authenticated: ${auth.userId}`);

    // USAGE GATE: Check AI query limits
    const wsId = await getWorkspaceForUser(auth.userId);
    if (wsId) {
      const usageCheck = await checkUsageGate(wsId, 'ai_queries', auth.userId);
      if (!usageCheck.allowed) return usageLimitResponse(corsHeaders, usageCheck);
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all workflows with analytics data
    const { data: analytics, error: analyticsError } = await supabaseClient
      .from('workflow_analytics')
      .select('*')
      .order('last_run_at', { ascending: false });

    if (analyticsError) throw analyticsError;

    console.log(`Found ${analytics?.length || 0} workflow analytics records`);

    const recommendations: any[] = [];

    // Generate recommendations based on analytics
    for (const analytic of (analytics || [])) {
      const successRate = analytic.execution_count > 0
        ? (analytic.success_count / analytic.execution_count) * 100
        : 0;
      
      const errorRate = analytic.execution_count > 0
        ? (analytic.error_count / analytic.execution_count) * 100
        : 0;

      // Recommendation 1: High error rate
      if (errorRate > 20 && analytic.execution_count > 5) {
        recommendations.push({
          workflow_id: analytic.workflow_id,
          recommendation_type: 'error_handling',
          title: 'Add Error Recovery Steps',
          description: `This workflow has a ${errorRate.toFixed(1)}% error rate. Consider adding retry logic or fallback actions to improve reliability.`,
          expected_improvement: `Reduce error rate by up to 50%`,
        });
      }

      // Recommendation 2: Slow execution
      if (analytic.avg_duration_ms > 5000 && analytic.execution_count > 3) {
        recommendations.push({
          workflow_id: analytic.workflow_id,
          recommendation_type: 'optimize_timing',
          title: 'Optimize Workflow Speed',
          description: `Average execution time is ${(analytic.avg_duration_ms / 1000).toFixed(1)}s. Consider parallelizing actions or reducing API calls.`,
          expected_improvement: `20-40% faster execution`,
        });
      }

      // Recommendation 3: Low usage
      const daysSinceLastRun = analytic.last_run_at
        ? Math.floor((Date.now() - new Date(analytic.last_run_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      if (daysSinceLastRun > 7 && analytic.execution_count < 10) {
        recommendations.push({
          workflow_id: analytic.workflow_id,
          recommendation_type: 'review_trigger',
          title: 'Review Trigger Configuration',
          description: `This workflow hasn't run in ${daysSinceLastRun} days. The trigger conditions may need adjustment.`,
          expected_improvement: `Increase automation coverage`,
        });
      }

      // Recommendation 4: High success rate but could add conditions
      if (successRate > 90 && analytic.execution_count > 10) {
        recommendations.push({
          workflow_id: analytic.workflow_id,
          recommendation_type: 'add_condition',
          title: 'Add Smart Filtering',
          description: `This workflow is performing well. Consider adding conditions to make it more targeted and efficient.`,
          expected_improvement: `10-15% more precise automation`,
        });
      }
    }

    console.log(`Generated ${recommendations.length} recommendations`);

    // Delete existing recommendations that are older than 7 days or already applied
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseClient
      .from('workflow_recommendations')
      .delete()
      .or(`created_at.lt.${sevenDaysAgo},is_applied.eq.true`);

    // Insert new recommendations (avoiding duplicates)
    if (recommendations.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('workflow_recommendations')
        .upsert(recommendations, {
          onConflict: 'workflow_id,recommendation_type',
          ignoreDuplicates: false,
        });

      if (insertError) {
        console.error('Error inserting recommendations:', insertError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        recommendations_generated: recommendations.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-workflow-recommendations:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
