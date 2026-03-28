import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AmbientBackground from "@/components/dashboard/AmbientBackground";
import HeroSignalCard from "@/components/dashboard/HeroSignalCard";
import AIChatPanel from "@/components/dashboard/AIChatPanel";
import PortfolioPanel from "@/components/dashboard/PortfolioPanel";
import MarketStatusSign from "@/components/dashboard/MarketStatusSign";
import MarketStatusSign from "@/components/dashboard/MarketStatusSign";
import PerformanceSnapshot from "@/components/dashboard/PerformanceSnapshot";
import { useMarketData, type MarketSignal } from "@/hooks/useMarketData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type SignalOutcomeRow = Tables<"signal_outcomes">;

const getSignalScore = (signal: Pick<MarketSignal, "convictionScore" | "confidence">) =>
  signal.convictionScore ?? Math.round(signal.confidence * 10);

const formatRelativeTimestamp = (isoString: string) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Today";
  const now = Date.now();
  const diffMinutes = Math.floor((now - date.getTime()) / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 12) return `${diffHours}h ago`;
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
};

const recordToDashboardSignal = (record: SignalOutcomeRow): MarketSignal => {
  const confidence = Number(record.confidence) || 0;
  const convictionScore = Math.round(confidence * 10);
  const isBullish = record.signal_type === "bullish";
  const tags = [record.put_call === "call" ? "Call Flow" : "Put Flow"];
  if (convictionScore >= 85) tags.push("🔥 ACT NOW");
  else if (convictionScore >= 70) tags.push("⚡ HIGH CONVICTION");

  return {
    id: record.id,
    ticker: record.ticker,
    type: isBullish ? "bullish" : "bearish",
    confidence,
    convictionScore,
    convictionLabel: convictionScore >= 90 ? "Extreme Conviction"
      : convictionScore >= 75 ? "Very High Conviction"
      : convictionScore >= 60 ? "High Conviction"
      : convictionScore >= 40 ? "Moderate Conviction"
      : "Low Conviction",
    description: record.description || `${record.put_call === "call" ? "Call" : "Put"} flow on ${record.ticker}${record.strike ? ` at ${record.strike}` : ""}.`,
    timestamp: formatRelativeTimestamp(record.created_at),
    tags,
    strike: record.strike ?? undefined,
    expiry: record.expiry ?? undefined,
    premium: record.premium ?? undefined,
    putCall: (record.put_call as "call" | "put" | null) ?? undefined,
    suggestedTrade: `Buy ${record.ticker}${record.strike ? ` ${record.strike}` : ""} ${record.put_call === "put" ? "Puts" : "Calls"}${record.expiry ? ` exp ${record.expiry}` : ""}`,
    targetZone: record.target_zone ?? undefined,
    createdAt: record.created_at,
    source: "live",
  };
};

const Dashboard = () => {
  const { signals, whaleAlerts, loading } = useMarketData();
  const { profile } = useAuth();
  const [persistedSignals, setPersistedSignals] = useState<MarketSignal[]>([]);
  const [persistedLoading, setPersistedLoading] = useState(true);

  useEffect(() => {
    const loadTodaysLiveSignals = async () => {
      setPersistedLoading(true);
      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        todayStart.setHours(todayStart.getHours() - 4);
        const { data, error } = await supabase
          .from("signal_outcomes")
          .select("*")
          .gte("created_at", todayStart.toISOString())
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        setPersistedSignals((data ?? []).map(recordToDashboardSignal));
      } catch (error) {
        console.warn("Failed to load persisted dashboard signals:", error);
        setPersistedSignals([]);
      } finally {
        setPersistedLoading(false);
      }
    };
    loadTodaysLiveSignals();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-signals-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "signal_outcomes" }, (payload) => {
        const row = payload.new as SignalOutcomeRow;
        const mapped = recordToDashboardSignal(row);
        setPersistedSignals((prev) => {
          const key = `${mapped.ticker}|${mapped.strike}|${mapped.expiry}`;
          const exists = prev.some((s) => `${s.ticker}|${s.strike}|${s.expiry}` === key);
          if (exists) return prev;
          return [mapped, ...prev];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const topSignals = useMemo(() => {
    const mergedSignals = new Map<string, MarketSignal>();
    for (const signal of persistedSignals) {
      const key = `${signal.ticker}|${signal.strike}|${signal.expiry}`;
      mergedSignals.set(key, signal);
    }
    for (const signal of signals) {
      if (signal.source !== "live") continue;
      if (getSignalScore(signal) < 90) continue;
      const key = `${signal.ticker}|${signal.strike}|${signal.expiry}`;
      const existing = mergedSignals.get(key);
      mergedSignals.set(key, { ...existing, ...signal, createdAt: existing?.createdAt ?? signal.createdAt });
    }
    return Array.from(mergedSignals.values())
      .filter((signal) => getSignalScore(signal) >= 90)
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : Date.now();
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : Date.now();
        if (timeB !== timeA) return timeB - timeA;
        return getSignalScore(b) - getSignalScore(a);
      })
      .slice(0, 3);
  }, [persistedSignals, signals]);

  const sentiment: "bullish" | "bearish" | "neutral" = useMemo(() => {
    const bullish = topSignals.filter((s) => s.type === "bullish").length;
    const bearish = topSignals.filter((s) => s.type === "bearish").length;
    if (bullish > bearish) return "bullish";
    if (bearish > bullish) return "bearish";
    return "neutral";
  }, [topSignals]);

  const heroSignal = topSignals[0] ?? null;
  const signalFeedLoading = loading || persistedLoading;

  return (
    <DashboardLayout>
      <AmbientBackground sentiment={sentiment} />
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-5 space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <MarketStatusSign />
          <PerformanceSnapshot />
        </div>

        {/* === DEMO: Live state === */}
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 px-1">▸ Live State</p>
          <div className="glass-panel rounded-xl px-4 py-1 border-glow-purple">
            <SessionStatusRow />
          </div>
          <div className="glass-panel rounded-xl px-4 py-1 border-glow-purple">
            <SessionHeatmapStrip />
          </div>
        </div>

        {/* === DEMO: All Dimmed — "Markets Closed" === */}
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 px-1">▸ All Dimmed — Markets Closed</p>
          <div className="glass-panel rounded-xl px-4 py-1 border-glow-purple">
            <SessionStatusRow forceAllClosed />
          </div>
          <div className="glass-panel rounded-xl px-4 py-1 border-glow-purple">
            <SessionHeatmapStrip forceAllClosed />
          </div>
        </div>

        {/* === DEMO: All Dimmed + Countdown === */}
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 px-1">▸ All Dimmed + Countdown to Next Open</p>
          <div className="glass-panel rounded-xl px-4 py-1 border-glow-purple">
            <SessionStatusRow forceAllClosed />
          </div>
          <div className="glass-panel rounded-xl px-4 py-1 border-glow-purple">
            <SessionHeatmapStrip forceAllClosed showCountdown />
          </div>
        </div>

        <HeroSignalCard signal={heroSignal} loading={signalFeedLoading} />

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="h-[500px]">
            <AIChatPanel />
          </div>
          <div className="h-[500px] overflow-y-auto">
            <PortfolioPanel whaleAlerts={whaleAlerts} loading={loading} limit={5} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
