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

// Parse strike from option symbol like NVDA260327P00170000 -> 170
function parseStrike(sym: string): number | null {
  const m = sym.match(/[CP](\d{8})$/);
  return m ? parseInt(m[1]) / 1000 : null;
}

// Determine bias from flow tags
function computeBias(flowRecords: any[]): { bias: string; bullishCount: number; bearishCount: number } {
  let bullish = 0, bearish = 0;
  for (const f of flowRecords) {
    const tags = f.tags || [];
    if (tags.includes('bullish')) bullish++;
    if (tags.includes('bearish')) bearish++;
  }
  const bias = bullish > bearish * 1.3 ? 'Bullish Bias ↗' : bearish > bullish * 1.3 ? 'Bearish Bias ↘' : 'Neutral ↔';
  return { bias, bullishCount: bullish, bearishCount: bearish };
}

// Find key price levels from OI concentration
function findKeyLevels(contracts: any[], currentPrice: number, isBullish: boolean) {
  // Parse and filter to near-money strikes
  const parsed = contracts
    .map((c: any) => {
      const sym = c.option_symbol || '';
      const strike = parseStrike(sym);
      const isCall = sym.includes('C');
      return {
        strike,
        type: isCall ? 'call' : 'put',
        oi: parseInt(c.open_interest || '0'),
        volume: parseInt(c.volume || '0'),
        sweepVol: parseInt(c.sweep_volume || '0'),
        totalPremium: parseFloat(c.total_premium || '0'),
      };
    })
    .filter((c: any) => c.strike && c.oi > 500 && Math.abs(c.strike - currentPrice) / currentPrice < 0.15)
    .sort((a: any, b: any) => b.oi - a.oi);

  // Key level = highest OI strike near current price
  const keyLevelStrike = parsed[0]?.strike || Math.round(currentPrice);

  // For bullish: target = next call OI above price, invalidation = put OI below
  // For bearish: target = next put OI below price, invalidation = call OI above
  const above = parsed.filter(c => c.strike > currentPrice).sort((a, b) => a.strike - b.strike);
  const below = parsed.filter(c => c.strike < currentPrice).sort((a, b) => b.strike - a.strike);

  let target: number, invalidation: number;
  if (isBullish) {
    target = above.find(c => c.type === 'call')?.strike || above[0]?.strike || Math.round(currentPrice * 1.05);
    invalidation = below.find(c => c.type === 'put')?.strike || below[0]?.strike || Math.round(currentPrice * 0.97);
  } else {
    target = below.find(c => c.type === 'put')?.strike || below[0]?.strike || Math.round(currentPrice * 0.95);
    invalidation = above.find(c => c.type === 'call')?.strike || above[0]?.strike || Math.round(currentPrice * 1.03);
  }

  // S/R = nearest psychological round number
  const roundLevels = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500];
  const sr = roundLevels.reduce((best, lvl) => 
    Math.abs(lvl - currentPrice) < Math.abs(best - currentPrice) ? lvl : best
  , roundLevels[0]);

  return { keyLevelStrike, target, invalidation, sr, topStrikes: parsed.slice(0, 5) };
}

