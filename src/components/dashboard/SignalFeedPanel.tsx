import { Activity, TrendingUp, TrendingDown, Clock } from "lucide-react";
import type { MarketSignal } from "@/hooks/useMarketData";

interface Props {
  signals: MarketSignal[];
  loading: boolean;
}

const SignalFeedPanel = ({ signals, loading }: Props) => {
  return (
    <div className="glass-panel rounded-xl p-5 border-glow-blue">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Live Signal Feed</span>
        </div>
        <span className="text-xs bg-primary/20 text-primary px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          {signals.length} Active
        </span>
      </div>

      {loading && signals.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-lg bg-muted/20 animate-pulse h-20" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {signals.map((signal) => (
            <div
              key={signal.id}
              className={`p-3 rounded-lg border-l-2 ${
                signal.type === "bullish"
                  ? "border-l-primary bg-primary/5"
                  : signal.type === "bearish"
                  ? "border-l-destructive bg-destructive/5"
                  : "border-l-muted-foreground bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {signal.type === "bullish" ? (
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  ) : signal.type === "bearish" ? (
                    <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                  ) : null}
                  <span className="font-bold text-foreground text-sm">{signal.ticker}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                      signal.confidence >= 8
                        ? "border-primary text-primary"
                        : signal.confidence >= 6
                        ? "border-accent text-accent"
                        : "border-muted-foreground text-muted-foreground"
                    }`}
                  >
                    {signal.confidence}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{signal.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {signal.tags.map((tag) => (
                    <span key={tag} className="text-[10px] bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {signal.timestamp}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SignalFeedPanel;
