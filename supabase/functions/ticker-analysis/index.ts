import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UW_BASE = 'https://api.unusualwhales.com/api';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const uwKey = Deno.env.get('UNUSUAL_WHALES_API_KEY');
  const aiKey = Deno.env.get('LOVABLE_API_KEY');

  if (!uwKey || !aiKey) {
    return new Response(JSON.stringify({ error: 'Missing API keys' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { ticker, traderName } = await req.json();
    if (!ticker) {
      return new Response(JSON.stringify({ error: 'ticker is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const uwHeaders = { Authorization: `Bearer ${uwKey}`, Accept: 'application/json' };

    // Fetch flow data for the ticker (all valid GET endpoints)
    const [flowRes, volumeRes, tideRes] = await Promise.all([
      fetch(`${UW_BASE}/stock/${ticker}/flow-recent`, { headers: uwHeaders }),
      fetch(`${UW_BASE}/stock/${ticker}/options-volume`, { headers: uwHeaders }),
      fetch(`${UW_BASE}/market/market-tide`, { headers: uwHeaders }),
    ]);

    const flowData = flowRes.ok ? await flowRes.json() : { data: [] };
    const volumeData = volumeRes.ok ? await volumeRes.json() : { data: [] };
    const tideData = tideRes.ok ? await tideRes.json() : { data: {} };

    // Build context for AI
    const flowSummary = JSON.stringify((flowData.data || []).slice(0, 10));
    const volumeSummary = JSON.stringify((volumeData.data || []).slice(0, 5));
    const tideSummary = JSON.stringify(tideData.data || tideData);

    const name = traderName || 'Trader';

    const systemPrompt = `You are Biddie, the JORTRADE AI trading assistant. You analyze options flow data and provide structured trade recommendations.

Given real-time flow data for a ticker, generate a JSON response with these exact fields:
{
  "bias": "Bullish Bias ↗" or "Bearish Bias ↘" or "Neutral ↔",
  "targetZone": "Target Zone $XXX – $XXX" (the price range where the recommended contract profits — use real strikes),
  "keyLevel": "Key Level: $XXX" (an important support/resistance level the price is approaching or breaking through),
  "invalidation": "Invalidation: $XXX" (the level where the trade idea is invalidated — a stop-loss level),
  "strategy": one of ONLY: "Call" | "Put" | "Call Butterfly" | "Put Butterfly" | "Bull Call Debit Spread" | "Bear Put Debit Spread",
  "contract": "the specific contract(s), e.g. 'Buy NVDA Mar 28 2026 $980 Call' or for spreads 'Buy NVDA Mar 28 $950 Call / Sell NVDA Mar 28 $970 Call' or for butterflies 'Buy 1x $940 Call / Sell 2x $960 Call / Buy 1x $980 Call'",
  "expiration": "the nearest expiration with heavy activity, format: Mon DD, YYYY",
  "score": "X.X / 10" (probability score for the SPECIFIC CONTRACT you are recommending. How likely is this contract to be profitable? Base it on: volume of flow at that strike, size of premiums, number of repeated sweeps, how close price is to the strike, time to expiration. 9-10 = very high probability — massive repeated flow, large premiums, price action confirming. 7-8 = good probability. 5-6 = moderate, mixed signals. Below 5 = speculative. Use the full range.),
  "description": "Hey ${name}, the market structure for ${ticker} is... (2-3 sentences explaining the current setup, addressing the trader by name, referencing specific flow data like sweep counts, premium sizes, dominant strikes)",
  "strategyExplanation": "1-2 sentences explaining WHY this specific strategy makes sense given the flow data"
}

Rules:
- Use ONLY real data from the flow. Don't invent numbers.
- ONLY recommend: Call, Put, Call Butterfly, Put Butterfly, Bull Call Debit Spread, or Bear Put Debit Spread.
- Bullish flow → Call, Bull Call Debit Spread, or Call Butterfly.
- Bearish flow → Put, Bear Put Debit Spread, or Put Butterfly.
- Use spreads when the move looks measured/range-bound. Use butterflies for concentrated strike activity. Use Call/Put for strong directional conviction.
- The "contract" field MUST have exact ticker, expiration date, strike(s), and type. For multi-leg strategies, list each leg.
- Use actual strike prices and expirations from the flow data.
- ONLY use flow data from TODAY or this current trading week. Ignore any trades with past expirations or old dates.
- All recommended expirations MUST be in the future (today or later). Never recommend an expired contract.
- Today's date is ${new Date().toISOString().split('T')[0]}.
- Keep descriptions conversational but professional.
- The year is 2026.
- Return ONLY valid JSON, no markdown.`;

    const today = new Date().toISOString().split('T')[0];
    const userPrompt = `Analyze this flow data for ${ticker} and generate the trade recommendation JSON.
IMPORTANT: Today is ${today}. Only use flow entries from this week. Only recommend contracts with future expirations (${today} or later). Discard anything expired.

Recent Flow (last 10 trades):
${flowSummary}

Options Volume:
${volumeSummary}

Market Tide (overall sentiment):
${tideSummary}`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${aiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('AI gateway error:', aiRes.status, errText);
      return new Response(JSON.stringify({ error: `AI analysis failed [${aiRes.status}]` }), {
        status: aiRes.status === 429 ? 429 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse JSON from response (strip markdown fences if present)
    let analysis;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse AI JSON:', content);
      analysis = {
        bias: 'Analyzing...',
        callZone: 'Calculating...',
        invalidation: 'Pending',
        strategy: 'Pending',
        expiration: '—',
        score: '— / 10',
        description: `Hey ${name}, we're still processing the latest flow data for ${ticker}. Check back shortly.`,
        strategyExplanation: 'Analysis in progress.',
      };
    }

    return new Response(JSON.stringify(analysis), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('ticker-analysis error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
