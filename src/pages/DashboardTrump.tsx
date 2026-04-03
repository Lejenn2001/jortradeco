import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { MessageSquare, Repeat2, Heart, RefreshCw, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TrumpPost {
  id: string;
  text: string;
  timestamp: string;
  handle: string;
  sentiment: "bullish" | "bearish" | "neutral";
  comments: number;
  retweets: number;
  likes: number;
}

const formatTimeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor(diff / 60000);
  if (hours > 24) return `${Math.floor(hours / 24)}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${minutes}m ago`;
};

const formatCount = (n: number) => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
};

const sentimentBadge = (s: string) => {
  switch (s) {
    case "bullish": return { label: "Bullish", cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
    case "bearish": return { label: "Bearish", cls: "bg-red-500/20 text-red-400 border-red-500/30" };
    default: return { label: "Neutral", cls: "bg-muted/40 text-muted-foreground border-border/40" };
  }
};

const SAMPLE_POSTS: TrumpPost[] = [
  {
    id: "1",
    text: "With a little more time, we can easily OPEN THE HORMUZ STRAIT, TAKE THE OIL, & MAKE A FORTUNE. IT WOULD BE A \"GUSHER\" FOR THE WORLD??? President DONALD J. TRUMP",
    timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
    handle: "@realDonaldTrump",
    sentiment: "neutral",
    comments: 2500,
    retweets: 3400,
    likes: 14400,
  },
  {
    id: "2",
    text: "Vice President JD Vance is now in charge of \"FRAUD\" in the United States. It is massive and pervasive, and the job he will be doing, in conjunction with many great people within the Trump Administration, will be a major factor in how great the future of our Country will be. We will call him the \"FRAUD CZAR,\" and his focus will be \"EVERYWHERE,\" but primarily in those Blue States where CROOKED DEMOCRAT POLITICIANS, like those in California, Illinois, Minnesota (Somalia beware!), Maine, New York, and many others, have had a \"free for all\" in the unprecedented theft of Taxpayer Money. The numbers are so large that, if successful, we would literally be able to balance our American Budget. Raids have already started in L.A. Good Luck JD!",
    timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
    handle: "@realDonaldTrump",
    sentiment: "neutral",
    comments: 3600,
    retweets: 6900,
    likes: 29500,
  },
  {
    id: "3",
    text: "The Economy is doing GREAT! Stock Market at ALL TIME HIGHS. We are WINNING like never before. MAGA! 🇺🇸",
    timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
    handle: "@realDonaldTrump",
    sentiment: "bullish",
    comments: 1800,
    retweets: 4200,
    likes: 22000,
  },
  {
    id: "4",
    text: "TARIFFS are working. China wants to make a deal. They know they can't win. We have all the cards! The great American worker is finally being protected.",
    timestamp: new Date(Date.now() - 8 * 3600000).toISOString(),
    handle: "@realDonaldTrump",
    sentiment: "bearish",
    comments: 2100,
    retweets: 3800,
    likes: 18500,
  },
];

const TrumpPostCard = ({ post, index }: { post: TrumpPost; index: number }) => {
  const badge = sentimentBadge(post.sentiment);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm p-5 hover:bg-card/80 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
            <span className="text-xs font-black text-red-400">DT</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">Donald J. Trump</span>
              <span className="text-[10px] text-muted-foreground/60">{post.handle}</span>
              <span className="text-[10px] text-muted-foreground/40">·</span>
              <span className="text-[10px] text-muted-foreground/60">{formatTimeAgo(post.timestamp)}</span>
            </div>
          </div>
        </div>
        <span className={`text-[9px] font-bold px-2 py-1 rounded-full border ${badge.cls} flex items-center gap-1`}>
          — {badge.label}
        </span>
      </div>

      {/* Post text */}
      <p className="text-sm text-foreground/90 leading-relaxed mb-4">{post.text}</p>

      {/* Engagement */}
      <div className="flex items-center gap-6 text-muted-foreground/60">
        <span className="flex items-center gap-1.5 text-xs hover:text-foreground transition-colors cursor-pointer">
          <MessageSquare className="h-3.5 w-3.5" /> {formatCount(post.comments)}
        </span>
        <span className="flex items-center gap-1.5 text-xs hover:text-emerald-400 transition-colors cursor-pointer">
          <Repeat2 className="h-3.5 w-3.5" /> {formatCount(post.retweets)}
        </span>
        <span className="flex items-center gap-1.5 text-xs hover:text-red-400 transition-colors cursor-pointer">
          <Heart className="h-3.5 w-3.5" /> {formatCount(post.likes)}
        </span>
      </div>
    </motion.div>
  );
};

const DashboardTrump = () => {
  const [posts, setPosts] = useState<TrumpPost[]>(SAMPLE_POSTS);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-5 space-y-5">
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

          <div className="relative px-6 py-7 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-10 rounded-full bg-gradient-to-b from-red-500 via-amber-500 to-emerald-500" />
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-[0.15em] uppercase bg-gradient-to-r from-foreground via-foreground to-foreground/50 bg-clip-text text-transparent">
                  TRUMP FEED
                </h1>
                <p className="text-[10px] uppercase tracking-[0.3em] text-red-400/80 font-semibold mt-0.5">
                  Truth Social × Market Impact
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground/60">Updated {formatTimeAgo(new Date(Date.now() - 60000).toISOString())}</span>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/30 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <Bell className="h-3.5 w-3.5" /> Subscribe
              </button>
              <button
                onClick={handleRefresh}
                className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {posts.map((post, i) => (
              <TrumpPostCard key={post.id} post={post} index={i} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardTrump;
