import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UW_BASE = "https://api.unusualwhales.com/api";

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
    // Get all pending signals
    const { data: pending, error: fetchErr } = await supabase
      .from("signal_outcomes")
      .select("*")
      .eq("outcome", "pending");

    if (fetchErr) throw fetchErr;
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ message: "No pending signals to verify", verified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get unique tickers to look up
    const tickers = [...new Set(pending.map((s: any) => s.ticker))];
    const priceMap: Record<string, number> = {};

    // Fetch current price for each ticker using options-volume (has underlying price)
    const uwHeaders = {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    };

    // Log API usage
    const logRows = tickers.map((t) => ({ api_name: "unusual_whales", endpoint: `options-volume-verify-${t}` }));
    await supabase.from("api_usage_log").insert(logRows);

    for (const ticker of tickers) {
      try {
        const res = await fetch(`${UW_BASE}/stock/${ticker}/options-volume`, { headers: uwHeaders });
        if (res.ok) {
          const json = await res.json();
          // The options-volume endpoint returns data with underlying price info
          // Try to extract the latest price from the data
          const records = json?.data || [];
          if (records.length > 0) {
            const latest = records[records.length - 1];
            const price = parseFloat(latest.close || latest.price || latest.underlying_price || "0");
            if (price > 0) priceMap[ticker] = price;
          }
        }
      } catch (e) {
        console.warn(`Failed to get price for ${ticker}:`, e);
      }
      // Small delay to respect rate limits
      await new Promise((r) => setTimeout(r, 600));
    }

    let verified = 0;
    let hits = 0;
    let misses = 0;

    for (const signal of pending as any[]) {
      const currentPrice = priceMap[signal.ticker];
      if (!currentPrice) continue;

      const strike = parseFloat((signal.strike || "").replace(/[$,]/g, ""));
      if (!strike || isNaN(strike)) continue;

      // Check if signal has expired (past expiry date)
      const now = new Date();
      const expiryDate = signal.expiry ? new Date(signal.expiry) : null;
      const isExpired = expiryDate && expiryDate < now;

      // Determine if signal was correct:
      // Bullish/Call: price went ABOVE strike = hit
      // Bearish/Put: price went BELOW strike = hit
      let outcome: string | null = null;

      if (signal.signal_type === "bullish" || signal.put_call === "call") {
        if (currentPrice > strike) {
          outcome = "hit";
          hits++;
        } else if (isExpired) {
          outcome = "missed";
          misses++;
        }
      } else if (signal.signal_type === "bearish" || signal.put_call === "put") {
        if (currentPrice < strike) {
          outcome = "hit";
          hits++;
        } else if (isExpired) {
          outcome = "missed";
          misses++;
        }
      }

      // Also check target zone if available
      if (!outcome && signal.target_zone) {
        const targetMatch = signal.target_zone.match(/\$([\d.]+)/);
        if (targetMatch) {
          const target = parseFloat(targetMatch[1]);
          if (signal.signal_type === "bullish" && currentPrice >= target) {
            outcome = "hit";
            hits++;
          } else if (signal.signal_type === "bearish" && currentPrice <= target) {
            outcome = "hit";
            hits++;
          }
        }
      }

      if (outcome) {
        await supabase
          .from("signal_outcomes")
          .update({
            outcome,
            outcome_price: currentPrice,
            resolved_at: new Date().toISOString(),
          })
          .eq("id", signal.id);
        verified++;
      }
    }

    return new Response(
      JSON.stringify({
        message: `Verified ${verified} signals`,
        verified,
        hits,
        misses,
        prices: priceMap,
        pending_count: pending.length,
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
