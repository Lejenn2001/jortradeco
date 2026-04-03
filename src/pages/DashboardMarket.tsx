import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PageBanner from "@/components/dashboard/PageBanner";
import {
  Search, TrendingUp, TrendingDown, Activity, Shield, Target,
  Zap, BarChart3, Eye, Crosshair,
  Waves, Clock, Loader2, Flame
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface TradeSetup {
  has_play: boolean;
  action: string | null;
  entry: string | null;
  target: string | null;
  stop: string | null;
  timeframe: string | null;
  confidence: string | null;
  reasoning: string | null;
}

interface Analysis {
  verdict: string;
  verdict_summary: string;
  market_structure: string;
  flow_analysis: string;
  dark_pool_analysis: string;
  key_levels_analysis: string;
  trade_setup: TradeSetup;
  watch_for: string;
}

interface AnalysisData {
  key_levels: any;
  price_confirmation: any;
  flow_summary: {
    total_alerts: number;
    call_premium: number;
    put_premium: number;
    sweeps: number;
    avg_aggression: number;
    top_flow: any[];
  };
  dark_pool: {
    trades: number;
    total_volume: number;
    total_notional: number;
    avg_price: number | null;
    recent: any[];
  };
}

interface AnalysisResult {
  ticker: string;
  timestamp: string;
  analysis: Analysis;
  data: AnalysisData;
}

const formatPremium = (val: number) => {
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
};

const popularTickers = ["SPY", "QQQ", "NVDA", "AAPL", "TSLA", "META", "AMZN", "MSFT", "AMD", "GOOGL"];

const TICKER_DB: { symbol: string; name: string }[] = [
  { symbol: "SPY", name: "SPDR S&P 500 ETF" },
  { symbol: "QQQ", name: "Invesco Nasdaq 100 ETF" },
  { symbol: "IWM", name: "iShares Russell 2000 ETF" },
  { symbol: "DIA", name: "SPDR Dow Jones ETF" },
  { symbol: "SPX", name: "S&P 500 Index" },
  { symbol: "VIX", name: "CBOE Volatility Index" },
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "AMD", name: "Advanced Micro Devices" },
  { symbol: "AVGO", name: "Broadcom Inc." },
  { symbol: "NFLX", name: "Netflix Inc." },
  { symbol: "CRM", name: "Salesforce Inc." },
  { symbol: "ORCL", name: "Oracle Corporation" },
  { symbol: "INTC", name: "Intel Corporation" },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "BAC", name: "Bank of America" },
  { symbol: "GS", name: "Goldman Sachs Group" },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "UNH", name: "UnitedHealth Group" },
  { symbol: "PFE", name: "Pfizer Inc." },
  { symbol: "XOM", name: "Exxon Mobil" },
  { symbol: "CVX", name: "Chevron Corporation" },
  { symbol: "HD", name: "Home Depot Inc." },
  { symbol: "WMT", name: "Walmart Inc." },
  { symbol: "COST", name: "Costco Wholesale" },
  { symbol: "DIS", name: "Walt Disney Co." },
  { symbol: "BA", name: "Boeing Company" },
  { symbol: "CAT", name: "Caterpillar Inc." },
  { symbol: "PANW", name: "Palo Alto Networks" },
  { symbol: "CRWD", name: "CrowdStrike Holdings" },
  { symbol: "GLD", name: "SPDR Gold Shares ETF" },
  { symbol: "TLT", name: "iShares 20+ Year Treasury" },
  { symbol: "SOXX", name: "iShares Semiconductor ETF" },
  { symbol: "COIN", name: "Coinbase Global" },
  { symbol: "PLTR", name: "Palantir Technologies" },
  { symbol: "MARA", name: "Marathon Digital" },
  { symbol: "SOFI", name: "SoFi Technologies" },
  { symbol: "RIVN", name: "Rivian Automotive" },
  { symbol: "NIO", name: "NIO Inc." },
  { symbol: "BABA", name: "Alibaba Group" },
  { symbol: "DJT", name: "Trump Media & Technology" },
];

