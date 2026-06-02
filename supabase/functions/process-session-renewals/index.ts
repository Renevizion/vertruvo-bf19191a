import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Process Session Renewals — The Proactive Pipeline
 * 
 * Actions:
 * - "scan": Scan bookings ending within X days for a campaign, populate renewal_contacts
 * - "launch": Start outreach for a campaign (voice/SMS/email)
 * - "confirm": Confirm a single contact — charge card on file, create next booking
 * - "decline": Mark a contact as declined
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Get workspace
    const { data: wm } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    if (!wm) throw new Error("No workspace found");

    const { action, campaign_id, contact_id, ...params } = await req.json();

    switch (action) {
      case "scan": {
        // Scan bookings ending soon and populate renewal contacts
        const { data: campaign } = await supabase
          .from("renewal_campaigns" as any)
          .select("*")
          .eq("id", campaign_id)
          .eq("workspace_id", wm.workspace_id)
          .single();
        if (!campaign) throw new Error("Campaign not found");

        const c = campaign as any;
        const daysOut = c.days_before_end || 14;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() + daysOut);

        // Find bookings ending within the window that match the item filter
        let bookingQuery = supabase
          .from("bookings")
          .select("id, title, start_time, end_time, lead_id, item_id, notes, leads(id, name, email, phone), items(id, title, price)")
          .eq("workspace_id", wm.workspace_id)
          .lte("end_time", cutoffDate.toISOString())
          .gte("end_time", new Date().toISOString())
          .neq("status", "cancelled");

        if (c.item_id) {
          bookingQuery = bookingQuery.eq("item_id", c.item_id);
        }

        const { data: bookings, error: bErr } = await bookingQuery;
        if (bErr) throw bErr;

        const contacts: any[] = [];
        const seenLeads = new Set<string>();

        for (const booking of (bookings || [])) {
          const b = booking as any;
          if (!b.lead_id || seenLeads.has(b.lead_id)) continue;
          seenLeads.add(b.lead_id);

          const lead = b.leads;
          if (!lead) continue;

          // Check if contact already exists for this campaign+lead
          const { data: existing } = await supabase
            .from("renewal_contacts" as any)
            .select("id")
            .eq("campaign_id", campaign_id)
            .eq("lead_id", b.lead_id)
            .limit(1);

          if (existing && existing.length > 0) continue;

          contacts.push({
            campaign_id,
            workspace_id: wm.workspace_id,
            lead_id: b.lead_id,
            booking_id: b.id,
            contact_name: lead.name || "Unknown",
            phone: lead.phone,
            email: lead.email,
            program_name: b.items?.title || b.title,
            current_schedule: `${new Date(b.start_time).toLocaleDateString()} - ${new Date(b.end_time).toLocaleDateString()}`,
            student_notes: b.notes,
            charge_amount: b.items?.price || 0,
          });
        }

        if (contacts.length > 0) {
          await supabase.from("renewal_contacts" as any).insert(contacts);
        }

        // Update campaign stats
        const totalContacts = (seenLeads.size) + (c.total_contacts || 0);
        await supabase
          .from("renewal_campaigns" as any)
          .update({
            total_contacts: totalContacts,
            pending_count: totalContacts,
            revenue_at_risk: contacts.reduce((sum: number, ct: any) => sum + (ct.charge_amount || 0), 0) + (c.revenue_at_risk || 0),
          })
          .eq("id", campaign_id);

        return new Response(JSON.stringify({
          success: true,
          contacts_added: contacts.length,
          total: totalContacts,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "launch": {
        // Mark campaign as active and trigger outreach
        await supabase
          .from("renewal_campaigns" as any)
          .update({ status: "active", started_at: new Date().toISOString() })
          .eq("id", campaign_id);

        // Get all pending contacts
        const { data: contacts } = await supabase
          .from("renewal_contacts" as any)
          .select("*")
          .eq("campaign_id", campaign_id)
          .eq("outreach_status", "pending");

        const campaign = (await supabase
          .from("renewal_campaigns" as any)
          .select("*")
          .eq("id", campaign_id)
          .single()).data as any;

        let contacted = 0;
        for (const contact of (contacts || [])) {
          const ct = contact as any;
          const methods: string[] = [];

          // Voice outreach
          if (campaign?.voice_enabled && ct.phone) {
            try {
              await supabase.functions.invoke("voice-broadcast", {
                body: {
                  action: "single_call",
                  phone_number: ct.phone,
                  message_text: campaign?.message_template?.replace("{name}", ct.contact_name)
                    .replace("{program}", ct.program_name || "your program")
                    .replace("{schedule}", ct.current_schedule || "") || 
                    `Hi ${ct.contact_name}, this is your program coordinator. Your current session for ${ct.program_name || 'the program'} is wrapping up soon. We'd love to hold your spot for the next session. Should I confirm your enrollment and charge the card on file?`,
                  workspace_id: wm.workspace_id,
                },
              });
              methods.push("voice");
            } catch (e) {
              console.error("[RENEWAL] Voice outreach failed:", e);
            }
          }

          // Email outreach
          if (campaign?.email_enabled && ct.email) {
            try {
              await supabase.functions.invoke("send-transactional-email", {
                body: {
                  templateName: "system-test",
                  recipientEmail: ct.email,
                  idempotencyKey: `renewal-${campaign_id}-${ct.id}`,
                  templateData: {
                    subject: `🎾 Hold your spot — ${ct.program_name || 'Next session'} enrollment is open`,
                    heading: `${ct.contact_name}, your spot is reserved`,
                    body: campaign?.message_template?.replace("{name}", ct.contact_name)
                      .replace("{program}", ct.program_name || "your program") ||
                      `Your current session is wrapping up soon. We'd love to keep ${ct.contact_name} in the program for the next session. Reply to confirm or contact us to discuss options.`,
                  },
                },
              });
              methods.push("email");
            } catch (e) {
              console.error("[RENEWAL] Email outreach failed:", e);
            }
          }

          if (methods.length > 0) {
            await supabase
              .from("renewal_contacts" as any)
              .update({
                outreach_status: "contacted",
                outreach_method: methods.join(", "),
                last_contacted_at: new Date().toISOString(),
                attempts: (ct.attempts || 0) + 1,
              })
              .eq("id", ct.id);
            contacted++;
          }
        }

        return new Response(JSON.stringify({
          success: true,
          contacted,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "confirm": {
        // Confirm a renewal — charge card on file and create next booking
        const { data: contact } = await supabase
          .from("renewal_contacts" as any)
          .select("*, leads(id, name, email, phone)")
          .eq("id", contact_id)
          .single();
        
        if (!contact) throw new Error("Contact not found");
        const ct = contact as any;

        let charged = false;

        // Try to charge card on file if amount > 0
        if (ct.charge_amount > 0 && ct.lead_id) {
          try {
            const { data: chargeResult, error: chargeError } = await supabase.functions.invoke("charge-card-on-file", {
              body: {
                lead_id: ct.lead_id,
                amount: Math.round(ct.charge_amount * 100),
                description: `Renewal: ${ct.program_name || 'Program enrollment'}`,
              },
            });
            if (!chargeError && chargeResult?.success) {
              charged = true;
            }
          } catch (e) {
            console.error("[RENEWAL] Charge failed:", e);
          }
        }

        // Create next session booking if we have the item
        let newBookingId = null;
        if (ct.booking_id) {
          const { data: origBooking } = await supabase
            .from("bookings")
            .select("*")
            .eq("id", ct.booking_id)
            .single();

          if (origBooking) {
            // Calculate next session dates (same duration, offset by session length)
            const origStart = new Date(origBooking.start_time);
            const origEnd = new Date(origBooking.end_time);
            const durationMs = origEnd.getTime() - origStart.getTime();
            const nextStart = new Date(origEnd.getTime() + 86400000); // Day after current ends
            const nextEnd = new Date(nextStart.getTime() + durationMs);

            const { data: newBooking } = await supabase
              .from("bookings")
              .insert({
                workspace_id: wm.workspace_id,
                title: origBooking.title + " (Renewed)",
                start_time: nextStart.toISOString(),
                end_time: nextEnd.toISOString(),
                lead_id: ct.lead_id,
                item_id: ct.next_session_item_id || origBooking.item_id,
                resource_id: origBooking.resource_id,
                assigned_staff_id: origBooking.assigned_staff_id,
                status: "confirmed",
                notes: `Auto-renewed from campaign. ${charged ? 'Card charged.' : 'Pending payment.'}`,
              })
              .select("id")
              .single();
            
            newBookingId = newBooking?.id;
          }
        }

        // Update contact status
        await supabase
          .from("renewal_contacts" as any)
          .update({
            outreach_status: "confirmed",
            card_charged: charged,
            new_booking_id: newBookingId,
            response_notes: params.notes || "Confirmed via renewal campaign",
          })
          .eq("id", contact_id);

        // Update campaign stats
        const { data: campaign } = await supabase
          .from("renewal_campaigns" as any)
          .select("*")
          .eq("id", ct.campaign_id)
          .single();

        if (campaign) {
          const cam = campaign as any;
          await supabase
            .from("renewal_campaigns" as any)
            .update({
              confirmed_count: (cam.confirmed_count || 0) + 1,
              pending_count: Math.max(0, (cam.pending_count || 0) - 1),
              revenue_secured: (cam.revenue_secured || 0) + (ct.charge_amount || 0),
            })
            .eq("id", ct.campaign_id);
        }

        // Log activity
        await supabase.from("activities").insert({
          workspace_id: wm.workspace_id,
          lead_id: ct.lead_id,
          type: "renewal_confirmed",
          title: `Renewed: ${ct.program_name}`,
          description: `${ct.contact_name} confirmed for next session. ${charged ? `Card charged $${ct.charge_amount}.` : ''}`,
          created_by: user.id,
        });

        return new Response(JSON.stringify({
          success: true,
          charged,
          new_booking_id: newBookingId,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "decline": {
        await supabase
          .from("renewal_contacts" as any)
          .update({
            outreach_status: "declined",
            response_notes: params.notes || "Declined renewal",
          })
          .eq("id", contact_id);

        // Update campaign stats
        const { data: contact } = await supabase
          .from("renewal_contacts" as any)
          .select("campaign_id")
          .eq("id", contact_id)
          .single();

        if (contact) {
          const ct = contact as any;
          const { data: campaign } = await supabase
            .from("renewal_campaigns" as any)
            .select("*")
            .eq("id", ct.campaign_id)
            .single();
          if (campaign) {
            const cam = campaign as any;
            await supabase
              .from("renewal_campaigns" as any)
              .update({
                declined_count: (cam.declined_count || 0) + 1,
                pending_count: Math.max(0, (cam.pending_count || 0) - 1),
              })
              .eq("id", ct.campaign_id);
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[RENEWAL] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
