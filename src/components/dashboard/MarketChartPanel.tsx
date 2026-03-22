import { useState } from "react";
import { TrendingUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const candlesticks = [
  { x: 20, o: 160, c: 145, h: 138, l: 165, bull: true },
  { x: 40, o: 145, c: 155, h: 138, l: 158, bull: false },
  { x: 60, o: 150, c: 135, h: 128, l: 155, bull: true },
  { x: 80, o: 135, c: 140, h: 128, l: 148, bull: false },
  { x: 100, o: 140, c: 125, h: 118, l: 148, bull: true },
  { x: 120, o: 125, c: 130, h: 118, l: 138, bull: false },
  { x: 140, o: 128, c: 115, h: 108, l: 135, bull: true },
  { x: 160, o: 115, c: 120, h: 108, l: 128, bull: false },
  { x: 180, o: 118, c: 105, h: 98, l: 125, bull: true },
  { x: 200, o: 105, c: 112, h: 98, l: 118, bull: false },
  { x: 220, o: 110, c: 95, h: 88, l: 118, bull: true },
  { x: 240, o: 95, c: 102, h: 88, l: 108, bull: false },
  { x: 260, o: 100, c: 88, h: 80, l: 108, bull: true },
  { x: 280, o: 88, c: 78, h: 70, l: 95, bull: true },
  { x: 300, o: 78, c: 85, h: 68, l: 90, bull: false },
  { x: 320, o: 83, c: 72, h: 65, l: 90, bull: true },
  { x: 340, o: 72, c: 62, h: 55, l: 78, bull: true },
  { x: 360, o: 62, c: 68, h: 55, l: 75, bull: false },
  { x: 380, o: 66, c: 55, h: 48, l: 72, bull: true },
  { x: 400, o: 55, c: 48, h: 42, l: 62, bull: true },
];

const quickTickers = ["NQ", "SPX", "PLTR", "TSLA"];

const MarketChartPanel = () => {
  const [activeTicker, setActiveTicker] = useState("NQ");
  const [searchValue, setSearchValue] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      setActiveTicker(searchValue.trim().toUpperCase());
      setSearchValue("");
    }
  };

  return (
    <div className="glass-panel rounded-xl p-5 border-glow-purple">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Market Structure</span>
        </div>
        <span className="text-xs bg-primary/20 text-primary px-2.5 py-0.5 rounded-full">Bullish Bias ↗</span>
      </div>

      {/* Ticker search + quick picks */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search ticker..."
            className="pl-8 h-8 text-xs bg-muted/30 border-border/50 rounded-lg"
          />
        </form>
        <div className="flex gap-2">
          {quickTickers.map((ticker) => (
            <button
              key={ticker}
              onClick={() => setActiveTicker(ticker)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                activeTicker === ticker
                  ? "bg-primary/20 text-primary font-medium"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {ticker}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-52 w-full mb-4 bg-muted/20 rounded-lg overflow-hidden">
        <svg viewBox="0 0 420 200" className="w-full h-full" preserveAspectRatio="none">
          {/* Grid lines */}
          {[50, 100, 150].map((y) => (
            <line key={y} x1="0" y1={y} x2="420" y2={y} stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />
          ))}

          {/* Key levels */}
          <line x1="0" y1="90" x2="420" y2="90" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="6 4" opacity="0.5" />
          <rect x="200" y="30" width="220" height="35" fill="hsl(var(--primary))" opacity="0.06" rx="4" />
          <rect x="100" y="150" width="220" height="25" fill="hsl(var(--destructive))" opacity="0.06" rx="4" />

          {/* Candlesticks */}
          {candlesticks.map((c, i) => {
            const top = Math.min(c.o, c.c);
            const bottom = Math.max(c.o, c.c);
            const color = c.bull ? "hsl(var(--primary))" : "hsl(var(--destructive))";
            return (
              <g key={i}>
                <line x1={c.x} y1={c.h} x2={c.x} y2={c.l} stroke={color} strokeWidth="1.5" />
                <rect x={c.x - 5} y={top} width="10" height={Math.max(bottom - top, 2)} fill={color} rx="1" />
              </g>
            );
          })}
        </svg>

        {/* Labels */}
        <div className="absolute top-3 right-3 text-[10px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded">
          Call Zone 150–152.5
        </div>
        <div className="absolute bottom-3 right-3 text-[10px] text-destructive font-medium bg-destructive/10 px-2 py-0.5 rounded">
          Invalidation: $147
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 border-t border-border/40 pt-3">
        {[
          { label: "Asset", value: "NQ Futures" },
          { label: "Strategy", value: "Call Option" },
          { label: "Expiration", value: "Mar 27" },
          { label: "AI Score", value: "9.1 / 10" },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-[10px] text-muted-foreground">{stat.label}</div>
            <div className="font-bold text-foreground text-xs">{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketChartPanel;
