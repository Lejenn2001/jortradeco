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
      // Fetch both general flow alerts AND smaller-cap screener results in parallel
      const [flowRes, screenerRes] = await Promise.all([
        fetch(`${UW_BASE}/option-trades/flow-alerts?limit=15`, { headers: uwHeaders }),
        fetch(`${UW_BASE}/screener/option-contracts?max_stock_price=50&min_premium=5000&limit=10`, { headers: uwHeaders }),
      ]);
      if (!flowRes.ok) throw new Error(`UW flow-alerts failed [${flowRes.status}]: ${await flowRes.text()}`);
      data = await flowRes.json();

      // Merge screener results so smaller tickers get tracked too
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

      // Deduplicate — don't add screener tickers already in flow
      const flowTickers = new Set((data?.data || []).map((a: any) => a.ticker));
      const newAlerts = screenerAlerts.filter((a: any) => !flowTickers.has(a.ticker));
      if (newAlerts.length > 0) {
        data.data = [...(data.data || []), ...newAlerts];
      }

      await logApiUsage(["flow-alerts", "screener"]);

      // Auto-log high-conviction signals for accuracy tracking
      try {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        const alerts = data?.data || [];
        
        // Apply same filtering as dashboard: confidence >= 8.5, dedup per ticker (keep highest premium side), top 6
        const signalsWithMeta = alerts
          .filter((a: any) => {
            const volOi = a.volume_oi_ratio ? parseFloat(a.volume_oi_ratio) : 0;
            const tradeCount = a.trade_count || 0;
            return volOi > 3 || tradeCount > 5;
          })
          .map((a: any) => {
            const volOi = a.volume_oi_ratio ? parseFloat(a.volume_oi_ratio) : 0;
            const tradeCount = a.trade_count || 0;
            const confidence = volOi > 10 ? 9.5 : volOi > 3 ? 9.0 : tradeCount > 8 ? 8.8 : tradeCount > 5 ? 8.5 : 8.0;
            return {
              ticker: a.ticker || a.underlying_symbol || a.ticker_symbol || 'N/A',
              signal_type: a.type === 'call' ? 'bullish' : 'bearish',
              put_call: a.type === 'call' ? 'call' : 'put',
              confidence,
              strike: a.strike ? `$${a.strike}` : null,
              expiry: a.expiry || a.expires || null,
              premium: a.total_premium ? `$${formatPremiumHelper(a.total_premium)}` : null,
              _totalPremium: parseFloat(a.total_premium || a.premium || '0'),
              description: `${tradeCount || 'Multiple'} ${a.type} trades at $${a.strike} strike. Vol/OI: ${volOi ? volOi.toFixed(1) + 'x' : 'N/A'}`,
              outcome: 'pending',
              signal_source: 'auto',
            };
          })
          .filter((s: any) => s.confidence >= 8.5);

        // Dedup: per ticker keep highest premium side (matches dashboard logic)
        const tickerMap = new Map<string, any>();
        for (const s of signalsWithMeta) {
          const existing = tickerMap.get(s.ticker);
          if (!existing || s._totalPremium > existing._totalPremium) {
            tickerMap.set(s.ticker, s);
          }
        }

        // Top 6 by confidence (same as dashboard)
        const dashboardSignals = Array.from(tickerMap.values())
          .sort((a: any, b: any) => b.confidence - a.confidence)
          .slice(0, 6)
          .map(({ _totalPremium, ...s }: any) => s);

        if (dashboardSignals.length > 0) {
          const tickers = [...new Set(dashboardSignals.map((s: any) => s.ticker))];
          const buildSignalKey = (signal: any) => [
            signal.ticker || 'N/A',
            signal.signal_type || 'unknown',
            signal.strike || '',
            signal.expiry || '',
            signal.signal_source || 'auto',
          ].join('|');

          const { data: existingPendingSignals, error: existingPendingSignalsError } = await supabaseAdmin
            .from("signal_outcomes")
            .select("ticker,signal_type,strike,expiry,signal_source")
            .in("ticker", tickers)
            .eq("signal_source", "auto")
            .eq("outcome", "pending");

          if (existingPendingSignalsError) throw existingPendingSignalsError;

          const existingKeys = new Set((existingPendingSignals || []).map((signal: any) => buildSignalKey(signal)));
          const freshSignals = dashboardSignals.filter((signal: any) => !existingKeys.has(buildSignalKey(signal)));

          if (freshSignals.length > 0) {
            const { data: insertedSignals, error: insertError } = await supabaseAdmin
              .from("signal_outcomes")
              .insert(freshSignals)
              .select("*");

            if (insertError) throw insertError;

            const newPendingSignals = (insertedSignals || []).filter((signal: any) =>
              signal.outcome === "pending" && !signal.alerted && signal.confidence >= 8.5
            );

            if (newPendingSignals.length > 0) {
              const ids = newPendingSignals.map((signal: any) => signal.id);
              await supabaseAdmin
                .from("signal_outcomes")
                .update({ alerted: true })
                .in("id", ids);

              try {
                const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
                const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
                await fetch(`${supabaseUrl}/functions/v1/telegram-alert`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${supabaseAnonKey}`,
                  },
                  body: JSON.stringify({ signals: newPendingSignals }),
                });
              } catch (tgErr) {
                console.warn("Failed to send Telegram alerts:", tgErr);
              }
            }
          }
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

function formatPremiumHelper(value: any): string {
  if (!value) return '0';
  const num = parseFloat(value);
  if (isNaN(num)) return String(value);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toFixed(0);
}
