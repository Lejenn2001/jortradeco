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

  const apiKey = Deno.env.get('UNUSUAL_WHALES_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'UNUSUAL_WHALES_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { action, ticker } = await req.json();
    const headers = { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' };

    let data: any = {};

    if (action === 'flow') {
      // Get recent options flow / alerts
      const res = await fetch(`${UW_BASE}/option-trades/flow-alerts`, { headers });
      if (!res.ok) throw new Error(`UW flow-alerts failed [${res.status}]: ${await res.text()}`);
      data = await res.json();
    } else if (action === 'ticker' && ticker) {
      // Get ticker overview + options volume in parallel
      const [overviewRes, volumeRes] = await Promise.all([
        fetch(`${UW_BASE}/stock/${ticker}/overview`, { headers }),
        fetch(`${UW_BASE}/stock/${ticker}/options-volume`, { headers }),
      ]);

      const overview = overviewRes.ok ? await overviewRes.json() : { data: null };
      const volume = volumeRes.ok ? await volumeRes.json() : { data: [] };

      data = { overview: overview.data, volume: volume.data };
    } else if (action === 'market') {
      // Market overview - overall sentiment
      const res = await fetch(`${UW_BASE}/market/overview`, { headers });
      if (!res.ok) throw new Error(`UW market overview failed [${res.status}]: ${await res.text()}`);
      data = await res.json();
    } else if (action === 'whale-alerts') {
      // Large options trades
      const res = await fetch(`${UW_BASE}/option-trades/flow-alerts?min_premium=500000&limit=10`, { headers });
      if (!res.ok) throw new Error(`UW whale-alerts failed [${res.status}]: ${await res.text()}`);
      data = await res.json();
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action. Use: flow, ticker, market, whale-alerts' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('market-data error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
