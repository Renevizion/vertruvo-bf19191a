import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { formName, submitterName, submitterEmail, submissionData, businessName, aiPrompt, aiLength, aiStrictMode, workspaceId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ message: '' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch workspace services/items to give AI context about what the business offers
    let servicesContext = '';
    if (workspaceId) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        const { data: items } = await supabaseClient
          .from('items')
          .select('title, description, price, item_type, duration_minutes')
          .eq('workspace_id', workspaceId)
          .eq('is_active', true)
          .limit(20);

        if (items && items.length > 0) {
          const itemList = items.map(i => {
            let line = `- ${i.title} (${i.item_type})`;
            if (i.price) line += ` — $${i.price}`;
            if (i.duration_minutes) line += `, ${i.duration_minutes} min`;
            if (i.description) line += `: ${i.description.substring(0, 120)}`;
            return line;
          }).join('\n');
          servicesContext = `\n\nAvailable services/programs offered by "${businessName}":\n${itemList}\n\nYou may naturally mention relevant services that match the person's inquiry. Do NOT list everything — pick the most relevant one or two if appropriate.`;
        }
      } catch (err) {
        console.error("Failed to fetch workspace items:", err);
      }
    }

    const lengthRule = aiLength === 'short'
      ? '- Keep it to 1-2 sentences MAX. Be concise.'
      : '- Keep it to 2-4 sentences. Be concise but warm.';

    const strictRule = aiStrictMode !== false
      ? `- STRICT MODE: Do NOT invent, assume, or hallucinate any details about the person, their business, or their needs. Only reference information explicitly present in the submission data below. If you don't have enough info, keep it generic.`
      : '- You may make reasonable inferences from the submission data to personalize the response.';

    const systemPrompt = `You are writing a brief auto-response email body for "${businessName}".
Someone just submitted a form called "${formName}".
${aiPrompt ? `User instructions: ${aiPrompt}` : ''}

Rules:
- Write ONLY the email body (no subject line, no greeting like "Hi Name" — that's handled by the template)
${lengthRule}
${strictRule}
- Do NOT include any sign-off or signature (handled by template)
- Do NOT include unsubscribe text
- Be professional and warm${servicesContext}`;

    const userMessage = `Submitter: ${submitterName || 'Unknown'} (${submitterEmail})
Submission data: ${JSON.stringify(submissionData, null, 2)}

Write the email body:`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: aiLength === 'short' ? 150 : 300,
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ message: '' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const message = result.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("form-auto-response-ai error:", e);
    return new Response(JSON.stringify({ message: '' }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