const verdictColors: Record<string, { bg: string; text: string; border: string }> = {
  BULLISH: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/40" },
  BEARISH: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/40" },
  NEUTRAL: { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/40" },
  "NO PLAY": { bg: "bg-muted/30", text: "text-muted-foreground", border: "border-border/40" },
};

const DashboardMarket = () => {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const dropdownRef = useRef<HTMLFormElement>(null);

  const suggestions = useMemo(() => {
    const q = ticker.trim().toUpperCase();
    if (!q) return [];
    return TICKER_DB.filter(
      t => t.symbol.startsWith(q) || t.name.toUpperCase().includes(q)
    ).slice(0, 8);
  }, [ticker]);

  useEffect(() => {
    setHighlightIndex(-1);
  }, [suggestions]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const analyzeCallback = useCallback(async (t: string) => {
    const clean = t.toUpperCase().replace(/[^A-Z]/g, "");
    if (!clean || clean.length > 5) return;

    setShowDropdown(false);
    setLoading(true);
    setError(null);
    setResult(null);
    setTicker(clean);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ticker-analysis", {
        body: { ticker: clean },
      });
      if (fnError) throw new Error(fnError.message || "Analysis failed");
      setResult(data);
      setSearchHistory(prev => {
        const filtered = prev.filter(x => x !== clean);
        return [clean, ...filtered].slice(0, 8);
      });
    } catch (err: any) {
      setError(err.message || "Failed to analyze ticker");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticker.trim()) analyzeCallback(ticker.trim());
  };

  const v = result?.analysis?.verdict || "";
  const vc = verdictColors[v] || verdictColors["NEUTRAL"];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-5 space-y-5">
        <PageBanner
          title="MARKET VIEW"
          subtitle="AI-Powered Ticker Analysis"
          accentFrom="hsl(174, 72%, 56%)"
          accentTo="hsl(199, 89%, 48%)"
          gradientFrom="from-cyan-900/15"
          gradientTo="to-blue-900/10"
        />

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="relative" ref={dropdownRef}>
          <div className="glass-panel rounded-2xl border-glow-purple p-1.5 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Input
                value={ticker}
                onChange={e => { setTicker(e.target.value.toUpperCase()); setShowDropdown(true); }}
                onFocus={() => { if (suggestions.length > 0 && ticker.length > 0) setShowDropdown(true); }}
                onKeyDown={e => {
                  if (!showDropdown || suggestions.length === 0) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHighlightIndex(prev => Math.min(prev + 1, suggestions.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlightIndex(prev => Math.max(prev - 1, 0));
                  } else if (e.key === "Enter" && highlightIndex >= 0) {
                    e.preventDefault();
                    const selected = suggestions[highlightIndex];
                    setTicker(selected.symbol);
                    setShowDropdown(false);
                    analyzeCallback(selected.symbol);
                  } else if (e.key === "Escape") {
                    setShowDropdown(false);
                  }
                }}
                placeholder="Enter ticker symbol (e.g. SPY, NVDA, AAPL)"
                className="pl-12 pr-4 h-14 text-lg font-bold bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 uppercase"
                maxLength={5}
                disabled={loading}
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !ticker.trim()}
              className="h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Analyze
                </>
              )}
            </button>
          </div>

          <AnimatePresence>
            {showDropdown && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute z-50 left-0 right-0 top-full mt-1 glass-panel rounded-xl border border-border/30 overflow-hidden shadow-2xl"
              >
                {suggestions.map((s, i) => (
                  <button
                    key={s.symbol}
                    type="button"
                    onMouseDown={() => {
                      setTicker(s.symbol);
                      setShowDropdown(false);
                      analyzeCallback(s.symbol);
                    }}
                    onMouseEnter={() => setHighlightIndex(i)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      i === highlightIndex
                        ? "bg-primary/15 text-primary"
                        : "hover:bg-muted/30 text-foreground"
                    }`}
                  >
                    <span className="font-bold text-sm w-14 shrink-0">{s.symbol}</span>
                    <span className="text-xs text-muted-foreground truncate">{s.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* Recent & Popular */}
        <div className="flex flex-wrap gap-2">
          {searchHistory.length > 0 && (
            <>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold self-center mr-1">Recent:</span>
              {searchHistory.map(t => (
                <button
                  key={t}
                  onClick={() => analyzeCallback(t)}
                  disabled={loading}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20 disabled:opacity-50"
                >
                  {t}
                </button>
              ))}
              <span className="mx-2 text-border">|</span>
            </>
          )}
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold self-center mr-1">Popular:</span>
          {popularTickers.filter(t => !searchHistory.includes(t)).slice(0, 6).map(t => (
            <button
              key={t}
              onClick={() => analyzeCallback(t)}
              disabled={loading}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              {t}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Loading State */}
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-panel rounded-2xl border-glow-purple p-8"
            >
              <div className="flex flex-col items-center gap-5">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full border-2 border-primary/30 flex items-center justify-center">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-primary/10 animate-ping" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-bold text-foreground">Analyzing {ticker}</p>
                  <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                    <p className="flex items-center gap-2 justify-center">
                      <Activity className="h-3 w-3 text-emerald-400 animate-pulse" /> Scanning live options flow
                    </p>
                    <p className="flex items-center gap-2 justify-center">
                      <Eye className="h-3 w-3 text-blue-400 animate-pulse" /> Checking dark pool activity
                    </p>
                    <p className="flex items-center gap-2 justify-center">
                      <BarChart3 className="h-3 w-3 text-violet-400 animate-pulse" /> Computing key levels & VWAP
                    </p>
                    <p className="flex items-center gap-2 justify-center">
                      <Zap className="h-3 w-3 text-yellow-400 animate-pulse" /> Running AI analysis
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error State */}
          {error && !loading && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass-panel rounded-2xl p-8 border border-destructive/30 text-center"
            >
              <p className="text-destructive font-semibold">{error}</p>
              <p className="text-xs text-muted-foreground mt-2">Try a different ticker or check back during market hours.</p>
            </motion.div>
          )}

          {/* Result */}
          {result && !loading && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Verdict */}
              <div className={`rounded-2xl border ${vc.border} ${vc.bg} p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-foreground tracking-tight">{result.ticker}</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${vc.border} ${vc.text}`}>
                      {v}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {result.timestamp}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{result.analysis.verdict_summary}</p>
              </div>

              {/* Trade Setup */}
              {result.analysis.trade_setup?.has_play && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl border border-primary/30 bg-primary/5 p-5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-5 w-5 text-primary" />
                    <span className="text-sm font-black text-foreground uppercase tracking-wider">Trade Setup</span>
                    {result.analysis.trade_setup.confidence && (
                      <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-auto">
                        {result.analysis.trade_setup.confidence} confidence
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {result.analysis.trade_setup.action && (
                      <div className="rounded-lg bg-muted/30 px-3 py-2.5">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Zap className="h-3 w-3 text-primary" /> Action
                        </p>
                        <p className="text-sm font-bold text-foreground mt-0.5">{result.analysis.trade_setup.action}</p>
                      </div>
                    )}
                    {result.analysis.trade_setup.entry && (
                      <div className="rounded-lg bg-muted/30 px-3 py-2.5">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-emerald-400" /> Entry
                        </p>
                        <p className="text-sm font-bold text-emerald-400 mt-0.5">{result.analysis.trade_setup.entry}</p>
                      </div>
                    )}
                    {result.analysis.trade_setup.target && (
                      <div className="rounded-lg bg-muted/30 px-3 py-2.5">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Target className="h-3 w-3 text-primary" /> Target
                        </p>
                        <p className="text-sm font-bold text-primary mt-0.5">{result.analysis.trade_setup.target}</p>
                      </div>
                    )}
                    {result.analysis.trade_setup.stop && (
                      <div className="rounded-lg bg-muted/30 px-3 py-2.5">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Shield className="h-3 w-3 text-red-400" /> Stop
                        </p>
                        <p className="text-sm font-bold text-red-400 mt-0.5">{result.analysis.trade_setup.stop}</p>
                      </div>
                    )}
                  </div>
                  {result.analysis.trade_setup.reasoning && (
                    <p className="mt-3 text-xs text-muted-foreground italic">{result.analysis.trade_setup.reasoning}</p>
                  )}
                </motion.div>
              )}

              {/* Analysis Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-panel rounded-xl p-4 border border-border/30">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-violet-400" />
                    <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Market Structure</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.analysis.market_structure}</p>
                </div>

                <div className="glass-panel rounded-xl p-4 border border-border/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Waves className="h-4 w-4 text-blue-400" />
                    <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Options Flow</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{result.analysis.flow_analysis}</p>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Calls: {formatPremium(result.data.flow_summary.call_premium)}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                      Puts: {formatPremium(result.data.flow_summary.put_premium)}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                      Sweeps: {result.data.flow_summary.sweeps}
                    </span>
                  </div>
                </div>

                <div className="glass-panel rounded-xl p-4 border border-border/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="h-4 w-4 text-amber-400" />
                    <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Dark Pool</h3>
                  </div>
                  <div className="rounded-lg px-3 py-2 bg-amber-500/[0.05] border border-amber-500/15 mb-3">
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      <span className="font-bold text-amber-400">What is a Dark Pool?</span> Private exchanges where large institutions trade huge blocks of shares away from public markets. Heavy dark pool activity tells us where the big money is quietly positioning.
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{result.analysis.dark_pool_analysis}</p>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {result.data.dark_pool.trades} Trades
                    </span>
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {formatPremium(result.data.dark_pool.total_notional)} Notional
                    </span>
                    {result.data.dark_pool.avg_price && (
                      <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Avg: ${result.data.dark_pool.avg_price.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="glass-panel rounded-xl p-4 border border-border/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Crosshair className="h-4 w-4 text-cyan-400" />
                    <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Key Levels</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{result.analysis.key_levels_analysis}</p>
                  {result.data.key_levels && (
                    <div className="grid grid-cols-2 gap-2">
                      {result.data.key_levels.vwap && (
                        <div className="rounded-lg bg-background/50 px-2.5 py-1.5">
                          <p className="text-[10px] text-muted-foreground">VWAP</p>
                          <p className="text-xs font-bold text-cyan-400">${result.data.key_levels.vwap}</p>
                        </div>
                      )}
                      {result.data.key_levels.pivot_points?.pivot && (
                        <div className="rounded-lg bg-background/50 px-2.5 py-1.5">
                          <p className="text-[10px] text-muted-foreground">Pivot</p>
                          <p className="text-xs font-bold text-foreground">${result.data.key_levels.pivot_points.pivot}</p>
                        </div>
                      )}
                      {result.data.key_levels.prior_day?.high && (
                        <div className="rounded-lg bg-background/50 px-2.5 py-1.5">
                          <p className="text-[10px] text-muted-foreground">PDH</p>
                          <p className="text-xs font-bold text-emerald-400">${result.data.key_levels.prior_day.high}</p>
                        </div>
                      )}
                      {result.data.key_levels.prior_day?.low && (
                        <div className="rounded-lg bg-background/50 px-2.5 py-1.5">
                          <p className="text-[10px] text-muted-foreground">PDL</p>
                          <p className="text-xs font-bold text-red-400">${result.data.key_levels.prior_day.low}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Watch For */}
              {result.analysis.watch_for && (
                <div className="glass-panel rounded-xl p-4 border border-yellow-500/20 bg-yellow-500/5">
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Eye className="h-3.5 w-3.5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-foreground uppercase tracking-wider mb-1">Watch For</p>
                      <p className="text-sm text-muted-foreground">{result.analysis.watch_for}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="glass-panel rounded-xl p-3 border border-border/20">
                <p className="text-[10px] text-muted-foreground/60 text-center">
                  JORTRADE is an AI-powered analysis tool using data analysis and probabilistic models. This is not financial advice.
                  Trading options involves substantial risk. You are solely responsible for your trading decisions.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!result && !loading && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-panel rounded-2xl border-glow-purple p-8 text-center"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Search className="h-8 w-8 text-primary/50" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-foreground">Your Personal Trade Assistant</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Enter any ticker above to get a full AI-powered breakdown including live options flow,
                  dark pool activity, key support/resistance levels, and actionable trade setups.
                </p>
              </div>
              <div className="flex items-center gap-6 mt-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Activity className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Live Flow</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Eye className="h-3.5 w-3.5 text-amber-400" />
                  <span>Dark Pool</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Crosshair className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Key Levels</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  <span>AI Analysis</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardMarket;
