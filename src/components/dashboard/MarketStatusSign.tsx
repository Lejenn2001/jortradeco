import { useState, useEffect } from "react";

function getMarketState() {
  const now = new Date();

  // Get current ET components using Intl (reliable timezone conversion)
  const etParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parseInt(etParts.find((p) => p.type === type)?.value || "0");
  const etHour = get("hour") === 24 ? 0 : get("hour");
  const etMin = get("minute");
  const etDay = now.toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "short" });

  const totalMin = etHour * 60 + etMin;
  const openMin = 9 * 60 + 30;  // 9:30 AM ET
  const closeMin = 16 * 60;     // 4:00 PM ET

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const isWeekday = weekdays.includes(etDay);
  const isOpen = isWeekday && totalMin >= openMin && totalMin < closeMin;

  let targetLabel = "";
  let targetTime = "";
  let diffMs = 0;

  // Build a proper Date in ET by computing offset from UTC
  const buildETDate = (daysAhead: number, hour: number, min: number) => {
    // Start from current UTC midnight of the ET date
    const etDateStr = now.toLocaleDateString("en-US", { timeZone: "America/New_York" });
    const base = new Date(etDateStr);
    base.setDate(base.getDate() + daysAhead);
    // Create target in ET by using a formatter round-trip
    const target = new Date(
      base.toLocaleDateString("en-US") + ` ${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`
    );
    // Adjust: find the real UTC time for this ET moment
    // The offset between "now in UTC" vs "now displayed as ET" tells us the shift
    const offsetMs = now.getTime() - new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" })).getTime();
    return new Date(target.getTime() + offsetMs);
  };

  if (isOpen) {
    targetLabel = "Closes at";
    targetTime = "4:00 PM ET";
    const closeUTC = buildETDate(0, 16, 0);
    diffMs = closeUTC.getTime() - now.getTime();
  } else {
    targetLabel = "Opens at";
    targetTime = "9:30 AM ET";

    // Figure out days until next weekday open
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayNum = dayMap[etDay] ?? 0;
    let daysAhead = 0;

    if (isWeekday && totalMin < openMin) {
      daysAhead = 0; // Today before open
    } else {
      daysAhead = 1;
      let nextDayNum = (dayNum + 1) % 7;
      while (nextDayNum === 0 || nextDayNum === 6) {
        daysAhead++;
        nextDayNum = (nextDayNum + 1) % 7;
      }
    }

    const openUTC = buildETDate(daysAhead, 9, 30);
    diffMs = openUTC.getTime() - now.getTime();
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
