import { useState } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PageBanner from "@/components/dashboard/PageBanner";
import ConvictionScoreRing from "@/components/dashboard/ConvictionScoreRing";
import GammaLevelsPanel from "@/components/dashboard/GammaLevelsPanel";
import { Bell, ChevronRight, RefreshCw, Eye, Radio, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      className={`group relative rounded-2xl border ${borderColor} bg-card/60 backdrop-blur-sm p-5 hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 cursor-pointer`}
    >
      {/* Top row: ticker + badges */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <ConvictionScoreRing score={signal.score} label={convictionLabel} size="md" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-black tracking-tight text-foreground">{signal.ticker}</h3>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${status.bg} ${status.text} border ${status.border}`}>
                {status.label}
              </span>
              {signal.putCall === "put" && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40">
                  ↘ PUTS
                </span>
              )}
              <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-border/40">
                {signal.expiry}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className={`font-bold ${accentColor}`}>
                {signal.strike} {isCall ? "CALL" : "PUT"}
              </span>
              <span className="text-muted-foreground/40">→</span>
              <span className={`font-semibold ${accentColor}`}>Target {signal.target}</span>
              {signal.squeezeSince && (
                <>
                  <span className="text-muted-foreground/30">|</span>
                  <span className="text-muted-foreground/60 text-[10px]">Squeeze since {signal.squeezeSince}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Current price */}
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-foreground">{signal.currentPrice}</p>
          <p className="text-[10px] text-emerald-400 font-medium">Just now</p>
        </div>
      </div>

      {/* Bottom row: timestamp + actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border/20">
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
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Crosshair className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-black tracking-tight text-foreground">Breakout Scanner</h1>
            </div>
            <p className="text-sm text-muted-foreground/60">Real-time breakout detection across 40 tickers</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRescan}
            disabled={isScanning}
            className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
            Rescan
          </Button>
        </div>

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
      </div>
    </DashboardLayout>
  );
};

export default DashboardScanner;
