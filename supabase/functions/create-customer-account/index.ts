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

    const { data: callerMembership } = await adminClient
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", caller.id)
      .in("role", ["owner", "admin"])
      .limit(1)
      .single();

    if (!callerMembership) {
      return new Response(JSON.stringify({ error: "Only workspace owners and admins can create customer accounts" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { lead_id, email, first_name, last_name, send_email } = await req.json();

    if (!lead_id || !email || !first_name) {
      return new Response(JSON.stringify({ error: "Lead ID, email, and first name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify lead belongs to this workspace
    const { data: lead, error: leadError } = await adminClient
      .from("leads")
      .select("id, name, customer_user_id, workspace_id")
      .eq("id", lead_id)
      .eq("workspace_id", callerMembership.workspace_id)
      .single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found in your workspace" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (lead.customer_user_id) {
      return new Response(JSON.stringify({ error: "This lead already has a customer account" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if auth user already exists with this email
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    let userId: string;
    let tempPassword: string | null = null;

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      // Create new auth user with a temp password
      tempPassword = generateTempPassword();
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name,
          last_name: last_name || "",
          account_type: "customer",
        },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userId = newUser.user.id;

      // Wait for handle_new_user trigger to create profile
      let profileReady = false;
      for (let attempt = 0; attempt < 10; attempt++) {
        const { data: profile } = await adminClient
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();

        if (profile?.id) {
          profileReady = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      if (profileReady) {
        await adminClient
          .from("profiles")
          .update({ onboarding_completed: true })
          .eq("id", userId);
      }
    }

    // Assign 'customer' role
    await adminClient.from("user_roles").upsert(
      { user_id: userId, role: "customer" },
      { onConflict: "user_id,role" }
    );

    // Link lead to customer account
    await adminClient
      .from("leads")
      .update({ customer_user_id: userId })
      .eq("id", lead_id);

    // Send welcome email with temp password if requested
    if (send_email && tempPassword) {
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

        await adminClient.functions.invoke("send-transactional-email", {
          body: {
            templateName: "customer-welcome",
            recipientEmail: email,
            idempotencyKey: `customer-welcome-${userId}`,
            templateData: {
              first_name,
              temp_password: tempPassword,
              login_email: email,
              login_url: portalLoginUrl,
              business_name: bsData?.business_name || "",
            },
          },
        });
      } catch (emailErr) {
        console.error("Failed to send welcome email:", emailErr);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: existingProfile
        ? "Existing user linked as customer"
        : send_email
          ? "Customer account created — welcome email sent with login details"
          : "Customer account created (no email sent)",
      user_id: userId,
      temp_password: tempPassword,
      is_existing: !!existingProfile,
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
