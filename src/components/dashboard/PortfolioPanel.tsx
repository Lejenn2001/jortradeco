import { Fish, ArrowUpRight, ArrowDownRight, Clock, Flame } from "lucide-react";
import type { FlowAlert } from "@/hooks/useMarketData";

interface Props {
  whaleAlerts: FlowAlert[];
  loading: boolean;
}

// High-conviction example whale alerts across diverse tickers
const exampleWhaleAlerts: FlowAlert[] = [
  {
    ticker: "NVDA",
    type: "Call Sweep",
    premium: "$2.8M",
    strike: "$145",
    expiry: "Mar 27",
    sentiment: "bullish",
    time: "Fri 3:42 PM",
  },
  {
    ticker: "TSLA",
    type: "Put Sweep",
    premium: "$1.9M",
    strike: "$250",
    expiry: "Mar 27",
    sentiment: "bearish",
    time: "Fri 2:58 PM",
  },
  {
    ticker: "META",
    type: "Call Block",
    premium: "$3.6M",
    strike: "$620",
    expiry: "Mar 27",
    sentiment: "bullish",
    time: "Fri 2:15 PM",
  },
  {
    ticker: "AMD",
    type: "Put Sweep",
    premium: "$5.2M",
    strike: "$110",
    expiry: "Mar 27",
    sentiment: "bearish",
    time: "Fri 1:30 PM",
  },
  {
    ticker: "AAPL",
    type: "Call Sweep",
    premium: "$3.1M",
    strike: "$215",
    expiry: "Mar 27",
    sentiment: "bullish",
    time: "Fri 1:15 PM",
  },
  {
    ticker: "COIN",
    type: "Call Block",
    premium: "$1.7M",
    strike: "$280",
    expiry: "Mar 27",
    sentiment: "bullish",
    time: "Fri 12:45 PM",
  },
  {
    ticker: "PLTR",
    type: "Call Sweep",
    premium: "$1.4M",
    strike: "$120",
    expiry: "Mar 27",
    sentiment: "bullish",
    time: "Fri 11:45 AM",
  },
  {
    ticker: "SPY",
    type: "Put Sweep",
    premium: "$4.5M",
    strike: "$570",
    expiry: "Mar 27",
    sentiment: "bearish",
    time: "Fri 11:00 AM",
  },
];

function getActionLabel(alert: FlowAlert): string {
  if (alert.sentiment === "bullish") {
    return `Buy ${alert.strike} Calls`;
  }
  return `Buy ${alert.strike} Puts`;
}

function getSentimentEmoji(alert: FlowAlert): string {
  const prem = parsePremium(alert.premium);
  if (prem >= 3_000_000) return "🔥";
  if (prem >= 1_500_000) return "⚡";
  return "📊";
}

const PortfolioPanel = ({ whaleAlerts, loading }: Props) => {
  // Merge: live data takes priority, fill with examples for diversity
  const liveTickers = new Set(whaleAlerts.map(a => a.ticker));
  const fillers = exampleWhaleAlerts.filter(a => !liveTickers.has(a.ticker));
  const displayAlerts = [...whaleAlerts, ...fillers].slice(0, 8);

  const bullishPremium = displayAlerts
    .filter((a) => a.sentiment === "bullish")
    .reduce((sum, a) => sum + parsePremium(a.premium), 0);
  const bearishPremium = displayAlerts
    .filter((a) => a.sentiment === "bearish")
    .reduce((sum, a) => sum + parsePremium(a.premium), 0);

  return (
    <div className="glass-panel rounded-xl p-5 border-glow-blue">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Fish className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Whale Activity</span>
        </div>
        <span className="text-xs bg-primary/20 text-primary px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Live
        </span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Bullish Flow", value: `$${formatMoney(bullishPremium)}`, color: "text-primary" },
          { label: "Bearish Flow", value: `$${formatMoney(bearishPremium)}`, color: "text-destructive" },
          { label: "Net Sentiment", value: bullishPremium >= bearishPremium ? "Bullish" : "Bearish", color: bullishPremium >= bearishPremium ? "text-primary" : "text-destructive" },
        ].map((s) => (
          <div key={s.label} className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
            <div className={`font-bold text-sm ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {loading && whaleAlerts.length === 0 && displayAlerts.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 bg-muted/20 rounded-lg animate-pulse h-14" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {displayAlerts.map((alert, i) => {
            const prem = parsePremium(alert.premium);
            const isHighConviction = prem >= 1_500_000;

            return (
              <div
                key={`${alert.ticker}-${i}`}
                className={`p-3 rounded-lg border transition-all ${
                  isHighConviction
                    ? alert.sentiment === "bullish"
                      ? "bg-primary/5 border-primary/30"
                      : "bg-destructive/5 border-destructive/30"
                    : "bg-muted/20 border-transparent"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      alert.sentiment === "bullish" ? "bg-primary/10" : "bg-destructive/10"
                    }`}>
                      <span className={`text-xs font-bold ${
                        alert.sentiment === "bullish" ? "text-primary" : "text-destructive"
                      }`}>{alert.ticker.slice(0, 3)}</span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        {alert.ticker}
                        {isHighConviction && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive font-bold animate-pulse">
                            {getSentimentEmoji(alert)} HIGH
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{alert.type}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold flex items-center gap-1 ${
                      alert.sentiment === "bullish" ? "text-primary" : "text-destructive"
                    }`}>
                      {alert.sentiment === "bullish"
                        ? <ArrowUpRight className="h-3 w-3" />
                        : <ArrowDownRight className="h-3 w-3" />}
                      {alert.premium}
                    </div>
                  </div>
                </div>

                {/* Clear action line */}
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-muted-foreground">
                    {alert.strike} strike • {alert.expiry}
                  </div>
                  <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    alert.sentiment === "bullish"
                      ? "bg-primary/15 text-primary"
                      : "bg-destructive/15 text-destructive"
                  }`}>
                    {getActionLabel(alert)}
                  </div>
                </div>

                {/* Time */}
                <div className="text-[9px] text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="h-2.5 w-2.5" />
                  {alert.time}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

function parsePremium(str: string): number {
  const clean = str.replace(/[$,]/g, '');
  if (clean.endsWith('M')) return parseFloat(clean) * 1_000_000;
  if (clean.endsWith('K')) return parseFloat(clean) * 1_000;
  return parseFloat(clean) || 0;
}

function formatMoney(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toFixed(0);
}

export default PortfolioPanel;
