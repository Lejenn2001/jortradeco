import { TrendingUp, TrendingDown, Trophy, Clock } from "lucide-react";
import biddieRobot from "@/assets/biddie-robot.png";

interface RecapTicker {
  ticker: string;
  mentions: number;
  direction: "up" | "down";
}

interface RecapProps {
  date?: string;
  tickers?: RecapTicker[];
  topCall?: { ticker: string; direction: string; result: string };
  totalMessages?: number;
}

const MOCK_DATA: Required<RecapProps> = {
  date: new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }),
  tickers: [
    { ticker: "SPY", mentions: 14, direction: "up" },
    { ticker: "NVDA", mentions: 9, direction: "up" },
    { ticker: "TSLA", mentions: 7, direction: "down" },
    { ticker: "AAPL", mentions: 5, direction: "up" },
    { ticker: "QQQ", mentions: 4, direction: "down" },
  ],
  topCall: { ticker: "NVDA", direction: "Calls", result: "+42% 🔥" },
  totalMessages: 128,
};

const DailyRecapCard = ({
  date = MOCK_DATA.date,
  tickers = MOCK_DATA.tickers,
  topCall = MOCK_DATA.topCall,
  totalMessages = MOCK_DATA.totalMessages,
}: RecapProps) => {
  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card/80 to-accent/5 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={biddieRobot} alt="Biddie" className="w-8 h-8 drop-shadow-[0_0_8px_hsl(230_85%_60%_/_0.3)]" />
          <div>
            <h3 className="text-sm font-bold text-foreground">Daily Recap</h3>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {date} · Market Close
            </p>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">
          {totalMessages} messages today
        </div>
      </div>

      {/* Top Discussed Tickers */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
          🔥 Most Discussed
        </p>
        <div className="flex flex-wrap gap-1.5">
          {tickers.map((t, i) => (
            <div
              key={t.ticker}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium ${
                i === 0
                  ? "bg-primary/15 border-primary/30 text-primary"
                  : "bg-muted/30 border-border/40 text-foreground"
              }`}
            >
              {t.direction === "up" ? (
                <TrendingUp className="h-3 w-3 text-emerald-400" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-400" />
              )}
              <span className="font-bold">{t.ticker}</span>
              <span className="text-muted-foreground text-[10px]">×{t.mentions}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Biddie's Best Call */}
      <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
        <Trophy className="h-4 w-4 text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">Biddie's Best Call</p>
          <p className="text-xs text-foreground font-medium">
            {topCall.ticker} {topCall.direction} → {topCall.result}
          </p>
        </div>
      </div>

      <p className="text-[9px] text-muted-foreground/50 text-center">
        Auto-generated at market close · Powered by JORTRADE
      </p>
    </div>
  );
};

export default DailyRecapCard;
