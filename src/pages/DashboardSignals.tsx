import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { useMarketData, type MarketSignal, type SignalTimeframe } from "@/hooks/useMarketData";
import { Search, Filter, TrendingUp, TrendingDown, Zap, Clock, CalendarDays, Target, ShieldX, Crosshair, MapPin, Gauge } from "lucide-react";
import { Input } from "@/components/ui/input";
import SignalLegend from "@/components/dashboard/SignalLegend";
import ConvictionScoreRing from "@/components/dashboard/ConvictionScoreRing";

type FilterType = "all" | "call" | "put";

const SECTION_META: Record<SignalTimeframe, { label: string; icon: React.ReactNode; description: string }> = {
  buy_now: {
    label: "🔥 BUY NOW",
    icon: <Zap className="h-4 w-4" />,
    description: "Highest conviction — act immediately",
  },
  short_term: {
    label: "⚡ 1–3 DAY TRADE",
    icon: <Clock className="h-4 w-4" />,
    description: "Strong setups with short-term expiry",
  },
  swing: {
    label: "📈 SWING",
    icon: <CalendarDays className="h-4 w-4" />,
    description: "Longer-dated positioning plays",
  },
};

const SECTION_ORDER: SignalTimeframe[] = ["buy_now", "short_term", "swing"];

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.4, delay: i * 0.1, ease: "easeOut" as const },
  }),
};

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

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-4">
          {/* Header */}
          <div className="flex flex-col gap-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground">Live Signals</h1>
            <p className="text-xs text-muted-foreground">Full signal details — organized by timeframe</p>
          </div>

          {/* Filters */}
          <div className="glass-panel rounded-xl p-3 flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="Search ticker..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none shadow-none focus-visible:ring-0 text-sm h-8"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              {(["all", "call", "put"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
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
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-xl bg-muted/20 animate-pulse h-40" />
              ))}
            </div>
          )}

          {/* Sections */}
          {SECTION_ORDER.map((timeframe) => {
            const meta = SECTION_META[timeframe];
            const sectionSignals = grouped[timeframe];
            if (sectionSignals.length === 0) return null;

            return (
              <div key={timeframe} className="space-y-3">
                {/* Section label */}
                <div className="flex items-center gap-2 px-1">
                  {meta.icon}
                  <span className="font-bold text-xs sm:text-sm text-foreground">{meta.label}</span>
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">— {meta.description}</span>
                </div>

                {/* Signal cards — same style as dashboard */}
                <div className="space-y-3">
                  {sectionSignals.map((signal, i) => (
                    <motion.div
                      key={signal.id}
                      custom={i}
                      initial="hidden"
                      animate="visible"
                      variants={cardVariants}
                    >
                      <SignalCard signal={signal} />
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </main>
      </div>
    </div>
  );
};

function SignalCard({ signal }: { signal: MarketSignal }) {
  const isCall = signal.putCall === "call" || signal.type === "bullish";
  const score = signal.convictionScore ?? Math.round(signal.confidence * 10);

  // Glow class based on conviction
  const glowClass = score >= 85
    ? "shadow-[0_0_15px_-3px_hsl(var(--primary)/0.4)] border-primary/40"
    : score >= 70
    ? "shadow-[0_0_10px_-3px_hsl(var(--primary)/0.25)] border-primary/30"
    : isCall
    ? "border-primary/20"
    : "border-destructive/20";

  return (
    <div className={`rounded-xl border overflow-hidden transition-shadow ${glowClass} ${
      isCall ? "bg-primary/5" : "bg-destructive/5"
    }`}>
      {/* Alert Header Bar */}
      <div className={`px-3 sm:px-4 py-2 flex items-center justify-between ${
        isCall ? "bg-primary/15" : "bg-destructive/15"
      }`}>
        <div className="flex items-center gap-2">
          <Zap className="h-3 w-3 text-accent" />
          <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-accent uppercase">
            JORTRADE Alert
          </span>
          {signal.source === "live" ? (
            <span className="text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase tracking-wider">Live</span>
          ) : signal.source === "example" ? (
            <span className="text-[8px] sm:text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground uppercase tracking-wider">Example</span>
          ) : null}
        </div>
        <span className="text-[9px] sm:text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          {signal.timestamp}
        </span>
      </div>

      <div className="px-3 sm:px-4 py-3 space-y-2.5">
        {/* Ticker + Direction + Score Ring */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isCall ? (
              <TrendingUp className="h-4 w-4 text-primary" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            <span className="font-bold text-sm sm:text-base text-foreground">{signal.ticker}</span>
            <span className={`text-[9px] sm:text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
              isCall ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
            }`}>
              {signal.putCall === "call" ? "CALL" : "PUT"}
            </span>
            {signal.premium && (
              <span className="text-[10px] sm:text-xs text-accent font-semibold">{signal.premium}</span>
            )}
          </div>
          <ConvictionScoreRing score={score} label={signal.convictionLabel ?? ""} />
        </div>

        {/* Description */}
        <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
          {signal.description}
        </p>

        {/* Trade Details */}
        <div className="grid grid-cols-1 gap-1.5 text-[11px] sm:text-xs">
          {signal.suggestedTrade && (
            <div className="flex items-start gap-2 bg-muted/30 rounded-lg px-2.5 py-1.5">
              <Target className="h-3 w-3 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-muted-foreground">Trade: </span>
                <span className="text-foreground font-semibold">{signal.suggestedTrade}</span>
              </div>
            </div>
          )}
          {signal.entryTrigger && (
            <div className="flex items-start gap-2 bg-muted/30 rounded-lg px-2.5 py-1.5">
              <TrendingUp className="h-3 w-3 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-muted-foreground">Entry: </span>
                <span className="text-foreground font-semibold">{signal.entryTrigger}</span>
              </div>
            </div>
          )}
          {signal.targetZone && (
            <div className="flex items-start gap-2 bg-primary/10 rounded-lg px-2.5 py-1.5">
              <MapPin className="h-3 w-3 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-muted-foreground">Target: </span>
                <span className="text-primary font-semibold">{signal.targetZone}</span>
              </div>
            </div>
          )}
          {signal.invalidation && (
            <div className="flex items-start gap-2 bg-destructive/10 rounded-lg px-2.5 py-1.5">
              <ShieldX className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-muted-foreground">Invalidation: </span>
                <span className="text-destructive font-semibold">{signal.invalidation}</span>
              </div>
            </div>
          )}
          {signal.keyLevel && (
            <div className="flex items-start gap-2 bg-primary/10 rounded-lg px-2.5 py-1.5">
              <Crosshair className="h-3 w-3 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-muted-foreground">Key level: </span>
                <span className="text-primary font-semibold">{signal.keyLevel}</span>
              </div>
            </div>
          )}
          {signal.gammaLevelLabel && (
            <div className="flex items-start gap-2 bg-accent/10 rounded-lg px-2.5 py-1.5">
              <Gauge className="h-3 w-3 text-accent mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-muted-foreground">S/R: </span>
                <span className="text-accent font-semibold">{signal.gammaLevelLabel}</span>
              </div>
            </div>
          )}
        </div>

        {/* Tags + Expiry */}
        <div className="flex flex-wrap gap-1.5">
          {signal.tags.map((tag) => {
            const isUrgent = tag.includes('ACT NOW') || tag.includes('HIGH CONVICTION');
            return (
              <span
                key={tag}
                className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  isUrgent
                    ? "bg-destructive/20 text-destructive animate-pulse"
                    : "bg-muted/50 text-muted-foreground"
                }`}
              >
                {tag}
              </span>
            );
          })}
          {signal.expiry && (
            <span className="text-[9px] sm:text-[10px] bg-muted/40 text-muted-foreground px-2 py-0.5 rounded-full font-medium">
              Exp: {signal.expiry}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardSignals;
