import { useState, useEffect } from "react";

function getMarketState() {
  const now = new Date();
  // Convert to ET
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay(); // 0=Sun, 6=Sat
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const totalMin = hours * 60 + minutes;

  const openMin = 9 * 60 + 30;  // 9:30 AM
  const closeMin = 16 * 60;     // 4:00 PM

  const isWeekday = day >= 1 && day <= 5;
  const isOpen = isWeekday && totalMin >= openMin && totalMin < closeMin;

  let targetLabel = "";
  let targetTime = "";
  let diffMs = 0;

  if (isOpen) {
    targetLabel = "Closes at";
    targetTime = "4:00 PM ET";
    const closeToday = new Date(et);
    closeToday.setHours(16, 0, 0, 0);
    diffMs = closeToday.getTime() - et.getTime();
  } else {
    targetLabel = "Opens at";
    targetTime = "9:30 AM ET";
    const nextOpen = new Date(et);
    
    if (isWeekday && totalMin < openMin) {
      nextOpen.setHours(9, 30, 0, 0);
    } else {
      nextOpen.setDate(nextOpen.getDate() + 1);
      while (nextOpen.getDay() === 0 || nextOpen.getDay() === 6) {
        nextOpen.setDate(nextOpen.getDate() + 1);
      }
      nextOpen.setHours(9, 30, 0, 0);
    }
    diffMs = nextOpen.getTime() - et.getTime();
  }

  const totalSec = Math.max(0, Math.floor(diffMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  parts.push(`${s}s`);
  const countdown = parts.join(" ");

  return { isOpen, countdown, targetLabel, targetTime };
}

const MarketStatusSign = () => {
  const [state, setState] = useState(getMarketState);

  useEffect(() => {
    const interval = setInterval(() => setState(getMarketState()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel rounded-xl p-4 border-glow-purple relative overflow-hidden">
      {/* Neon glow background */}
      <div
        className={`absolute inset-0 rounded-xl transition-all duration-1000 ${
          state.isOpen
            ? "bg-[radial-gradient(ellipse_at_center,hsl(142_71%_45%/0.15),transparent_70%)]"
            : "bg-[radial-gradient(ellipse_at_center,hsl(0_72%_51%/0.1),transparent_70%)]"
        }`}
      />

      <div className="relative flex items-center justify-between gap-4">
        {/* Neon sign */}
        <div className="flex items-center gap-3">
          {/* Glowing dot */}
          <div className="relative">
            <div
              className={`w-3 h-3 rounded-full ${
                state.isOpen ? "bg-green-500" : "bg-destructive"
              }`}
            />
            <div
              className={`absolute inset-0 w-3 h-3 rounded-full animate-ping ${
                state.isOpen ? "bg-green-500/60" : "bg-destructive/40"
              }`}
            />
          </div>

          {/* OPEN / CLOSED text — neon style */}
          <span
            className={`text-lg font-black tracking-[0.25em] uppercase ${
              state.isOpen
                ? "text-green-400 drop-shadow-[0_0_8px_hsl(142_71%_45%/0.8)] drop-shadow-[0_0_20px_hsl(142_71%_45%/0.4)]"
                : "text-destructive drop-shadow-[0_0_8px_hsl(0_72%_51%/0.6)]"
            }`}
            style={{
              textShadow: state.isOpen
                ? "0 0 7px hsl(142 71% 45% / 0.8), 0 0 20px hsl(142 71% 45% / 0.4), 0 0 40px hsl(142 71% 45% / 0.2)"
                : "0 0 7px hsl(0 72% 51% / 0.6), 0 0 20px hsl(0 72% 51% / 0.3)",
            }}
          >
            {state.isOpen ? "Market Open" : "Market Closed"}
          </span>
        </div>

        {/* Countdown */}
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {state.targetLabel} <span className="text-foreground font-medium">{state.targetTime}</span>
          </div>
          <div
            className={`text-sm font-mono font-bold tracking-wider ${
              state.isOpen ? "text-green-400" : "text-muted-foreground"
            }`}
          >
            {state.countdown}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketStatusSign;
