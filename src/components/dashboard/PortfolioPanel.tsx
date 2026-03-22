import { useState } from "react";
import { Fish, ArrowUpRight, ArrowDownRight, Clock, ChevronDown, ChevronUp, Info, Copy, Check, Repeat2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { FlowAlert } from "@/hooks/useMarketData";
import { toast } from "sonner";

interface Props {
  whaleAlerts: FlowAlert[];
  loading: boolean;
  limit?: number;
}

const exampleWhaleAlerts: FlowAlert[] = [
  {
    ticker: "NVDA",
    type: "Call Sweep",
    premium: "$2.8M",
    strike: "$145",
    expiry: "Mar 27",
    sentiment: "bullish",
    time: "Fri 3:42 PM",
    explanation: "Institutions are aggressively buying $145 calls with $2.8M in premium. The sweep pattern (multiple rapid orders at the ask) signals urgency — they want in fast before the price moves. Volume is 4.2x the open interest, meaning this is new money entering, not hedges being rolled. When smart money pays up at the ask like this, it's a strong directional bet that NVDA breaks higher.",
  },
  {
    ticker: "TSLA",
    type: "Put Sweep",
    premium: "$1.9M",
    strike: "$250",
    expiry: "Mar 27",
    sentiment: "bearish",
    time: "Fri 2:58 PM",
    explanation: "6 consecutive put sweeps at the ask within 12 minutes — that's institutional urgency. $1.9M in premium on the $250 puts means someone with deep pockets expects TSLA to drop below $250 by expiry. Dark pool data confirms large sell blocks near $260 resistance. When whales buy puts this aggressively, they typically have information or conviction the rest of the market hasn't priced in yet.",
  },
  {
    ticker: "META",
    type: "Call Block",
    premium: "$3.6M",
    strike: "$620",
    expiry: "Mar 27",
    sentiment: "bullish",
    time: "Fri 2:15 PM",
    explanation: "A single $3.6M block order on META $620 calls — this isn't retail. Block orders bypass the open market and are negotiated directly, which means a fund or institution wanted to build a large position without moving the price. At $620 strike, they're betting META runs at least 3-4% higher. This kind of size and conviction from smart money is one of the strongest bullish signals you can get.",
  },
  {
    ticker: "AMD",
    type: "Put Sweep",
    premium: "$5.2M",
    strike: "$110",
    expiry: "Mar 27",
    sentiment: "bearish",
    time: "Fri 1:30 PM",
    explanation: "The largest bearish flow of the week: $5.2M across 12 consecutive put sweeps in 15 minutes. Dark pool short volume hit 62% — the highest in 30 days. When you see this much capital flowing into puts at this speed, institutions are positioning for a significant move down. The $110 strike suggests they expect AMD to lose at least 5% from current levels.",
  },
  {
    ticker: "AAPL",
    type: "Call Sweep",
    premium: "$3.1M",
    strike: "$215",
    expiry: "Mar 27",
    sentiment: "bullish",
    time: "Fri 1:15 PM",
    explanation: "A whale dropped $3.1M on AAPL $215 calls in a single block. Call volume is 5.8x the daily average — that kind of spike almost always precedes a move. Market makers are hedging long delta, which means they're buying shares to cover these calls. That buying pressure alone can push the stock higher. This is textbook smart money accumulation before a breakout.",
  },
  {
    ticker: "COIN",
    type: "Call Block",
    premium: "$1.7M",
    strike: "$280",
    expiry: "Mar 27",
    sentiment: "bullish",
    time: "Fri 12:45 PM",
    explanation: "$1.7M in COIN $280 calls via block trade. Crypto-related names tend to see whale activity before major BTC moves. The $280 strike is about 5% above current price, and this expiry is tight — they expect a quick move. When institutions buy short-dated OTM calls with this much premium, they're not hedging. This is a directional bet with high conviction.",
  },
  {
    ticker: "PLTR",
    type: "Call Sweep",
    premium: "$1.4M",
    strike: "$120",
    expiry: "Mar 27",
    sentiment: "bullish",
    time: "Fri 11:45 AM",
    explanation: "4 rapid call sweeps at the ask totaling $1.4M. PLTR is consolidating near a breakout level and open interest is building fast — a sign institutions are positioning before the move happens. The sweep pattern (paying the ask price repeatedly) shows urgency. They'd rather pay more per contract than risk missing the entry. That's conviction.",
  },
  {
    ticker: "SPY",
    type: "Put Sweep",
    premium: "$4.5M",
    strike: "$570",
    expiry: "Mar 27",
    sentiment: "bearish",
    time: "Fri 11:00 AM",
    explanation: "$4.5M in SPY $570 puts across 9 sweeps in under 20 minutes. The put/call ratio spiked to 2.1x — meaning twice as much money flowed into puts vs calls. When whales bet against the entire market (SPY), they're seeing macro risk the average trader might miss. This is the highest conviction bearish signal across all indices this week.",
  },
];

function getActionLabel(alert: FlowAlert): string {
  return alert.sentiment === "bullish"
    ? `Buy ${alert.strike} Calls`
    : `Buy ${alert.strike} Puts`;
}

function getSentimentEmoji(alert: FlowAlert): string {
  const prem = parsePremium(alert.premium);
  if (prem >= 3_000_000) return "🔥";
  if (prem >= 1_500_000) return "⚡";
  return "📊";
}

const PortfolioPanel = ({ whaleAlerts, loading, limit }: Props) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const liveTickers = new Set(whaleAlerts.map(a => a.ticker));
  const fillers = exampleWhaleAlerts.filter(a => !liveTickers.has(a.ticker));
  const allAlerts = [...whaleAlerts, ...fillers].slice(0, 8);
  const displayAlerts = limit ? allAlerts.slice(0, limit) : allAlerts;

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
            const isExpanded = expandedIdx === i;
            const explanation = alert.explanation || generateExplanation(alert);

            return (
              <div
                key={`${alert.ticker}-${i}`}
                className={`rounded-lg border transition-all ${
                  isHighConviction
                    ? alert.sentiment === "bullish"
                      ? "bg-primary/5 border-primary/30"
                      : "bg-destructive/5 border-destructive/30"
                    : "bg-muted/20 border-transparent"
                }`}
              >
                <div className="p-3">
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

                  {/* Action button - clickable */}
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-muted-foreground">
                      {alert.strike} strike • {alert.expiry}
                    </div>
                    <button
                      onClick={() => setExpandedIdx(isExpanded ? null : i)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors cursor-pointer ${
                        alert.sentiment === "bullish"
                          ? "bg-primary/15 text-primary hover:bg-primary/25"
                          : "bg-destructive/15 text-destructive hover:bg-destructive/25"
                      }`}
                    >
                      {getActionLabel(alert)}
                      {isExpanded ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                    </button>
                  </div>

                  <div className="text-[9px] text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-2.5 w-2.5" />
                    {alert.time}
                  </div>
                </div>

                {/* Expandable explanation */}
                {isExpanded && (
                  <div className={`px-3 pb-3 border-t ${
                    alert.sentiment === "bullish" ? "border-primary/20" : "border-destructive/20"
                  }`}>
                    <div className="flex items-start gap-2 mt-2.5">
                      <Info className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
                        alert.sentiment === "bullish" ? "text-primary" : "text-destructive"
                      }`} />
                      <div className="flex-1">
                        <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                          alert.sentiment === "bullish" ? "text-primary" : "text-destructive"
                        }`}>
                          Why this trade?
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                          {explanation}
                        </p>

                        {/* Budget-friendly alternative */}
                        {getAlternative(alert) && (
                          <div className="bg-muted/30 rounded-lg p-2.5 mb-3 border border-border/30">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Repeat2 className="h-3 w-3 text-accent" />
                              <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                                Budget-Friendly Alternative
                              </span>
                            </div>
                            <p className="text-xs text-foreground font-semibold">
                              {getAlternative(alert)}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Same directional exposure at a fraction of the cost
                            </p>
                          </div>
                        )}

                        {/* Copy Trade button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const tradeText = `${getActionLabel(alert)} — ${alert.ticker} ${alert.strike} ${alert.sentiment === "bullish" ? "Calls" : "Puts"} exp ${alert.expiry}${getAlternative(alert) ? ` | Alt: ${getAlternative(alert)}` : ""}`;
                            navigator.clipboard.writeText(tradeText);
                            toast.success("Trade copied to clipboard!");
                          }}
                          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-colors ${
                            alert.sentiment === "bullish"
                              ? "bg-primary/20 text-primary hover:bg-primary/30"
                              : "bg-destructive/20 text-destructive hover:bg-destructive/30"
                          }`}
                        >
                          <Copy className="h-3 w-3" />
                          Copy Trade
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

