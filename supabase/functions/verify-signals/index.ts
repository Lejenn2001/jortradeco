import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UW_BASE = "https://api.unusualwhales.com/api";
const POLYGON_BASE = "https://api.polygon.io";
const BATCH_SIZE = 10;

// ── MFE Tier Classification ──────────────────────────────────────
// Full Hit:    MFE ≥ 75% → outcome = "win"
// Partial Hit: MFE ≥ 50% → outcome = "partial_win"
// Near Miss:   MFE ≥ 30% → outcome = "near_miss"
// Miss:        MFE < 30% → outcome = "loss"
function classifyOutcomeByMfe(mfePercent: number): string {
  if (mfePercent >= 75) return "win";
  if (mfePercent >= 50) return "partial_win";
  if (mfePercent >= 30) return "near_miss";
  return "loss";
}

function mfeTierLabel(mfePercent: number): string {
  if (mfePercent >= 75) return "Full Hit";
  if (mfePercent >= 50) return "Partial Hit";
  if (mfePercent >= 30) return "Near Miss";
  return "Miss";
}

// Extract invalidation price from signal fields
function extractInvalidation(signal: any): number | null {
  // First check the dedicated invalidation field
  if (signal.invalidation) {
    const match = signal.invalidation.match(/\$?([\d,.]+)/);
    if (match) return parseFloat(match[1].replace(/,/g, ''));
  }
  // Fallback: parse from description/target_zone
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

// ── Fetch intraday high/low from Polygon for MFE calc ────────────
async function fetchIntradayExtremes(
  ticker: string,
  fromDate: string,
  toDate: string,
  polygonKey: string
): Promise<{ high: number; low: number } | null> {
  try {
    // Use daily aggregates to get high/low range since signal creation
    const url = `${POLYGON_BASE}/v2/aggs/ticker/${ticker}/range/1/day/${fromDate}/${toDate}?adjusted=true&sort=asc&apiKey=${polygonKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const results = json?.results;
    if (!results || results.length === 0) return null;

    let high = -Infinity;
    let low = Infinity;
    for (const bar of results) {
      if (bar.h > high) high = bar.h;
      if (bar.l < low) low = bar.l;
    }
    return { high, low };
  } catch (e) {
    console.warn(`Polygon fetch failed for ${ticker}:`, e);
    return null;
  }
}

// ── Compute MFE% ─────────────────────────────────────────────────
function computeMfe(
  isBullish: boolean,
  entryPrice: number,
  targetPrice: number,
  extremes: { high: number; low: number }
): { mfePercent: number; maxFavorablePrice: number } {
  if (isBullish) {
    // Calls: how far price moved UP toward target
    const maxFavorablePrice = extremes.high;
    const totalDistance = targetPrice - entryPrice;
    if (totalDistance <= 0) return { mfePercent: 0, maxFavorablePrice };
    const mfePercent = Math.min(((maxFavorablePrice - entryPrice) / totalDistance) * 100, 150);
    return { mfePercent: Math.max(mfePercent, 0), maxFavorablePrice };
  } else {
    // Puts: how far price moved DOWN toward target
    const maxFavorablePrice = extremes.low;
    const totalDistance = entryPrice - targetPrice;
    if (totalDistance <= 0) return { mfePercent: 0, maxFavorablePrice };
    const mfePercent = Math.min(((entryPrice - maxFavorablePrice) / totalDistance) * 100, 150);
    return { mfePercent: Math.max(mfePercent, 0), maxFavorablePrice };
  }
}

// ── Derive trade_status from current price position ──────────────
function deriveTradeStatus(
  isBullish: boolean,
  currentPrice: number,
  entryPrice: number | null,
  targetPrice: number | null,
  invalPrice: number | null
): string {
  if (!entryPrice) return "watching";
  
  if (isBullish) {
    if (targetPrice && currentPrice >= targetPrice) return "hit";
    if (invalPrice && currentPrice <= invalPrice) return "stopped";
    if (currentPrice > entryPrice) return "active"; // in profit
    return "watching";
  } else {
    if (targetPrice && currentPrice <= targetPrice) return "hit";
    if (invalPrice && currentPrice >= invalPrice) return "stopped";
    if (currentPrice < entryPrice) return "active"; // in profit
    return "watching";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("UNUSUAL_WHALES_API_KEY");
  const polygonKey = Deno.env.get("POLYGON_API_KEY");
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
    const extremesMap: Record<string, { high: number; low: number }> = {};

    const uwHeaders = {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    };

    await supabase.from("api_usage_log").insert(
      tickers.map((t) => ({ api_name: "unusual_whales", endpoint: `verify-flow-${t}` }))
    );

    // Fetch current prices from UW
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

    // Fetch intraday extremes from Polygon for MFE calculation
    if (polygonKey) {
      const today = new Date().toISOString().slice(0, 10);
      for (const signal of pending as any[]) {
        const ticker = signal.ticker;
        const cacheKey = `${ticker}_${signal.created_at}`;
        if (extremesMap[cacheKey]) continue;

        const fromDate = new Date(signal.created_at).toISOString().slice(0, 10);
        const extremes = await fetchIntradayExtremes(ticker, fromDate, today, polygonKey);
        if (extremes) {
          extremesMap[cacheKey] = extremes;
        }
        await new Promise((r) => setTimeout(r, 250)); // Polygon rate limit
      }
    }

    let verified = 0, hits = 0, misses = 0, expired = 0, partialWins = 0, nearMisses = 0, alertCount = 0;
    const newAlerts: any[] = [];

    for (const signal of pending as any[]) {
      const currentPrice = priceMap[signal.ticker];
      if (!currentPrice) continue;

      const strike = parseFloat((signal.strike || "").replace(/[$,]/g, ""));
      const now = new Date();
      const expiryDate = signal.expiry ? new Date(signal.expiry) : null;
      const isExpired = expiryDate && expiryDate < now;
      const isBullish = signal.signal_type === "bullish" || signal.put_call === "call";

      const entryPrice = signal.entry_price || signal.price_at_signal || (strike > 0 ? strike : null);
      const targetPrice = extractTarget(signal);
      const invalPrice = extractInvalidation(signal);

      let outcome: string | null = null;
      let alertType: string | null = null;
      let alertMessage: string | null = null;
      let triggerPrice: number | null = null;
      let mfePercent: number | null = signal.mfe_percent;
      let maxFavorablePrice: number | null = signal.max_favorable_price;

      // ── Calculate MFE from Polygon data ──
      const cacheKey = `${signal.ticker}_${signal.created_at}`;
      const extremes = extremesMap[cacheKey];
      if (extremes && entryPrice && targetPrice) {
        const mfeResult = computeMfe(isBullish, entryPrice, targetPrice, extremes);
        mfePercent = Math.round(mfeResult.mfePercent * 100) / 100;
        maxFavorablePrice = mfeResult.maxFavorablePrice;
      }

      // ── Derive current trade_status ──
      const tradeStatus = deriveTradeStatus(isBullish, currentPrice, entryPrice, targetPrice, invalPrice);

      // ── 1) Check invalidation — price crossed stop ──
      if (invalPrice && invalPrice > 0) {
        if (isBullish && currentPrice <= invalPrice) {
          // Even though invalidated, classify by MFE tier
          outcome = mfePercent != null ? classifyOutcomeByMfe(mfePercent) : "loss";
          if (outcome === "loss") misses++;
          else if (outcome === "partial_win") partialWins++;
          else if (outcome === "near_miss") nearMisses++;
          alertType = "invalidated";
          triggerPrice = invalPrice;
          const tierLabel = mfePercent != null ? ` (${mfeTierLabel(mfePercent)} — MFE ${mfePercent.toFixed(0)}%)` : "";
          alertMessage = `🚨 ${signal.ticker} INVALIDATED${tierLabel} — Price dropped to $${currentPrice.toFixed(2)}, below stop at $${invalPrice.toFixed(2)}.`;
        } else if (!isBullish && currentPrice >= invalPrice) {
          outcome = mfePercent != null ? classifyOutcomeByMfe(mfePercent) : "loss";
          if (outcome === "loss") misses++;
          else if (outcome === "partial_win") partialWins++;
          else if (outcome === "near_miss") nearMisses++;
          alertType = "invalidated";
          triggerPrice = invalPrice;
          const tierLabel = mfePercent != null ? ` (${mfeTierLabel(mfePercent)} — MFE ${mfePercent.toFixed(0)}%)` : "";
          alertMessage = `🚨 ${signal.ticker} INVALIDATED${tierLabel} — Price rose to $${currentPrice.toFixed(2)}, above stop at $${invalPrice.toFixed(2)}.`;
        }
      }

      // ── 2) Check target zone — price reached target ──
      if (!outcome) {
        if (targetPrice && targetPrice > 0) {
          if (isBullish && currentPrice >= targetPrice) {
            outcome = "win";
            hits++;
            alertType = "target_hit";
            triggerPrice = targetPrice;
            const mfeText = mfePercent != null ? ` (MFE ${mfePercent.toFixed(0)}%)` : "";
            alertMessage = `🎯 ${signal.ticker} TARGET HIT${mfeText} — Price reached $${currentPrice.toFixed(2)}, target was $${targetPrice.toFixed(2)}. WIN!`;
          } else if (!isBullish && currentPrice <= targetPrice) {
            outcome = "win";
            hits++;
            alertType = "target_hit";
            triggerPrice = targetPrice;
            const mfeText = mfePercent != null ? ` (MFE ${mfePercent.toFixed(0)}%)` : "";
            alertMessage = `🎯 ${signal.ticker} TARGET HIT${mfeText} — Price dropped to $${currentPrice.toFixed(2)}, target was $${targetPrice.toFixed(2)}. WIN!`;
          }
        }
      }

      // ── 3) Strike-based fallback ──
      if (!outcome && strike > 0) {
        if (isBullish) {
          if (currentPrice > strike * 1.02) { outcome = "win"; hits++; }
          else if (isExpired && currentPrice < strike) {
            outcome = mfePercent != null ? classifyOutcomeByMfe(mfePercent) : "loss";
            if (outcome === "loss") misses++;
            else if (outcome === "partial_win") partialWins++;
            else if (outcome === "near_miss") nearMisses++;
          }
        } else {
          if (currentPrice < strike * 0.98) { outcome = "win"; hits++; }
          else if (isExpired && currentPrice > strike) {
            outcome = mfePercent != null ? classifyOutcomeByMfe(mfePercent) : "loss";
            if (outcome === "loss") misses++;
            else if (outcome === "partial_win") partialWins++;
            else if (outcome === "near_miss") nearMisses++;
          }
        }
      }

      // ── 4) Expiry check — classify expired signals by MFE tier ──
      if (!outcome) {
        const ageDays = (now.getTime() - new Date(signal.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays > 30 || isExpired) {
          // Use MFE-based classification if we have data, otherwise "expired"
          if (mfePercent != null && mfePercent >= 30) {
            outcome = classifyOutcomeByMfe(mfePercent);
            if (outcome === "win") hits++;
            else if (outcome === "partial_win") partialWins++;
            else if (outcome === "near_miss") nearMisses++;
          } else {
            outcome = "expired";
            expired++;
          }
          alertType = "expired";
          const tierLabel = mfePercent != null ? ` (${mfeTierLabel(mfePercent)} — MFE ${mfePercent.toFixed(0)}%)` : "";
          alertMessage = `⏰ ${signal.ticker} EXPIRED${tierLabel} — ${signal.put_call?.toUpperCase() || ''} $${signal.strike || 'N/A'}.`;
        }
      }

      // ── Update signal — always update MFE + trade_status even if not resolved ──
      const updatePayload: Record<string, any> = {};

      if (mfePercent != null) updatePayload.mfe_percent = mfePercent;
      if (maxFavorablePrice != null) updatePayload.max_favorable_price = maxFavorablePrice;
      updatePayload.trade_status = tradeStatus;

      if (outcome) {
        updatePayload.outcome = outcome;
        updatePayload.outcome_price = currentPrice;
        updatePayload.resolved_at = new Date().toISOString();
        verified++;

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

      if (Object.keys(updatePayload).length > 0) {
        await supabase.from("signal_outcomes").update(updatePayload).eq("id", signal.id);
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
        verified, hits, misses, expired, partial_wins: partialWins, near_misses: nearMisses,
        alerts: alertCount,
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
