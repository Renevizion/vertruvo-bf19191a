import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const { data: { user: caller }, error: authError } = await userClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Verify caller is workspace owner/admin
    const { data: callerMembership } = await adminClient
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", caller.id)
      .in("role", ["owner", "admin"])
      .limit(1)
      .single();

    if (!callerMembership) {
      return new Response(JSON.stringify({ error: "Only workspace owners and admins can reset customer passwords" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { lead_id, send_email } = await req.json();

    if (!lead_id) {
      return new Response(JSON.stringify({ error: "Lead ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get lead with customer_user_id
    const { data: lead, error: leadError } = await adminClient
      .from("leads")
      .select("id, name, email, customer_user_id, workspace_id")
      .eq("id", lead_id)
      .eq("workspace_id", callerMembership.workspace_id)
      .single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found in your workspace" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!lead.customer_user_id) {
      return new Response(JSON.stringify({ error: "This lead does not have a customer account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate new temp password
    const tempPassword = generateTempPassword();

    // Update the user's password via admin API
    const { error: updateError } = await adminClient.auth.admin.updateUser(
      lead.customer_user_id,
      { password: tempPassword }
    );

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send password reset email if requested
    if (send_email && lead.email) {
      try {
        const { data: wsData } = await adminClient
          .from("workspaces")
          .select("slug")
          .eq("id", callerMembership.workspace_id)
          .single();

        const { data: bsData } = await adminClient
          .from("business_settings")
          .select("business_name")
          .eq("workspace_id", callerMembership.workspace_id)
          .maybeSingle();

        const portalSlug = wsData?.slug || "";
        const appUrl = Deno.env.get("APP_URL") || "https://kiruvo.com";
        const portalLoginUrl = portalSlug
          ? `${appUrl}/portal/login/${portalSlug}`
          : `${appUrl}/portal`;

        const nameParts = lead.name.split(" ");

        await adminClient.functions.invoke("send-transactional-email", {
          body: {
            templateName: "customer-password-reset",
            recipientEmail: lead.email,
            idempotencyKey: `customer-pw-reset-${lead.customer_user_id}-${Date.now()}`,
            templateData: {
              first_name: nameParts[0] || lead.name,
              temp_password: tempPassword,
              login_email: lead.email,
              login_url: portalLoginUrl,
              business_name: bsData?.business_name || "",
            },
          },
        });
      } catch (emailErr) {
        console.error("Failed to send password reset email:", emailErr);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      temp_password: tempPassword,
      email_sent: !!send_email,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let pw = "";
  for (let i = 0; i < 16; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
}
