import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface TickerItem {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  isUp: boolean;
}

const SYMBOLS = ["SPY", "QQQ", "NVDA", "AAPL", "TSLA", "AMD", "AMZN", "META", "MSFT", "GOOGL"];

const FALLBACK_TICKERS: TickerItem[] = [
  { symbol: "SPY", price: "—", change: "", changePercent: "—", isUp: true },
  { symbol: "QQQ", price: "—", change: "", changePercent: "—", isUp: true },
  { symbol: "NVDA", price: "—", change: "", changePercent: "—", isUp: true },
  { symbol: "AAPL", price: "—", change: "", changePercent: "—", isUp: true },
  { symbol: "TSLA", price: "—", change: "", changePercent: "—", isUp: true },
  { symbol: "AMD", price: "—", change: "", changePercent: "—", isUp: true },
  { symbol: "AMZN", price: "—", change: "", changePercent: "—", isUp: true },
  { symbol: "META", price: "—", change: "", changePercent: "—", isUp: true },
  { symbol: "MSFT", price: "—", change: "", changePercent: "—", isUp: true },
  { symbol: "GOOGL", price: "—", change: "", changePercent: "—", isUp: true },
];

const TickerTape = () => {
  const [tickers, setTickers] = useState<TickerItem[]>(FALLBACK_TICKERS);

  const fetchPrices = useCallback(async () => {
    try {
      // Use Yahoo Finance v8 quote endpoint via a CORS-friendly approach
      const symbolList = SYMBOLS.join(",");
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${SYMBOLS[0]}?interval=1d&range=1d`
      );
      
      // If Yahoo direct doesn't work due to CORS, use alternative
      if (!res.ok) throw new Error("Yahoo blocked");

      // Fetch all symbols individually (Yahoo v8 chart endpoint)
      const results = await Promise.allSettled(
        SYMBOLS.map(async (symbol) => {
          const r = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
          );
          if (!r.ok) throw new Error(`Failed ${symbol}`);
          const data = await r.json();
          const meta = data.chart.result[0].meta;
          const price = meta.regularMarketPrice;
          const prevClose = meta.chartPreviousClose || meta.previousClose;
          const change = price - prevClose;
          const changePct = (change / prevClose) * 100;
          return {
            symbol,
            price: price.toFixed(2),
            change: `${change >= 0 ? "+" : ""}${change.toFixed(2)}`,
            changePercent: `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`,
            isUp: change >= 0,
          } as TickerItem;
        })
      );

      const fetched = results
        .filter((r): r is PromiseFulfilledResult<TickerItem> => r.status === "fulfilled")
        .map((r) => r.value);

      if (fetched.length > 0) {
        setTickers(fetched);
      }
    } catch {
      // Try Finnhub as fallback (free tier, no key needed for quotes)
      try {
        const results = await Promise.allSettled(
          SYMBOLS.map(async (symbol) => {
            const r = await fetch(
              `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=demo`
            );
            if (!r.ok) throw new Error(`Failed ${symbol}`);
            const data = await r.json();
            if (!data.c || data.c === 0) throw new Error("No data");
            const price = data.c;
            const change = data.d || 0;
            const changePct = data.dp || 0;
            return {
              symbol,
              price: price.toFixed(2),
              change: `${change >= 0 ? "+" : ""}${change.toFixed(2)}`,
              changePercent: `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`,
              isUp: change >= 0,
            } as TickerItem;
          })
        );

        const fetched = results
          .filter((r): r is PromiseFulfilledResult<TickerItem> => r.status === "fulfilled")
          .map((r) => r.value);

        if (fetched.length > 0) {
          setTickers(fetched);
        }
      } catch {
        console.warn("All ticker price sources failed");
      }
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    // Refresh every 60 seconds
    const interval = setInterval(fetchPrices, 60_000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

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