function generateExplanation(alert: FlowAlert): string {
  const direction = alert.sentiment === "bullish" ? "bullish" : "bearish";
  const contract = alert.sentiment === "bullish" ? "calls" : "puts";
  return `Large ${alert.type.toLowerCase()} detected on ${alert.ticker} — ${alert.premium} in premium on the ${alert.strike} ${contract}. When institutions place orders this size, they're making a high-conviction ${direction} bet. The ${alert.type.toLowerCase()} pattern indicates urgency — they want to get filled fast before the move happens. This level of premium commitment from smart money is a strong signal worth watching.`;
}

// Map expensive index/stock tickers to budget-friendly ETF or stock alternatives
const alternativesMap: Record<string, (strike: string, sentiment: string) => string | null> = {
  SPX: (strike, sentiment) => {
    const spxPrice = parseFloat(strike.replace('$', ''));
    const spyEquiv = Math.round(spxPrice / 10);
    return `Buy SPY $${spyEquiv} ${sentiment === "bullish" ? "Calls" : "Puts"} — SPY tracks SPX at ~1/10th the price`;
  },
  SPXW: (strike, sentiment) => {
    const spxPrice = parseFloat(strike.replace('$', ''));
    const spyEquiv = Math.round(spxPrice / 10);
    return `Buy SPY $${spyEquiv} ${sentiment === "bullish" ? "Calls" : "Puts"} — SPY tracks SPX at ~1/10th the price`;
  },
  NDX: (strike, sentiment) => {
    const ndxPrice = parseFloat(strike.replace('$', ''));
    const qqqEquiv = Math.round(ndxPrice / 40);
    return `Buy QQQ $${qqqEquiv} ${sentiment === "bullish" ? "Calls" : "Puts"} — QQQ tracks Nasdaq-100 at ~1/40th the price`;
  },
  NQ: (strike, sentiment) => {
    const nqPrice = parseFloat(strike.replace('$', ''));
    const qqqEquiv = Math.round(nqPrice / 40);
    return `Buy QQQ $${qqqEquiv} ${sentiment === "bullish" ? "Calls" : "Puts"} — QQQ tracks Nasdaq-100`;
  },
  AMZN: (strike, sentiment) => {
    const price = parseFloat(strike.replace('$', ''));
    return price >= 180 ? `Buy AMZN $${Math.round(price * 0.95)} ${sentiment === "bullish" ? "Calls" : "Puts"} closer to the money for lower premium` : null;
  },
  GOOGL: (strike, sentiment) => {
    const price = parseFloat(strike.replace('$', ''));
    return price >= 170 ? `Buy GOOG $${Math.round(price)} ${sentiment === "bullish" ? "Calls" : "Puts"} — same company, sometimes cheaper premiums` : null;
  },
};

function getAlternative(alert: FlowAlert): string | null {
  const ticker = alert.ticker.replace(/W$/, ''); // SPXW -> SPX
  const mapFn = alternativesMap[alert.ticker] || alternativesMap[ticker];
  if (mapFn) return mapFn(alert.strike, alert.sentiment);
  return null;
}

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
