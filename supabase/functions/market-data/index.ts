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

      // Auto-log high-conviction signals for accuracy tracking
      try {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        const alerts = data?.data || [];
        const signalsToLog = alerts
          .filter((a: any) => {
            const volOi = a.volume_oi_ratio ? parseFloat(a.volume_oi_ratio) : 0;
            const tradeCount = a.trade_count || 0;
            return volOi > 3 || tradeCount > 5;
          })
          .map((a: any) => ({
            ticker: a.ticker || a.underlying_symbol || 'N/A',
            signal_type: a.type === 'call' ? 'bullish' : 'bearish',
            put_call: a.type === 'call' ? 'call' : 'put',
            confidence: a.volume_oi_ratio && parseFloat(a.volume_oi_ratio) > 10 ? 9.5 :
                        a.volume_oi_ratio && parseFloat(a.volume_oi_ratio) > 3 ? 9.0 : 8.5,
            strike: a.strike ? `$${a.strike}` : null,
            expiry: a.expiry || a.expires || null,
            premium: a.total_premium ? `$${formatPremiumHelper(a.total_premium)}` : null,
            description: `${a.trade_count || 'Multiple'} ${a.type} trades at $${a.strike} strike. Vol/OI: ${a.volume_oi_ratio ? parseFloat(a.volume_oi_ratio).toFixed(1) + 'x' : 'N/A'}`,
            outcome: 'pending',
            signal_source: 'auto',
          }));

        if (signalsToLog.length > 0) {
          await supabaseAdmin
            .from("signal_outcomes")
            .upsert(signalsToLog, { onConflict: "ticker,signal_type,strike,expiry,signal_source", ignoreDuplicates: true });
        }
      } catch (logErr) {
        console.warn("Failed to auto-log signals:", logErr);
      }

    } else if (action === 'ticker' && ticker) {
      const [volumeRes, flowRes] = await Promise.all([
        fetch(`${UW_BASE}/stock/${ticker}/options-volume`, { headers: uwHeaders }),
        fetch(`${UW_BASE}/stock/${ticker}/flow-recent`, { headers: uwHeaders }),
      ]);
      const volume = volumeRes.ok ? await volumeRes.json() : { data: [] };
      const flow = flowRes.ok ? await flowRes.json() : { data: [] };
      data = { volume: volume.data, flow: flow.data };
      await logApiUsage(["options-volume", "flow-recent"]);

    } else if (action === 'market') {
      const res = await fetch(`${UW_BASE}/market/market-tide`, { headers: uwHeaders });
      if (!res.ok) throw new Error(`UW market-tide failed [${res.status}]: ${await res.text()}`);
      data = await res.json();
      await logApiUsage(["market-tide"]);

    } else if (action === 'whale-alerts') {
      const res = await fetch(`${UW_BASE}/option-trades/flow-alerts?min_premium=500000&limit=10`, { headers: uwHeaders });
      if (!res.ok) throw new Error(`UW whale-alerts failed [${res.status}]: ${await res.text()}`);
      data = await res.json();
      await logApiUsage(["whale-alerts"]);

    } else if (action === 'darkpool' && ticker) {
      const res = await fetch(`${UW_BASE}/darkpool/${ticker}`, { headers: uwHeaders });
      if (!res.ok) throw new Error(`UW darkpool failed [${res.status}]: ${await res.text()}`);
      data = await res.json();
      await logApiUsage(["darkpool"]);

    } else if (action === 'hottest') {
      const res = await fetch(`${UW_BASE}/screener/option-contracts?limit=10&min_premium=100000`, { headers: uwHeaders });
      if (!res.ok) throw new Error(`UW screener failed [${res.status}]: ${await res.text()}`);
      data = await res.json();
      await logApiUsage(["screener"]);

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
