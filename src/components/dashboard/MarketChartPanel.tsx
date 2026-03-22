import { useState, useCallback, useMemo, useRef } from "react";
import { TrendingUp, Search, Info, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const quickTickers = ["NQ", "SPX", "PLTR", "TSLA", "NVDA", "AAPL"];

const popularTickers = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA", "AMD", "INTC", "NFLX",
  "SPY", "QQQ", "IWM", "DIA", "SPX", "NQ", "ES", "VIX",
  "BA", "DIS", "PYPL", "SQ", "SHOP", "ROKU", "SNAP", "UBER", "LYFT", "COIN",
  "PLTR", "SOFI", "NIO", "RIVN", "LCID", "F", "GM", "AAL", "UAL", "DAL",
  "JPM", "BAC", "GS", "MS", "WFC", "C", "V", "MA", "AXP",
  "XOM", "CVX", "COP", "OXY", "SLB", "HAL",
  "JNJ", "PFE", "MRNA", "ABBV", "LLY", "UNH", "BMY",
  "WMT", "TGT", "COST", "HD", "LOW", "SBUX", "MCD", "KO", "PEP",
  "CRM", "ORCL", "NOW", "SNOW", "PANW", "CRWD", "ZS", "NET", "DDOG",
  "ARM", "SMCI", "AVGO", "MU", "QCOM", "TSM", "MRVL", "LRCX", "AMAT",
];

interface TickerInsight {
  bias: string;
  targetZone: string;
  keyLevel: string;
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
  targetZone: "—",
  keyLevel: "—",
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
  let basePrice = isBearish ? 160 : 160;
  const count = 20;
  const chartWidth = 500;
  const margin = 20;
  const spacing = (chartWidth - margin * 2) / count;
  for (let i = 0; i < count; i++) {
    const x = margin + spacing * (i + 0.5);
    const trend = isBearish ? 0.35 : 0.65;
    const move = (Math.random() - trend) * 8;
    const open = basePrice;
    const close = basePrice + move;
    const bodyHeight = Math.abs(close - open);
    const wickUp = Math.random() * 4 + 2;
    const wickDown = Math.random() * 4 + 2;
    const high = Math.min(open, close) - wickUp;
    const low = Math.max(open, close) + wickDown;
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
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

  const filteredTickers = useMemo(() => {
    if (!searchValue.trim()) return [];
    const query = searchValue.toUpperCase();
    return popularTickers.filter(t => t.startsWith(query) && t !== query).slice(0, 8);
  }, [searchValue]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      fetchAnalysis(searchValue.trim().toUpperCase());
      setSearchValue("");
      setShowSuggestions(false);
    }
  };

  const handleSelectTicker = (ticker: string) => {
    setSearchValue("");
    setShowSuggestions(false);
    fetchAnalysis(ticker);
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
        <div ref={searchRef} className="relative flex-1 max-w-[200px]">
          <form onSubmit={handleSearch}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground z-10" />
            <Input
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => searchValue && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Search ticker..."
              className="pl-8 h-8 text-xs bg-muted/30 border-border/50 rounded-lg"
            />
          </form>
          {showSuggestions && filteredTickers.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              {filteredTickers.map((ticker) => (
                <button
                  key={ticker}
                  onMouseDown={() => handleSelectTicker(ticker)}
                  className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted/50 transition-colors"
                >
                  {ticker}
                </button>
              ))}
            </div>
          )}
        </div>
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

      {/* Chart - matching reference image exactly */}
      <div className="relative h-56 w-full mb-4">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <svg viewBox="0 0 500 200" className="w-full h-full" preserveAspectRatio="none">
          {/* Key Level dashed line across full width */}
          <line x1="0" y1="90" x2="500" y2="90"
            stroke="hsl(230 85% 60%)"
            strokeWidth="1" strokeDasharray="6 4" opacity="0.4"
          />

          {/* Target zone shaded rectangle */}
          {isBearish ? (
            <rect x="150" y="150" width="250" height="30" fill="hsl(0 72% 51%)" opacity="0.06" rx="4" />
          ) : (
            <rect x="250" y="30" width="250" height="40" fill="hsl(230 85% 60%)" opacity="0.06" rx="4" />
          )}

          {/* Invalidation zone shaded rectangle */}
          {isBearish ? (
            <rect x="250" y="30" width="250" height="40" fill="hsl(230 85% 60%)" opacity="0.03" rx="4" />
          ) : (
            <rect x="150" y="150" width="250" height="30" fill="hsl(0 72% 51%)" opacity="0.06" rx="4" />
          )}

          {/* Candlesticks */}
          {candles.map((c, i) => {
            const top = Math.min(c.o, c.c);
            const bottom = Math.max(c.o, c.c);
            const color = c.bull ? "hsl(230 85% 60%)" : "hsl(0 72% 51%)";
            return (
              <g key={i}>
                <line x1={c.x} y1={c.h} x2={c.x} y2={c.l} stroke={color} strokeWidth="1.5" />
                <rect x={c.x - 6} y={top} width="12" height={Math.max(bottom - top, 2)} fill={color} rx="1" />
              </g>
            );
          })}
        </svg>

        {/* Target Zone label */}
        {insight.targetZone !== "—" && (
          <div className={`absolute text-xs font-medium ${
            isBearish
              ? "bottom-4 right-4 text-destructive"
              : "top-4 right-4 text-primary"
          }`}>
            {insight.targetZone}
          </div>
        )}

        {/* Key Level label - middle right */}
        {insight.keyLevel !== "—" && (
          <div className="absolute right-4 top-[45%] text-xs text-primary">
            {insight.keyLevel}
          </div>
        )}

        {/* Invalidation label */}
        {insight.invalidation !== "—" && (
          <div className={`absolute text-xs font-medium ${
            isBearish
              ? "top-4 right-4 text-muted-foreground"
              : "bottom-4 right-4 text-destructive"
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
