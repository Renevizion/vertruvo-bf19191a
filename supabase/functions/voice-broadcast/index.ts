import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: workspace } = await supabaseClient
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!workspace) {
      return new Response(JSON.stringify({ error: "No workspace" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { broadcast_id, action } = await req.json();

    if (action === "start" && broadcast_id) {
      // Get broadcast details
      const { data: broadcast } = await serviceClient
        .from("voice_broadcasts")
        .select("*")
        .eq("id", broadcast_id)
        .eq("workspace_id", workspace.workspace_id)
        .single();

      if (!broadcast) {
        return new Response(JSON.stringify({ error: "Broadcast not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (broadcast.status !== "draft" && broadcast.status !== "scheduled") {
        return new Response(JSON.stringify({ error: "Broadcast already started or completed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get recipients
      const { data: recipients } = await serviceClient
        .from("voice_broadcast_recipients")
        .select("id, phone_number, lead_id")
        .eq("broadcast_id", broadcast_id)
        .eq("status", "pending");

      if (!recipients?.length) {
        return new Response(JSON.stringify({ error: "No pending recipients" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update broadcast status
      await serviceClient
        .from("voice_broadcasts")
        .update({ status: "in_progress", started_at: new Date().toISOString() })
        .eq("id", broadcast_id);

      // Get Twilio config
      const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
      const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
        return new Response(JSON.stringify({ error: "Twilio not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get workspace phone number
      const { data: phoneNum } = await serviceClient
        .from("twilio_phone_numbers")
        .select("phone_number")
        .eq("workspace_id", workspace.workspace_id)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (!phoneNum) {
        return new Response(JSON.stringify({ error: "No active phone number" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const gatherKeys = (broadcast as any).gather_keypresses !== false;
      const gatherSpeech = (broadcast as any).gather_speech !== false;
      const objectiveId = (broadcast as any).objective_id || null;
      const objectiveText = (broadcast as any).objective_text || null;
      const statusCallbackUrl = `${SUPABASE_URL}/functions/v1/twilio-status-callback`;

      let sentCount = 0;
      let failedCount = 0;

      for (const recipient of recipients) {
        try {
          // Pre-create call_log so TwiML/gather can write to it
          const { data: callLogRow } = await serviceClient
            .from("call_logs")
            .insert({
              workspace_id: workspace.workspace_id,
              lead_id: recipient.lead_id,
              phone_number: recipient.phone_number,
              status: "initiated",
              broadcast_id,
              broadcast_recipient_id: recipient.id,
              objective_id: objectiveId,
              objective_text: objectiveText,
            })
            .select("id")
            .single();

          const callLogId = callLogRow?.id;
          const twimlParams = new URLSearchParams({
            broadcastText: broadcast.message_text,
            ...(callLogId ? { callLogId } : {}),
            ...(gatherKeys ? { gatherKeys: "1" } : {}),
            ...(gatherSpeech ? { gatherSpeech: "1" } : {}),
          });
          const twimlUrl = `${SUPABASE_URL}/functions/v1/twilio-twiml?${twimlParams.toString()}`;

          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
          const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

          const formData = new URLSearchParams();
          formData.append("From", phoneNum.phone_number);
          formData.append("To", recipient.phone_number);
          formData.append("Url", twimlUrl);
          formData.append("MachineDetection", "Enable");
          formData.append("Record", "true");
          formData.append("StatusCallback", statusCallbackUrl);
          formData.append("StatusCallbackEvent", "completed");
          formData.append("StatusCallbackMethod", "POST");

          const callResp = await fetch(twilioUrl, {
            method: "POST",
            headers: {
              Authorization: `Basic ${twilioAuth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formData.toString(),
          });

          if (callResp.ok) {
            const callData = await callResp.json();
            await serviceClient
              .from("voice_broadcast_recipients")
              .update({ status: "sent", call_sid: callData.sid, sent_at: new Date().toISOString() })
              .eq("id", recipient.id);
            if (callLogId) {
              await serviceClient.from("call_logs").update({ call_sid: callData.sid }).eq("id", callLogId);
            }
            sentCount++;
          } else {
            await serviceClient
              .from("voice_broadcast_recipients")
              .update({ status: "failed" })
              .eq("id", recipient.id);
            if (callLogId) {
              await serviceClient.from("call_logs").update({ status: "failed" }).eq("id", callLogId);
            }
            failedCount++;
          }
        } catch (e) {
          console.error("Broadcast call error:", e);
          await serviceClient
            .from("voice_broadcast_recipients")
            .update({ status: "failed" })
            .eq("id", recipient.id);
          failedCount++;
        }
      }

      // Update broadcast
      await serviceClient
        .from("voice_broadcasts")
        .update({
          status: "completed",
          sent_count: sentCount,
          failed_count: failedCount,
          completed_at: new Date().toISOString(),
        })
        .eq("id", broadcast_id);

      return new Response(
        JSON.stringify({ success: true, sent: sentCount, failed: failedCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[BROADCAST] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
