import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export interface AuthResult {
  userId: string;
  email?: string;
}

/**
 * Verify JWT from Authorization header and return user info.
 * Returns null if auth fails — caller should return 401.
 */
export async function verifyAuth(req: Request): Promise<AuthResult | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data, error } = await authClient.auth.getClaims(token);

    if (error || !data?.claims?.sub) {
      // Fallback to getUser for edge cases
      const { data: userData, error: userError } = await authClient.auth.getUser();
      if (userError || !userData?.user?.id) return null;
      return { userId: userData.user.id, email: userData.user.email };
    }

    return {
      userId: data.claims.sub as string,
      email: data.claims.email as string | undefined,
    };
  } catch (e) {
    console.error('[Auth] Verification failed:', e);
    return null;
  }
}

/**
 * Returns a 401 Unauthorized response with CORS headers.
 */
export function unauthorizedResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
