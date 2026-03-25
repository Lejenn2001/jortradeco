import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UW_BASE = "https://api.unusualwhales.com/api";
const BATCH_SIZE = 20; // Process max 20 signals per invocation

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
    // Get only recent pending signals (batch)
    const { data: pending, error: fetchErr } = await supabase
      .from("signal_outcomes")
      .select("*")
      .eq("outcome", "pending")
      .order("created_at", { ascending: false })
      .limit(BATCH_SIZE);

    if (fetchErr) throw fetchErr;
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ message: "No pending signals to verify", verified: 0, hits: 0, misses: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get unique tickers from this batch only
    const tickers = [...new Set(pending.map((s: any) => s.ticker))];
    const priceMap: Record<string, number> = {};

    const uwHeaders = {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    };

    // Log API usage
    const logRows = tickers.map((t) => ({ api_name: "unusual_whales", endpoint: `verify-${t}` }));
    await supabase.from("api_usage_log").insert(logRows);

    // Fetch prices in parallel (max 5 concurrent)
    const chunks: string[][] = [];
    for (let i = 0; i < tickers.length; i += 5) {
      chunks.push(tickers.slice(i, i + 5));
    }

    for (const chunk of chunks) {
      const results = await Promise.allSettled(
        chunk.map(async (ticker) => {
          try {
            const res = await fetch(`${UW_BASE}/stock/${ticker}/options-volume`, { headers: uwHeaders });
            if (res.ok) {
              const json = await res.json();
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
        })
      );
      // Brief delay between chunks
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    let verified = 0;
    let hits = 0;
    let misses = 0;
    let expired = 0;

    for (const signal of pending as any[]) {
      const currentPrice = priceMap[signal.ticker];
      if (!currentPrice) continue;

      const strike = parseFloat((signal.strike || "").replace(/[$,]/g, ""));
      const now = new Date();
      const expiryDate = signal.expiry ? new Date(signal.expiry) : null;
      const isExpired = expiryDate && expiryDate < now;

      let outcome: string | null = null;

      if (signal.signal_type === "bullish" || signal.put_call === "call") {
        if (currentPrice > strike && strike > 0) {
          outcome = "hit";
          hits++;
        } else if (isExpired) {
          outcome = strike > 0 ? "missed" : "expired";
          if (outcome === "missed") misses++;
          else expired++;
        }
      } else if (signal.signal_type === "bearish" || signal.put_call === "put") {
        if (currentPrice < strike && strike > 0) {
          outcome = "hit";
          hits++;
        } else if (isExpired) {
          outcome = strike > 0 ? "missed" : "expired";
          if (outcome === "missed") misses++;
          else expired++;
        }
      }

      // Check target zone
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

      // Mark very old signals (>30 days) as expired
      if (!outcome) {
        const age = (now.getTime() - new Date(signal.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (age > 30) {
          outcome = "expired";
          expired++;
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

    // Count remaining pending
    const { count: remainingCount } = await supabase
      .from("signal_outcomes")
      .select("id", { count: "exact", head: true })
      .eq("outcome", "pending");

    return new Response(
      JSON.stringify({
        message: `Verified ${verified} signals`,
        verified,
        hits,
        misses,
        expired,
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
