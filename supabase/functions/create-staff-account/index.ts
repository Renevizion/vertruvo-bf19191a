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

    // Verify the calling user
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

    // Check if caller is workspace owner or admin
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: callerMembership } = await adminClient
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", caller.id)
      .in("role", ["owner", "admin"])
      .limit(1)
      .single();

    if (!callerMembership) {
      return new Response(JSON.stringify({ error: "Only workspace owners and admins can create staff accounts" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check subscription tier — free tier cannot create accounts
    const { data: subscription } = await adminClient
      .from("subscriptions")
      .select("status, plan_id, plans:plan_id(name)")
      .eq("workspace_id", callerMembership.workspace_id)
      .in("status", ["active", "trial"])
      .limit(1)
      .single();

    const planName = (subscription?.plans as any)?.name?.toLowerCase() || "";
    const isPaying = subscription && (planName !== "free" && planName !== "");

    if (!isPaying) {
      return new Response(JSON.stringify({ error: "Upgrade to a paid plan to create staff accounts directly. Contact the platform admin for assistance." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enforce seat limits based on plan
    const seatLimits: Record<string, number> = {
      starter: 2,
      professional: 11,
      enterprise: -1, // unlimited
    };
    const seatLimit = seatLimits[planName] ?? 2;

    if (seatLimit !== -1) {
      const { count: currentStaff } = await adminClient
        .from("workspace_members")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", callerMembership.workspace_id);

      if ((currentStaff || 0) >= seatLimit) {
        return new Response(JSON.stringify({ 
          error: `You've reached the ${seatLimit}-seat limit for the ${planName} plan. Upgrade to add more team members.` 
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Parse request body
    const { email, first_name, last_name, role, password } = await req.json();

    if (!email || !first_name || !role) {
      return new Response(JSON.stringify({ error: "Email, first name, and role are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already exists
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      // User exists — just add to workspace
      const { error: memberError } = await adminClient
        .from("workspace_members")
        .upsert({
          workspace_id: callerMembership.workspace_id,
          user_id: existingProfile.id,
          role: role,
        }, { onConflict: "workspace_id,user_id" });

      if (memberError) {
        return new Response(JSON.stringify({ error: memberError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: "Existing user added to workspace", user_id: existingProfile.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create new auth user via admin API
    const tempPassword = password || generateTempPassword();
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm since admin is creating
      user_metadata: {
        first_name,
        last_name: last_name || "",
      },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add to workspace
    await adminClient.from("workspace_members").insert({
      workspace_id: callerMembership.workspace_id,
      user_id: newUser.user.id,
      role: role,
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Staff account created",
      user_id: newUser.user.id,
      temp_password: tempPassword,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error('[create-staff-account] Error:', err);
    return new Response(JSON.stringify({ error: 'An error occurred creating the staff account' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let pw = "";
  for (let i = 0; i < 12; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
}
