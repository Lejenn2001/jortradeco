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
  const topTicker = tickers[0];

  return (
    <div className="rounded-lg border border-border/60 bg-card/80 px-2 py-1.5">
      <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
        <div className="flex shrink-0 items-center gap-2 pr-1">
          <img src={biddieRobot} alt="Biddie AI avatar" className="h-5 w-5 shrink-0" />
          <div className="leading-none">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Daily Recap</p>
            <p className="mt-0.5 text-[11px] font-medium text-foreground">{date}</p>
          </div>
        </div>

        <span className="shrink-0 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">
          {totalMessages} msgs
        </span>

        {topTicker && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-[10px] text-foreground">
            {topTicker.direction === "up" ? (
              <TrendingUp className="h-3 w-3 text-primary" />
            ) : (
              <TrendingDown className="h-3 w-3 text-destructive" />
            )}
            <span className="font-semibold">{topTicker.ticker}</span>
            <span className="text-muted-foreground">×{topTicker.mentions}</span>
          </span>
        )}

        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] text-foreground">
          <Trophy className="h-3 w-3 text-primary" />
          <span className="font-medium">
            {topCall.ticker} {topCall.direction}
          </span>
          <span className="text-primary">{topCall.result}</span>
        </span>
      </div>
    </div>
  );
};

export default DailyRecapCard;
