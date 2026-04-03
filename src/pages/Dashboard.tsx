import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AmbientBackground from "@/components/dashboard/AmbientBackground";
import HeroSignalCard from "@/components/dashboard/HeroSignalCard";
import AIChatPanel from "@/components/dashboard/AIChatPanel";
import PortfolioPanel from "@/components/dashboard/PortfolioPanel";
import MarketStatusSign from "@/components/dashboard/MarketStatusSign";
import MarketPulse from "@/components/dashboard/MarketPulse";
import PerformanceSnapshot from "@/components/dashboard/PerformanceSnapshot";
import SignalFeedPanel from "@/components/dashboard/SignalFeedPanel";
import { useMarketData, type MarketSignal } from "@/hooks/useMarketData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { HelpCircle, X, Sparkles, Zap } from "lucide-react";
import { dbRecordToSignal } from "@/lib/signalMapper";

const getSignalScore = (signal: Pick<MarketSignal, "convictionScore" | "confidence">) =>
  signal.convictionScore ?? Math.round(signal.confidence * 10);

const Dashboard = () => {
  const { signals, whaleAlerts, loading } = useMarketData();
  const { user, profile } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "Trader";
  const [persistedSignals, setPersistedSignals] = useState<MarketSignal[]>([]);
  const [persistedLoading, setPersistedLoading] = useState(true);

  // Welcome banner state
  const welcomeKey = user?.id ? `biddie_welcomed_${user.id}` : null;
  const isFirstTime = welcomeKey ? !localStorage.getItem(welcomeKey) : false;
  const sessionDismissKey = user?.id ? `biddie_session_${user.id}` : null;
  const [showWelcome, setShowWelcome] = useState(() => {
    if (!welcomeKey) return false;
    if (isFirstTime) return true;
    if (sessionDismissKey && sessionStorage.getItem(sessionDismissKey)) return false;
    return true;
  });

  const dismissWelcome = () => {
    setShowWelcome(false);
    if (isFirstTime && welcomeKey) localStorage.setItem(welcomeKey, "true");
    if (sessionDismissKey) sessionStorage.setItem(sessionDismissKey, "true");
  };

  useEffect(() => {
    if (showWelcome && !isFirstTime) {
      const timer = setTimeout(dismissWelcome, 4000);
      return () => clearTimeout(timer);
    }
  }, [showWelcome, isFirstTime]);

  // Load signals from DB
  useEffect(() => {
    const loadSignals = async () => {
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
          .limit(300);
        if (error) throw error;
        setPersistedSignals((data ?? []).filter((s: any) => s.review_status !== 'wrong').map(dbRecordToSignal));
      } catch (error) {
        console.warn("Failed to load persisted signals:", error);
        setPersistedSignals([]);
      } finally {
        setPersistedLoading(false);
      }
    };
    loadSignals();
  }, []);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-signals-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "signal_outcomes" }, (payload) => {
        const row = payload.new as any;
        const mapped = dbRecordToSignal(row);
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

  // Merge and categorize signals
  const allMergedSignals = useMemo(() => {
    const mergedSignals = new Map<string, MarketSignal>();
    for (const signal of persistedSignals) {
      const key = `${signal.ticker}|${signal.strike}|${signal.expiry}`;
      mergedSignals.set(key, signal);
    }
    for (const signal of signals) {
      if (signal.source === "example") continue;
      const key = `${signal.ticker}|${signal.strike}|${signal.expiry}`;
      const existing = mergedSignals.get(key);
      mergedSignals.set(key, { ...existing, ...signal, createdAt: existing?.createdAt ?? signal.createdAt });
    }
    return Array.from(mergedSignals.values())
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return getSignalScore(b) - getSignalScore(a);
      });
  }, [persistedSignals, signals]);

  const sortSignals = (list: MarketSignal[]) =>
    [...list].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

  const algorithmPlays = useMemo(() =>
    sortSignals(allMergedSignals.filter(s =>
      (s.category === 'algorithm' || (s.category !== 'whale' && s.category !== 'spread')) && getSignalScore(s) >= 60
    )).slice(0, 10),
    [allMergedSignals]
  );

  const whalePlays = useMemo(() =>
    sortSignals(allMergedSignals.filter(s => s.category === 'whale' && getSignalScore(s) >= 60)).slice(0, 10),
    [allMergedSignals]
  );

  const spreadPlays = useMemo(() =>
    sortSignals(allMergedSignals.filter(s => s.category === 'spread' && getSignalScore(s) >= 60)).slice(0, 10),
    [allMergedSignals]
  );

  const sentiment: "bullish" | "bearish" | "neutral" = useMemo(() => {
    const top = allMergedSignals.slice(0, 10);
    const bullish = top.filter((s) => s.type === "bullish").length;
    const bearish = top.filter((s) => s.type === "bearish").length;
    if (bullish > bearish) return "bullish";
    if (bearish > bullish) return "bearish";
    return "neutral";
  }, [allMergedSignals]);

  const heroSignal = allMergedSignals.find(s => getSignalScore(s) >= 90) ?? null;
  const signalFeedLoading = loading || persistedLoading;

  return (
    <DashboardLayout>
      <AmbientBackground sentiment={sentiment} />
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-5 space-y-5">
        {/* Decision Engine Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-border/10 bg-card/80">
          <svg className="absolute inset-0 w-full h-full opacity-[0.35]" viewBox="0 0 1000 200" preserveAspectRatio="none">
            {[40, 95, 150, 205, 260, 315, 370, 425, 480, 535, 590, 645, 700, 755, 810, 865, 920].map((x, i) => {
              const heights = [60, 45, 80, 35, 70, 90, 50, 65, 40, 85, 55, 75, 30, 60, 45, 70, 55];
              const tops = [70, 85, 50, 95, 60, 30, 80, 65, 90, 45, 75, 55, 100, 70, 85, 50, 75];
              const green = i % 3 !== 0;
              return (
                <g key={i}>
                  <line x1={x} y1={tops[i] - 15} x2={x} y2={tops[i] + heights[i] + 15} stroke={green ? "hsl(var(--primary))" : "hsl(var(--accent))"} strokeWidth="1" opacity="0.3" />
                  <rect x={x - 8} y={tops[i]} width="16" height={heights[i]} fill={green ? "hsl(var(--primary))" : "hsl(var(--accent))"} rx="1" opacity="0.2" />
                </g>
              );
            })}
          </svg>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/3 to-primary/5" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />

          <div className="relative px-6 py-7 lg:py-8">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-10 rounded-full bg-gradient-to-b from-primary via-accent to-primary/50" />
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-[0.15em] uppercase bg-gradient-to-r from-foreground via-foreground to-foreground/50 bg-clip-text text-transparent">
                  DECISION ENGINE
                </h1>
                <p className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-semibold mt-0.5">
                  Flow · Insight · Execution
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Welcome Banner */}
        <AnimatePresence>
          {showWelcome && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-accent/10"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
              <button
                onClick={dismissWelcome}
                className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted/50 transition-colors z-10"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
              {isFirstTime ? (
                <div className="relative flex flex-col items-center text-center px-5 py-5 gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold text-foreground">Welcome to JORTRADE, {firstName}!</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                    This dashboard is filled with goodies. Real-time whale flow, AI signals, alerts, and so much more.
                    Take your time and look around!
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                    Beginners, hover over the{" "}
                    <span className="inline-flex items-center gap-0.5 align-middle">
                      <HelpCircle className="h-3.5 w-3.5 text-primary" />
                    </span>
                    {" "}icons for quick tips that explain everything in plain English.
                  </p>
                  <button
                    onClick={dismissWelcome}
                    className="mt-1 px-5 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/30 text-sm font-bold text-primary hover:text-primary/80 transition-all uppercase tracking-wider"
                  >
                    Got it, let's trade!
                  </button>
                </div>
              ) : (
                <div className="relative flex items-center px-5 py-4 gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-bold text-foreground">Welcome back, {firstName}!</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Let's get it today. Your signals and plays are ready.</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Market Pulse */}
        <MarketPulse />

        {/* Live State */}
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 px-1">▸ Live State</p>
          <div className="grid md:grid-cols-2 gap-4">
            <MarketStatusSign />
            <PerformanceSnapshot />
          </div>
        </div>

        <HeroSignalCard signal={heroSignal} loading={signalFeedLoading} />

        {/* AI Chat */}
        <div className="max-h-[600px]">
          <AIChatPanel />
        </div>

        {/* Categorized Signal Feeds */}
        <div className="grid grid-cols-1 gap-4 lg:gap-6">
          <SignalFeedPanel
            signals={algorithmPlays}
            loading={signalFeedLoading}
            title="Algorithm Plays"
            subtitle="AI detected setups using price action and options flow analysis"
            icon="algorithm"
            limit={5}
          />
          <SignalFeedPanel
            signals={whalePlays}
            loading={signalFeedLoading}
            title="Whale Plays"
            subtitle="Institutional money flow — high-conviction sweeps ($1M+)"
            icon="whale"
            limit={5}
          />
          <SignalFeedPanel
            signals={spreadPlays}
            loading={signalFeedLoading}
            title="Spread Plays"
            subtitle="Multi-leg strategies with defined risk/reward profiles"
            icon="spread"
            limit={5}
          />
        </div>

        {/* Portfolio */}
        <div className="overflow-y-auto">
          <PortfolioPanel whaleAlerts={whaleAlerts} loading={loading} limit={5} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
