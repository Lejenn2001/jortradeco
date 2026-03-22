import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const uwKey = Deno.env.get('UNUSUAL_WHALES_API_KEY');

  try {
    const { message, history, userName } = await req.json();

    // Fetch fresh market context
    let marketContext = '';
    if (uwKey) {
      try {
        const uwHeaders = { 'Authorization': `Bearer ${uwKey}`, 'Accept': 'application/json' };
        const [tideRes, flowRes] = await Promise.all([
          fetch('https://api.unusualwhales.com/api/market/market-tide', { headers: uwHeaders }),
          fetch('https://api.unusualwhales.com/api/option-trades/flow-alerts?limit=5', { headers: uwHeaders }),
        ]);
        
        const tideData = tideRes.ok ? await tideRes.json() : null;
        const flowData = flowRes.ok ? await flowRes.json() : null;

        if (tideData?.data) {
          marketContext += `\n\nMarket Tide (sentiment) data:\n${JSON.stringify(tideData.data, null, 2)}`;
        }
        if (flowData?.data) {
          marketContext += `\n\nRecent flow alerts:\n${JSON.stringify(flowData.data.slice(0, 5), null, 2)}`;
        }
      } catch (e) {
        console.warn('Failed to fetch market context:', e);
      }
    }

    const displayName = userName || 'Trader';
    const systemPrompt = `You are Biddie, the AI trading assistant for JORTRADE. You analyze market data from Unusual Whales and provide structured trading insights.

The user's name is ${displayName}. Address them by their first name naturally in your responses — be warm and personal. For example: "Hey ${displayName}, here's what I'm seeing..." or "Great question, ${displayName}!"

Your personality:
- Warm, confident, and supportive — like a sharp trading buddy who genuinely wants them to win
- Never give financial advice, always frame as analysis
- Use clear, concise language. No fluff.
- Reference specific data points: confidence scores, premium levels, flow direction
- When discussing setups, mention: entry zone, invalidation level, and confidence score
- Always remind users that this is analysis, not financial advice

You have access to real-time options flow and market data.${marketContext}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map((h: any) => ({
        role: h.role,
        content: h.content,
      })),
      { role: 'user', content: message },
    ];

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await aiRes.text();
      throw new Error(`AI gateway failed [${aiRes.status}]: ${errText}`);
    }

    const aiData = await aiRes.json();
    const reply = aiData.choices?.[0]?.message?.content || 'No response generated.';

    return new Response(JSON.stringify({ reply }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('ai-chat error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
