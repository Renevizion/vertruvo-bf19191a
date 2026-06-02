import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { checkUsageGate, usageLimitResponse, getWorkspaceForUser } from "../_shared/usage-gate.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await verifyAuth(req);
    if (!auth) return unauthorizedResponse(corsHeaders);

    // USAGE GATE: Check image generation limits
    const wsId = await getWorkspaceForUser(auth.userId);
    if (wsId) {
      const usageCheck = await checkUsageGate(wsId, 'image_generations', auth.userId);
      if (!usageCheck.allowed) return usageLimitResponse(corsHeaders, usageCheck);
    }

    const { prompt } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('Lovable API key not configured');
    }

    // Generate image using Lovable AI (Nano Banana - Gemini 2.5 Flash Image)
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: `Generate a high-quality social media image: ${prompt}. Ultra high resolution, professional, eye-catching.`
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (response.status === 402) {
        throw new Error('Payment required. Please add credits to your Lovable AI workspace.');
      }
      const errorText = await response.text();
      console.error('AI gateway error:', errorText);
      throw new Error('Failed to generate image');
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error('No image generated');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        imageUrl 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating image:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
