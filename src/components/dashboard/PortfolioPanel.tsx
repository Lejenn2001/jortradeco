import { Fish, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";

const whaleAlerts = [
  { ticker: "SPY", type: "Call Sweep", premium: "$2.4M", strike: "$530", expiry: "Mar 28", sentiment: "bullish" as const, time: "1 min ago" },
  { ticker: "NVDA", type: "Put Block", premium: "$1.8M", strike: "$880", expiry: "Apr 4", sentiment: "bearish" as const, time: "4 min ago" },
  { ticker: "TSLA", type: "Call Sweep", premium: "$960K", strike: "$185", expiry: "Mar 28", sentiment: "bullish" as const, time: "7 min ago" },
  { ticker: "AAPL", type: "Put Sweep", premium: "$1.1M", strike: "$170", expiry: "Apr 11", sentiment: "bearish" as const, time: "12 min ago" },
  { ticker: "META", type: "Call Block", premium: "$3.2M", strike: "$520", expiry: "Apr 18", sentiment: "bullish" as const, time: "18 min ago" },
];

const PortfolioPanel = () => {
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
          { label: "Bullish Flow", value: "$6.6M", color: "text-primary" },
          { label: "Bearish Flow", value: "$2.9M", color: "text-destructive" },
          { label: "Net Sentiment", value: "Bullish", color: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
            <div className={`font-bold text-sm ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
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
    </div>
  );
};

export default PortfolioPanel;
