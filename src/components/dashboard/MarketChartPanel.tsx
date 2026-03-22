import { useState, useCallback, useMemo } from "react";
import { TrendingUp, Search, Info, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const quickTickers = ["NQ", "SPX", "PLTR", "TSLA", "NVDA", "AAPL"];

interface TickerInsight {
  bias: string;
  callZone: string;
  invalidation: string;
  strategy: string;
  contract?: string;
  expiration: string;
  score: string;
  description: string;
  strategyExplanation: string;
}

const defaultInsight: TickerInsight = {
  bias: "Select a ticker ↗",
  callZone: "—",
  invalidation: "—",
  strategy: "—",
  expiration: "—",
  score: "— / 10",
  description: "Hey Trader, select a ticker above to get a live AI-powered market structure analysis with entry signals, strategy recommendations, and confidence scoring.",
  strategyExplanation: "Biddie will analyze real-time options flow data to recommend the best strategy for the current market conditions.",
};

// Generate candlesticks based on bias direction
function generateCandles(isBearish: boolean) {
  const candles = [];
  let basePrice = isBearish ? 60 : 160;
  const count = 12;
  const spacing = 420 / (count + 1);
  for (let i = 0; i < count; i++) {
    const x = spacing * (i + 1);
    const move = (Math.random() - (isBearish ? 0.35 : 0.65)) * 18;
    const open = basePrice;
    const close = basePrice + move;
    const high = Math.min(open, close) - Math.random() * 10;
    const low = Math.max(open, close) + Math.random() * 10;
    const bull = close < open;
    candles.push({ x, o: open, c: close, h: high, l: low, bull });
    basePrice = close;
  }
  return candles;
}

const MarketChartPanel = () => {
  const { profile } = useAuth();
  const traderName = profile?.full_name?.split(" ")[0] || "Trader";

  const [activeTicker, setActiveTicker] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [insight, setInsight] = useState<TickerInsight>(defaultInsight);
  const [loading, setLoading] = useState(false);

  const isBearish = insight.bias.toLowerCase().includes("bearish");
  const isBullish = insight.bias.toLowerCase().includes("bullish");

  const candles = useMemo(() => {
    if (!activeTicker) return generateCandles(false);
    return generateCandles(isBearish);
  }, [activeTicker, isBearish]);

  const fetchAnalysis = useCallback(async (ticker: string) => {
    setActiveTicker(ticker);
    setLoading(true);
    setInsight({
      ...defaultInsight,
      bias: "Analyzing...",
      description: `Hey ${traderName}, Biddie is analyzing real-time flow data for ${ticker}. Pulling sweep activity, volume, and market sentiment...`,
    });

    try {
      const { data, error } = await supabase.functions.invoke('ticker-analysis', {
        body: { ticker, traderName },
      });
      if (error) throw error;
      if (data && data.bias) {
        setInsight(data as TickerInsight);
      }
    } catch (e) {
      console.error('Failed to fetch analysis:', e);
      setInsight({
        ...defaultInsight,
        bias: "Error",
        description: `Hey ${traderName}, we couldn't pull live data for ${ticker} right now. Please try again in a moment.`,
        strategyExplanation: "Analysis unavailable — the data feed may be temporarily down.",
      });
    } finally {
      setLoading(false);
    }
  }, [traderName]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      fetchAnalysis(searchValue.trim().toUpperCase());
      setSearchValue("");
    }
  };

  return (
    <div className="glass-panel rounded-xl p-5 border-glow-purple">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Market Structure</span>
        </div>
        <span className={`text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
          loading ? "bg-muted/50 text-muted-foreground" :
          isBearish ? "bg-destructive/20 text-destructive" :
          isBullish ? "bg-primary/20 text-primary" :
          "bg-muted/50 text-muted-foreground"
        }`}>
          {loading && <Loader2 className="h-3 w-3 animate-spin" />}
          {insight.bias}
        </span>
      </div>

      {/* Ticker search + quick picks */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search ticker..."
            className="pl-8 h-8 text-xs bg-muted/30 border-border/50 rounded-lg"
          />
        </form>
        <div className="flex flex-wrap gap-2">
          {quickTickers.map((ticker) => (
            <button
              key={ticker}
              onClick={() => fetchAnalysis(ticker)}
              disabled={loading}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                activeTicker === ticker
                  ? "bg-primary/20 text-primary font-medium"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              } disabled:opacity-50`}
            >
              {ticker}
            </button>
          ))}
        </div>
      </div>

      {/* AI Market Insight */}
      <div className="bg-muted/20 rounded-lg p-3 mb-4 border border-border/30">
        <div className="flex items-start gap-2">
          <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {insight.description}
          </p>
        </div>
      </div>

      {/* Chart - direction matches bias */}
      <div className="relative h-48 w-full mb-4 bg-muted/20 rounded-lg overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <svg viewBox="0 0 420 200" className="w-full h-full" preserveAspectRatio="none">
          {[50, 100, 150].map((y) => (
            <line key={y} x1="0" y1={y} x2="420" y2={y} stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />
          ))}

          {/* Key level line */}
          <line x1="0" y1="100" x2="420" y2="100"
            stroke={isBearish ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
            strokeWidth="1" strokeDasharray="6 4" opacity="0.5"
          />

          {/* Zone highlight - Put zone at bottom for bearish, Call zone at top for bullish */}
          {isBearish ? (
            <>
              <rect x="200" y="140" width="220" height="35" fill="hsl(var(--destructive))" opacity="0.08" rx="4" />
              <rect x="100" y="30" width="220" height="25" fill="hsl(var(--primary))" opacity="0.04" rx="4" />
            </>
          ) : (
            <>
              <rect x="200" y="30" width="220" height="35" fill="hsl(var(--primary))" opacity="0.08" rx="4" />
              <rect x="100" y="150" width="220" height="25" fill="hsl(var(--destructive))" opacity="0.04" rx="4" />
            </>
          )}

          {/* Candlesticks */}
          {candles.map((c, i) => {
            const top = Math.min(c.o, c.c);
            const bottom = Math.max(c.o, c.c);
            const color = c.bull ? "hsl(var(--primary))" : "hsl(var(--destructive))";
            return (
              <g key={i}>
                <line x1={c.x} y1={c.h} x2={c.x} y2={c.l} stroke={color} strokeWidth="2" />
                <rect x={c.x - 8} y={top} width="16" height={Math.max(bottom - top, 3)} fill={color} rx="2" />
              </g>
            );
          })}
        </svg>

        {/* Zone labels */}
        {insight.callZone !== "—" && (
          <div className={`absolute text-[10px] font-medium px-2 py-0.5 rounded ${
            isBearish
              ? "bottom-3 right-3 text-destructive bg-destructive/10"
              : "top-3 right-3 text-primary bg-primary/10"
          }`}>
            {insight.callZone}
          </div>
        )}
        {insight.invalidation !== "—" && (
          <div className={`absolute text-[10px] font-medium px-2 py-0.5 rounded ${
            isBearish
              ? "top-3 right-3 text-primary bg-primary/10"
              : "bottom-3 right-3 text-destructive bg-destructive/10"
          }`}>
            {insight.invalidation}
          </div>
        )}
      </div>

      {/* Stats + Contract */}
      <div className="space-y-3 border-t border-border/40 pt-3 mb-3">
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Asset", value: activeTicker || "—" },
            { label: "Strategy", value: insight.strategy },
            { label: "Expiration", value: insight.expiration },
            { label: "AI Score", value: insight.score },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-[10px] text-muted-foreground">{stat.label}</div>
              <div className="font-bold text-foreground text-xs">{stat.value}</div>
            </div>
          ))}
        </div>

        {insight.contract && insight.contract !== "—" && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
            <div className="text-[10px] text-muted-foreground mb-0.5">Contract</div>
            <div className="text-xs font-bold text-primary">{insight.contract}</div>
          </div>
        )}
      </div>

      {/* Strategy Explanation */}
      <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
        <div className="text-[10px] font-semibold text-accent uppercase tracking-wider mb-1">Why this strategy?</div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {insight.strategyExplanation}
        </p>
      </div>
    </div>
  );
};

export default MarketChartPanel;
