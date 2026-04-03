import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AmbientBackground from "@/components/dashboard/AmbientBackground";
import HeroSignalCard from "@/components/dashboard/HeroSignalCard";
import AIChatPanel from "@/components/dashboard/AIChatPanel";
import MarketStatusSign from "@/components/dashboard/MarketStatusSign";
import MarketPulse from "@/components/dashboard/MarketPulse";
import TopPlayCard from "@/components/dashboard/TopPlayCard";
import { useMarketData, type MarketSignal } from "@/hooks/useMarketData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { HelpCircle, X, Sparkles, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { dbRecordToSignal } from "@/lib/signalMapper";

const getSignalScore = (signal: Pick<MarketSignal, "convictionScore" | "confidence">) =>
  signal.convictionScore ?? Math.round(signal.confidence * 10);

const Dashboard = () => {
  const { signals, loading } = useMarketData();
  const { user, profile } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "Trader";
  const [persistedSignals, setPersistedSignals] = useState<MarketSignal[]>([]);
  const [persistedLoading, setPersistedLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

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

  // Merge signals
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

  // Pick top signal per category (highest score)
  const topAlgo = useMemo(() => {
    const candidates = allMergedSignals.filter(s =>
      (s.category === 'algorithm' || (s.category !== 'whale' && s.category !== 'spread')) && getSignalScore(s) >= 60
    );
    return candidates.sort((a, b) => getSignalScore(b) - getSignalScore(a))[0] ?? null;
  }, [allMergedSignals]);

  const topWhale = useMemo(() => {
    const candidates = allMergedSignals.filter(s => s.category === 'whale' && getSignalScore(s) >= 60);
    return candidates.sort((a, b) => getSignalScore(b) - getSignalScore(a))[0] ?? null;
  }, [allMergedSignals]);

  const topSpread = useMemo(() => {
    const candidates = allMergedSignals.filter(s => s.category === 'spread' && getSignalScore(s) >= 60);
    return candidates.sort((a, b) => getSignalScore(b) - getSignalScore(a))[0] ?? null;
  }, [allMergedSignals]);

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
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 space-y-4">
        {/* Compact Decision Engine Banner */}
        <div className="relative overflow-hidden rounded-xl border border-border/10 bg-card/80">
          <svg className="absolute inset-0 w-full h-full opacity-[0.25]" viewBox="0 0 1000 100" preserveAspectRatio="none">
            {[40, 95, 150, 205, 260, 315, 370, 425, 480, 535, 590, 645, 700, 755, 810, 865, 920].map((x, i) => {
              const heights = [30, 22, 40, 18, 35, 45, 25, 32, 20, 42, 28, 38, 15, 30, 22, 35, 28];
              const tops = [35, 42, 25, 48, 30, 15, 40, 32, 45, 22, 38, 28, 50, 35, 42, 25, 38];
              const green = i % 3 !== 0;
              return (
                <g key={i}>
                  <line x1={x} y1={tops[i] - 8} x2={x} y2={tops[i] + heights[i] + 8} stroke={green ? "hsl(var(--primary))" : "hsl(var(--accent))"} strokeWidth="1" opacity="0.3" />
                  <rect x={x - 6} y={tops[i]} width="12" height={heights[i]} fill={green ? "hsl(var(--primary))" : "hsl(var(--accent))"} rx="1" opacity="0.2" />
                </g>
              );
            })}
          </svg>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/3 to-primary/5" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
          <div className="relative px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-primary via-accent to-primary/50" />
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-[0.15em] uppercase bg-gradient-to-r from-foreground via-foreground to-foreground/50 bg-clip-text text-transparent">
                  DECISION ENGINE
                </h1>
                <p className="text-[9px] uppercase tracking-[0.3em] text-primary/80 font-semibold">
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
              <button onClick={dismissWelcome} className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted/50 transition-colors z-10">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
              {isFirstTime ? (
                <div className="relative flex flex-col items-center text-center px-5 py-5 gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold text-foreground">Welcome to JORTRADE, {firstName}!</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                    This dashboard shows your top plays across all categories. Dive deeper into all signals on the Decision Engine page.
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                    Beginners, hover over the{" "}
                    <span className="inline-flex items-center gap-0.5 align-middle">
                      <HelpCircle className="h-3.5 w-3.5 text-primary" />
                    </span>
                    {" "}icons for quick tips.
                  </p>
                  <button onClick={dismissWelcome} className="mt-1 px-5 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/30 text-sm font-bold text-primary hover:text-primary/80 transition-all uppercase tracking-wider">
                    Got it, let's trade!
                  </button>
                </div>
              ) : (
                <div className="relative flex items-center px-5 py-3 gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-bold text-foreground">Welcome back, {firstName}!</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Let's get it today. Your top plays are ready.</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Market Pulse + Market Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <MarketPulse />
          </div>
          <div className="lg:col-span-1">
            <MarketStatusSign />
          </div>
        </div>

        {/* Section Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

        {/* Hero Signal */}
        <HeroSignalCard signal={heroSignal} loading={signalFeedLoading} />

        {/* Top 3 Plays */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 px-1 mb-3">▸ Today's Top Plays</p>
          <div className="space-y-4">
            <TopPlayCard signal={topAlgo} loading={signalFeedLoading} category="algorithm" />
            <TopPlayCard signal={topWhale} loading={signalFeedLoading} category="whale" />
            <TopPlayCard signal={topSpread} loading={signalFeedLoading} category="spread" />
          </div>
        </div>

        {/* Section Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

        {/* Collapsible AI Chat */}
        <div className="rounded-xl border border-border/20 bg-card/60 overflow-hidden">
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">AI Chat Assistant</span>
              <span className="text-[10px] text-muted-foreground">Ask Biddie anything</span>
            </div>
            {chatOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <AnimatePresence>
            {chatOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="max-h-[500px] border-t border-border/10">
                  <AIChatPanel />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
