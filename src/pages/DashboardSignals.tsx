import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { useMarketData, type MarketSignal, type SignalTimeframe } from "@/hooks/useMarketData";
import { Search, Filter, TrendingUp, TrendingDown, Zap, Clock, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import SignalLegend from "@/components/dashboard/SignalLegend";
import ConvictionScoreRing from "@/components/dashboard/ConvictionScoreRing";

type FilterType = "all" | "call" | "put";

const SECTION_META: Record<SignalTimeframe, { label: string; icon: React.ReactNode; description: string; accent: string }> = {
  buy_now: {
    label: "🔥 BUY NOW",
    icon: <Zap className="h-4 w-4" />,
    description: "Highest conviction — act immediately",
    accent: "border-destructive/40 bg-destructive/5",
  },
  short_term: {
    label: "⚡ 1–3 DAY TRADE",
    icon: <Clock className="h-4 w-4" />,
    description: "Strong setups with short-term expiry",
    accent: "border-accent/40 bg-accent/5",
  },
  swing: {
    label: "📈 SWING",
    icon: <CalendarDays className="h-4 w-4" />,
    description: "Longer-dated positioning plays",
    accent: "border-primary/40 bg-primary/5",
  },
};

const SECTION_ORDER: SignalTimeframe[] = ["buy_now", "short_term", "swing"];

const DashboardSignals = () => {
  const { signals, loading } = useMarketData();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");

  const grouped = useMemo(() => {
    let list = [...signals];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.ticker.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
    }
    if (filterType !== "all") {
      list = list.filter((s) => s.putCall === filterType);
    }

    // Sort newest first within each group
    list.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    const groups: Record<SignalTimeframe, MarketSignal[]> = {
      buy_now: [],
      short_term: [],
      swing: [],
    };

    for (const s of list) {
      const tf = s.timeframe || "swing";
      groups[tf].push(s);
    }

    return groups;
  }, [signals, search, filterType]);

  const totalCount = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-4">
          {/* Header */}
          <div className="flex flex-col gap-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground">Live Signals</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Organized by trade timeframe — newest first</p>
          </div>

          {/* Filters */}
          <div className="glass-panel rounded-xl p-4 flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ticker or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none shadow-none focus-visible:ring-0 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {(["all", "call", "put"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    filterType === f
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {f === "all" ? "All" : f === "call" ? "Calls" : "Puts"}
                </button>
              ))}
            </div>
          </div>

          <SignalLegend />

          {loading && signals.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading signals...</div>
          )}

          {/* 3 Sections — vertical stack */}
          {SECTION_ORDER.map((timeframe) => {
            const meta = SECTION_META[timeframe];
            const sectionSignals = grouped[timeframe];

            return (
              <div key={timeframe} className={`glass-panel rounded-xl border ${meta.accent} overflow-hidden`}>
                {/* Section Header */}
                <div className="px-3 sm:px-5 py-2.5 border-b border-border/30 flex items-center gap-2 flex-wrap">
                  {meta.icon}
                  <span className="font-bold text-xs sm:text-sm text-foreground">{meta.label}</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">— {meta.description}</span>
                </div>

                {/* Signal cards */}
                {sectionSignals.length === 0 ? (
                  <div className="px-5 py-6 text-center text-muted-foreground text-sm">
                    No {meta.label.replace(/[🔥⚡📈]\s?/, "")} signals right now
                  </div>
                ) : (
                  <div className="divide-y divide-border/20">
                    {sectionSignals.map((signal, i) => (
                      <motion.div
                        key={`${signal.ticker}-${signal.id}-${i}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: i * 0.08, ease: "easeOut" as const }}
                      >
                        <SignalRow signal={signal} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </main>
      </div>
    </div>
  );
};

function SignalRow({ signal }: { signal: MarketSignal }) {
  const isCall = signal.putCall === "call" || signal.type === "bullish";
  const score = signal.convictionScore ?? Math.round(signal.confidence * 10);

  return (
    <div className="px-5 py-4 hover:bg-muted/20 transition-colors">
      {/* Top row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          {isCall ? (
            <TrendingUp className="h-4 w-4 text-primary" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
          <span className="font-bold text-base text-foreground">{signal.ticker}</span>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
            isCall ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
          }`}>
            {signal.putCall === "call" ? "CALL" : "PUT"}
          </span>
          {signal.source === "live" ? (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase tracking-wider">Live</span>
          ) : signal.source === "example" ? (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground uppercase tracking-wider">Example</span>
          ) : null}
          {signal.premium && (
            <span className="text-xs text-accent font-semibold">{signal.premium}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">{signal.timestamp}</span>
          <ConvictionScoreRing
            score={score}
            label={signal.convictionLabel ?? ""}
          />
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed mb-2">
        {signal.suggestedTrade || signal.description}
      </p>

      {/* Detail chips */}
      <div className="flex flex-wrap gap-2 text-xs">
        {signal.strike && (
          <span className="bg-muted/30 rounded-lg px-2.5 py-1">
            Strike: <span className="font-semibold text-foreground">{signal.strike}</span>
          </span>
        )}
        {signal.gammaLevelLabel && (
          <span className="bg-accent/10 rounded-lg px-2.5 py-1">
            📍 <span className="font-semibold text-accent">{signal.gammaLevelLabel}</span>
          </span>
        )}
        {signal.keyLevel && (
          <span className="bg-primary/10 rounded-lg px-2.5 py-1">
            Key: <span className="font-semibold text-primary">{signal.keyLevel}</span>
          </span>
        )}
        {signal.targetZone && (
          <span className="bg-primary/10 rounded-lg px-2.5 py-1">
            Target: <span className="font-semibold text-primary">{signal.targetZone}</span>
          </span>
        )}
        {signal.invalidation && (
          <span className="bg-destructive/10 rounded-lg px-2.5 py-1">
            Stop: <span className="font-semibold text-destructive">{signal.invalidation}</span>
          </span>
        )}
        {signal.expiry && (
          <span className="bg-muted/30 rounded-lg px-2.5 py-1">
            Exp: <span className="font-semibold text-foreground">{signal.expiry}</span>
          </span>
        )}
      </div>
    </div>
  );
}

export default DashboardSignals;