// Find dark pool levels
function findDarkPoolLevel(records: any[], currentPrice: number): { price: number; size: number } | null {
  if (!records.length) return null;
  // Find largest dark pool trade near current price
  const near = records
    .filter((d: any) => {
      const p = parseFloat(d.price || '0');
      return p > 0 && Math.abs(p - currentPrice) / currentPrice < 0.05;
    })
    .sort((a: any, b: any) => parseInt(b.size || '0') - parseInt(a.size || '0'));
  if (near.length) return { price: parseFloat(near[0].price), size: parseInt(near[0].size) };
  return null;
}

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

    const [flowRes, volumeRes, tideRes, contractsRes, darkPoolRes] = await Promise.all([
      fetch(`${UW_BASE}/stock/${ticker}/flow-recent`, { headers: uwHeaders }),
      fetch(`${UW_BASE}/stock/${ticker}/options-volume`, { headers: uwHeaders }),
      fetch(`${UW_BASE}/market/market-tide`, { headers: uwHeaders }),
      fetch(`${UW_BASE}/stock/${ticker}/option-contracts?limit=30`, { headers: uwHeaders }),
      fetch(`${UW_BASE}/darkpool/${ticker}`, { headers: uwHeaders }),
    ]);

    const flowData = flowRes.ok ? await flowRes.json() : { data: [] };
    const volumeData = volumeRes.ok ? await volumeRes.json() : { data: [] };
    const tideData = tideRes.ok ? await tideRes.json() : { data: {} };
    const contractsData = contractsRes.ok ? await contractsRes.json() : { data: [] };
    const darkPoolData = darkPoolRes.ok ? await darkPoolRes.json() : { data: [] };

    await logApiUsage(["flow-recent", "options-volume", "market-tide", "option-contracts", "darkpool"]);

    // --- ALGORITHMIC LEVEL COMPUTATION ---
    const flowRecords = (Array.isArray(flowData) ? flowData : flowData.data || []).slice(0, 30);
    const contracts = (contractsData.data || []);
    const darkPoolRecords = (darkPoolData.data || []).slice(0, 20);
    const volData = (volumeData.data || [])[0] || {};

    // Current price
    const currentPrice = parseFloat(flowRecords[0]?.underlying_price || '0');
    if (!currentPrice) {
      return new Response(JSON.stringify({ error: 'Could not determine current price' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Bias from flow
    const { bias, bullishCount, bearishCount } = computeBias(flowRecords);
    const isBullish = bias.includes('Bullish');

    // Key levels from OI
    const levels = findKeyLevels(contracts, currentPrice, isBullish);

    // Dark pool level
    const dpLevel = findDarkPoolLevel(darkPoolRecords, currentPrice);

    // Volume sentiment
    const callVol = parseInt(volData.call_volume || '0');
    const putVol = parseInt(volData.put_volume || '0');
    const pcRatio = callVol > 0 ? (putVol / callVol).toFixed(2) : 'N/A';
    const netCallPrem = parseFloat(volData.net_call_premium || '0');

    // Determine strategy
    let strategy: string;
    const targetDist = Math.abs(levels.target - currentPrice);
    const hasConcentratedOI = levels.topStrikes.length >= 3;
    if (isBullish) {
      strategy = hasConcentratedOI && targetDist / currentPrice < 0.05 ? 'Call Butterfly' : 
                 targetDist / currentPrice < 0.08 ? 'Bull Call Debit Spread' : 'Call';
    } else {
      strategy = hasConcentratedOI && targetDist / currentPrice < 0.05 ? 'Put Butterfly' :
                 targetDist / currentPrice < 0.08 ? 'Bear Put Debit Spread' : 'Put';
    }

    // Find best expiry from flow (most common near-term future expiry)
    const today = new Date().toISOString().split('T')[0];
    const expiryCount: Record<string, number> = {};
    for (const f of flowRecords) {
      if (f.expiry && f.expiry >= today) {
        expiryCount[f.expiry] = (expiryCount[f.expiry] || 0) + 1;
      }
    }
    const bestExpiry = Object.entries(expiryCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || today;
    const expDate = new Date(bestExpiry + 'T12:00:00Z');
    const expFormatted = expDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    // Pre-computed analysis object
    const preComputed = {
      bias,
      currentPrice: currentPrice.toFixed(2),
      entry: `$${currentPrice.toFixed(2)}`,
      target: `$${levels.target.toFixed(2)}`,
      targetRange: isBullish 
        ? `$${levels.target.toFixed(2)} – $${(levels.target + (levels.target - currentPrice) * 0.3).toFixed(2)}`
        : `$${(levels.target - (currentPrice - levels.target) * 0.3).toFixed(2)} – $${levels.target.toFixed(2)}`,
      invalidation: `$${levels.invalidation.toFixed(2)}`,
      keyLevel: `$${levels.keyLevelStrike.toFixed(2)}`,
      sr: `$${levels.sr}`,
      dpLevel: dpLevel ? `$${dpLevel.price.toFixed(2)} (${dpLevel.size.toLocaleString()} shares)` : null,
      strategy,
      expiration: expFormatted,
      contractStrike: isBullish ? levels.target : levels.target,
      putCall: isBullish ? 'Call' : 'Put',
      pcRatio,
      bullishCount,
      bearishCount,
      topOIStrikes: levels.topStrikes.slice(0, 3).map(s => `$${s.strike} (${s.type}, OI: ${s.oi.toLocaleString()})`).join(', '),
    };

    const name = traderName || 'Trader';

    // Now ask AI ONLY for narrative description and score — all prices are pre-computed
    const systemPrompt = `You are Biddie, the JORTRADE AI trading assistant. You will receive a PRE-COMPUTED trade analysis with all price levels already determined from real data. Your job is ONLY to:
1. Write a natural "description" (2-3 sentences, address trader as "${name}", reference the specific data points provided)
2. Write a "strategyExplanation" (1-2 sentences explaining why the strategy fits)
3. Assign a "score" (X.X / 10) based on alignment strength
4. Write an "entry" description referencing the current price and nearest key level

DO NOT change any of the pre-computed price levels. Return ONLY valid JSON with these exact fields:
{
  "description": "Hey ${name}, ...",
  "strategyExplanation": "...",
  "score": "X.X / 10",
  "entryDescription": "Broke below/above [level] at $X.XX — confirmed" or "Testing [level] at $X.XX"
}

Score guide: 9-10 = all data sources aligned, 7-8 = two of three confirm, 5-6 = mixed signals, below 5 = conflicting.
Return ONLY valid JSON, no markdown.`;

    const userPrompt = `Pre-computed analysis for ${ticker}:
- Current Price: $${preComputed.currentPrice}
- Bias: ${preComputed.bias} (${preComputed.bullishCount} bullish vs ${preComputed.bearishCount} bearish flow tags)
- Key Level: ${preComputed.keyLevel} (highest OI strike near price)
- Target: ${preComputed.targetRange}
- Invalidation: ${preComputed.invalidation}
- S/R: ${preComputed.sr} psychological level${preComputed.dpLevel ? `, Dark pool: ${preComputed.dpLevel}` : ''}
- Strategy: ${preComputed.strategy}
- Top OI Strikes: ${preComputed.topOIStrikes}
- P/C Ratio: ${preComputed.pcRatio}
- Net call premium: ${netCallPrem > 0 ? 'positive (bullish)' : 'negative (bearish)'}
- Market tide: ${parseFloat((tideData.data || tideData)?.net_call_premium_flow || '0') > 0 ? 'bullish' : 'bearish'}

Write the description, strategy explanation, score, and entry description.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${aiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    let description = `Hey ${name}, analyzing ${ticker} flow data at $${preComputed.currentPrice}.`;
    let strategyExplanation = `${preComputed.strategy} selected based on flow bias and OI concentration.`;
    let score = '6.0 / 10';
    let entryDesc = `Testing key level at ${preComputed.keyLevel}`;

    if (aiRes.ok) {
      const aiData = await aiRes.json();
      const content = aiData.choices?.[0]?.message?.content || '';
      try {
        const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        description = parsed.description || description;
        strategyExplanation = parsed.strategyExplanation || strategyExplanation;
        score = parsed.score || score;
        entryDesc = parsed.entryDescription || entryDesc;
      } catch {
        console.warn('AI narrative parse failed, using defaults');
      }
    }

    // Build contract string
    let contractStr: string;
    const strikeStr = levels.target.toFixed(2).replace(/\.00$/, '');
    if (strategy === 'Call' || strategy === 'Put') {
      contractStr = `Buy ${ticker} ${expFormatted} $${strikeStr} ${preComputed.putCall}`;
    } else if (strategy === 'Bull Call Debit Spread' || strategy === 'Bear Put Debit Spread') {
      const leg2Strike = isBullish 
        ? (levels.target + (levels.target - currentPrice) * 0.5).toFixed(2).replace(/\.00$/, '')
        : (levels.target - (currentPrice - levels.target) * 0.5).toFixed(2).replace(/\.00$/, '');
      contractStr = `Buy ${ticker} ${expFormatted} $${strikeStr} ${preComputed.putCall} / Sell ${ticker} ${expFormatted} $${leg2Strike} ${preComputed.putCall}`;
    } else {
      // Butterfly
      const wing = Math.abs(levels.target - currentPrice) * 0.5;
      const mid = levels.target;
      const low = (mid - wing).toFixed(2).replace(/\.00$/, '');
      const high = (mid + wing).toFixed(2).replace(/\.00$/, '');
      contractStr = `Buy 1x $${low} ${preComputed.putCall} / Sell 2x $${strikeStr} ${preComputed.putCall} / Buy 1x $${high} ${preComputed.putCall}`;
    }

    const analysis = {
      bias: preComputed.bias,
      entry: entryDesc,
      targetZone: `Target Zone ${preComputed.targetRange}`,
      keyLevel: `Key Level: ${preComputed.keyLevel}`,
      invalidation: `Invalidation: ${isBullish ? 'Below' : 'Above'} ${preComputed.invalidation}`,
      supportResistance: `S/R: ${preComputed.sr} psychological level${preComputed.dpLevel ? `, Dark pool at ${preComputed.dpLevel}` : ''}`,
      strategy,
      contract: contractStr,
      expiration: expFormatted,
      score,
      description,
      strategyExplanation,
    };

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
