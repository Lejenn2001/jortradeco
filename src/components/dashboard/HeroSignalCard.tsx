import { motion } from "framer-motion";
import { Zap, TrendingUp, TrendingDown, Target, MapPin, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import type { MarketSignal } from "@/hooks/useMarketData";
import ConvictionScoreRing from "./ConvictionScoreRing";

interface Props {
  signal: MarketSignal | null;
  loading: boolean;
}

const HeroSignalCard = ({ signal, loading }: Props) => {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-8 animate-pulse h-48" />
    );
  }

  if (!signal) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-8 text-center"
      >
        <Zap className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No high-conviction signals right now</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Biddie is scanning the flow…</p>
      </motion.div>
    );
  }

  const score = signal.convictionScore ?? Math.round(signal.confidence * 10);
  const isBullish = signal.type === "bullish";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`relative rounded-2xl border overflow-hidden ${
        isBullish
          ? "border-primary/30 bg-primary/[0.03]"
          : "border-destructive/30 bg-destructive/[0.03]"
      }`}
    >
      {/* Ambient glow behind card */}
      <div
        className={`absolute inset-0 opacity-30 ${
          isBullish
            ? "bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.15),transparent_60%)]"
            : "bg-[radial-gradient(ellipse_at_top_right,hsl(var(--destructive)/0.15),transparent_60%)]"
        }`}
      />

      {/* Header strip */}
      <div className={`relative px-6 py-2.5 flex items-center justify-between ${
        isBullish ? "bg-primary/10" : "bg-destructive/10"
      }`}>
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-accent" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase">
            Top Signal
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase tracking-wider">
            Live
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          {signal.timestamp}
        </span>
      </div>

      {/* Main content */}
      <div className="relative px-6 py-5">
        <div className="flex items-start justify-between gap-6">
          {/* Left: ticker + details */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              {isBullish ? (
                <TrendingUp className="h-6 w-6 text-primary" />
              ) : (
                <TrendingDown className="h-6 w-6 text-destructive" />
              )}
              <span className="text-2xl font-bold text-foreground tracking-tight">
                {signal.ticker}
              </span>
              <span
                className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                  isBullish
                    ? "bg-primary/20 text-primary"
                    : "bg-destructive/20 text-destructive"
                }`}
              >
                {signal.putCall === "call" ? "CALL" : signal.putCall === "put" ? "PUT" : signal.type}
              </span>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              {signal.description}
            </p>

            {/* Key details row */}
            <div className="flex flex-wrap gap-3">
              {signal.suggestedTrade && (
                <div className="flex items-center gap-1.5 text-xs bg-muted/30 rounded-lg px-3 py-1.5">
                  <Target className="h-3 w-3 text-primary" />
                  <span className="text-foreground font-medium">{signal.suggestedTrade}</span>
                </div>
              )}
              {signal.targetZone && (
                <div className="flex items-center gap-1.5 text-xs bg-muted/30 rounded-lg px-3 py-1.5">
                  <MapPin className="h-3 w-3 text-primary" />
                  <span className="text-foreground font-medium">Target: {signal.targetZone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: conviction ring (large) */}
          <div className="shrink-0">
            <ConvictionScoreRing score={score} label={signal.convictionLabel ?? ""} size={80} />
          </div>
        </div>
      </div>

      {/* View all link */}
      <div className="px-6 pb-4">
        <Link
          to="/dashboard/signals"
          className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          View all signals →
        </Link>
      </div>
    </motion.div>
  );
};

export default HeroSignalCard;
