import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UW_BASE = "https://api.unusualwhales.com/api";
const BATCH_SIZE = 10;

// Extract invalidation price from signal description or dedicated field
function extractInvalidation(signal: any): number | null {
  // Check description for invalidation patterns
  const text = `${signal.description || ''} ${signal.target_zone || ''}`;
  const patterns = [
    /invalidation[:\s]*\$?([\d,.]+)/i,
    /stop[:\s]*\$?([\d,.]+)/i,
    /invalid(?:ated)?.*?\$?([\d,.]+)/i,
    /stops? (?:at|above|below)[:\s]*\$?([\d,.]+)/i,
  ];
  for (const p of patterns) {
    const match = text.match(p);
    if (match) return parseFloat(match[1].replace(/,/g, ''));
  }
  return null;
}

// Extract target price from target_zone
function extractTarget(signal: any): number | null {
  if (!signal.target_zone) return null;
  const match = signal.target_zone.match(/\$?([\d,.]+)/);
  if (match) return parseFloat(match[1].replace(/,/g, ''));
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("UNUSUAL_WHALES_API_KEY");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { data: pending, error: fetchErr } = await supabase
      .from("signal_outcomes")
      .select("*")
      .eq("outcome", "pending")
      .order("created_at", { ascending: false })
      .limit(BATCH_SIZE);

    if (fetchErr) throw fetchErr;
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ message: "No pending signals to verify", verified: 0, hits: 0, misses: 0, alerts: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tickers = [...new Set(pending.map((s: any) => s.ticker))];
    const priceMap: Record<string, number> = {};

    const uwHeaders = {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    };

    await supabase.from("api_usage_log").insert(
      tickers.map((t) => ({ api_name: "unusual_whales", endpoint: `verify-flow-${t}` }))
    );

    // Fetch prices sequentially
    for (const ticker of tickers) {
      try {
        const res = await fetch(`${UW_BASE}/stock/${ticker}/flow-recent?limit=1`, { headers: uwHeaders });
        if (res.ok) {
          const json = await res.json();
          const records = json?.data || [];
          if (records.length > 0) {
            const latest = records[0];
            const price = parseFloat(latest.stock_price || latest.underlying_price || latest.price || "0");
            if (price > 0) priceMap[ticker] = price;
          }
        }
      } catch (e) {
        console.warn(`Failed to get price for ${ticker}:`, e);
      }
      await new Promise((r) => setTimeout(r, 600));
    }

    let verified = 0, hits = 0, misses = 0, expired = 0, alertCount = 0;
    const newAlerts: any[] = [];

    for (const signal of pending as any[]) {
      const currentPrice = priceMap[signal.ticker];
      if (!currentPrice) continue;

      const strike = parseFloat((signal.strike || "").replace(/[$,]/g, ""));
      const now = new Date();
      const expiryDate = signal.expiry ? new Date(signal.expiry) : null;
      const isExpired = expiryDate && expiryDate < now;
      const isBullish = signal.signal_type === "bullish" || signal.put_call === "call";

      let outcome: string | null = null;
      let alertType: string | null = null;
      let alertMessage: string | null = null;
      let triggerPrice: number | null = null;

      // 1) Check invalidation — price crossed stop level
      const invalPrice = extractInvalidation(signal);
      if (invalPrice && invalPrice > 0) {
        if (isBullish && currentPrice <= invalPrice) {
          outcome = "loss";
          misses++;
          alertType = "invalidated";
          triggerPrice = invalPrice;
          alertMessage = `🚨 ${signal.ticker} INVALIDATED — Price dropped to $${currentPrice.toFixed(2)}, below stop at $${invalPrice.toFixed(2)}. Signal was ${signal.put_call?.toUpperCase() || 'BULLISH'} $${signal.strike || 'N/A'}.`;
        } else if (!isBullish && currentPrice >= invalPrice) {
          outcome = "loss";
          misses++;
          alertType = "invalidated";
          triggerPrice = invalPrice;
          alertMessage = `🚨 ${signal.ticker} INVALIDATED — Price rose to $${currentPrice.toFixed(2)}, above stop at $${invalPrice.toFixed(2)}. Signal was ${signal.put_call?.toUpperCase() || 'BEARISH'} $${signal.strike || 'N/A'}.`;
        }
      }

      // 2) Check target zone — price reached target
      if (!outcome) {
        const targetPrice = extractTarget(signal);
        if (targetPrice && targetPrice > 0) {
          if (isBullish && currentPrice >= targetPrice) {
            outcome = "win";
            hits++;
            alertType = "target_hit";
            triggerPrice = targetPrice;
            alertMessage = `🎯 ${signal.ticker} TARGET HIT — Price reached $${currentPrice.toFixed(2)}, target was $${targetPrice.toFixed(2)}. ${signal.put_call?.toUpperCase() || 'BULLISH'} $${signal.strike || 'N/A'} is a WIN!`;
          } else if (!isBullish && currentPrice <= targetPrice) {
            outcome = "win";
            hits++;
            alertType = "target_hit";
            triggerPrice = targetPrice;
            alertMessage = `🎯 ${signal.ticker} TARGET HIT — Price dropped to $${currentPrice.toFixed(2)}, target was $${targetPrice.toFixed(2)}. ${signal.put_call?.toUpperCase() || 'BEARISH'} $${signal.strike || 'N/A'} is a WIN!`;
          }
        }
      }

      // 3) Strike-based fallback
      if (!outcome && strike > 0) {
        if (isBullish) {
          if (currentPrice > strike * 1.02) { outcome = "win"; hits++; }
          else if (isExpired && currentPrice < strike) { outcome = "loss"; misses++; }
        } else {
          if (currentPrice < strike * 0.98) { outcome = "win"; hits++; }
          else if (isExpired && currentPrice > strike) { outcome = "loss"; misses++; }
        }
      }

      // 4) Expiry check
      if (!outcome) {
        const ageDays = (now.getTime() - new Date(signal.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays > 30 || isExpired) {
          outcome = "expired";
          expired++;
          alertType = "expired";
          alertMessage = `⏰ ${signal.ticker} ${signal.put_call?.toUpperCase() || ''} $${signal.strike || 'N/A'} has expired without hitting target or invalidation.`;
        }
      }

      if (outcome) {
        await supabase.from("signal_outcomes").update({
          outcome,
          outcome_price: currentPrice,
          resolved_at: new Date().toISOString(),
        }).eq("id", signal.id);
        verified++;

        // Queue alert if we have one
        if (alertType && alertMessage) {
          newAlerts.push({
            signal_id: signal.id,
            ticker: signal.ticker,
            alert_type: alertType,
            message: alertMessage,
            current_price: currentPrice,
            trigger_price: triggerPrice,
          });
        }
      }
    }

    // Insert all alerts at once
    if (newAlerts.length > 0) {
      const { error: alertErr } = await supabase.from("signal_alerts").insert(newAlerts);
      if (alertErr) console.warn("Failed to insert alerts:", alertErr);
      else alertCount = newAlerts.length;
    }

    const { count: remainingCount } = await supabase
      .from("signal_outcomes")
      .select("id", { count: "exact", head: true })
      .eq("outcome", "pending");

    return new Response(
      JSON.stringify({
        message: `Verified ${verified} signals, ${alertCount} alerts sent`,
        verified, hits, misses, expired, alerts: alertCount,
        prices: priceMap,
        batch_size: pending.length,
        remaining_pending: remainingCount || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("verify-signals error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
