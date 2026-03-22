import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const claudeKey = Deno.env.get('CLAUDE_API_KEY');
  if (!claudeKey) {
    return new Response(JSON.stringify({ error: 'CLAUDE_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const uwKey = Deno.env.get('UNUSUAL_WHALES_API_KEY');

  try {
    const { message, history } = await req.json();

    // Optionally fetch fresh market context for Claude
    let marketContext = '';
    if (uwKey) {
      try {
        const uwHeaders = { 'Authorization': `Bearer ${uwKey}`, 'Accept': 'application/json' };
        const marketRes = await fetch('https://api.unusualwhales.com/api/market/overview', { headers: uwHeaders });
        if (marketRes.ok) {
          const marketData = await marketRes.json();
          marketContext = `\n\nCurrent market data from Unusual Whales:\n${JSON.stringify(marketData.data, null, 2)}`;
        }
      } catch (e) {
        console.warn('Failed to fetch market context:', e);
      }
    }

    const systemPrompt = `You are Biddie, the AI trading assistant for JORTRADE. You analyze market data from Unusual Whales and provide structured trading insights.

Your personality:
- Confident but measured — never give financial advice, always frame as analysis
- Use clear, concise language. No fluff.
- Reference specific data points: confidence scores, premium levels, flow direction
- When discussing setups, mention: entry zone, invalidation level, and confidence score
- Always remind users that this is analysis, not financial advice

You have access to real-time options flow and market data.${marketContext}`;

    const messages = [
      ...(history || []).map((h: any) => ({
        role: h.role,
        content: h.content,
      })),
      { role: 'user', content: message },
    ];

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!claudeRes.ok) {
      throw new Error(`Claude API failed [${claudeRes.status}]: ${await claudeRes.text()}`);
    }

    const claudeData = await claudeRes.json();
    const reply = claudeData.content?.[0]?.text || 'No response generated.';

    return new Response(JSON.stringify({ reply }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('ai-chat error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
