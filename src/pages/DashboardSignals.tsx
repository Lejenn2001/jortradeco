import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useMarketData, type MarketSignal, type SignalTimeframe } from "@/hooks/useMarketData";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, Filter, TrendingUp, TrendingDown, Zap, Clock, Target,
  ShieldX, Crosshair, MapPin, Gauge, Waves, XCircle, Eye, Shield,
  CheckCircle2, Plus, ThumbsUp, ThumbsDown, MessageSquare
} from "lucide-react";
import { Input } from "@/components/ui/input";
import SignalLegend from "@/components/dashboard/SignalLegend";
import ConvictionScoreRing from "@/components/dashboard/ConvictionScoreRing";
import SignalErrorBoundary from "@/components/dashboard/SignalErrorBoundary";
import { dbRecordToSignal, classifyTimeframe, deriveTimeframeLabel } from "@/lib/signalMapper";

type FilterType = "all" | "call" | "put";
type ViewTab = "algorithm" | "whale" | "spread" | "spx";

const MOCK_SIGNALS: MarketSignal[] = [
  {
    id: "mock-algo-1",
    ticker: "QQQ",
    type: "bullish",
    confidence: 8.2,
    convictionScore: 82,
    convictionLabel: "Very High Conviction",
    description: "Options flow. 100% ask aggression. Price @ $485.04.",
    timestamp: "4/3/2026 10:42 AM",
    tags: ["Call Flow", "ATM", "GEX Call Wall", "GEX Wall Target"],
    strike: "$490",
    expiry: "April 4, 2026",
    premium: "$142K",
    putCall: "call",
    suggestedTrade: "Buy QQQ $490 Call",
    entryTrigger: "Near $485.04 (no VWAP data)",
    targetZone: "$490.00 (GEX call wall — likely resistance) – $495.45",
    invalidation: "Below $479.34",
    keyLevel: "$490 psychological level",
    srLevel: "$490 psychological level",
    tradeStatus: "active",
    timeframe: "buy_now",
    category: "algorithm",
    source: "live",
    gammaZone: "positive",
    gammaDescription: "Above gamma flip",
    aiEvaluated: false,
    mfePercent: 72,
    outcome: "pending",
  },
  {
    id: "mock-algo-2",
    ticker: "SPXW",
    type: "bullish",
    confidence: 8.5,
    convictionScore: 85,
    convictionLabel: "Very High Conviction",
    description: "Options flow. 0% ask aggression. Price @ $5582.68.",
    timestamp: "4/2/2026 8:00 PM",
    tags: ["Call Flow", "⚡ HIGH CONVICTION", "SPX Flow", "VWAP Retest"],
    strike: "$5600",
    expiry: "April 6, 2026",
    premium: "$89K",
    putCall: "call",
    suggestedTrade: "Buy SPXW $5600.00 Call (April 6, 2026)",
    entryTrigger: "VWAP retest from above at $5559.4 — bounce is your entry",
    targetZone: "$5594.22 – $5601.91 (previous swing high)",
    invalidation: "Below $5559.4 (VWAP break invalidates bullish thesis)",
    tradeStatus: "watching",
    timeframe: "short_term",
    category: "algorithm",
    source: "live",
    aiEvaluated: true,
    mfePercent: null,
    outcome: "pending",
  },
  {
    id: "mock-algo-3",
    ticker: "NVDA",
    type: "bullish",
    confidence: 9.0,
    convictionScore: 92,
    convictionLabel: "Extreme Conviction",
    description: "8x sweep on NVDA $118 Calls. $320K premium. 95% ask aggression.",
    timestamp: "4/3/2026 11:15 AM",
    tags: ["Call Flow", "🔥 ACT NOW"],
    strike: "$118",
    expiry: "April 7, 2026",
    premium: "$320K",
    putCall: "call",
    suggestedTrade: "Buy NVDA $118 Calls",
    entryTrigger: "Above VWAP at $115.80 — momentum confirmed",
    targetZone: "$118.50 – $120.00 (15m swing high)",
    targetNear: "$119.25",
    invalidation: "Below $114.90",
    keyLevel: "$115 support cluster",
    tradeStatus: "active",
    timeframe: "short_term",
    category: "algorithm",
    source: "live",
    aiEvaluated: true,
    mfePercent: 41,
    outcome: "pending",
  },
  {
    id: "mock-whale-1",
    ticker: "TSLA",
    type: "bearish",
    confidence: 7.8,
    convictionScore: 78,
    convictionLabel: "High Conviction",
    description: "$1.2M block on TSLA $340 Puts. Single print, no sweep. 12x Vol/OI.",
    timestamp: "4/3/2026 9:55 AM",
    tags: ["Put Flow", "Block Trade"],
    strike: "$340",
    expiry: "April 11, 2026",
    premium: "$1.2M",
    putCall: "put",
    suggestedTrade: "Buy TSLA $340 Puts",
    entryTrigger: "Break below $348.50 VWAP",
    targetZone: "$340.00 – $335.00",
    invalidation: "Above $355.00",
    keyLevel: "$350 round number resistance",
    tradeStatus: "watching",
    timeframe: "swing",
    category: "whale",
    source: "live",
    aiEvaluated: false,
    mfePercent: 18,
    outcome: "pending",
  },
  {
    id: "mock-whale-2",
    ticker: "AAPL",
    type: "bullish",
    confidence: 8.8,
    convictionScore: 88,
    convictionLabel: "Very High Conviction",
    description: "$2.4M sweep on AAPL $225 Calls. 12 fills across 4 exchanges. 98% ask aggression.",
    timestamp: "4/3/2026 10:30 AM",
    tags: ["Call Flow", "🔥 ACT NOW", "Sweep"],
    strike: "$225",
    expiry: "April 11, 2026",
    premium: "$2.4M",
    putCall: "call",
    suggestedTrade: "Buy AAPL $225 Calls",
    entryTrigger: "VWAP hold at $222.60 — buy the retest",
    targetZone: "$225.00 – $228.50",
    invalidation: "Below $220.00",
    srLevel: "$220 dark pool cluster",
    tradeStatus: "active",
    timeframe: "swing",
    category: "whale",
    source: "live",
    aiEvaluated: true,
    mfePercent: 52,
    outcome: "pending",
  },
  {
    id: "mock-spread-1",
    ticker: "SPY",
    type: "bullish",
    confidence: 7.5,
    convictionScore: 75,
    convictionLabel: "High Conviction",
    description: "Bull call spread on SPY. Net debit $1.20.",
    timestamp: "4/3/2026 10:05 AM",
    tags: ["Call Flow", "Spread"],
    strike: "$530/$535",
    expiry: "April 7, 2026",
    premium: "$180K",
    putCall: "call",
    suggestedTrade: "Buy SPY $530/$535 Bull Call Spread",
    entryTrigger: "Near $528.50",
    targetZone: "$535.00 (max profit at expiry)",
    invalidation: "Below $525.00",
    tradeStatus: "watching",
    timeframe: "short_term",
    category: "spread",
    source: "live",
    spreadDetails: { type: "Bull Call Spread", legs: "Buy $530C / Sell $535C", max_profit: 380, max_loss: 120, probability: 62 },
    aiEvaluated: false,
    mfePercent: null,
    outcome: "pending",
  },
  {
    id: "mock-spx-1",
    ticker: "SPXW",
    type: "bearish",
    confidence: 8.0,
    convictionScore: 80,
    convictionLabel: "Very High Conviction",
    description: "Options flow. $450K on SPXW Puts. 88% ask aggression. Gamma flip at 5520.",
    timestamp: "4/3/2026 11:00 AM",
    tags: ["Put Flow", "SPX Flow", "⚡ HIGH CONVICTION"],
    strike: "$5500",
    expiry: "April 4, 2026",
    premium: "$450K",
    putCall: "put",
    suggestedTrade: "Buy SPXW $5500 Puts",
    entryTrigger: "Break below $5515 (gamma flip zone)",
    targetZone: "$5500.00 – $5480.00 (put wall support)",
    invalidation: "Above $5535.00",
    keyLevel: "$5520 gamma flip",
    tradeStatus: "active",
    timeframe: "buy_now",
    category: "algorithm",
    source: "live",
    gammaZone: "negative",
    gammaDescription: "Below gamma flip — expect volatility expansion",
    aiEvaluated: true,
    mfePercent: 58,
    outcome: "pending",
  },
];
const ALGO_SECTION_META = {
  buy_now: {
    label: "🔥 ACT NOW",
    iconComponent: Zap,
    iconClass: "h-4 w-4 text-emerald-400",
    description: "Price confirmed — act immediately",
  },
  short_term: {
    label: "⚡ 1–3 DAY TRADE",
    iconComponent: Clock,
    iconClass: "h-4 w-4 text-emerald-400",
    description: "Algorithm-detected setups with short-term expiry",
  },
} as const;

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.4, delay: i * 0.1, ease: "easeOut" as const },
  }),
};

