import { useState, useEffect } from "react";

function getETNow() {
  // Get the current ET time components reliably
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false, weekday: "short",
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return {
    now,
    weekday: get("weekday"),
    hour: parseInt(get("hour")) % 24,
    minute: parseInt(get("minute")),
    second: parseInt(get("second")),
  };
}

function getMarketState() {
  const { now, weekday, hour, minute, second } = getETNow();
  const totalSec = hour * 3600 + minute * 60 + second;
  const premarketSec = 4 * 3600;           // 4:00 AM ET
  const openSec = 9 * 3600 + 30 * 60;      // 9:30 AM ET
  const closeSec = 16 * 3600;              // 4:00 PM ET
  const afterHoursEnd = 20 * 3600;          // 8:00 PM ET

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const isWeekday = weekdays.includes(weekday);

  // Determine session
  const isPremarket = isWeekday && totalSec >= premarketSec && totalSec < openSec;
  const isOpen = isWeekday && totalSec >= openSec && totalSec < closeSec;
  const isAfterHours = isWeekday && totalSec >= closeSec && totalSec < afterHoursEnd;

  let status: "open" | "premarket" | "afterhours" | "closed";
  let targetLabel = "";
  let targetTime = "";
  let remainingSec = 0;

  if (isOpen) {
    status = "open";
    targetLabel = "Closes at";
    targetTime = "4:00 PM ET";
    remainingSec = closeSec - totalSec;
  } else if (isPremarket) {
    status = "premarket";
    targetLabel = "Market opens at";
    targetTime = "9:30 AM ET";
    remainingSec = openSec - totalSec;
  } else if (isAfterHours) {
    status = "afterhours";
    targetLabel = "After-hours end at";
    targetTime = "8:00 PM ET";
    remainingSec = afterHoursEnd - totalSec;
  } else {
    status = "closed";

    // Find next session: premarket at 4:00 AM on next weekday
    const secLeftToday = 86400 - totalSec;

    if (isWeekday && totalSec < premarketSec) {
      // Before premarket on a weekday
      targetLabel = "Pre-market opens at";
      targetTime = "4:00 AM ET";
      remainingSec = premarketSec - totalSec;
    } else {
      // After all sessions or weekend — find next weekday
      targetLabel = "Pre-market opens at";
      targetTime = "4:00 AM ET";
      const dayOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayIdx = dayOrder.indexOf(weekday);
      let daysAhead = 1;
      let nextIdx = (dayIdx + 1) % 7;
      while (nextIdx === 0 || nextIdx === 6) {
        daysAhead++;
        nextIdx = (nextIdx + 1) % 7;
      }
      remainingSec = secLeftToday + (daysAhead - 1) * 86400 + premarketSec;
    }
  }

  remainingSec = Math.max(0, remainingSec);
  const h = Math.floor(remainingSec / 3600);
  const m = Math.floor((remainingSec % 3600) / 60);
  const s = remainingSec % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  parts.push(`${s}s`);
  const countdown = parts.join(" ");

  return { status, isOpen: status === "open", countdown, targetLabel, targetTime };
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
