import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const logApiUsage = async (endpoints: string[]) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const rows = endpoints.map(e => ({ api_name: "unusual_whales", endpoint: e }));
    await supabase.from("api_usage_log").insert(rows);
  } catch (e) { console.warn("Failed to log API usage:", e); }
};

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

    // Fetch 5 data sources in parallel for comprehensive analysis
    const [flowRes, volumeRes, tideRes, contractsRes, darkPoolRes] = await Promise.all([
      fetch(`${UW_BASE}/stock/${ticker}/flow-recent`, { headers: uwHeaders }),
      fetch(`${UW_BASE}/stock/${ticker}/options-volume`, { headers: uwHeaders }),
      fetch(`${UW_BASE}/market/market-tide`, { headers: uwHeaders }),
      fetch(`${UW_BASE}/stock/${ticker}/option-contracts?limit=20`, { headers: uwHeaders }),
      fetch(`${UW_BASE}/darkpool/${ticker}`, { headers: uwHeaders }),
    ]);

    const flowData = flowRes.ok ? await flowRes.json() : { data: [] };
    const volumeData = volumeRes.ok ? await volumeRes.json() : { data: [] };
    const tideData = tideRes.ok ? await tideRes.json() : { data: {} };
    const contractsData = contractsRes.ok ? await contractsRes.json() : { data: [] };
    const darkPoolData = darkPoolRes.ok ? await darkPoolRes.json() : { data: [] };

    await logApiUsage(["flow-recent", "options-volume", "market-tide", "option-contracts", "darkpool"]);

    // --- Build structured technical context ---

    // 1. Flow data: recent sweeps with underlying price, strikes, deltas, tags
    const flowRecords = (Array.isArray(flowData) ? flowData : flowData.data || []).slice(0, 15);
    const flowSummary = flowRecords.map((f: any) => ({
      strike: f.strike,
      type: f.option_type,
      premium: f.premium,
      size: f.size,
      volume: f.volume,
      open_interest: f.open_interest,
      underlying_price: f.underlying_price,
      delta: f.delta,
      implied_volatility: f.implied_volatility,
      expiry: f.expiry,
      tags: f.tags,
      executed_at: f.executed_at,
    }));

    // 2. Option contracts: OI concentration reveals real S/R levels
    const contracts = (contractsData.data || []).slice(0, 20);
    const oiConcentration = contracts
      .filter((c: any) => parseInt(c.open_interest || '0') > 1000)
      .map((c: any) => {
        const sym = c.option_symbol || '';
        const isCall = sym.includes('C');
        // Extract strike from option symbol (e.g., NVDA260327P00170000 -> 170)
        const strikeMatch = sym.match(/[CP](\d{8})$/);
        const strike = strikeMatch ? parseInt(strikeMatch[1]) / 1000 : null;
        return {
          strike,
          type: isCall ? 'call' : 'put',
          open_interest: parseInt(c.open_interest || '0'),
          volume: parseInt(c.volume || '0'),
          total_premium: c.total_premium,
          sweep_volume: parseInt(c.sweep_volume || '0'),
          ask_volume: parseInt(c.ask_volume || '0'),
          bid_volume: parseInt(c.bid_volume || '0'),
        };
      })
      .filter((c: any) => c.strike)
      .sort((a: any, b: any) => b.open_interest - a.open_interest);

    // 3. Dark pool: institutional price levels = hidden S/R
    const darkPoolRecords = (darkPoolData.data || []).slice(0, 10);
    const darkPoolSummary = darkPoolRecords.map((d: any) => ({
      price: d.price,
      size: d.size,
      premium: d.premium,
      executed_at: d.executed_at,
      nbbo_bid: d.nbbo_bid,
      nbbo_ask: d.nbbo_ask,
    }));

    // 4. Derive current price from flow data
    const currentPrice = flowRecords[0]?.underlying_price || 'unknown';

    // 5. Volume summary
    const volumeSummary = JSON.stringify((volumeData.data || []).slice(0, 5));

    // 6. Market tide
    const tideSummary = JSON.stringify(tideData.data || tideData);

    const name = traderName || 'Trader';
    const today = new Date().toISOString().split('T')[0];

    const systemPrompt = `You are Biddie, the JORTRADE AI trading assistant. You analyze OPTIONS FLOW + TECHNICAL DATA to provide structured trade recommendations.

You now receive 5 data sources:
1. **Flow Data**: Recent option sweeps/blocks with underlying_price, strike, delta, IV, tags (bullish/bearish), premium, size
2. **OI Concentration**: Open interest by strike — high OI strikes act as REAL support/resistance levels (market makers hedge here)
3. **Dark Pool Data**: Large institutional block trades — these price levels reveal hidden S/R where big money transacted
4. **Options Volume**: Volume concentration by strike/expiry
5. **Market Tide**: Overall market sentiment

## HOW TO DERIVE EACH FIELD:

### Entry
- Use the CURRENT underlying_price from flow data as the reference
- Identify the nearest key level the price has broken through or is testing
- Express as: "Broke below/above [level name] at $X.XX — confirmed" or "Testing [level] at $X.XX"
- Level names: PDH (previous day high), PDL (previous day low), key OI strike, dark pool level, VWAP area

### Target
- For BULLISH: Find the next significant CALL OI concentration strike ABOVE current price — that's where resistance lives
- For BEARISH: Find the next significant PUT OI concentration strike BELOW current price — that's where support lives
- Dark pool price clusters in the target direction strengthen the target
- Use the ACTUAL strike price from OI data, not an invented number

### Invalidation
- For BULLISH: The nearest significant resistance level ABOVE entry that, if price drops below support, invalidates the trade. Use the highest nearby PUT OI strike or dark pool level ABOVE entry.
- For BEARISH: The nearest significant support level BELOW entry that, if price rises above resistance, invalidates the trade. Use the highest nearby CALL OI strike or dark pool level BELOW entry.
- Must be a REAL price level from the data (OI concentration, dark pool, or flow reference price)

### Key Level
- The single most important price level right now — the pivot point
- Usually the strike with the HIGHEST combined OI (calls + puts) near current price
- Or a dark pool level where massive volume transacted

### S/R (Support/Resistance)
- Psychological round numbers ($100, $150, $170, $200)
- OR the highest-volume dark pool price level
- OR the strike with max gamma exposure (highest OI near the money)

Given real-time data, generate a JSON response with these exact fields:
{
  "bias": "Bullish Bias ↗" or "Bearish Bias ↘" or "Neutral ↔",
  "entry": "Broke below PDL at $X.XX — confirmed" or "Testing resistance at $X.XX" (MUST reference a real price from the data and name the level type),
  "targetZone": "Target Zone $XXX – $XXX" (price range from OI concentration in the favorable direction),
  "keyLevel": "Key Level: $XXX" (the most important S/R from OI + dark pool data — name what makes it key),
  "invalidation": "Invalidation: Above/Below $XXX" (real price level from data where trade thesis breaks — MUST be a level from OI or dark pool),
  "supportResistance": "S/R: $XXX [description]" (psychological level, max gamma strike, or biggest dark pool cluster),
  "strategy": one of ONLY: "Call" | "Put" | "Call Butterfly" | "Put Butterfly" | "Bull Call Debit Spread" | "Bear Put Debit Spread",
  "contract": "the specific contract(s), e.g. 'Buy NVDA Mar 28 2026 $170 Put' or for spreads list each leg",
  "expiration": "the nearest expiration with heavy activity, format: Mon DD, YYYY",
  "score": "X.X / 10" (probability score — base on: flow direction consistency, OI confirmation at target, dark pool alignment, premium size, sweep aggression. 9-10 = flow + OI + dark pool all aligned. 7-8 = two of three confirm. 5-6 = mixed. Below 5 = conflicting data.),
  "description": "Hey ${name}, here's what the data shows for ${ticker}... (2-3 sentences referencing SPECIFIC numbers: sweep counts, premium sizes, OI at key strikes, dark pool levels. Explain WHY the levels matter.)",
  "strategyExplanation": "1-2 sentences explaining WHY this strategy given the data alignment"
}

## CRITICAL RULES:
- You MUST return ALL 12 fields listed above. Do NOT omit any field. Required keys: bias, entry, targetZone, keyLevel, invalidation, supportResistance, strategy, contract, expiration, score, description, strategyExplanation. If you omit ANY key, the output is invalid.
- The current stock price is $${currentPrice}. ALL strikes, targets, invalidation levels, and contract strikes MUST be near this price (within ~15% range). Do NOT use strikes like $900 for a $167 stock.
- EVERY price in your response MUST come from the actual data provided. Never invent prices.
- Entry, target, invalidation, key level, and S/R must ALL reference real prices from flow underlying_price, OI strikes, or dark pool prices.
- "entry" MUST include the current underlying_price ($${currentPrice}) and describe whether price broke or is testing a level.
- "supportResistance" MUST cite a specific price — a round number, gamma strike, or dark pool cluster.
- The "contract" field strikes must match actual OI concentration strikes near the current price ($${currentPrice}).
- When citing a level, name its source: "OI concentration at $170", "Dark pool cluster at $166.60"
- ONLY recommend: Call, Put, Call Butterfly, Put Butterfly, Bull Call Debit Spread, or Bear Put Debit Spread.
- All recommended expirations MUST be in the future (${today} or later). Never recommend an expired contract.
- Today's date is ${today}. The year is 2026.
- Return ONLY valid JSON, no markdown fences.`;

    // Filter OI to only strikes within 15% of current price
    const priceNum = parseFloat(currentPrice) || 0;
    const nearbyOI = oiConcentration
      .filter((c: any) => c.strike && Math.abs(c.strike - priceNum) / priceNum < 0.15)
      .slice(0, 15);

    const userPrompt = `## ⚠️ CRITICAL: ${ticker} CURRENT STOCK PRICE IS $${currentPrice}. All strikes and price levels MUST be near $${currentPrice} (within 15%). Do NOT use strikes far from this price.

Analyze this data and generate the trade recommendation JSON with ALL 12 required fields.
Today is ${today}. Only recommend contracts with future expirations.

## 1. Recent Flow (last 15 trades — note underlying_price field = current stock price):
${JSON.stringify(flowSummary, null, 1)}

## 2. OI Concentration NEAR CURRENT PRICE (sorted by open interest — these are your S/R levels):
${JSON.stringify(nearbyOI, null, 1)}

## 3. Dark Pool Trades (institutional block trades — hidden S/R at these price levels):
${JSON.stringify(darkPoolSummary, null, 1)}

## 4. Options Volume Summary (directional sentiment, NOT price levels):
${(() => {
      const vol = (volumeData.data || [])[0] || {};
      const callVol = parseInt(vol.call_volume || '0');
      const putVol = parseInt(vol.put_volume || '0');
      const pcRatio = putVol && callVol ? (putVol / callVol).toFixed(2) : 'N/A';
      const netCallPrem = parseFloat(vol.net_call_premium || '0');
      return `Put/Call Ratio: ${pcRatio}, Call Volume: ${callVol.toLocaleString()}, Put Volume: ${putVol.toLocaleString()}, Net call premium flow: ${netCallPrem > 0 ? 'positive (bullish)' : 'negative (bearish)'}`;
    })()}

## 5. Market Tide (overall sentiment): ${parseFloat((tideData.data || tideData)?.net_call_premium_flow || '0') > 0 ? 'BULLISH overall market' : 'BEARISH overall market'}

⚠️ FINAL CHECK: The stock price is $${currentPrice}. Your contract strikes, target, invalidation, and key levels must all be near $${currentPrice}. Strikes like $800, $900, $1000 are WRONG for a $${currentPrice} stock. Use the strikes from the OI data above (e.g., ${nearbyOI.slice(0,3).map((c: any) => '$' + c.strike).join(', ')}).
Return ALL 12 JSON fields including "entry" and "supportResistance".`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${aiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
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

    let analysis;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse AI JSON:', content);
      analysis = {
        bias: 'Analyzing...',
        entry: 'Calculating...',
        targetZone: 'Calculating...',
        invalidation: 'Pending',
        keyLevel: 'Pending',
        supportResistance: 'Pending',
        strategy: 'Pending',
        expiration: '—',
        score: '— / 10',
        description: `Hey ${name}, we're still processing the latest data for ${ticker}. Check back shortly.`,
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
