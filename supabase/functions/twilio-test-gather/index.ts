import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const form = await req.formData().catch(() => null);
    const digit = form?.get("Digits")?.toString() || "";

    let message = "";
    if (digit === "1") {
      message = "Awesome! The audio came through clearly. Kiruvo voice calling is working perfectly. Goodbye!";
    } else if (digit === "2") {
      message = "Got it. We will work on improving call quality. Thank you for the feedback. Goodbye!";
    } else {
      message = `You pressed ${digit}. This is a Kiruvo test call. Thank you and goodbye!`;
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${message}</Say>
  <Hangup/>
</Response>`;

    return new Response(twiml, {
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });
  } catch (e) {
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Sorry, something went wrong. Goodbye.</Say>
  <Hangup/>
</Response>`;
    return new Response(errorTwiml, {
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });
  }
});
