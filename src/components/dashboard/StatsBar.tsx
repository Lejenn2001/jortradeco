import { TrendingUp, Activity, Target, BarChart3 } from "lucide-react";

const stats = [
  { label: "Market Sentiment", value: "Bullish", icon: TrendingUp, color: "text-primary" },
  { label: "Active Signals", value: "4", icon: Activity, color: "text-primary" },
  { label: "Avg Confidence", value: "7.6", icon: Target, color: "text-accent" },
  { label: "Today's Trades", value: "3", icon: BarChart3, color: "text-foreground" },
];

const StatsBar = () => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="glass-panel rounded-xl p-4 border-glow-blue flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</div>
            <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsBar;
