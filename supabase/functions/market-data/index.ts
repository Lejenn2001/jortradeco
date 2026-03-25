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

// Sequential fetch helper — never exceed 1 concurrent UW request
async function uwFetch(url: string, headers: Record<string, string>): Promise<Response> {
  return fetch(url, { headers });
}

function extractKeyLevels(contracts: any[], topN = 5): number[] {
  if (!contracts || contracts.length === 0) return [];
  const withStrikes = contracts
    .map((c: any) => {
      let strike = 0;
      if (c.option_symbol) {
        const match = c.option_symbol.match(/(\d{8})$/);
        if (match) strike = parseInt(match[1]) / 1000;
      }
      return { strike, oi: c.open_interest || 0 };
    })
    .filter((c: any) => c.strike > 0 && c.oi > 0);

  const strikeMap = new Map<number, number>();
  for (const c of withStrikes) {
    strikeMap.set(c.strike, (strikeMap.get(c.strike) || 0) + c.oi);
  }

  return Array.from(strikeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([strike]) => strike);
}

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
      // Sequential: flow-alerts first, then screener
      const flowRes = await uwFetch(`${UW_BASE}/option-trades/flow-alerts?limit=20&min_premium=25000`, uwHeaders);
      if (!flowRes.ok) throw new Error(`UW flow-alerts failed [${flowRes.status}]: ${await flowRes.text()}`);
      data = await flowRes.json();

      const screenerRes = await uwFetch(`${UW_BASE}/screener/option-contracts?max_stock_price=50&min_premium=25000&limit=10`, uwHeaders);
      const screenerData = screenerRes.ok ? await screenerRes.json() : { data: [] };
      const screenerAlerts = (screenerData?.data || []).map((s: any) => ({
        ticker: s.ticker_symbol || 'N/A',
        type: s.delta > 0 ? 'call' : 'put',
        strike: s.option_symbol?.match(/[CP]0*(\d+?)0{3}$/)?.[1] || null,
        total_premium: s.premium,
        volume: s.volume,
        open_interest: s.open_interest,
        volume_oi_ratio: s.open_interest > 0 ? String(s.volume / s.open_interest) : '0',
        trade_count: s.trades || 0,
        expiry: null,
        stock_price: s.stock_price,
        source: 'screener',
      }));

      const flowTickers = new Set((data?.data || []).map((a: any) => a.ticker));
      const newAlerts = screenerAlerts.filter((a: any) => !flowTickers.has(a.ticker));
      if (newAlerts.length > 0) {
        data.data = [...(data.data || []), ...newAlerts];
      }

      // Fetch key levels sequentially for top 2 tickers (to stay under limit)
      const alerts = data?.data || [];
      const tickerPremiums = new Map<string, number>();
      for (const a of alerts) {
        const t = a.ticker || a.underlying_symbol || '';
        const p = parseFloat(a.total_premium || a.premium || '0');
        tickerPremiums.set(t, (tickerPremiums.get(t) || 0) + p);
      }
      const topTickers = Array.from(tickerPremiums.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([t]) => t)
        .filter(t => t && t !== 'N/A');

      const keyLevelsMap: Record<string, number[]> = {};
      for (const t of topTickers) {
        try {
          const res = await uwFetch(`${UW_BASE}/stock/${t}/option-contracts`, uwHeaders);
          if (res.ok) {
            const json = await res.json();
            const levels = extractKeyLevels(json?.data || [], 5);
            if (levels.length > 0) keyLevelsMap[t] = levels;
          }
        } catch { /* skip */ }
      }

      await logApiUsage(["flow-alerts", "screener", ...topTickers.map(t => `option-contracts:${t}`)]);
      data.key_levels = keyLevelsMap;

    } else if (action === 'ticker' && ticker) {
      // Sequential
      const volumeRes = await uwFetch(`${UW_BASE}/stock/${ticker}/options-volume`, uwHeaders);
      const volume = volumeRes.ok ? await volumeRes.json() : { data: [] };
      const flowRes = await uwFetch(`${UW_BASE}/stock/${ticker}/flow-recent`, uwHeaders);
      const flow = flowRes.ok ? await flowRes.json() : { data: [] };
      data = { volume: volume.data, flow: flow.data };
      await logApiUsage(["options-volume", "flow-recent"]);

    } else if (action === 'market') {
      const res = await uwFetch(`${UW_BASE}/market/market-tide`, uwHeaders);
      if (!res.ok) throw new Error(`UW market-tide failed [${res.status}]: ${await res.text()}`);
      data = await res.json();
      await logApiUsage(["market-tide"]);

    } else if (action === 'whale-alerts') {
      const res = await uwFetch(`${UW_BASE}/option-trades/flow-alerts?min_premium=500000&limit=10`, uwHeaders);
      if (!res.ok) throw new Error(`UW whale-alerts failed [${res.status}]: ${await res.text()}`);
      data = await res.json();

      // Fetch key levels sequentially for top 2 tickers
      const whaleAlerts = data?.data || [];
      const whaleTickers = [...new Set(whaleAlerts.map((a: any) => a.ticker || a.underlying_symbol).filter(Boolean))].slice(0, 2) as string[];

      const keyLevelsMap: Record<string, number[]> = {};
      for (const t of whaleTickers) {
        try {
          const res = await uwFetch(`${UW_BASE}/stock/${t}/option-contracts`, uwHeaders);
          if (res.ok) {
            const json = await res.json();
            const levels = extractKeyLevels(json?.data || [], 5);
            if (levels.length > 0) keyLevelsMap[t] = levels;
          }
        } catch { /* skip */ }
      }

      await logApiUsage(["whale-alerts", ...whaleTickers.map(t => `option-contracts:${t}`)]);
      data.key_levels = keyLevelsMap;

    } else if (action === 'darkpool' && ticker) {
      const res = await uwFetch(`${UW_BASE}/darkpool/${ticker}`, uwHeaders);
      if (!res.ok) throw new Error(`UW darkpool failed [${res.status}]: ${await res.text()}`);
      data = await res.json();
      await logApiUsage(["darkpool"]);

    } else if (action === 'hottest') {
      const res = await uwFetch(`${UW_BASE}/screener/option-contracts?limit=10&min_premium=100000`, uwHeaders);
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

function formatPremiumHelper(value: any): string {
  if (!value) return '0';
  const num = parseFloat(value);
  if (isNaN(num)) return String(value);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toFixed(0);
}
