import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Flame, TrendingUp, TrendingDown, Clock, ExternalLink, MessageSquare, BarChart3, AlertTriangle } from "lucide-react";

interface TrumpPost {
  id: string;
  text: string;
  timestamp: string;
  platform: "truth_social" | "twitter";
  sentiment: "bullish" | "bearish" | "neutral";
  tickers_mentioned: string[];
  market_impact: number; // -100 to 100
}

const SAMPLE_POSTS: TrumpPost[] = [
  {
    id: "1",
    text: "The Economy is doing GREAT! Stock Market at ALL TIME HIGHS. America is winning again! 🇺🇸",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    platform: "truth_social",
    sentiment: "bullish",
    tickers_mentioned: ["SPY", "DJI"],
    market_impact: 35,
  },
  {
    id: "2",
    text: "TARIFFS on China will be raised to 60% starting next month. They have been taking advantage of us for too long!",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    platform: "truth_social",
    sentiment: "bearish",
    tickers_mentioned: ["BABA", "FXI", "EEM"],
    market_impact: -65,
  },
  {
    id: "3",
    text: "Just had a great meeting with ELON about the future of AI and Space. Tremendous things happening! @elonmusk",
    timestamp: new Date(Date.now() - 18000000).toISOString(),
    platform: "truth_social",
    sentiment: "bullish",
    tickers_mentioned: ["TSLA", "NVDA"],
    market_impact: 25,
  },
  {
    id: "4",
    text: "The Federal Reserve should LOWER RATES immediately. They are destroying our Country with high interest rates!",
    timestamp: new Date(Date.now() - 28800000).toISOString(),
    platform: "truth_social",
    sentiment: "neutral",
    tickers_mentioned: ["TLT", "XLF"],
    market_impact: -15,
  },
  {
    id: "5",
    text: "Oil prices are TOO HIGH! OPEC better start pumping or there will be consequences. Energy independence is KEY.",
    timestamp: new Date(Date.now() - 43200000).toISOString(),
    platform: "truth_social",
    sentiment: "bearish",
    tickers_mentioned: ["USO", "XLE", "XOM"],
    market_impact: -40,
  },
];

const formatTimeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor(diff / 60000);
  if (hours > 24) return `${Math.floor(hours / 24)}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${minutes}m ago`;
};