const DashboardSignals = () => {
  const { signals: liveSignals, loading: liveLoading } = useMarketData();
  const [dbSignals, setDbSignals] = useState<MarketSignal[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [viewTab, setViewTab] = useState<ViewTab>("algorithm");
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    const loadSignals = async () => {
      setDbLoading(true);
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
        if (data && data.length > 0) setDbSignals(data.map(dbRecordToSignal));
      } catch (e) {
        console.warn("Failed to load signals from DB:", e);
      } finally {
        setDbLoading(false);
      }
    };
    loadSignals();
  }, []);

  const allSignals = useMemo(() => {
    const dbKeys = new Set(dbSignals.map(s => `${s.ticker}|${s.strike}|${s.putCall}|${s.expiry}`));
    const filteredLive = liveSignals.filter(s => {
      const key = `${s.ticker}|${s.strike}|${s.putCall}|${s.expiry}`;
      return !dbKeys.has(key) && s.source !== "example";
    });
    const all = [...dbSignals, ...filteredLive];
    const seen = new Set<string>();
    const unique: MarketSignal[] = [];
    for (const s of all) {
      if (!seen.has(s.id)) { seen.add(s.id); unique.push(s); }
    }
    return unique;
  }, [liveSignals, dbSignals]);

  const loading = liveLoading && dbLoading;
  // Always include mock signals so the full card format is visible for demo
  const signals = useMemo(() => {
    const mockIds = new Set(MOCK_SIGNALS.map(s => s.id));
    const realWithoutDupes = allSignals.filter(s => !mockIds.has(s.id));
    return [...MOCK_SIGNALS, ...realWithoutDupes];
  }, [allSignals]);

  const filtered = useMemo(() => {
    let list = [...signals];
    if (showResolved) {
      list = list.filter(s => s.outcome && s.outcome !== "pending");
    } else {
      list = list.filter(s => !s.outcome || s.outcome === "pending");
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.ticker.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
    }
    if (filterType !== "all") {
      list = list.filter(s => s.putCall === filterType);
    }
    list.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    return list;
  }, [signals, search, filterType, showResolved]);

  const resolvedCount = useMemo(() => signals.filter(s => s.outcome && s.outcome !== "pending").length, [signals]);

  const algorithmSignals = useMemo(() => {
    const algoOnly = filtered.filter(s => s.category === "algorithm" || (s.category !== "whale" && s.category !== "spread"));
    return {
      buy_now: algoOnly.filter(s => {
        const { timeframe: tf } = deriveTimeframeLabel(s.expiry);
        return tf === "buy_now";
      }),
      short_term: algoOnly.filter(s => {
        const { timeframe: tf } = deriveTimeframeLabel(s.expiry);
        return tf === "short_term" || tf === "swing";
      }),
    };
  }, [filtered]);

  const whaleSignals = useMemo(() => filtered.filter(s => s.category === "whale"), [filtered]);
  const spreadSignals = useMemo(() => filtered.filter(s => s.category === "spread"), [filtered]);
  const spxSignals = useMemo(() => filtered.filter(s => s.ticker === "SPX" || s.ticker === "SPXW"), [filtered]);

  const algoCount = algorithmSignals.buy_now.length + algorithmSignals.short_term.length;
  const whaleCount = whaleSignals.length;
  const spreadCount = spreadSignals.length;
  const spxCount = spxSignals.length;
  const totalCount = signals.length;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-5 space-y-4">
        {/* Decision Engine Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-border/10 bg-card/80">
          <svg className="absolute inset-0 w-full h-full opacity-[0.35]" viewBox="0 0 800 200" preserveAspectRatio="none">
            {[40, 90, 140, 190, 240, 290, 340, 390, 440, 490, 540, 590, 640, 690, 740].map((x, i) => {
              const heights = [60, 45, 80, 35, 70, 90, 50, 65, 40, 85, 55, 75, 30, 60, 45];
              const tops = [70, 85, 50, 95, 60, 30, 80, 65, 90, 45, 75, 55, 100, 70, 85];
              const green = i % 3 !== 0;
              return (
                <g key={i}>
                  <line x1={x} y1={tops[i] - 15} x2={x} y2={tops[i] + heights[i] + 15} stroke={green ? "#34d399" : "#06b6d4"} strokeWidth="1" />
                  <rect x={x - 8} y={tops[i]} width="16" height={heights[i]} fill={green ? "#34d399" : "#06b6d4"} rx="1" />
                </g>
              );
            })}
          </svg>
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/15 via-transparent to-cyan-900/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
          <div className="relative px-6 py-7 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-emerald-400 to-cyan-500" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-[0.15em] uppercase bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
                  DECISION ENGINE
                </h1>
                <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-400/80 font-semibold mt-0.5">
                  Filtered · Scored · Actionable
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setViewTab("algorithm")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              viewTab === "algorithm"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Zap className="h-4 w-4" />
            Algorithm Plays
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${viewTab === "algorithm" ? "bg-emerald-500/30" : "bg-muted/50"}`}>{algoCount}</span>
          </button>
          <button
            onClick={() => setViewTab("whale")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              viewTab === "whale"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Waves className="h-4 w-4" />
            Whale Activity
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${viewTab === "whale" ? "bg-blue-500/30" : "bg-muted/50"}`}>{whaleCount}</span>
          </button>
          <button
            onClick={() => setViewTab("spread")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              viewTab === "spread"
                ? "bg-violet-500/20 text-violet-400 border border-violet-500/40"
                : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Target className="h-4 w-4" />
            Spreads & Butterflies
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${viewTab === "spread" ? "bg-violet-500/30" : "bg-muted/50"}`}>{spreadCount}</span>
          </button>
          <button
            onClick={() => setViewTab("spx")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              viewTab === "spx"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Gauge className="h-4 w-4" />
            SPX / GEX
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${viewTab === "spx" ? "bg-cyan-500/30" : "bg-muted/50"}`}>{spxCount}</span>
          </button>
          <span className="ml-auto text-xs text-muted-foreground font-semibold">
            Total: <span className="text-foreground">{totalCount}</span>
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search ticker (SPY, TSLA, QQQ...)"
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
            className="pl-9 pr-9 h-10 bg-muted/30 border-border/40 text-sm font-semibold tracking-wider placeholder:text-muted-foreground/50 placeholder:font-normal placeholder:tracking-normal focus-visible:ring-emerald-500/40"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="glass-panel rounded-xl p-3 flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            {(["all", "call", "put"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                  filterType === f ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {f === "all" ? "All" : f === "call" ? "Calls" : "Puts"}
              </button>
            ))}
            <span className="w-px h-4 bg-border/40 mx-1" />
            <button
              onClick={() => setShowResolved(!showResolved)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                showResolved ? "bg-muted/50 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {showResolved ? "Hide Resolved" : `Show Resolved (${resolvedCount})`}
            </button>
          </div>
        </div>

        <SignalLegend />

        {loading && signals.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-xl bg-muted/20 animate-pulse h-40" />
            ))}
          </div>
        )}

        {/* Algorithm Plays Tab */}
        {viewTab === "algorithm" && (
          <>
            {algoCount === 0 && !loading && (
              <div className="glass-panel rounded-xl p-8 text-center border border-emerald-500/20">
                <Zap className="h-8 w-8 text-emerald-400/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No algorithm plays detected yet. Signals appear here when price action confirms at key levels during market hours.</p>
              </div>
            )}
            {(["buy_now", "short_term"] as const).map((timeframe) => {
              const meta = ALGO_SECTION_META[timeframe];
              const sectionSignals = algorithmSignals[timeframe];
              if (sectionSignals.length === 0) return null;
              return (
                <div key={timeframe} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <meta.iconComponent className={meta.iconClass} />
                    <span className="font-bold text-xs sm:text-sm text-emerald-400">{meta.label}</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full ml-auto">{sectionSignals.length}</span>
                  </div>
                  <div className="space-y-3">
                    {sectionSignals.map((signal, i) => (
                      <motion.div key={`${signal.id}-${i}`} id={`signal-${signal.id}`} custom={i} initial="hidden" animate="visible" variants={cardVariants}>
                        <SignalErrorBoundary>
                          <SignalCard signal={signal} />
                        </SignalErrorBoundary>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Whale Plays Tab */}
        {viewTab === "whale" && (
          <>
            {whaleCount === 0 && !loading && (
              <div className="glass-panel rounded-xl p-8 text-center border border-blue-500/20">
                <Waves className="h-8 w-8 text-blue-400/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No whale plays detected yet. These appear when large institutional orders ($250K+ premium) are identified as swing setups.</p>
              </div>
            )}
            {whaleSignals.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Waves className="h-4 w-4 text-blue-400" />
                  <span className="font-bold text-xs sm:text-sm text-blue-400">🐋 WHALE PLAYS</span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full ml-auto">{whaleSignals.length}</span>
                </div>
                <div className="space-y-3">
                  {whaleSignals.map((signal, i) => (
                    <motion.div key={`w-${signal.id}-${i}`} id={`signal-${signal.id}`} custom={i} initial="hidden" animate="visible" variants={cardVariants}>
                      <SignalErrorBoundary><SignalCard signal={signal} /></SignalErrorBoundary>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Spreads & Butterflies Tab */}
        {viewTab === "spread" && (
          <>
            {spreadCount === 0 && !loading && (
              <div className="glass-panel rounded-xl p-8 text-center border border-violet-500/20">
                <Target className="h-8 w-8 text-violet-400/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No spread or butterfly plays detected yet. These appear when multi-leg strategies are identified from flow data.</p>
              </div>
            )}
            {spreadSignals.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Target className="h-4 w-4 text-violet-400" />
                  <span className="font-bold text-xs sm:text-sm text-violet-400">SPREADS & BUTTERFLIES</span>
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">— Defined risk multi-leg strategies</span>
                  <span className="text-[10px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full ml-auto">{spreadSignals.length}</span>
                </div>
                <div className="space-y-3">
                  {spreadSignals.map((signal, i) => (
                    <motion.div key={`s-${signal.id}-${i}`} id={`signal-${signal.id}`} custom={i} initial="hidden" animate="visible" variants={cardVariants}>
                      <SignalErrorBoundary><SignalCard signal={signal} /></SignalErrorBoundary>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* SPX / GEX Tab */}
        {viewTab === "spx" && (
          <>
            <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 via-card to-slate-950/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-cyan-400" />
                <span className="font-bold text-sm text-cyan-400 tracking-wide">SPX GAMMA EXPOSURE</span>
              </div>
              <p className="text-xs text-muted-foreground">GEX data updates during market hours. Connect Polygon for live gamma levels.</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Gamma Flip</div>
                  <div className="text-lg font-black text-cyan-400 mt-0.5">—</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">Zero-cross point</div>
                </div>
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Call Wall</div>
                  <div className="text-lg font-black text-emerald-400 mt-0.5">—</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">Resistance</div>
                </div>
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Put Wall</div>
                  <div className="text-lg font-black text-red-400 mt-0.5">—</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">Support</div>
                </div>
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Key Magnet</div>
                  <div className="text-lg font-black text-amber-400 mt-0.5">—</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">Highest GEX</div>
                </div>
              </div>
            </div>

            {spxCount === 0 && !loading && (
              <div className="glass-panel rounded-xl p-8 text-center border border-cyan-500/20">
                <Gauge className="h-8 w-8 text-cyan-400/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No SPX/SPXW signals detected yet. SPX flow signals appear here when institutional activity is detected on the S&P 500 index.</p>
              </div>
            )}

            {spxSignals.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Gauge className="h-4 w-4 text-cyan-400" />
                  <span className="font-bold text-xs sm:text-sm text-cyan-400">SPX INDEX SIGNALS</span>
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">— S&P 500 with gamma context</span>
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full ml-auto">{spxSignals.length}</span>
                </div>
                <div className="space-y-3">
                  {spxSignals.map((signal, i) => (
                    <motion.div key={`spx-${signal.id}-${i}`} id={`signal-${signal.id}`} custom={i} initial="hidden" animate="visible" variants={cardVariants}>
                      <SignalErrorBoundary><SignalCard signal={signal} /></SignalErrorBoundary>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

/* ─── Signal Card ─────────────────────────────────────────── */

function SignalCard({ signal }: { signal: MarketSignal }) {
  const [tookTrade, setTookTrade] = useState(false);
  const isCall = signal.putCall === "call" || signal.type === "bullish";
  const score = signal.convictionScore ?? Math.round(signal.confidence * 10);
  const cat = signal.category || "algorithm";

  const catLabel = cat === "whale" ? "WHALE PLAY" : cat === "spread" ? "SPREAD PLAY" : "ALGORITHM PLAY";
  const catColor = cat === "whale" ? "text-blue-400" : cat === "spread" ? "text-violet-400" : "text-emerald-400";
  const catIcon = cat === "whale" ? <Waves className="h-3 w-3 text-blue-400" /> : cat === "spread" ? <Target className="h-3 w-3 text-violet-400" /> : <Zap className="h-3 w-3 text-emerald-400" />;
  const headerBg = cat === "whale" ? "bg-blue-500/15" : cat === "spread" ? "bg-violet-500/15" : "bg-emerald-500/15";

  // Auto-derive timeframe from expiry
  const { label: tfLabel, timeframe: derivedTf } = deriveTimeframeLabel(signal.expiry);
  const tfColor = derivedTf === "buy_now" ? "bg-yellow-500/90 text-yellow-950" : derivedTf === "short_term" ? "bg-accent/80 text-accent-foreground" : "bg-emerald-500/80 text-emerald-950";

  // Outcome badges — simplified: WIN, PARTIAL WIN, LOSS (near_miss → loss on UI)
  const outcome = signal.outcome;
  const isResolved = outcome && outcome !== "pending";
  const isWin = outcome === "win" || outcome === "hit";
  const isPartialWin = outcome === "partial_win";
  const isLoss = outcome === "loss" || outcome === "missed" || outcome === "near_miss" || outcome === "expired";
  const isPending = !outcome || outcome === "pending";

  // MFE progress for active (unresolved) signals
  const mfeProgress = isPending && signal.mfePercent != null
    ? { percent: signal.mfePercent, color: signal.mfePercent >= 75 ? "text-emerald-400" : signal.mfePercent >= 50 ? "text-primary" : signal.mfePercent >= 30 ? "text-yellow-400" : "text-destructive" }
    : null;

  // MFE tier label for resolved signals
  const mfeInfo = isResolved && signal.mfePercent != null
    ? { text: `MFE ${signal.mfePercent.toFixed(0)}%`, color: signal.mfePercent >= 75 ? "text-emerald-400" : signal.mfePercent >= 50 ? "text-primary" : "text-destructive" }
    : null;

  const glowClass = signal.aiEvaluated
    ? "shadow-[0_0_12px_-3px_rgba(16,185,129,0.35)] border-emerald-400/50"
    : score >= 85
    ? "shadow-[0_0_15px_-3px_hsl(var(--primary)/0.4)] border-primary/40"
    : score >= 70
    ? "shadow-[0_0_10px_-3px_hsl(var(--primary)/0.25)] border-primary/30"
    : isCall
    ? "border-primary/20"
    : "border-destructive/20";

  const bgClass = cat === "whale" ? "bg-blue-500/5" : cat === "spread" ? "bg-violet-500/5" : isCall ? "bg-primary/5" : "bg-destructive/5";

  // Urgency banner
  const urgencyBanner = useMemo(() => {
    if (signal.tradeStatus === "active" || derivedTf === "buy_now") {
      return { label: "🔥 ACT NOW", bg: "bg-gradient-to-r from-yellow-600/90 to-amber-600/90 text-yellow-50" };
    }
    if (signal.tradeStatus === "watching") {
      return { label: "👀 WATCHING", bg: "bg-gradient-to-r from-yellow-700/50 to-amber-700/50 text-yellow-300" };
    }
    return null;
  }, [signal.tradeStatus, derivedTf]);

  // Signal date context
  const signalDateLabel = useMemo(() => {
    const ts = signal.createdAt || signal.timestamp;
    if (!ts) return null;
    const d = new Date(ts);
    if (isNaN(d.getTime())) return null;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const sigStr = d.toISOString().split("T")[0];
    if (sigStr === todayStr) return null; // today, no label needed
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = days[d.getDay()];
    return `SIGNAL FROM ${dayName.toUpperCase()} ${d.getMonth() + 1}/${d.getDate()}`;
  }, [signal.createdAt, signal.timestamp]);

  return (
    <div className={`rounded-xl border overflow-hidden transition-shadow ${glowClass} ${bgClass}`}>
      {/* Urgency banner */}
      {urgencyBanner && (
        <div className={`px-3 py-1.5 text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5 ${urgencyBanner.bg}`}>
          <Zap className="h-3 w-3" />
          {urgencyBanner.label}
        </div>
      )}

      {/* Date context banner */}
      {signalDateLabel && (
        <div className="px-3 py-1 bg-yellow-900/30 border-b border-yellow-500/20 flex items-center gap-1.5">
          <Clock className="h-2.5 w-2.5 text-yellow-400" />
          <span className="text-[9px] font-bold text-yellow-400 tracking-widest uppercase">{signalDateLabel}</span>
        </div>
      )}

      {/* Category header */}
      <div className={`px-3 sm:px-4 py-2 flex items-center justify-between ${headerBg}`}>
        <div className="flex items-center gap-2 flex-wrap">
          {catIcon}
          <span className={`text-[9px] sm:text-[10px] font-bold tracking-widest uppercase ${catColor}`}>{catLabel}</span>
          <span className={`text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded ${tfColor}`}>{tfLabel}</span>
          {signal.id.startsWith("mock-") && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 uppercase tracking-wider">MOCK</span>
          )}
          {signal.aiEvaluated && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase tracking-wider flex items-center gap-0.5">
              <CheckCircle2 className="h-2.5 w-2.5" /> BIDDIE PICK
            </span>
          )}
        </div>
        <span className="text-[9px] sm:text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          {signal.timestamp}
        </span>
      </div>

      <div className="px-3 sm:px-4 py-3 space-y-3">
        {/* Ticker + CALL/PUT + WIN/LOSS + MFE + Conviction */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {isCall ? <TrendingUp className="h-5 w-5 text-primary" /> : <TrendingDown className="h-5 w-5 text-destructive" />}
            <span className="font-bold text-foreground text-lg">{signal.ticker}</span>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${isCall ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`}>
              {signal.putCall === "call" ? "CALL" : "PUT"}
            </span>
            {isWin && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> WIN
              </span>
            )}
            {isPartialWin && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> PARTIAL WIN
              </span>
            )}
            {isLoss && isResolved && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-destructive/20 text-destructive border border-destructive/30 flex items-center gap-1">
                <XCircle className="h-3 w-3" /> LOSS
              </span>
            )}
            {/* MFE badge on resolved signals */}
            {mfeInfo && (
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border bg-muted/20 border-border/30 ${mfeInfo.color}`}>
                {mfeInfo.text}
              </span>
            )}
            {/* MFE progress on active signals */}
            {mfeProgress && (
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border bg-muted/20 border-border/30 ${mfeProgress.color}`}>
                {mfeProgress.percent.toFixed(0)}% to TP
              </span>
            )}
            {signal.premium && <span className="text-[10px] sm:text-xs text-accent font-semibold">{signal.premium}</span>}
          </div>
          <ConvictionScoreRing score={score} label={signal.convictionLabel ?? ""} />
        </div>

        {/* Description */}
        <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">{signal.description}</p>

        {/* Always-visible trade details */}
        <div className="grid grid-cols-1 gap-1.5 text-[11px] sm:text-xs">
          {signal.suggestedTrade && (
            <div className="flex items-start gap-2 bg-muted/30 rounded-lg px-2.5 py-2">
              <Target className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-muted-foreground">Trade: </span>
                <span className="text-foreground font-semibold">{signal.suggestedTrade}</span>
              </div>
            </div>
          )}
          {signal.entryTrigger && (
            <div className="flex items-start gap-2 bg-muted/30 rounded-lg px-2.5 py-2">
              <TrendingUp className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-muted-foreground">Entry: </span>
                <span className="text-foreground font-semibold">{signal.entryTrigger}</span>
              </div>
            </div>
          )}
          {signal.targetZone && (
            <div className="flex items-start gap-2 bg-primary/10 rounded-lg px-2.5 py-2">
              <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-muted-foreground">Target: </span>
                <span className="text-primary font-semibold">{signal.targetZone}</span>
                {signal.targetNear && <span className="text-primary/70 ml-1">– {signal.targetNear}</span>}
              </div>
            </div>
          )}
          {signal.invalidation && (
            <div className="flex items-start gap-2 bg-destructive/10 rounded-lg px-2.5 py-2">
              <ShieldX className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-muted-foreground">Invalidation: </span>
                <span className="text-destructive font-semibold">{signal.invalidation}</span>
              </div>
            </div>
          )}
          {signal.keyLevel && (
            <div className="flex items-start gap-2 bg-blue-500/10 rounded-lg px-2.5 py-2">
              <Crosshair className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-muted-foreground">Key Level: </span>
                <span className="text-blue-400 font-semibold">{signal.keyLevel}</span>
              </div>
            </div>
          )}
          {signal.srLevel && (
            <div className="flex items-start gap-2 bg-violet-500/10 rounded-lg px-2.5 py-2">
              <Shield className="h-3.5 w-3.5 text-violet-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-muted-foreground">S/R: </span>
                <span className="text-violet-400 font-semibold">{signal.srLevel}</span>
              </div>
            </div>
          )}
          {signal.gammaZone && (
            <div className="flex items-start gap-2 bg-accent/10 rounded-lg px-2.5 py-2">
              <Gauge className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-muted-foreground">Gamma: </span>
                <span className="text-accent font-semibold uppercase">
                  {signal.gammaZone === "positive" ? "POS GAMMA" : signal.gammaZone === "negative" ? "NEG GAMMA" : "NEUTRAL"}
                </span>
                {signal.gammaDescription && <span className="text-muted-foreground ml-1 text-[10px]">({signal.gammaDescription})</span>}
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {signal.tags.map((tag) => {
            const isUrgent = tag.includes("ACT NOW") || tag.includes("HIGH CONVICTION");
            return (
              <span key={tag} className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-medium ${isUrgent ? "bg-destructive/20 text-destructive animate-pulse" : "bg-muted/50 text-muted-foreground"}`}>
                {tag}
              </span>
            );
          })}
          {signal.gammaZone && (
            <span className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5 ${
              signal.gammaZone === "positive" ? "bg-emerald-500/20 text-emerald-400" : signal.gammaZone === "negative" ? "bg-red-500/20 text-red-400" : "bg-muted/50 text-muted-foreground"
            }`}>
              <Shield className="h-2.5 w-2.5" />
              {signal.gammaZone === "positive" ? "POS GAMMA" : signal.gammaZone === "negative" ? "NEG GAMMA" : "NEUTRAL"}
            </span>
          )}
          {signal.expiry && (
            <span className="text-[9px] sm:text-[10px] bg-muted/40 text-muted-foreground px-2 py-0.5 rounded-full font-medium">
              Exp: {signal.expiry}
            </span>
          )}
        </div>


        {/* I Took This Trade */}
        <button
          onClick={() => setTookTrade(true)}
          disabled={tookTrade}
          className={`w-full rounded-lg border py-2 text-xs font-medium transition-all ${
            tookTrade
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 cursor-default"
              : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          }`}
        >
          {tookTrade ? (
            <span className="flex items-center justify-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Trade Logged</span>
          ) : (
            <span className="flex items-center justify-center gap-1.5"><Plus className="h-3.5 w-3.5" /> I Took This Trade</span>
          )}
        </button>

        {/* Review */}
        <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
          <span className="text-[10px]">Review:</span>
          <button className="hover:text-emerald-400 transition-colors p-1 rounded hover:bg-emerald-500/10"><ThumbsUp className="h-3.5 w-3.5" /></button>
          <button className="hover:text-destructive transition-colors p-1 rounded hover:bg-destructive/10"><ThumbsDown className="h-3.5 w-3.5" /></button>
          <button className="hover:text-foreground transition-colors p-1 rounded hover:bg-muted/30"><MessageSquare className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

export default DashboardSignals;
