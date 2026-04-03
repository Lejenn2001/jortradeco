import { useState } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PageBanner from "@/components/dashboard/PageBanner";
import ConvictionScoreRing from "@/components/dashboard/ConvictionScoreRing";
import GammaLevelsPanel from "@/components/dashboard/GammaLevelsPanel";
import { Bell, ChevronRight, RefreshCw, Eye, Radio, Crosshair, Info, ChevronUp, Zap, BarChart3, TrendingUp, Target, Activity, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ScannerSignal {
  ticker: string;
  score: number;
  putCall: "call" | "put";
  strike: string;
  target: string;
  currentPrice: string;
  expiry: string;
  status: "watch" | "radar" | "squeeze";
  squeezeSince?: string;
  description?: string;
  postedAt: string;
}

const MOCK_SIGNALS: ScannerSignal[] = [
  {
    ticker: "TLT",
    score: 40,
    putCall: "call",
    strike: "$86",
    target: "$89.83",
    currentPrice: "$85.82",
    expiry: "Weekly",
    status: "watch",
    postedAt: "Mar 28 9:35 PM",
  },
  {
    ticker: "MARA",
    score: 32,
    putCall: "call",
    strike: "$8",
    target: "$10.05",
    currentPrice: "$8.00",
    expiry: "Weekly",
    status: "squeeze",
    squeezeSince: "Mar 28",
    description: "Squeeze activ...",
    postedAt: "Mar 28 9:35 PM",
  },
  {
    ticker: "INTC",
    score: 32,
    putCall: "put",
    strike: "$43",
    target: "$40.41",
    currentPrice: "$43.02",
    expiry: "Weekly",
    status: "radar",
    squeezeSince: "Mar 28",
    postedAt: "Mar 28 9:35 PM",
  },
  {
    ticker: "META",
    score: 28,
    putCall: "put",
    strike: "$520",
    target: "$498.84",
    currentPrice: "$520.07",
    expiry: "Weekly",
    status: "radar",
    postedAt: "Mar 28 9:35 PM",
  },
  {
    ticker: "NVDA",
    score: 72,
    putCall: "call",
    strike: "$118",
    target: "$125.50",
    currentPrice: "$117.80",
    expiry: "Apr 4",
    status: "watch",
    postedAt: "Mar 28 10:12 PM",
  },
];

const statusConfig = {
  watch: { label: "WATCH & SET ALERT", bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/40" },
  radar: { label: "ON YOUR RADAR", bg: "bg-muted/40", text: "text-muted-foreground", border: "border-border/60" },
  squeeze: { label: "SQUEEZE ACTIVE", bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/40" },
};

const ScannerCard = ({ signal, index }: { signal: ScannerSignal; index: number }) => {
  const isCall = signal.putCall === "call";
  const borderColor = isCall ? "border-emerald-500/30" : "border-red-500/30";
  const accentColor = isCall ? "text-emerald-400" : "text-red-400";
  const status = statusConfig[signal.status];
  const convictionLabel = signal.score >= 70 ? "High" : signal.score >= 50 ? "Elevated" : "Moderate";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className={`group relative rounded-2xl border ${borderColor} bg-card/60 backdrop-blur-sm p-4 hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 cursor-pointer`}
    >
      {/* Header: Conviction + Ticker + Price */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <ConvictionScoreRing score={signal.score} label={convictionLabel} size="md" />
          <h3 className="text-xl font-black tracking-tight text-foreground">{signal.ticker}</h3>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-foreground">{signal.currentPrice}</p>
          <p className="text-[10px] text-emerald-400 font-medium">Just now</p>
        </div>
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${status.bg} ${status.text} border ${status.border}`}>
          {status.label}
        </span>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isCall ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-red-500/20 text-red-400 border border-red-500/40"}`}>
          {isCall ? "↗ CALLS" : "↘ PUTS"}
        </span>
        <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-border/40">
          {signal.expiry}
        </span>
      </div>

      {/* Trade details */}
      <div className="space-y-1 mb-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Strike:</span>
          <span className={`font-bold ${accentColor}`}>{signal.strike} {isCall ? "CALL" : "PUT"}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Target:</span>
          <span className={`font-semibold ${accentColor}`}>{signal.target}</span>
        </div>
        {signal.squeezeSince && (
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-muted-foreground">Squeeze since:</span>
            <span className="text-orange-400 font-medium">{signal.squeezeSince}</span>
          </div>
        )}
      </div>

      {/* Bottom row: timestamp + actions */}
      <div className="flex items-center justify-between pt-2.5 border-t border-border/20">
        <span className="text-[10px] text-muted-foreground/50">Posted {signal.postedAt}</span>
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const TRACKED_TICKERS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA", "AMD", "SPY", "QQQ",
  "NFLX", "COIN", "MARA", "RIOT", "PLTR", "SOFI", "NIO", "BABA", "BA", "DIS",
  "JPM", "GS", "V", "MA", "XOM", "CVX", "GLD", "SLV", "TLT", "IWM",
  "MRVL", "MU", "INTC", "AVGO", "CRM", "SNOW", "NET", "DKNG", "UBER", "ABNB",
];

const EducationCard = ({ icon, title, children, borderColor = "border-border/40" }: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  borderColor?: string;
}) => (
  <div className={`rounded-xl border ${borderColor} bg-card/60 p-4 space-y-2`}>
    <div className="flex items-center gap-2">
      {icon}
      <h4 className="font-bold text-sm text-foreground">{title}</h4>
    </div>
    <div className="text-xs text-muted-foreground leading-relaxed space-y-1.5">
      {children}
    </div>
  </div>
);

const HowItWorksSection = () => {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between rounded-xl border border-border/40 bg-card/60 px-5 py-4 hover:bg-card/80 transition-colors">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="font-bold text-sm text-foreground">How It Works</span>
        </div>
        <ChevronUp className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "" : "rotate-180"}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-4">
        {/* Intro */}
        <div className="text-xs text-muted-foreground leading-relaxed px-1">
          A <strong className="text-foreground">breakout</strong> is when a stock's price suddenly moves past a key level (resistance or support) with strong volume. This scanner watches for the conditions that lead to breakouts so you can be ready before they happen.
        </div>

        {/* How the Scanner Works */}
        <EducationCard icon={<Crosshair className="h-4 w-4 text-primary" />} title="How the Scanner Works" borderColor="border-primary/20">
          <p>The scanner runs every 5 minutes, analyzing 40 stocks for squeeze patterns, consolidation zones, and breakout setups. When it finds something building up, it shows up here as a card with a score.</p>
          <p>Once setups are found, a live price monitor kicks in — watching those stocks in real-time, every second. When a stock actually breaks through its key level with volume, you get an instant alert. The scanner finds the setups, the monitor catches the breakout.</p>
        </EducationCard>

        {/* What is a Squeeze */}
        <EducationCard icon={<Zap className="h-4 w-4 text-yellow-400" />} title="What is a Squeeze?" borderColor="border-yellow-500/30">
          <p>A squeeze happens when a stock's price range gets really tight — it stops moving much in either direction. Think of it like pulling back a rubber band. The tighter you pull, the harder it snaps.</p>
          <p><strong className="text-yellow-400">Why it matters:</strong> Squeezes almost always lead to big, fast moves. The stock is building up energy, and when it finally breaks out of that tight range, it tends to move explosively.</p>
          <p><strong className="text-yellow-400">Candles count:</strong> Shows how long the squeeze has been active. More candles = more energy building up = bigger expected move.</p>
        </EducationCard>

        {/* What is Consolidation */}
        <EducationCard icon={<BarChart3 className="h-4 w-4 text-violet-400" />} title="What is Consolidation?" borderColor="border-violet-500/30">
          <p>Consolidation is when a stock trades sideways in a narrow range for multiple days. The price keeps bouncing between the same high and low levels without picking a direction.</p>
          <p><strong className="text-violet-400">Why days matter:</strong> The longer a stock consolidates (3+ days is ideal), the bigger the eventual move. It's like a spring being compressed — more time compressing = more force when it releases.</p>
        </EducationCard>

        {/* What is Volume */}
        <EducationCard icon={<TrendingUp className="h-4 w-4 text-cyan-400" />} title="What is Volume?" borderColor="border-cyan-500/30">
          <p>Volume is how many shares are being traded. When volume is 2x or 3x higher than normal, it means big money is moving in — institutions, hedge funds, or a wave of traders all jumping at once.</p>
          <p><strong className="text-cyan-400">Why it matters:</strong> A breakout without volume is fake — price might just fall back. A breakout WITH heavy volume means real money is behind the move and it's more likely to keep going.</p>
        </EducationCard>

        {/* What is Proximity */}
        <EducationCard icon={<Target className="h-4 w-4 text-emerald-400" />} title="What is Proximity?" borderColor="border-emerald-500/30">
          <p>This shows how close the current price is to the breakout level (resistance or support). If proximity is 0.5%, the stock is right at the edge — one push and it breaks. If it's 3%, there's still some distance to go.</p>
        </EducationCard>

        {/* What is BB/KC Ratio */}
        <EducationCard icon={<Activity className="h-4 w-4 text-muted-foreground" />} title="What is the BB/KC Ratio?" borderColor="border-border/40">
          <p>This is the technical measurement behind the squeeze. BB stands for Bollinger Bands (a measure of price volatility) and KC stands for Keltner Channels (a measure of average price range).</p>
          <p><strong className="text-foreground">Simple version:</strong> When the ratio is below 1.0, the squeeze is ON — volatility has compressed inside the normal range. The lower the number, the tighter the squeeze. When it climbs back above 1.0, the breakout is starting.</p>
        </EducationCard>

        {/* Breakout Readiness Score */}
        <div className="space-y-3 px-1">
          <div>
            <h4 className="font-bold text-sm text-foreground">Breakout Readiness Score (0–100)</h4>
            <p className="text-xs text-muted-foreground mt-1">Each factor above adds points to the score. The more factors that are active and stacking together, the higher the score — and the closer the stock is to breaking out.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-muted/40 bg-card/60 p-3.5">
              <p className="text-xs font-bold text-muted-foreground mb-1"><span className="text-foreground">20–35</span>  On Your Radar</p>
              <p className="text-[11px] text-muted-foreground">Something is starting to form but it's early. Keep an eye on it, but don't act yet — it might fizzle out.</p>
            </div>
            <div className="rounded-xl border border-yellow-500/30 bg-card/60 p-3.5">
              <p className="text-xs font-bold text-yellow-400 mb-1"><span className="text-yellow-400">35–55</span>  Watch & Set Alert</p>
              <p className="text-[11px] text-muted-foreground">A real setup is forming. Hit the bell icon so you get notified when it breaks. Look at the suggested contract and decide how much you'd want to risk.</p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-card/60 p-3.5">
              <p className="text-xs font-bold text-emerald-400 mb-1"><span className="text-emerald-400">55–75</span>  High Alert — Breakout Imminent</p>
              <p className="text-[11px] text-muted-foreground">Multiple factors are lined up and price is right near the breakout level. Stay ready. When the alert fires, that's your entry signal.</p>
            </div>
            <div className="rounded-xl border border-emerald-400/50 bg-card/60 p-3.5">
              <p className="text-xs font-bold text-emerald-300 mb-1"><span className="text-emerald-300">75–100</span>  Breakout Confirmed — Enter Now</p>
              <p className="text-[11px] text-muted-foreground">It broke. Price pushed through the key level with heavy volume behind it. The alert card above has the trade details — this is the entry moment.</p>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const TrackedTickersSection = () => {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between rounded-xl border border-border/40 bg-card/60 px-5 py-4 hover:bg-card/80 transition-colors">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <span className="font-bold text-sm text-foreground">Tracked Tickers ({TRACKED_TICKERS.length})</span>
        </div>
        <ChevronUp className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "" : "rotate-180"}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">
        <div className="rounded-xl border border-border/40 bg-card/60 p-5 space-y-4">
          <p className="text-xs text-muted-foreground">These {TRACKED_TICKERS.length} stocks are scanned every 5 minutes for squeeze, consolidation, and breakout setups.</p>
          <div className="flex flex-wrap gap-2">
            {TRACKED_TICKERS.map((ticker) => (
              <span key={ticker} className="px-3 py-1.5 rounded-lg border border-border/60 bg-background/40 text-xs font-semibold text-foreground">
                {ticker}
              </span>
            ))}
          </div>
          <div className="pt-2 border-t border-border/20">
            <p className="text-xs text-primary font-semibold mb-2">Your Custom Tickers</p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-xs font-semibold text-foreground">
                SNDK <X className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground" />
              </span>
            </div>
          </div>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors">
            + Suggest More Tickers
          </button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

const DashboardScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const setups = MOCK_SIGNALS.filter((s) => s.status === "watch").length;
  const live = MOCK_SIGNALS.filter((s) => s.status === "squeeze" || s.status === "radar").length;

  const handleRescan = () => {
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6 space-y-6">
        <PageBanner
          title="BREAKOUT SCANNER"
          subtitle="Detection · Alerts · Execution"
          accentFrom="hsl(38, 92%, 50%)"
          accentTo="hsl(45, 93%, 47%)"
          gradientFrom="from-amber-900/15"
          gradientTo="to-yellow-900/10"
        />

        {/* Stats bar */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground/60 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
            Scanned 7m ago
          </span>
          <span>40 tickers</span>
          <span className="text-emerald-400 font-semibold">{setups} setups</span>
          <span className="flex items-center gap-1.5">
            <Radio className="w-3 h-3" />
            {live} tickers live
          </span>
          <span className="flex items-center gap-1.5 text-primary">
            <Eye className="w-3 h-3" />
            1 watched
          </span>
        </div>

        {/* Gamma Levels Panel */}
        <GammaLevelsPanel ticker="SPX" />

        {/* Cards grid */}
        <div className="grid sm:grid-cols-2 gap-4">
          {MOCK_SIGNALS.map((signal, i) => (
            <ScannerCard key={signal.ticker} signal={signal} index={i} />
          ))}
        </div>

        {/* How It Works — Collapsible */}
        <HowItWorksSection />

        {/* Tracked Tickers — Collapsible */}
        <TrackedTickersSection />
      </div>
    </DashboardLayout>
  );
};

export default DashboardScanner;
