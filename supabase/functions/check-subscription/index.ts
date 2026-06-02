import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Map tier names to product IDs
const TIER_TO_PRODUCT = {
  starter: "prod_TWJsiTC1NjHYNA",
  professional: "prod_TWJtzGu8NtKoOR",
  enterprise: "prod_TWJuL45k95WeVZ",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // FIRST: Check for admin-granted subscription override
    const { data: override, error: overrideError } = await supabaseClient
      .from('subscription_overrides')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (override && !overrideError) {
      if (override.expires_at && new Date(override.expires_at) < new Date()) {
        logStep("Admin override expired", { userId: user.id, expiredAt: override.expires_at });
      } else {
        const productId = TIER_TO_PRODUCT[override.granted_tier as keyof typeof TIER_TO_PRODUCT];
        logStep("Using admin-granted subscription", { tier: override.granted_tier, productId });
        
        return new Response(JSON.stringify({
          subscribed: true,
          product_id: productId,
          tier: override.granted_tier,
          subscription_end: override.expires_at,
          source: "admin_override",
          reason: override.reason,
          status: "active",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // SECOND: Check Stripe for paid subscription
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ 
        subscribed: false, product_id: null, tier: null,
        subscription_end: null, source: "none", status: "none",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check all subscription statuses (active, trialing, past_due)
    const allSubs = await stripe.subscriptions.list({
      customer: customerId,
      limit: 5,
    });

    // Find the best subscription (active > trialing > past_due)
    const statusPriority = ['active', 'trialing', 'past_due'];
    let bestSub: Stripe.Subscription | null = null;
    for (const status of statusPriority) {
      const found = allSubs.data.find((s: Stripe.Subscription) => s.status === status);
      if (found) { bestSub = found; break; }
    }

    if (!bestSub) {
      logStep("No relevant subscription found");
      return new Response(JSON.stringify({
        subscribed: false, product_id: null, tier: null,
        subscription_end: null, source: "none", status: "none",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const productId = bestSub.items.data[0].price.product as string;
    let tier: string | null = null;
    for (const [tierName, prodId] of Object.entries(TIER_TO_PRODUCT)) {
      if (prodId === productId) { tier = tierName; break; }
    }

    const subscriptionEnd = bestSub.status === 'trialing' && bestSub.trial_end
      ? new Date(bestSub.trial_end * 1000).toISOString()
      : new Date(bestSub.current_period_end * 1000).toISOString();

    let trialDaysRemaining: number | null = null;
    if (bestSub.status === 'trialing' && bestSub.trial_end) {
      trialDaysRemaining = Math.ceil((bestSub.trial_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
    }

    const sourceMap: Record<string, string> = {
      active: "stripe",
      trialing: "stripe_trial",
      past_due: "stripe_past_due",
    };

    logStep("Subscription found", { 
      status: bestSub.status, productId, tier, 
      trialDaysRemaining, subscriptionEnd 
    });

    // Grace period: past_due users keep access for 7 days after period end
    let subscribedStatus = bestSub.status !== 'past_due';
    if (bestSub.status === 'past_due') {
      const periodEnd = new Date(bestSub.current_period_end * 1000);
      const gracePeriodEnd = new Date(periodEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (new Date() < gracePeriodEnd) {
        subscribedStatus = true; // Still within grace period
        logStep("Past due but within 7-day grace period", { gracePeriodEnd: gracePeriodEnd.toISOString() });
      }
    }

    return new Response(JSON.stringify({
      subscribed: subscribedStatus,
      product_id: productId,
      tier,
      subscription_end: subscriptionEnd,
      source: sourceMap[bestSub.status] || bestSub.status,
      status: bestSub.status,
      trial_days_remaining: trialDaysRemaining,
      cancel_at_period_end: bestSub.cancel_at_period_end,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
