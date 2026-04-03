import { useState } from "react";
import { TrendingUp, TrendingDown, Clock, Target, ShieldX, Zap, Crosshair, MapPin, Gauge, Waves, CheckCircle2, ChevronDown, ChevronUp, Plus, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { MarketSignal } from "@/hooks/useMarketData";
import ConvictionScoreRing from "./ConvictionScoreRing";
import { compactDescription } from "@/lib/simplifyDescription";

interface Props {
  signal: MarketSignal | null;
  loading: boolean;
  category: "algorithm" | "whale" | "spread";
}

function getTimeframeLabel(signal: MarketSignal): string {
  if (signal.timeframe === "buy_now") return "ACT NOW";
  if (signal.timeframe === "short_term") return "1-3 DAY TRADE";
  return "SWING TRADE";
}

function getTimeframeBg(signal: MarketSignal): string {
  if (signal.timeframe === "buy_now") return "bg-destructive/20 text-destructive";
  if (signal.timeframe === "short_term") return "bg-accent/20 text-accent";
  return "bg-primary/20 text-primary";
}

function getDteBadge(expiry: string | undefined): string | null {
  if (!expiry) return null;
  const exp = new Date(expiry);
  if (isNaN(exp.getTime())) return null;
  const now = new Date();
  const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "0DTE";
  if (diffDays === 1) return "1DTE";
  if (diffDays <= 7) return `${diffDays}DTE`;
  return null;
}

const categoryConfig = {
  algorithm: {
    icon: <Zap className="h-3.5 w-3.5 text-emerald-400" />,
    label: "TOP ALGO PLAY",
    accentColor: "text-emerald-400",
    headerBg: "bg-emerald-500/15",
    borderColor: "border-emerald-500/30",
    cardBg: "bg-emerald-500/5",
  },
  whale: {
    icon: <Waves className="h-3.5 w-3.5 text-blue-400" />,
    label: "TOP WHALE PLAY",
    accentColor: "text-blue-400",
    headerBg: "bg-blue-500/15",
    borderColor: "border-blue-500/30",
    cardBg: "bg-blue-500/5",
  },
  spread: {
    icon: <Target className="h-3.5 w-3.5 text-violet-400" />,
    label: "TOP SPREAD PLAY",
    accentColor: "text-violet-400",
    headerBg: "bg-violet-500/15",
    borderColor: "border-violet-500/30",
    cardBg: "bg-violet-500/5",
  },
};

const TopPlayCard = ({ signal, loading, category }: Props) => {
  const [showDetails, setShowDetails] = useState(false);
  const config = categoryConfig[category];

  if (loading) {
    return (
      <div className={`rounded-xl border ${config.borderColor} overflow-hidden`}>
        <div className={`px-4 py-2.5 ${config.headerBg}`}>
          <div className="h-4 w-32 bg-muted/30 rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-3">
          <div className="h-5 w-24 bg-muted/20 rounded animate-pulse" />
          <div className="h-4 w-full bg-muted/20 rounded animate-pulse" />
          <div className="h-8 w-full bg-muted/10 rounded animate-pulse" />
          <div className="h-8 w-full bg-muted/10 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!signal) {
    return (
      <div className={`rounded-xl border ${config.borderColor} overflow-hidden ${config.cardBg}`}>
        <div className={`px-4 py-2.5 ${config.headerBg} flex items-center gap-2`}>
          {config.icon}
          <span className={`text-[10px] font-bold tracking-widest uppercase ${config.accentColor}`}>
            {config.label}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center px-4">
          <p className="text-sm font-semibold text-foreground">No {category} signals yet</p>
          <p className="text-[11px] text-muted-foreground mt-1">Biddie scans during market hours (9:30 AM – 4 PM ET)</p>
        </div>
      </div>
    );
  }

  const score = signal.convictionScore ?? Math.round(signal.confidence * 10);
  const isCall = signal.type === "bullish";
  const dteBadge = getDteBadge(signal.expiry);
  const tradeStatus = signal.tradeStatus || "watching";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`rounded-xl border ${config.borderColor} overflow-hidden ${config.cardBg}`}
    >
      {/* Category header bar */}
      <div className={`px-4 py-2.5 flex items-center justify-between ${config.headerBg}`}>
        <div className="flex items-center gap-2 flex-wrap">
          {config.icon}
          <span className={`text-[10px] font-bold tracking-widest uppercase ${config.accentColor}`}>
            {config.label}
          </span>
          {signal.aiEvaluated && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase tracking-wider flex items-center gap-0.5">
              <CheckCircle2 className="h-2.5 w-2.5" /> Biddie Pick
            </span>
          )}
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${getTimeframeBg(signal)} uppercase tracking-wider`}>
            {getTimeframeLabel(signal)}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          {signal.timestamp}
        </span>
      </div>

      {/* Main content */}
      <div className="px-4 py-3.5 space-y-3">
        {/* Ticker row + conviction ring */}
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {isCall ? (
                <TrendingUp className="h-4 w-4 text-primary" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className="font-black text-foreground text-lg tracking-wide">{signal.ticker}</span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                isCall ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
              }`}>
                {signal.putCall === "call" ? "CALL" : signal.putCall === "put" ? "PUT" : signal.type}
              </span>
              {dteBadge && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                  {dteBadge}
                </span>
              )}
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                tradeStatus === "active" ? "bg-primary/20 text-primary" :
                tradeStatus === "hit" ? "bg-emerald-500/20 text-emerald-400" :
                "bg-accent/20 text-accent"
              }`}>
                <Eye className="h-2.5 w-2.5" />
                {tradeStatus === "active" ? "ACTIVE" : tradeStatus === "hit" ? "HIT" : "WATCHING"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed max-w-lg">
              {compactDescription(signal)}
            </p>
          </div>
          <div className="shrink-0 ml-3">
            <ConvictionScoreRing score={score} label={signal.convictionLabel ?? ""} />
          </div>
        </div>

        {/* Always-visible trade details */}
        <div className="grid grid-cols-1 gap-1.5 text-xs">
          {signal.suggestedTrade && (
            <div className="flex items-start gap-2 bg-muted/30 rounded-lg px-3 py-2">
              <Target className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-muted-foreground">Trade: </span>
                <span className="text-foreground font-bold">{signal.suggestedTrade}</span>
              </div>
            </div>
          )}
          {signal.entryTrigger && (
            <div className="flex items-start gap-2 bg-muted/30 rounded-lg px-3 py-2">
              <TrendingUp className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-muted-foreground">Entry: </span>
                <span className="text-foreground font-bold">{signal.entryTrigger}</span>
              </div>
            </div>
          )}
          {signal.targetZone && (
            <div className="flex items-start gap-2 bg-primary/10 rounded-lg px-3 py-2">
              <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-muted-foreground">Target: </span>
                <span className="text-primary font-semibold">
                  {signal.targetZone}
                  {signal.targetNear && ` – ${signal.targetNear}`}
                </span>
              </div>
            </div>
          )}
          {signal.invalidation && (
            <div className="flex items-start gap-2 bg-destructive/10 rounded-lg px-3 py-2">
              <ShieldX className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-muted-foreground">Invalidation: </span>
                <span className="text-destructive font-semibold">{signal.invalidation}</span>
              </div>
            </div>
          )}
          {signal.keyLevel && (
            <div className="flex items-start gap-2 bg-blue-500/10 rounded-lg px-3 py-2">
              <Crosshair className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-muted-foreground">Key level: </span>
                <span className="text-blue-400 font-semibold">{signal.keyLevel}</span>
              </div>
            </div>
          )}
          {signal.srLevel && (
            <div className="flex items-start gap-2 bg-violet-500/10 rounded-lg px-3 py-2">
              <Gauge className="h-3.5 w-3.5 text-violet-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-muted-foreground">S/R: </span>
                <span className="text-violet-400 font-semibold">{signal.srLevel}</span>
              </div>
            </div>
          )}
        </div>

        {/* Expandable extra details */}
        {(signal.spreadDetails || signal.reason || signal.gammaDescription) && (
          <>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showDetails ? "Hide details" : "Show details"}
            </button>
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 gap-1.5 text-xs">
                    {signal.reason && (
                      <div className="bg-muted/20 rounded-lg px-3 py-2 text-[11px] text-muted-foreground leading-relaxed">
                        {signal.reason}
                      </div>
                    )}
                    {signal.gammaDescription && (
                      <div className="flex items-start gap-2 bg-accent/10 rounded-lg px-3 py-2">
                        <Gauge className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
                        <span className="text-accent font-semibold text-[11px]">{signal.gammaDescription}</span>
                      </div>
                    )}
                    {signal.spreadDetails && (
                      <div className="flex items-start gap-2 bg-violet-500/10 rounded-lg px-3 py-2">
                        <Target className="h-3.5 w-3.5 text-violet-400 mt-0.5 shrink-0" />
                        <div className="min-w-0 space-y-0.5">
                          <span className="text-foreground font-semibold">{signal.spreadDetails.legs}</span>
                          <div className="flex gap-3 text-[10px] text-muted-foreground">
                            {signal.spreadDetails.max_profit && <span>Max profit: <span className="text-primary">${signal.spreadDetails.max_profit}</span></span>}
                            {signal.spreadDetails.max_loss && <span>Max loss: <span className="text-destructive">${signal.spreadDetails.max_loss}</span></span>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Bottom: Tags + I Took This Trade */}
        <div className="flex items-center justify-between pt-1 border-t border-border/10">
          <div className="flex flex-wrap gap-1.5">
            {signal.tags.slice(0, 5).map((tag) => {
              const isGamma = tag.includes("GAMMA");
              const isUrgent = tag.includes("ACT NOW") || tag.includes("HIGH CONVICTION");
              return (
                <span
                  key={tag}
                  className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${
                    isGamma
                      ? "bg-accent/20 text-accent border border-accent/30"
                      : isUrgent
                      ? "bg-destructive/20 text-destructive animate-pulse"
                      : "bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {isGamma && "🛡 "}{tag}
                </span>
              );
            })}
          </div>
          <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors shrink-0">
            <Plus className="h-3 w-3" />
            I Took This Trade
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default TopPlayCard;
