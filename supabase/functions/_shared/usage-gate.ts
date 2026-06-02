import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

/**
 * Look up workspace ID from a user ID (first workspace they belong to).
 */
export async function getWorkspaceForUser(userId: string): Promise<string | null> {
  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const { data } = await serviceClient
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return data?.workspace_id || null;
}

export interface UsageGateResult {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number | null;
}

/**
 * Check if a workspace can use a feature, and optionally increment usage.
 * Uses the can_use_feature RPC which checks plan_features + workspace_feature_usage.
 * 
 * Platform admins bypass all limits.
 * Returns { allowed: true } if the workspace is within limits.
 */
export async function checkUsageGate(
  workspaceId: string,
  featureKey: string,
  userId?: string,
  incrementUsage: boolean = true
): Promise<UsageGateResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const serviceClient = createClient(supabaseUrl, serviceKey);

  // Platform admins bypass all limits
  if (userId) {
    const { data: isAdmin } = await serviceClient.rpc('is_platform_admin', { _user_id: userId });
    if (isAdmin) {
      console.log(`[Usage Gate] Admin bypass for ${featureKey}`);
      return { allowed: true };
    }
  }

  // Check feature limit via RPC
  const { data: canUse, error } = await serviceClient.rpc('can_use_feature', {
    p_workspace_id: workspaceId,
    p_feature_key: featureKey,
    p_increment_usage: incrementUsage,
  });

  if (error) {
    console.error(`[Usage Gate] RPC error for ${featureKey}:`, error.message);
    // On error, allow but don't increment (fail-open for UX, but log it)
    return { allowed: true, reason: 'gate_error' };
  }

  if (canUse === false) {
    // Get current usage info for the error message
    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);

    const { data: usageRow } = await serviceClient
      .from('workspace_feature_usage')
      .select('usage_count')
      .eq('workspace_id', workspaceId)
      .eq('feature_key', featureKey)
      .eq('period_start', periodStart.toISOString())
      .maybeSingle();

    const { data: limitRow } = await serviceClient
      .from('plan_features')
      .select('limit_value, plans!inner(id)')
      .eq('feature_key', featureKey)
      .eq('plans.id', (await serviceClient.from('subscriptions').select('plan_id').eq('workspace_id', workspaceId).in('status', ['active', 'trial']).maybeSingle()).data?.plan_id || '')
      .maybeSingle();

    console.log(`[Usage Gate] BLOCKED: ${featureKey} for workspace ${workspaceId}. Usage: ${usageRow?.usage_count || 0}, Limit: ${limitRow?.limit_value}`);
    
    return {
      allowed: false,
      reason: `Monthly ${featureKey.replace(/_/g, ' ')} limit reached`,
      currentUsage: usageRow?.usage_count || 0,
      limit: limitRow?.limit_value,
    };
  }

  console.log(`[Usage Gate] Allowed: ${featureKey} for workspace ${workspaceId}`);
  return { allowed: true };
}

/**
 * Returns a 402 Payment Required response when usage limit is exceeded.
 */
export function usageLimitResponse(
  corsHeaders: Record<string, string>,
  result: UsageGateResult
): Response {
  return new Response(
    JSON.stringify({
      error: 'Usage limit exceeded',
      reason: result.reason,
      currentUsage: result.currentUsage,
      limit: result.limit,
      upgrade: true,
    }),
    { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