const ImpactBar = ({ impact }: { impact: number }) => {
  const abs = Math.abs(impact);
  const isPositive = impact >= 0;
  return (
    <div className="flex items-center gap-2">
      <span className={`text-[10px] font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
        {isPositive ? "+" : ""}{impact}
      </span>
      <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden relative">
        <div className="absolute inset-0 flex">
          <div className="w-1/2" />
          <div className="w-1/2" />
        </div>
        <div
          className={`h-full rounded-full transition-all ${isPositive ? "bg-emerald-400 ml-[50%]" : "bg-red-400"}`}
          style={{
            width: `${abs / 2}%`,
            marginLeft: isPositive ? "50%" : `${50 - abs / 2}%`,
          }}
        />
      </div>
    </div>
  );
};

const TrumpPostCard = ({ post, index }: { post: TrumpPost; index: number }) => {
  const sentimentConfig = {
    bullish: { border: "border-emerald-500/30", bg: "bg-emerald-500/5", badge: "bg-emerald-500/20 text-emerald-400", icon: TrendingUp },
    bearish: { border: "border-red-500/30", bg: "bg-red-500/5", badge: "bg-red-500/20 text-red-400", icon: TrendingDown },
    neutral: { border: "border-border/40", bg: "bg-muted/5", badge: "bg-muted/40 text-muted-foreground", icon: BarChart3 },
  };
  const config = sentimentConfig[post.sentiment];
  const SentimentIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className={`group relative rounded-2xl border ${config.border} ${config.bg} backdrop-blur-sm p-5 hover:bg-card/80 transition-all duration-300`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <span className="text-xs font-black text-red-400">DJT</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-foreground">Donald J. Trump</span>
              <span className="text-[9px] text-muted-foreground/60">@realDonaldTrump</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-muted-foreground/40" />
              <span className="text-[10px] text-muted-foreground/60">{formatTimeAgo(post.timestamp)}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/30 text-muted-foreground/60 border border-border/30">
                {post.platform === "truth_social" ? "Truth Social" : "X"}
              </span>
            </div>
          </div>
        </div>
        <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${config.badge} flex items-center gap-1`}>
          <SentimentIcon className="h-3 w-3" />
          {post.sentiment.toUpperCase()}
        </span>
      </div>

      {/* Post text */}
      <p className="text-sm text-foreground/90 leading-relaxed mb-3">{post.text}</p>

      {/* Tickers */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {post.tickers_mentioned.map((ticker) => (
          <span
            key={ticker}
            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
          >
            ${ticker}
          </span>
        ))}
      </div>

      {/* Impact */}
      <div className="pt-3 border-t border-border/20">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Market Impact Score</span>
        </div>
        <ImpactBar impact={post.market_impact} />
      </div>
    </motion.div>
  );
};

const DashboardTrump = () => {
  const [filter, setFilter] = useState<"all" | "bullish" | "bearish">("all");

  const filteredPosts = SAMPLE_POSTS.filter((p) => filter === "all" || p.sentiment === filter);

  const bullishCount = SAMPLE_POSTS.filter((p) => p.sentiment === "bullish").length;
  const bearishCount = SAMPLE_POSTS.filter((p) => p.sentiment === "bearish").length;
  const avgImpact = SAMPLE_POSTS.reduce((s, p) => s + p.market_impact, 0) / SAMPLE_POSTS.length;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-5 space-y-5">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-border/10 bg-card/80">
          <svg className="absolute inset-0 w-full h-full opacity-[0.35]" viewBox="0 0 1000 200" preserveAspectRatio="none">
            {[40, 95, 150, 205, 260, 315, 370, 425, 480, 535, 590, 645, 700, 755, 810, 865, 920].map((x, i) => {
              const heights = [60, 45, 80, 35, 70, 90, 50, 65, 40, 85, 55, 75, 30, 60, 45, 70, 55];
              const tops = [70, 85, 50, 95, 60, 30, 80, 65, 90, 45, 75, 55, 100, 70, 85, 50, 75];
              const red = i % 2 === 0;
              return (
                <g key={i}>
                  <line x1={x} y1={tops[i] - 15} x2={x} y2={tops[i] + heights[i] + 15} stroke={red ? "hsl(0, 72%, 51%)" : "hsl(142, 71%, 45%)"} strokeWidth="1" opacity="0.3" />
                  <rect x={x - 8} y={tops[i]} width="16" height={heights[i]} fill={red ? "hsl(0, 72%, 51%)" : "hsl(142, 71%, 45%)"} rx="1" opacity="0.2" />
                </g>
              );
            })}
          </svg>
          <div className="absolute inset-0 bg-gradient-to-r from-red-900/15 via-transparent to-emerald-900/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />

          <div className="relative px-6 py-7 lg:py-8">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-10 rounded-full bg-gradient-to-b from-red-500 via-amber-500 to-emerald-500" />
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-[0.15em] uppercase bg-gradient-to-r from-foreground via-foreground to-foreground/50 bg-clip-text text-transparent">
                  TRUMP FEED
                </h1>
                <p className="text-[10px] uppercase tracking-[0.3em] text-red-400/80 font-semibold mt-0.5">
                  Social · Sentiment · Market Impact
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass-panel rounded-xl p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Posts</p>
            <p className="text-xl font-extrabold text-foreground">{SAMPLE_POSTS.length}</p>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Bullish</p>
            <p className="text-xl font-extrabold text-emerald-400">{bullishCount}</p>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Bearish</p>
            <p className="text-xl font-extrabold text-red-400">{bearishCount}</p>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Avg Impact</p>
            <p className={`text-xl font-extrabold ${avgImpact >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {avgImpact >= 0 ? "+" : ""}{avgImpact.toFixed(0)}
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            This feed tracks public social media activity and provides AI-estimated market impact scores.
            It is for <span className="text-foreground font-medium">informational purposes only</span> and does not constitute trading advice.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1.5">
          {(["all", "bullish", "bearish"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f
                  ? f === "bullish"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : f === "bearish"
                    ? "bg-red-500/20 text-red-400 border border-red-500/40"
                    : "bg-primary/20 text-primary border border-primary/40"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {f === "all" ? "All Posts" : f === "bullish" ? "🟢 Bullish" : "🔴 Bearish"}
            </button>
          ))}
        </div>

        {/* Posts */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredPosts.map((post, i) => (
              <TrumpPostCard key={post.id} post={post} index={i} />
            ))}
          </AnimatePresence>
          {filteredPosts.length === 0 && (
            <div className="glass-panel rounded-xl p-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No posts matching this filter.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardTrump;
