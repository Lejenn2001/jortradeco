import type { MarketSignal, SignalTimeframe } from "@/hooks/useMarketData";

/**
 * Shared signal mapping utility — used by Dashboard, DashboardSignals, and any
 * page that converts a Supabase `signal_outcomes` row into a MarketSignal object.
 *
 * Single source of truth for conviction thresholds & label generation.
 */

export function mapConfidenceToConviction(confidence: number) {
  let convictionScore = Math.round(confidence * 10);
  if (confidence >= 9) convictionScore = Math.max(convictionScore, 92);
  else if (confidence >= 8) convictionScore = Math.max(convictionScore, 85);
  else if (confidence >= 7) convictionScore = Math.max(convictionScore, 78);
  else if (confidence >= 6) convictionScore = Math.max(convictionScore, 70);

  let convictionLabel = "Low Conviction";
  if (convictionScore >= 90) convictionLabel = "Extreme Conviction";
  else if (convictionScore >= 80) convictionLabel = "Very High Conviction";
  else if (convictionScore >= 68) convictionLabel = "High Conviction";
  else if (convictionScore >= 50) convictionLabel = "Moderate Conviction";

  return { convictionScore, convictionLabel };
}

export function formatSignalTimestamp(isoStr: string): string {
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return "Today";
  const eastern = new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const month = eastern.getMonth() + 1;
  const day = eastern.getDate();
  const year = eastern.getFullYear();
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  });
  return `${month}/${day}/${year} ${time}`;
}

export function classifyTimeframe(record: any): SignalTimeframe {
  if (record.expiry) {
    const expDate = new Date(record.expiry);
    if (!isNaN(expDate.getTime())) {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const expStr = expDate.toISOString().split("T")[0];
      if (expStr === todayStr) return "buy_now";
      const dte = Math.max(0, Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      if (dte <= 7) return "short_term";
      return "swing";
    }
  }
  return "swing";
}

export function dbRecordToSignal(record: any): MarketSignal {
  const confidence = parseFloat(record.confidence) || 5;
  const { convictionScore, convictionLabel } = mapConfidenceToConviction(confidence);
  const isBullish = record.signal_type === "bullish";
  const putCall = record.put_call || record.option_type || "call";

  const tags: string[] = [];
  if (putCall) tags.push(putCall === "call" ? "Call Flow" : "Put Flow");
  if (convictionScore >= 85) tags.push("🔥 ACT NOW");
  else if (convictionScore >= 70) tags.push("⚡ HIGH CONVICTION");

  const createdAt = record.detected_at || record.created_at || "";
  const timestamp = createdAt ? formatSignalTimestamp(createdAt) : "Today";

  let description =
    record.description ||
    record.reason ||
    `${putCall === "call" ? "Call" : "Put"} flow on ${record.ticker}${record.strike ? ` at ${record.strike}` : ""}.`;
  if (record.price_at_signal && !description.includes("Price at $")) {
    description += ` Price at $${Number(record.price_at_signal).toFixed(2)}.`;
  }

  return {
    id: record.id,
    ticker: record.ticker,
    type: isBullish ? "bullish" : "bearish",
    confidence,
    convictionScore,
    convictionLabel,
    description,
    timestamp,
    tags,
    strike: record.strike ?? undefined,
    expiry: record.expiry ?? undefined,
    premium: record.premium ?? undefined,
    putCall: (putCall as "call" | "put") ?? undefined,
    suggestedTrade: `Buy ${record.ticker}${record.strike ? ` ${record.strike}` : ""} ${putCall === "put" ? "Puts" : "Calls"}${record.expiry ? ` exp ${record.expiry}` : ""}`,
    targetZone: record.target_zone || record.target || undefined,
    createdAt,
    source: "live",
    timeframe: classifyTimeframe(record),
    category: record.category || "algorithm",
    reason: record.reason,
    entryTrigger: record.entry_trigger,
    invalidation: record.invalidation,
    keyLevel: record.key_level,
    srLevel: record.sr_level,
    targetNear: record.target_near || undefined,
    tradeStatus: record.trade_status || null,
    aiEvaluated: !!record.is_biddie_pick,
    priceAtSignal: record.price_at_signal ? Number(record.price_at_signal) : undefined,
    outcome: record.outcome || null,
    resolvedAt: record.resolved_at || null,
    mfePercent: record.mfe_percent != null ? Number(record.mfe_percent) : null,
    maxFavorablePrice: record.max_favorable_price != null ? Number(record.max_favorable_price) : null,
    gammaZone: record.gamma_zone || undefined,
    gammaDescription: record.gamma_description || undefined,
    reviewStatus: record.review_status || null,
    reviewNote: record.review_note || null,
  };
}
