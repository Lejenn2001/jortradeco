import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface TickerItem {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  isUp: boolean;
}

const FALLBACK_TICKERS: TickerItem[] = [
  { symbol: "SPY", price: "575.42", change: "+2.18", changePercent: "+0.38%", isUp: true },
  { symbol: "QQQ", price: "487.95", change: "+3.21", changePercent: "+0.66%", isUp: true },
  { symbol: "NVDA", price: "143.80", change: "-1.45", changePercent: "-1.00%", isUp: false },
  { symbol: "AAPL", price: "213.50", change: "+0.87", changePercent: "+0.41%", isUp: true },
  { symbol: "TSLA", price: "258.30", change: "-3.12", changePercent: "-1.19%", isUp: false },
  { symbol: "AMD", price: "112.40", change: "-0.95", changePercent: "-0.84%", isUp: false },
  { symbol: "AMZN", price: "198.20", change: "+1.56", changePercent: "+0.79%", isUp: true },
  { symbol: "META", price: "612.80", change: "+4.30", changePercent: "+0.71%", isUp: true },
  { symbol: "MSFT", price: "428.60", change: "+1.20", changePercent: "+0.28%", isUp: true },
  { symbol: "GOOGL", price: "171.35", change: "-0.65", changePercent: "-0.38%", isUp: false },
];

const TickerTape = () => {
  const [tickers] = useState<TickerItem[]>(FALLBACK_TICKERS);

  // Double the list for seamless loop
  const allTickers = [...tickers, ...tickers];

  return (
    <div className="w-full overflow-hidden border-b border-border/30 bg-card/40 backdrop-blur-sm">
      <motion.div
        className="flex items-center gap-6 py-1.5 px-4 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30, ease: "linear", repeat: Infinity }}
      >
        {allTickers.map((t, i) => (
          <div key={`${t.symbol}-${i}`} className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-foreground">{t.symbol}</span>
            <span className="text-[11px] text-muted-foreground">{t.price}</span>
            <span className={`text-[10px] font-semibold ${t.isUp ? "text-emerald-400" : "text-destructive"}`}>
              {t.changePercent}
            </span>
            <span className="text-border/30 text-[8px]">|</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default TickerTape;
