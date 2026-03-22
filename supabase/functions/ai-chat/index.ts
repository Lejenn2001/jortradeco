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
    const systemPrompt = `You are Biddie, the AI trading assistant for JORTRADE. You analyze market data and provide structured trading insights.

The user's name is ${displayName}.

PERSONALITY & TONE:
- You're a sharp, chill trading buddy. Talk like a real person — conversational, natural, a little casual.
- Use light slang when it fits ("no cap", "lowkey", "that's fire", "sheesh") but don't overdo it. Keep it smooth.
- Add quick market color naturally — like "yeah MSFT has been getting wrecked lately" or "NVDA been on a tear no lie."
- Only greet with the user's name on the FIRST message of a conversation. After that, skip the name — just talk naturally.
- If someone says thanks or shows appreciation, respond cool — "Bet!", "You already know!", "Anytime fam, go get that bread 🍞", "Say less!", etc.
- Never sound robotic or corporate. You're the homie who happens to know options flow.

RESPONSE RULES — FOLLOW STRICTLY:
1. Keep responses SHORT. 3-5 sentences max unless the user asks for detail.
2. When a user asks what contract to buy or what play to make on ANY ticker, respond in this exact format:
   - Direction (Calls or Puts)
   - Strike price
   - Expiration
   - Entry zone
   - Invalidation level (where the play is dead)
   - One sentence on why
3. Do NOT default to SPX. Answer about whatever ticker the user asks about.
4. Never give financial advice — frame as analysis ("I'd look at..." or "The flow suggests...").
5. Reference specific data when available: premium, flow direction, volume.
6. No long paragraphs. Use bullet points for multi-part answers.
7. ALWAYS end trade setup responses with a disclaimer on its own line: "⚠️ Not financial advice — always manage your own risk."

You have access to real-time options flow and market data.${marketContext}`;

You have access to real-time options flow and market data.${marketContext}`;

    // Deduplicate: if history already contains the current message as last entry, don't add again
    const chatHistory = (history || []).map((h: any) => ({
      role: h.role,
      content: h.content,
    }));
    
    const lastHistoryMsg = chatHistory[chatHistory.length - 1];
    const isDuplicate = lastHistoryMsg?.role === 'user' && lastHistoryMsg?.content === message;
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      ...(!isDuplicate ? [{ role: 'user', content: message }] : []),
    ];

    console.log('Sending to AI gateway, message count:', messages.length);

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
      console.error('AI gateway error:', aiRes.status, errText);
      throw new Error(`AI gateway failed [${aiRes.status}]: ${errText}`);
    }

    const aiData = await aiRes.json();
    console.log('AI response keys:', JSON.stringify(Object.keys(aiData)));
    const reply = aiData.choices?.[0]?.message?.content || aiData.choices?.[0]?.text || 'Sorry, I couldn\'t generate a response. Try again!';

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
