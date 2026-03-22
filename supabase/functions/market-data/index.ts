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

  const apiKey = Deno.env.get('UNUSUAL_WHALES_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'UNUSUAL_WHALES_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { action, ticker } = await req.json();
    const uwHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    };

    let data: any = {};

    if (action === 'flow') {
      const res = await fetch(`${UW_BASE}/option-trades/flow-alerts?limit=15`, { headers: uwHeaders });
      if (!res.ok) throw new Error(`UW flow-alerts failed [${res.status}]: ${await res.text()}`);
      data = await res.json();
      await logApiUsage(["flow-alerts"]);

    } else if (action === 'ticker' && ticker) {
      // Ticker-specific: options volume + recent flow
      const [volumeRes, flowRes] = await Promise.all([
        fetch(`${UW_BASE}/stock/${ticker}/options-volume`, { headers: uwHeaders }),
        fetch(`${UW_BASE}/stock/${ticker}/flow-recent`, { headers: uwHeaders }),
      ]);

      const volume = volumeRes.ok ? await volumeRes.json() : { data: [] };
      const flow = flowRes.ok ? await flowRes.json() : { data: [] };

      data = { volume: volume.data, flow: flow.data };

    } else if (action === 'market') {
      // Market Tide - overall sentiment
      const res = await fetch(`${UW_BASE}/market/market-tide`, { headers: uwHeaders });
      if (!res.ok) throw new Error(`UW market-tide failed [${res.status}]: ${await res.text()}`);
      data = await res.json();

    } else if (action === 'whale-alerts') {
      // Large premium flow alerts
      const res = await fetch(`${UW_BASE}/option-trades/flow-alerts?min_premium=500000&limit=10`, { headers: uwHeaders });
      if (!res.ok) throw new Error(`UW whale-alerts failed [${res.status}]: ${await res.text()}`);
      data = await res.json();

    } else if (action === 'darkpool' && ticker) {
      const res = await fetch(`${UW_BASE}/darkpool/${ticker}`, { headers: uwHeaders });
      if (!res.ok) throw new Error(`UW darkpool failed [${res.status}]: ${await res.text()}`);
      data = await res.json();

    } else if (action === 'hottest') {
      // Hottest option chains
      const res = await fetch(`${UW_BASE}/screener/option-contracts?limit=10&min_premium=100000`, { headers: uwHeaders });
      if (!res.ok) throw new Error(`UW screener failed [${res.status}]: ${await res.text()}`);
      data = await res.json();

    } else {
      return new Response(JSON.stringify({ error: 'Invalid action. Use: flow, ticker, market, whale-alerts, darkpool, hottest' }), {
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
