import { Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";

const positions = [
  { ticker: "NQ", type: "Call", entry: "$148.50", current: "$151.20", pnl: "+$2,700", pnlPercent: "+8.2%", positive: true },
  { ticker: "SPX", type: "Call", entry: "$5,180", current: "$5,220", pnl: "+$1,100", pnlPercent: "+3.1%", positive: true },
  { ticker: "PLTR", type: "Put", entry: "$24.10", current: "$23.40", pnl: "+$340", pnlPercent: "+2.9%", positive: true },
  { ticker: "TSLA", type: "Call", entry: "$178", current: "$175.50", pnl: "-$250", pnlPercent: "-1.4%", positive: false },
];

const PortfolioPanel = () => {
  return (
    <div className="glass-panel rounded-xl p-5 border-glow-blue">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Portfolio Overview</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Total P&L", value: "+$3,890", color: "text-primary" },
          { label: "Win Rate", value: "78%", color: "text-foreground" },
          { label: "Active Trades", value: "4", color: "text-foreground" },
        ].map((s) => (
          <div key={s.label} className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
            <div className={`font-bold text-lg ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Positions */}
      <div className="space-y-2">
        {positions.map((pos) => (
          <div key={pos.ticker + pos.type} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{pos.ticker.slice(0, 2)}</span>
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{pos.ticker}</div>
                <div className="text-[10px] text-muted-foreground">{pos.type} • Entry {pos.entry}</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-bold flex items-center gap-1 ${pos.positive ? "text-primary" : "text-destructive"}`}>
                {pos.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {pos.pnl}
              </div>
              <div className={`text-[10px] ${pos.positive ? "text-primary/70" : "text-destructive/70"}`}>
                {pos.pnlPercent}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortfolioPanel;
