import { Activity, TrendingUp, TrendingDown, Clock, AlertTriangle, Target, ShieldX, Zap, Crosshair, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import type { MarketSignal } from "@/hooks/useMarketData";

interface Props {
  signals: MarketSignal[];
  loading: boolean;
  limit?: number;
}

const SignalFeedPanel = ({ signals, loading, limit }: Props) => {
  const displaySignals = limit ? signals.slice(0, limit) : signals;
  return (
    <div className="glass-panel rounded-xl p-5 border-glow-blue">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Live Signal Feed</span>
        </div>
        <span className="text-xs bg-primary/20 text-primary px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          {displaySignals.length} Active
        </span>
      </div>

      {loading && signals.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-lg bg-muted/20 animate-pulse h-36" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {signals.map((signal) => (
            <div
              key={signal.id}
              className={`rounded-xl border overflow-hidden ${
                signal.type === "bullish"
                  ? "border-primary/30 bg-primary/5"
                  : signal.type === "bearish"
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-muted bg-muted/30"
              }`}
            >
              {/* Alert Header */}
              <div
                className={`px-4 py-2 flex items-center justify-between ${
                  signal.type === "bullish"
                    ? "bg-primary/15"
                    : "bg-destructive/15"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-accent" />
                  <span className="text-[10px] font-bold tracking-widest text-accent uppercase">
                    JORTRADE Alert
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {signal.timestamp}
                </span>
              </div>

              <div className="px-4 py-3 space-y-3">
                {/* Ticker + Direction */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {signal.type === "bullish" ? (
                      <TrendingUp className="h-4 w-4 text-primary" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                    <span className="font-bold text-foreground text-base">{signal.ticker}</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        signal.type === "bullish"
                          ? "bg-primary/20 text-primary"
                          : "bg-destructive/20 text-destructive"
                      }`}
                    >
                      {signal.type} Entry Signal
                    </span>
                  </div>
                  <div
                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
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

                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {signal.description}
                </p>

                {/* Trade Details Grid */}
                <div className="grid grid-cols-1 gap-2 text-xs">
                  {signal.suggestedTrade && (
                    <div className="flex items-start gap-2 bg-muted/30 rounded-lg px-3 py-2">
                      <Target className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <span className="text-muted-foreground">Suggested trade: </span>
                        <span className="text-foreground font-semibold">{signal.suggestedTrade}</span>
                      </div>
                    </div>
                  )}

                  {signal.entryTrigger && (
                    <div className="flex items-start gap-2 bg-muted/30 rounded-lg px-3 py-2">
                      <TrendingUp className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <span className="text-muted-foreground">Entry trigger: </span>
                        <span className="text-foreground font-semibold">{signal.entryTrigger}</span>
                      </div>
                    </div>
                  )}

                  {signal.keyLevel && (
                    <div className="flex items-start gap-2 bg-primary/10 rounded-lg px-3 py-2">
                      <Crosshair className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <span className="text-muted-foreground">Key level: </span>
                        <span className="text-primary font-semibold">{signal.keyLevel}</span>
                      </div>
                    </div>
                  )}

                  {signal.targetZone && (
                    <div className="flex items-start gap-2 bg-primary/10 rounded-lg px-3 py-2">
                      <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <span className="text-muted-foreground">Target zone: </span>
                        <span className="text-primary font-semibold">{signal.targetZone}</span>
                      </div>
                    </div>
                  )}

                  {signal.invalidation && (
                    <div className="flex items-start gap-2 bg-destructive/10 rounded-lg px-3 py-2">
                      <ShieldX className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                      <div>
                        <span className="text-muted-foreground">Invalidation: </span>
                        <span className="text-destructive font-semibold">{signal.invalidation}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {signal.tags.map((tag) => {
                    const isUrgent = tag.includes('ACT NOW') || tag.includes('HIGH CONVICTION');
                    return (
                      <span
                        key={tag}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isUrgent
                            ? "bg-destructive/20 text-destructive animate-pulse"
                            : "bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        {tag}
                      </span>
                    );
                  })}
                  {signal.premium && (
                    <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">
                      Premium: {signal.premium}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SignalFeedPanel;
