import { useState } from "react";
import { Activity, TrendingUp, TrendingDown, Clock, Target, ShieldX, Zap, Crosshair, MapPin, Gauge, Waves, CheckCircle2, Flame, Plus, Check, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { MarketSignal } from "@/hooks/useMarketData";
import SignalLegend from "./SignalLegend";
import ConvictionScoreRing from "./ConvictionScoreRing";
import BeginnerTooltip from "./BeginnerTooltip";
import { compactDescription } from "@/lib/simplifyDescription";

interface Props {
  signals: MarketSignal[];
  loading: boolean;
  limit?: number;
  title?: string;
  subtitle?: string;
  icon?: "algorithm" | "whale" | "spread";
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.4, delay: i * 0.12, ease: "easeOut" as const },
  }),
};

const SignalFeedPanel = ({ signals, loading, limit, title, subtitle, icon }: Props) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const displaySignals = limit ? signals.slice(0, limit) : signals;
  const isWhale = icon === "whale";
  const isSpread = icon === "spread";
  const isAlgo = icon === "algorithm";
  const headerTitle = title || "Live Signal Feed";
  const headerIcon = isWhale
    ? <Waves className="h-4 w-4 text-blue-400" />
    : isSpread
    ? <Target className="h-4 w-4 text-violet-400" />
    : isAlgo
    ? <Zap className="h-4 w-4 text-emerald-400" />
    : <Activity className="h-4 w-4 text-primary" />;
  const accentColor = isWhale ? "text-blue-400" : isSpread ? "text-violet-400" : isAlgo ? "text-emerald-400" : "text-primary";
  const accentBg = isWhale ? "bg-blue-400/20" : isSpread ? "bg-violet-400/20" : isAlgo ? "bg-emerald-400/20" : "bg-primary/20";

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className={`glass-panel rounded-xl p-5 ${isWhale ? "border-blue-500/30 border" : isSpread ? "border-violet-500/30 border" : isAlgo ? "border-emerald-500/30 border" : "border-glow-blue"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {headerIcon}
          <span className={`font-semibold text-sm ${accentColor}`}>{headerTitle}</span>
          {subtitle && (
            <div className="relative group">
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/40 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 px-3 py-2 rounded-lg bg-popover border border-border text-[10px] text-muted-foreground w-52 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 shadow-lg leading-relaxed">
                {subtitle}
              </div>
            </div>
          )}
        </div>
        <span className={`text-xs ${accentBg} ${accentColor} px-2.5 py-0.5 rounded-full flex items-center gap-1`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isWhale ? "bg-blue-400" : isSpread ? "bg-violet-400" : isAlgo ? "bg-emerald-400" : "bg-primary"} animate-pulse`} />
          {displaySignals.length} Active
        </span>
      </div>

      {!icon && <SignalLegend />}

      {loading && signals.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-lg bg-muted/20 animate-pulse h-28" />
          ))}
        </div>
      ) : displaySignals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm font-semibold text-foreground">No Signals Right Now</p>
          <p className="text-xs text-muted-foreground mt-1">Biddie scans for setups during market hours (9:30 AM – 4 PM ET)</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displaySignals.map((signal, index) => {
            const score = signal.convictionScore ?? Math.round(signal.confidence * 10);
            const isExpanded = expandedIds.has(signal.id);
            const isWhaleCard = signal.category === "whale";
            const isSpreadCard = signal.category === "spread";
            const isCall = signal.type === "bullish";

            const glowClass = signal.aiEvaluated
              ? "shadow-[0_0_12px_-3px_rgba(16,185,129,0.35)] border-emerald-400/50"
              : isWhaleCard
              ? score >= 85
                ? "shadow-[0_0_10px_-3px_rgba(59,130,246,0.3)] border-blue-500/35"
                : "border-blue-500/25"
              : isSpreadCard
              ? score >= 85
                ? "shadow-[0_0_10px_-3px_rgba(139,92,246,0.3)] border-violet-500/35"
                : "border-violet-500/25"
              : score >= 85
              ? "shadow-[0_0_10px_-3px_hsl(var(--primary)/0.3)] border-primary/35"
              : score >= 70
              ? "border-primary/25"
              : isCall
              ? "border-primary/20"
              : "border-destructive/20";

            const bgClass = isWhaleCard ? "bg-blue-500/5" : isSpreadCard ? "bg-violet-500/5" : isCall ? "bg-primary/5" : "bg-destructive/5";

            return (
              <motion.div
                key={signal.id}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                className={`rounded-xl border overflow-visible transition-all ${glowClass} ${bgClass}`}
              >
                {/* Category header */}
                <div className={`px-3 sm:px-4 py-2 flex items-center justify-between ${
                  isWhaleCard ? "bg-blue-500/15" : isSpreadCard ? "bg-violet-500/15" : isCall ? "bg-primary/15" : "bg-destructive/15"
                }`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {isWhaleCard ? (
                      <Waves className="h-3 w-3 text-blue-400" />
                    ) : isSpreadCard ? (
                      <Target className="h-3 w-3 text-violet-400" />
                    ) : (
                      <Zap className="h-3 w-3 text-accent" />
                    )}
                    <span className={`text-[9px] sm:text-[10px] font-bold tracking-widest uppercase ${
                      isWhaleCard ? "text-blue-400" : isSpreadCard ? "text-violet-400" : "text-accent"
                    }`}>
                      {isWhaleCard ? "WHALE PLAY" : isSpreadCard ? "SPREAD PLAY" : "TOP SIGNAL"}
                    </span>
                    {signal.aiEvaluated && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase tracking-wider flex items-center gap-0.5">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Biddie Pick
                      </span>
                    )}
                    <span className="text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase tracking-wider">Live</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {signal.timestamp}
                  </span>
                </div>

                <div className="px-3 sm:px-4 py-3 space-y-2.5">
                  {/* Ticker + Direction + Conviction */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isCall ? (
                        <TrendingUp className="h-4 w-4 text-primary" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      )}
                      <span className="font-bold text-foreground text-base">{signal.ticker}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        isCall ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
                      }`}>
                        {signal.putCall === "call" ? "CALL" : signal.putCall === "put" ? "PUT" : signal.type}
                      </span>
                      {signal.premium && (
                        <span className="text-[10px] sm:text-xs text-accent font-semibold">{signal.premium}</span>
                      )}
                    </div>
                    <ConvictionScoreRing
                      score={score}
                      label={signal.convictionLabel ?? ""}
                    />
                  </div>

                  {/* Description */}
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                    {compactDescription(signal)}
                  </p>

                  {/* Trade details - collapsible */}
                  <button
                    onClick={() => toggleExpanded(signal.id)}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {isExpanded ? "Hide details" : "View trade details"}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 gap-1.5 text-[11px] sm:text-xs">
                          {signal.suggestedTrade && (
                            <div className="flex items-start gap-2 bg-muted/30 rounded-lg px-2.5 py-1.5">
                              <Target className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <span className="text-muted-foreground">Trade: </span>
                                <span className="text-foreground font-semibold">{signal.suggestedTrade}</span>
                              </div>
                            </div>
                          )}
                          {signal.entryTrigger && (
                            <div className="flex items-start gap-2 bg-muted/30 rounded-lg px-2.5 py-1.5">
                              <TrendingUp className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <span className="text-muted-foreground">Entry: </span>
                                <span className="text-foreground font-semibold">{signal.entryTrigger}</span>
                              </div>
                            </div>
                          )}
                          {signal.targetZone && (
                            <div className="flex items-start gap-2 bg-primary/10 rounded-lg px-2.5 py-1.5">
                              <MapPin className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <span className="text-muted-foreground">Target: </span>
                                <span className="text-primary font-semibold">{signal.targetZone}</span>
                              </div>
                            </div>
                          )}
                          {signal.targetNear && (
                            <div className="flex items-start gap-2 bg-primary/10 rounded-lg px-2.5 py-1.5">
                              <Crosshair className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <span className="text-muted-foreground">Near target: </span>
                                <span className="text-primary font-semibold">{signal.targetNear}</span>
                              </div>
                            </div>
                          )}
                          {signal.invalidation && (
                            <div className="flex items-start gap-2 bg-destructive/10 rounded-lg px-2.5 py-1.5">
                              <ShieldX className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <span className="text-muted-foreground">Invalidation: </span>
                                <span className="text-destructive font-semibold">{signal.invalidation}</span>
                              </div>
                            </div>
                          )}
                          {signal.keyLevel && (
                            <div className="flex items-start gap-2 bg-primary/10 rounded-lg px-2.5 py-1.5">
                              <Crosshair className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <span className="text-muted-foreground">Key level: </span>
                                <span className="text-primary font-semibold">{signal.keyLevel}</span>
                              </div>
                            </div>
                          )}
                          {signal.gammaLevelLabel && (
                            <div className="flex items-start gap-2 bg-accent/10 rounded-lg px-2.5 py-1.5">
                              <Gauge className="h-3 w-3 text-accent mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <span className="text-muted-foreground">S/R: </span>
                                <span className="text-accent font-semibold">{signal.gammaLevelLabel}</span>
                              </div>
                            </div>
                          )}
                          {signal.spreadDetails && (
                            <div className="flex items-start gap-2 bg-violet-500/10 rounded-lg px-2.5 py-1.5">
                              <Target className="h-3 w-3 text-violet-400 mt-0.5 shrink-0" />
                              <div className="min-w-0 space-y-0.5">
                                <span className="text-foreground font-semibold">{signal.spreadDetails.legs}</span>
                                {signal.spreadDetails.max_profit && (
                                  <p className="text-muted-foreground">Max profit: ${signal.spreadDetails.max_profit}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {signal.tags.map((tag) => {
                      const isUrgent = tag.includes('ACT NOW') || tag.includes('HIGH CONVICTION');
                      return (
                        <span
                          key={tag}
                          className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            isUrgent
                              ? "bg-destructive/20 text-destructive animate-pulse"
                              : "bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          {tag}
                        </span>
                      );
                    })}
                    {signal.expiry && (
                      <span className="text-[9px] sm:text-[10px] bg-muted/40 text-muted-foreground px-2 py-0.5 rounded-full">
                        Exp: {signal.expiry}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      {limit && signals.length > limit && (
        <Link to="/dashboard/signals" className="block mt-3 text-center text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
          View All {signals.length} Signals →
        </Link>
      )}
    </div>
  );
};

export default SignalFeedPanel;
