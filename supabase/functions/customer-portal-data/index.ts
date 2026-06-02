import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Verify customer role
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isCustomer = roles?.some((r: any) => r.role === "customer");
    if (!isCustomer) {
      return new Response(JSON.stringify({ error: "Not a customer account" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find all leads linked to this customer user
    const { data: leads } = await adminClient
      .from("leads")
      .select("id, name, workspace_id, card_brand, card_last_four, stripe_customer_id")
      .eq("customer_user_id", user.id);

    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ workspaces: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get unique workspace IDs
    const workspaceIds = [...new Set(leads.map((l: any) => l.workspace_id).filter(Boolean))];

    // Fetch workspace info + business settings
    const [{ data: workspaces }, { data: settings }] = await Promise.all([
      adminClient.from("workspaces").select("id, name, slug").in("id", workspaceIds),
      adminClient
        .from("business_settings")
        .select(
          "workspace_id, business_name, logo_url, business_phone, business_email, cancellation_policy_hours, portal_enabled"
        )
        .in("workspace_id", workspaceIds),
    ]);

    // Build per-workspace portal data
    const result = await Promise.all(
      workspaceIds.map(async (wsId: string) => {
        const ws = workspaces?.find((w: any) => w.id === wsId);
        const bs = settings?.find((s: any) => s.workspace_id === wsId);
        const lead = leads.find((l: any) => l.workspace_id === wsId);

        if (!ws || bs?.portal_enabled === false) return null;

        // Get upcoming bookings for this customer's lead at this workspace
        const { data: bookings } = await adminClient
          .from("bookings")
          .select("id, title, start_time, end_time, status, notes, item_id, color")
          .eq("workspace_id", wsId)
          .eq("lead_id", lead?.id)
          .gte("start_time", new Date().toISOString())
          .neq("status", "cancelled")
          .order("start_time", { ascending: true })
          .limit(20);

        // Get past bookings (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data: pastBookings } = await adminClient
          .from("bookings")
          .select("id, title, start_time, end_time, status, notes, item_id")
          .eq("workspace_id", wsId)
          .eq("lead_id", lead?.id)
          .lt("start_time", new Date().toISOString())
          .gte("start_time", thirtyDaysAgo.toISOString())
          .order("start_time", { ascending: false })
          .limit(10);

        // Get available services
        const { data: services } = await adminClient
          .from("items")
          .select("id, title, description, price, item_type, duration_minutes, payment_timing")
          .eq("workspace_id", wsId)
          .eq("is_active", true)
          .in("item_type", ["service", "membership", "camp"])
          .order("title");

        return {
          workspace_id: wsId,
          workspace_name: bs?.business_name || ws.name,
          workspace_slug: ws.slug,
          logo_url: bs?.logo_url,
          business_phone: bs?.business_phone,
          business_email: bs?.business_email,
          cancellation_policy_hours: bs?.cancellation_policy_hours ?? 24,
          lead_id: lead?.id,
          card_brand: lead?.card_brand,
          card_last_four: lead?.card_last_four,
          upcoming_bookings: bookings ?? [],
          past_bookings: pastBookings ?? [],
          available_services: services ?? [],
        };
      })
    );

    return new Response(
      JSON.stringify({ workspaces: result.filter(Boolean) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
