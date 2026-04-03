import { useState } from "react";
import {
  Activity, TrendingUp, TrendingDown, Clock, Target, ShieldX, Zap,
  Crosshair, MapPin, Gauge, Waves, CheckCircle2, Plus, HelpCircle,
  ThumbsUp, ThumbsDown, MessageSquare, Eye, Shield
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { MarketSignal } from "@/hooks/useMarketData";
import SignalLegend from "./SignalLegend";
import ConvictionScoreRing from "./ConvictionScoreRing";
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

function timeframeLabel(tf?: string): string {
  if (tf === "buy_now") return "BUY NOW";
  if (tf === "short_term") return "SWING TRADE";
  return "SWING TRADE";
}

function timeframeBadgeColor(tf?: string): string {
  if (tf === "buy_now") return "bg-yellow-500/90 text-yellow-950";
  return "bg-emerald-500/80 text-emerald-950";
}

function tradeStatusLabel(status?: string | null): { label: string; color: string } | null {
  if (!status) return null;
  switch (status) {
    case "watching": return { label: "WATCHING", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
    case "active": return { label: "ACTIVE", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
    case "hit": return { label: "HIT ✓", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
    case "miss": return { label: "MISS", color: "bg-destructive/20 text-destructive border-destructive/30" };
    case "expired": return { label: "EXPIRED", color: "bg-muted/30 text-muted-foreground border-muted/40" };
    default: return null;
  }
}

function categoryLabel(cat?: string): string {
  if (cat === "whale") return "WHALE PLAY";
  if (cat === "spread") return "SPREAD PLAY";
  return "ALGORITHM PLAY";
}

function categoryColor(cat?: string): string {
  if (cat === "whale") return "text-blue-400";
  if (cat === "spread") return "text-violet-400";
  return "text-emerald-400";
}

function categoryHeaderBg(cat?: string): string {
  if (cat === "whale") return "bg-blue-500/15";
  if (cat === "spread") return "bg-violet-500/15";
  return "bg-emerald-500/15";
}

function mfeLabel(mfe: number | null | undefined): { text: string; color: string } | null {
  if (mfe == null) return null;
  if (mfe >= 75) return { text: `Full Hit (${mfe.toFixed(0)}% MFE)`, color: "text-emerald-400" };
  if (mfe >= 50) return { text: `Partial Hit (${mfe.toFixed(0)}% MFE)`, color: "text-primary" };
  if (mfe >= 30) return { text: `Near Miss (${mfe.toFixed(0)}% MFE)`, color: "text-yellow-400" };
  return { text: `Miss (${mfe.toFixed(0)}% MFE)`, color: "text-destructive" };
}

const SignalFeedPanel = ({ signals, loading, limit, title, subtitle, icon }: Props) => {
  const [tookTrade, setTookTrade] = useState<Set<string>>(new Set());
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
        <div className="space-y-4">
          {displaySignals.map((signal, index) => {
            const score = signal.convictionScore ?? Math.round(signal.confidence * 10);
            const isCall = signal.type === "bullish";
            const cat = signal.category || "algorithm";
            const status = tradeStatusLabel(signal.tradeStatus);
            const mfe = mfeLabel(signal.mfePercent);
            const hasTook = tookTrade.has(signal.id);

            const glowClass = signal.aiEvaluated
              ? "shadow-[0_0_12px_-3px_rgba(16,185,129,0.35)] border-emerald-400/50"
              : cat === "whale"
              ? "border-blue-500/25"
              : cat === "spread"
              ? "border-violet-500/25"
              : isCall
              ? "border-primary/20"
              : "border-destructive/20";

            const bgClass = cat === "whale" ? "bg-blue-500/5" : cat === "spread" ? "bg-violet-500/5" : isCall ? "bg-primary/5" : "bg-destructive/5";

            return (
              <motion.div
                key={signal.id}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                className={`rounded-xl border overflow-hidden transition-all ${glowClass} ${bgClass}`}
              >
                {/* Category header bar */}
                <div className={`px-3 sm:px-4 py-2 flex items-center justify-between ${categoryHeaderBg(cat)}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {cat === "whale" ? (
                      <Waves className="h-3 w-3 text-blue-400" />
                    ) : cat === "spread" ? (
                      <Target className="h-3 w-3 text-violet-400" />
                    ) : (
                      <Zap className="h-3 w-3 text-emerald-400" />
                    )}
                    <span className={`text-[9px] sm:text-[10px] font-bold tracking-widest uppercase ${categoryColor(cat)}`}>
                      {categoryLabel(cat)}
                    </span>
                    <span className={`text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded ${timeframeBadgeColor(signal.timeframe)}`}>
                      {timeframeLabel(signal.timeframe)}
                    </span>
                    {signal.aiEvaluated && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase tracking-wider flex items-center gap-0.5">
                        <CheckCircle2 className="h-2.5 w-2.5" /> BIDDIE PICK
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {signal.timestamp}
                  </span>
                </div>

                {/* Card body */}
                <div className="px-3 sm:px-4 py-3 space-y-3">
                  {/* Ticker + CALL/PUT + Status + Conviction */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isCall ? (
                        <TrendingUp className="h-5 w-5 text-primary" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-destructive" />
                      )}
                      <span className="font-bold text-foreground text-lg">{signal.ticker}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        isCall ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
                      }`}>
                        {signal.putCall === "call" ? "CALL" : signal.putCall === "put" ? "PUT" : signal.type}
                      </span>
                      {status && (
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border flex items-center gap-1 ${status.color}`}>
                          <Eye className="h-2.5 w-2.5" />
                          {status.label}
                        </span>
                      )}
                    </div>
                    <ConvictionScoreRing score={score} label={signal.convictionLabel ?? ""} />
                  </div>

                  {/* Description */}
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                    {compactDescription(signal)}
                  </p>

                  {/* Always-visible trade details */}
                  <div className="grid grid-cols-1 gap-1.5 text-[11px] sm:text-xs">
                    {/* Trade */}
                    {signal.suggestedTrade && (
                      <div className="flex items-start gap-2 bg-muted/30 rounded-lg px-2.5 py-2">
                        <Target className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-muted-foreground">Trade: </span>
                          <span className="text-foreground font-semibold">{signal.suggestedTrade}</span>
                        </div>
                      </div>
                    )}

                    {/* Entry */}
                    {signal.entryTrigger && (
                      <div className="flex items-start gap-2 bg-muted/30 rounded-lg px-2.5 py-2">
                        <TrendingUp className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-muted-foreground">Entry: </span>
                          <span className="text-foreground font-semibold">{signal.entryTrigger}</span>
                        </div>
                      </div>
                    )}

                    {/* Target — green/primary tint */}
                    {signal.targetZone && (
                      <div className="flex items-start gap-2 bg-primary/10 rounded-lg px-2.5 py-2">
                        <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-muted-foreground">Target: </span>
                          <span className="text-primary font-semibold">{signal.targetZone}</span>
                          {signal.targetNear && (
                            <span className="text-primary/70 ml-1">– {signal.targetNear}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Invalidation — red tint */}
                    {signal.invalidation && (
                      <div className="flex items-start gap-2 bg-destructive/10 rounded-lg px-2.5 py-2">
                        <ShieldX className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-muted-foreground">Invalidation: </span>
                          <span className="text-destructive font-semibold">{signal.invalidation}</span>
                        </div>
                      </div>
                    )}

                    {/* Key Level — blue */}
                    {signal.keyLevel && (
                      <div className="flex items-start gap-2 bg-blue-500/10 rounded-lg px-2.5 py-2">
                        <Crosshair className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-muted-foreground">Key Level: </span>
                          <span className="text-blue-400 font-semibold">{signal.keyLevel}</span>
                        </div>
                      </div>
                    )}

                    {/* S/R Level — accent/purple */}
                    {signal.srLevel && (
                      <div className="flex items-start gap-2 bg-violet-500/10 rounded-lg px-2.5 py-2">
                        <Shield className="h-3.5 w-3.5 text-violet-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-muted-foreground">S/R: </span>
                          <span className="text-violet-400 font-semibold">{signal.srLevel}</span>
                        </div>
                      </div>
                    )}

                    {/* Gamma zone */}
                    {signal.gammaZone && (
                      <div className="flex items-start gap-2 bg-accent/10 rounded-lg px-2.5 py-2">
                        <Gauge className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-muted-foreground">Gamma: </span>
                          <span className="text-accent font-semibold uppercase">
                            {signal.gammaZone === "positive" ? "POS GAMMA" : signal.gammaZone === "negative" ? "NEG GAMMA" : "NEUTRAL"}
                          </span>
                          {signal.gammaDescription && (
                            <span className="text-muted-foreground ml-1 text-[10px]">({signal.gammaDescription})</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Spread details */}
                    {signal.spreadDetails && (
                      <div className="flex items-start gap-2 bg-violet-500/10 rounded-lg px-2.5 py-2">
                        <Target className="h-3.5 w-3.5 text-violet-400 mt-0.5 shrink-0" />
                        <div className="min-w-0 space-y-0.5">
                          <span className="text-foreground font-semibold">{signal.spreadDetails.legs}</span>
                          {signal.spreadDetails.max_profit && (
                            <p className="text-muted-foreground">Max profit: ${signal.spreadDetails.max_profit}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tags row */}
                  <div className="flex flex-wrap gap-1.5">
                    {signal.tags.map((tag) => {
                      const isUrgent = tag.includes("ACT NOW") || tag.includes("HIGH CONVICTION");
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
                    {signal.gammaZone && (
                      <span className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5 ${
                        signal.gammaZone === "positive"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : signal.gammaZone === "negative"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-muted/50 text-muted-foreground"
                      }`}>
                        <Shield className="h-2.5 w-2.5" />
                        {signal.gammaZone === "positive" ? "POS GAMMA" : signal.gammaZone === "negative" ? "NEG GAMMA" : "NEUTRAL"}
                      </span>
                    )}
                    {signal.expiry && (
                      <span className="text-[9px] sm:text-[10px] bg-muted/40 text-muted-foreground px-2 py-0.5 rounded-full">
                        Exp: {signal.expiry}
                      </span>
                    )}
                  </div>

                  {/* MFE display */}
                  {mfe && (
                    <div className={`text-[10px] sm:text-[11px] font-semibold ${mfe.color}`}>
                      📊 {mfe.text}
                    </div>
                  )}

                  {/* "I Took This Trade" button */}
                  <button
                    onClick={() => setTookTrade(prev => { const n = new Set(prev); n.add(signal.id); return n; })}
                    className={`w-full rounded-lg border py-2 text-xs font-medium transition-all ${
                      hasTook
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 cursor-default"
                        : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    }`}
                    disabled={hasTook}
                  >
                    {hasTook ? (
                      <span className="flex items-center justify-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Trade Logged</span>
                    ) : (
                      <span className="flex items-center justify-center gap-1.5"><Plus className="h-3.5 w-3.5" /> I Took This Trade</span>
                    )}
                  </button>

                  {/* Review row */}
                  <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                    <span className="text-[10px]">Review:</span>
                    <button className="hover:text-emerald-400 transition-colors p-1 rounded hover:bg-emerald-500/10">
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </button>
                    <button className="hover:text-destructive transition-colors p-1 rounded hover:bg-destructive/10">
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                    <button className="hover:text-foreground transition-colors p-1 rounded hover:bg-muted/30">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
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
