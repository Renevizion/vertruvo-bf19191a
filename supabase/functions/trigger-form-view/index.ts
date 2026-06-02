import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

import { publicCorsHeaders } from "../_shared/cors-public.ts";
;

serve(async (req) => {
  const corsHeaders = publicCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { formId, variantId, sessionId, referrer } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[Form View] Tracking form view:", { formId, variantId, sessionId });

    // Get user agent and derive device/browser info
    const userAgent = req.headers.get("user-agent") || "";
    const { deviceType, browser } = parseUserAgent(userAgent);

    // Track form view in form_metrics
    const { error } = await supabase.from("form_metrics").insert({
      form_id: formId,
      variant_id: variantId || null,
      session_id: sessionId,
      submitted_at: new Date().toISOString(),
      converted: false, // This is a view, not a submission
      device_type: deviceType,
      browser: browser,
      referrer: referrer || null,
      user_agent: userAgent,
    });

    if (error) {
      console.error("[Form View] Error tracking view:", error);
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Form View] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseUserAgent(userAgent: string): { deviceType: string; browser: string } {
  const ua = userAgent.toLowerCase();
  
  let deviceType = "desktop";
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    deviceType = "mobile";
  } else if (/tablet|ipad/i.test(ua)) {
    deviceType = "tablet";
  }
  
  let browser = "other";
  if (ua.includes("chrome")) browser = "chrome";
  else if (ua.includes("safari")) browser = "safari";
  else if (ua.includes("firefox")) browser = "firefox";
  else if (ua.includes("edge")) browser = "edge";
  
  return { deviceType, browser };
}
