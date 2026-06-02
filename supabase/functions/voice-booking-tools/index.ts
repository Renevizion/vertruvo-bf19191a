// Voice booking tools — called by ElevenLabs agent during a live conversation.
// Two tools:
//   1) check_availability(date, duration_minutes?) → list of free slots
//   2) create_booking(start_time, duration_minutes?, item_id?, notes?, mode?)
//      mode: "auto" → creates confirmed booking
//            "pending" → creates a pending request (status='pending') for staff review
//            "hybrid" → tries auto, falls back to pending if conflict
//
// Auth: workspace_id + lead_id are passed in via tool params (set by ElevenLabs agent
// using dynamic variables when the call is initiated). We verify lead belongs to workspace.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { tool, workspace_id, lead_id, params } = body;

    if (!workspace_id) return json({ error: "workspace_id required" }, 400);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    if (tool === "check_availability") {
      return await checkAvailability(admin, workspace_id, params);
    }
    if (tool === "create_booking") {
      return await createBooking(admin, workspace_id, lead_id, params);
    }
    if (tool === "list_services") {
      return await listServices(admin, workspace_id);
    }

    return json({ error: "Unknown tool" }, 400);
  } catch (e) {
    console.error("[voice-booking-tools]", e);
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function listServices(admin: any, workspaceId: string) {
  const { data: items } = await admin
    .from("items")
    .select("id, title, duration_minutes, price")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .in("item_type", ["service", "membership", "camp"])
    .limit(20);
  return json({ services: items || [] });
}

async function checkAvailability(admin: any, workspaceId: string, params: any) {
  const date = params?.date; // YYYY-MM-DD
  const durationMinutes = Number(params?.duration_minutes) || 60;
  if (!date) return json({ error: "date required (YYYY-MM-DD)" }, 400);

  const dayStart = new Date(`${date}T08:00:00`);
  const dayEnd = new Date(`${date}T20:00:00`);

  // Pull existing bookings
  const { data: existing } = await admin
    .from("bookings")
    .select("start_time, end_time")
    .eq("workspace_id", workspaceId)
    .gte("start_time", dayStart.toISOString())
    .lte("start_time", dayEnd.toISOString())
    .neq("status", "cancelled");

  const taken = (existing || []).map((b: any) => ({
    start: new Date(b.start_time).getTime(),
    end: new Date(b.end_time).getTime(),
  }));

  const slots: string[] = [];
  let cursor = dayStart.getTime();
  const slotMs = durationMinutes * 60000;
  while (cursor + slotMs <= dayEnd.getTime()) {
    const slotEnd = cursor + slotMs;
    const conflict = taken.some(t => !(slotEnd <= t.start || cursor >= t.end));
    if (!conflict) {
      slots.push(new Date(cursor).toISOString());
    }
    cursor += 30 * 60000; // 30 min increments
  }

  return json({
    date,
    duration_minutes: durationMinutes,
    available_slots: slots.slice(0, 8), // top 8 to keep agent reply concise
    total_available: slots.length,
  });
}

async function createBooking(admin: any, workspaceId: string, leadId: string | null, params: any) {
  const startTime = params?.start_time;
  const durationMinutes = Number(params?.duration_minutes) || 60;
  const itemId = params?.item_id || null;
  const notes = params?.notes || null;
  const mode = params?.mode || "hybrid"; // auto | pending | hybrid
  const title = params?.title || "AI-booked appointment";

  if (!startTime) return json({ error: "start_time required (ISO)" }, 400);

  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60000);

  // Verify lead if provided
  if (leadId) {
    const { data: lead } = await admin
      .from("leads")
      .select("id, name, workspace_id")
      .eq("id", leadId)
      .single();
    if (!lead || lead.workspace_id !== workspaceId) {
      return json({ error: "Lead not in workspace" }, 403);
    }
  }

  // Conflict check
  const { data: conflicts } = await admin
    .from("bookings")
    .select("id, start_time, end_time")
    .eq("workspace_id", workspaceId)
    .neq("status", "cancelled")
    .lt("start_time", end.toISOString())
    .gt("end_time", start.toISOString());

  const hasConflict = (conflicts || []).length > 0;

  let status: "confirmed" | "pending";
  if (mode === "pending") status = "pending";
  else if (mode === "auto") {
    if (hasConflict) return json({ success: false, error: "Time slot is no longer available", conflict: true });
    status = "confirmed";
  } else {
    // hybrid
    status = hasConflict ? "pending" : "confirmed";
  }

  const { data: booking, error } = await admin
    .from("bookings")
    .insert({
      workspace_id: workspaceId,
      lead_id: leadId,
      title,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      item_id: itemId,
      notes: `[Booked by AI Voice Agent]\n${notes || ""}`.trim(),
      status,
    })
    .select()
    .single();

  if (error) return json({ success: false, error: error.message });

  // Log activity
  if (leadId) {
    await admin.from("activities").insert({
      lead_id: leadId,
      workspace_id: workspaceId,
      type: "booking",
      title: status === "confirmed" ? "AI booked appointment" : "AI captured booking request (pending review)",
      description: `${title} on ${start.toLocaleString()} (${durationMinutes} min)`,
    });
  }

  return json({
    success: true,
    booking_id: booking.id,
    status,
    requires_confirmation: status === "pending",
    message: status === "confirmed"
      ? `Booked for ${start.toLocaleString()}`
      : `Captured request for ${start.toLocaleString()} — awaiting staff confirmation`,
  });
}
