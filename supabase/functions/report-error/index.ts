import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiting (per IP, resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Max 10 requests per minute per IP

function hashIP(ip: string): string {
  // Simple hash for privacy - don't store raw IPs
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

function isRateLimited(ipHash: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ipHash);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ipHash, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  entry.count++;
  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting by hashed IP
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const ipHash = hashIP(clientIP);
    
    if (isRateLimited(ipHash)) {
      console.log(`[Error Reporter] Rate limited: ${ipHash}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Too many requests. Please try again later.' 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { 
      errorMessage, 
      errorStack, 
      userMessage, 
      errorContext,
      workspaceId 
    } = await req.json();

    if (!errorMessage) {
      throw new Error('errorMessage is required');
    }

    // Basic input validation
    if (typeof errorMessage !== 'string' || errorMessage.length > 10000) {
      throw new Error('Invalid errorMessage');
    }
    if (userMessage && (typeof userMessage !== 'string' || userMessage.length > 5000)) {
      throw new Error('Invalid userMessage');
    }

    console.log('[Error Reporter] Receiving error report');
    console.log(`[Error Reporter] Error: ${errorMessage.substring(0, 200)}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user ID from auth header if available
    const authHeader = req.headers.get('authorization');
    let userId = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    // Store error report in audit_logs for admin visibility
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        action: 'error_reported',
        entity: 'system_error',
        entity_id: null,
        metadata: {
          error_message: errorMessage.substring(0, 5000), // Truncate for safety
          error_stack: errorStack?.substring?.(0, 10000),
          user_message: userMessage?.substring?.(0, 2000),
          error_context: errorContext,
          reported_at: new Date().toISOString(),
          user_agent: req.headers.get('user-agent')?.substring(0, 500),
          ip_hash: ipHash,
        }
      })
      .select()
      .single();

    if (error) {
      console.error('[Error Reporter] Failed to save error report:', error);
      throw error;
    }

    console.log('[Error Reporter] Error report saved successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Error report submitted successfully',
        reportId: data.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Error Reporter] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
