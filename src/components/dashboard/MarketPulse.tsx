import { useState } from "react";
import { Activity, BarChart3, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

const MarketPulse = () => {
  const [showVixLevels, setShowVixLevels] = useState(false);
  const [showPCLevels, setShowPCLevels] = useState(false);

  // These would come from real API data — static for now
  const indices = [
    { ticker: "SPY", price: "—" },
    { ticker: "QQQ", price: "—" },
    { ticker: "IWM", price: "—" },
  ];

  const vix = 23.87;
  const pcRatio = 0.83;

  const getVixSentiment = (v: number) => {
    if (v < 15) return { label: "Calm", color: "bg-emerald-500/80 text-emerald-100" };
    if (v < 20) return { label: "Steady", color: "bg-blue-500/80 text-blue-100" };
    if (v < 25) return { label: "Nervous", color: "bg-amber-500/80 text-amber-100" };
    if (v < 30) return { label: "Fearful", color: "bg-orange-500/80 text-orange-100" };
    return { label: "Panic", color: "bg-red-500/80 text-red-100" };
  };

  const getPCSentiment = (r: number) => {
    if (r < 0.7) return { label: "Bullish", color: "bg-emerald-500/80 text-emerald-100" };
    if (r < 0.9) return { label: "Neutral", color: "bg-muted text-muted-foreground" };
    if (r < 1.1) return { label: "Cautious", color: "bg-amber-500/80 text-amber-100" };
    return { label: "Bearish", color: "bg-red-500/80 text-red-100" };
  };

  const vixSentiment = getVixSentiment(vix);
  const pcSentiment = getPCSentiment(pcRatio);

  const getVixDescription = (v: number) => {
    if (v < 15) return "Smooth sailing — the market is calm and confident. Great environment for steady plays.";
    if (v < 20) return "Everything looks normal. No major fear in the market — steady as she goes.";
    if (v < 25) return "The fear meter is getting nervous — things are starting to get shaky. Play a little smaller and be careful out there.";
    if (v < 30) return "Fear is elevated. Big swings are likely — tighten stops and be selective.";
    return "Full panic mode. Extreme volatility — only experienced traders should be active.";
  };

  const getPCDescription = (r: number) => {
    if (r < 0.7) return "Traders are heavily betting UP. Lots of call buying — bullish sentiment is dominant.";
    if (r < 0.9) return `It's about 50/50 right now — half betting UP, half betting DOWN. Nobody really knows what's next. The market is undecided.`;
    if (r < 1.1) return "Slightly more puts than calls. Traders are getting cautious and hedging positions.";
    return "Heavy put buying — traders are positioning for downside. Bearish sentiment is strong.";
  };

  const isMarketOpen = () => {
    const now = new Date();
    const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const day = et.getDay();
    const hours = et.getHours();
    const minutes = et.getMinutes();
    const time = hours * 60 + minutes;
    if (day === 0 || day === 6) return false;
    return time >= 570 && time < 960; // 9:30 AM - 4:00 PM ET
  };

  return (
    <div className="glass-panel rounded-xl border border-border/20 bg-card/80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/10">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <span className="text-base font-bold text-primary">Market Pulse</span>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-md ${isMarketOpen() ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>
          {isMarketOpen() ? "Market Open" : "Market Closed"}
        </span>
      </div>

      {/* Index Tickers */}
      <div className="grid grid-cols-3 border-b border-border/10">
        {indices.map((idx) => (
          <div key={idx.ticker} className="text-center py-3 border-r border-border/10 last:border-r-0">
            <div className="text-xs text-muted-foreground">{idx.ticker}</div>
            <div className="text-sm font-semibold text-foreground mt-0.5">{idx.price}</div>
          </div>
        ))}
      </div>

      {/* VIX & Put/Call */}
      <div className="grid grid-cols-2 divide-x divide-border/10">
        {/* VIX */}
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              Volatility (VIX)
            </div>
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/40" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-foreground">{vix.toFixed(2)}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${vixSentiment.color}`}>
              {vixSentiment.label}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {getVixDescription(vix)}
          </p>
          <button
            onClick={() => setShowVixLevels(!showVixLevels)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors mt-1"
          >
            {showVixLevels ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            View VIX levels
          </button>
          {showVixLevels && (
            <div className="text-[10px] text-muted-foreground/60 space-y-0.5 mt-1">
              <div>0–15: Calm · 15–20: Steady · 20–25: Nervous</div>
              <div>25–30: Fearful · 30+: Panic</div>
            </div>
          )}
        </div>

        {/* Put/Call */}
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              Put/Call Ratio
            </div>
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/40" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-foreground">{pcRatio.toFixed(2)}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pcSentiment.color}`}>
              {pcSentiment.label}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {getPCDescription(pcRatio)}
          </p>
          <button
            onClick={() => setShowPCLevels(!showPCLevels)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors mt-1"
          >
            {showPCLevels ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            View P/C levels
          </button>
          {showPCLevels && (
            <div className="text-[10px] text-muted-foreground/60 space-y-0.5 mt-1">
              <div>Below 0.7: Bullish · 0.7–0.9: Neutral</div>
              <div>0.9–1.1: Cautious · Above 1.1: Bearish</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketPulse;
