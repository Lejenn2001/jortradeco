import { TrendingDown, TrendingUp, Trophy } from "lucide-react";
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
  date: new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
  tickers: [
    { ticker: "SPY", mentions: 14, direction: "up" },
    { ticker: "NVDA", mentions: 9, direction: "up" },
    { ticker: "TSLA", mentions: 7, direction: "down" },
    { ticker: "AAPL", mentions: 5, direction: "up" },
    { ticker: "QQQ", mentions: 4, direction: "down" },
  ],
  topCall: { ticker: "NVDA", direction: "Calls", result: "+42%" },
  totalMessages: 128,
};

const DailyRecapCard = ({
  date = MOCK_DATA.date,
  tickers = MOCK_DATA.tickers,
  topCall = MOCK_DATA.topCall,
  totalMessages = MOCK_DATA.totalMessages,
}: RecapProps) => {
  return (
    <div className="rounded-lg border border-border/60 bg-gradient-to-r from-primary/5 via-card/80 to-accent/5 p-3">
      <div className="flex items-start gap-3">
        <img src={biddieRobot} alt="Biddie AI" className="h-10 w-10 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Daily Recap</p>
            <span className="text-xs text-foreground font-medium">{date}</span>
            <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">
              {totalMessages} msgs
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Most Discussed:</span>
            {tickers.map((t) => (
              <span
                key={t.ticker}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-[11px] text-foreground"
              >
                {t.direction === "up" ? (
                  <TrendingUp className="h-3 w-3 text-primary" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span className="font-semibold">{t.ticker}</span>
                <span className="text-muted-foreground">×{t.mentions}</span>
              </span>
            ))}
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px]">
            <Trophy className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-foreground">Biddie's Best Call:</span>
            <span className="font-semibold text-foreground">{topCall.ticker} {topCall.direction}</span>
            <span className="font-bold text-primary">{topCall.result}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyRecapCard;
