import { Fish, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import type { FlowAlert } from "@/hooks/useMarketData";

interface Props {
  whaleAlerts: FlowAlert[];
  loading: boolean;
}

const PortfolioPanel = ({ whaleAlerts, loading }: Props) => {
  const bullishPremium = whaleAlerts
    .filter((a) => a.sentiment === "bullish")
    .reduce((sum, a) => sum + parsePremium(a.premium), 0);
  const bearishPremium = whaleAlerts
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
      {loading && whaleAlerts.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 bg-muted/20 rounded-lg animate-pulse h-14" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {whaleAlerts.map((alert, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  alert.sentiment === "bullish" ? "bg-primary/10" : "bg-destructive/10"
                }`}>
                  <span className={`text-xs font-bold ${
                    alert.sentiment === "bullish" ? "text-primary" : "text-destructive"
                  }`}>{alert.ticker.slice(0, 2)}</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{alert.ticker}</div>
                  <div className="text-[10px] text-muted-foreground">{alert.type} • {alert.strike} • {alert.expiry}</div>
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
                <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                  <Clock className="h-2.5 w-2.5" />
                  {alert.time}
                </div>
              </div>
            </div>
          ))}
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
