import { useState, useEffect } from "react";
import { Globe, Moon, Landmark, Building2 } from "lucide-react";
import { useWeather } from "@/hooks/useWeather";

/* ─── ET time helpers ─── */
function getETNow() {
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

/* ─── Market state logic ─── */
function getMarketState() {
  const { weekday, hour, minute, second } = getETNow();
  const totalSec = hour * 3600 + minute * 60 + second;
  const futuresSundaySec = 18 * 3600;
  const premarketSec = 4 * 3600;
  const openSec = 9 * 3600 + 30 * 60;
  const closeSec = 16 * 3600;
  const afterHoursEnd = 20 * 3600;

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const isWeekday = weekdays.includes(weekday);
  const isSunday = weekday === "Sun";
  const isSundayFutures = isSunday && totalSec >= futuresSundaySec;

  const isPremarket = isWeekday && totalSec >= premarketSec && totalSec < openSec;
  const isOpen = isWeekday && totalSec >= openSec && totalSec < closeSec;
  const isAfterHours = isWeekday && totalSec >= closeSec && totalSec < afterHoursEnd;

  let status: "open" | "premarket" | "afterhours" | "closed" | "futures";
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
  } else if (isSundayFutures) {
    status = "futures";
    targetLabel = "Pre-market opens at";
    targetTime = "4:00 AM ET";
    remainingSec = (86400 - totalSec) + premarketSec;
  } else if (isAfterHours) {
    status = "afterhours";
    targetLabel = "After-hours end at";
    targetTime = "8:00 PM ET";
    remainingSec = afterHoursEnd - totalSec;
  } else {
    status = "closed";
    const secLeftToday = 86400 - totalSec;
    if (isSunday && totalSec < futuresSundaySec) {
      targetLabel = "Futures open at";
      targetTime = "6:00 PM ET";
      remainingSec = futuresSundaySec - totalSec;
    } else if (isWeekday && totalSec < premarketSec) {
      targetLabel = "Pre-market opens at";
      targetTime = "4:00 AM ET";
      remainingSec = premarketSec - totalSec;
    } else if (weekday === "Fri" && totalSec >= afterHoursEnd) {
      targetLabel = "Futures open at";
      targetTime = "6:00 PM ET";
      remainingSec = secLeftToday + 86400 + futuresSundaySec;
    } else if (weekday === "Sat") {
      targetLabel = "Futures open at";
      targetTime = "6:00 PM ET";
      remainingSec = secLeftToday + futuresSundaySec;
    } else {
      targetLabel = "Pre-market opens at";
      targetTime = "4:00 AM ET";
      remainingSec = secLeftToday + premarketSec;
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

  return { status, countdown: parts.join("  "), targetLabel, targetTime };
}

/* ─── Session logic ─── */
interface SessionInfo {
  name: string;
  icon: React.ReactNode;
  hours: string;
  active: boolean;
  dotColor: string;
  textColor: string;
  bgActive: string;
  borderActive: string;
  glowActive: string;
}

function getSessions(totalMin: number): SessionInfo[] {
  const asiaActive = totalMin >= 1140 || totalMin < 240;
  const londonActive = totalMin >= 180 && totalMin < 720;
  const nyActive = totalMin >= 570 && totalMin < 960;

  return [
    {
      name: "Asia",
      icon: <Moon className="h-3 w-3" />,
      hours: "7 PM – 4 AM",
      active: asiaActive,
      dotColor: "bg-cyan-400",
      textColor: "text-cyan-400",
      bgActive: "bg-cyan-500/10",
      borderActive: "border-cyan-400/30",
      glowActive: "shadow-[0_0_12px_hsl(190_80%_55%/0.25)]",
    },
    {
      name: "London",
      icon: <Landmark className="h-3 w-3" />,
      hours: "3 AM – 12 PM",
      active: londonActive,
      dotColor: "bg-amber-400",
      textColor: "text-amber-400",
      bgActive: "bg-amber-500/10",
      borderActive: "border-amber-400/30",
      glowActive: "shadow-[0_0_12px_hsl(45_93%_47%/0.25)]",
    },
    {
      name: "New York",
      icon: <Building2 className="h-3 w-3" />,
      hours: "9:30 AM – 4 PM",
      active: nyActive,
      dotColor: "bg-green-400",
      textColor: "text-green-400",
      bgActive: "bg-green-500/10",
      borderActive: "border-green-400/30",
      glowActive: "shadow-[0_0_12px_hsl(142_71%_45%/0.25)]",
    },
  ];
}

/* ─── Status config ─── */
const statusConfig = {
  open: {
    label: "Market Open",
    dotClass: "bg-green-500",
    pingClass: "bg-green-500/60",
    textClass: "text-green-400 drop-shadow-[0_0_8px_hsl(142_71%_45%/0.8)] drop-shadow-[0_0_20px_hsl(142_71%_45%/0.4)]",
    textShadow: "0 0 7px hsl(142 71% 45% / 0.8), 0 0 20px hsl(142 71% 45% / 0.4), 0 0 40px hsl(142 71% 45% / 0.2)",
    bgGlow: "bg-[radial-gradient(ellipse_at_center,hsl(142_71%_45%/0.15),transparent_70%)]",
    countdownClass: "text-green-400",
  },
  premarket: {
    label: "Pre-Market",
    dotClass: "bg-amber-400",
    pingClass: "bg-amber-400/60",
    textClass: "text-amber-400 drop-shadow-[0_0_8px_hsl(45_93%_47%/0.8)] drop-shadow-[0_0_20px_hsl(45_93%_47%/0.4)]",
    textShadow: "0 0 7px hsl(45 93% 47% / 0.8), 0 0 20px hsl(45 93% 47% / 0.4), 0 0 40px hsl(45 93% 47% / 0.2)",
    bgGlow: "bg-[radial-gradient(ellipse_at_center,hsl(45_93%_47%/0.12),transparent_70%)]",
    countdownClass: "text-amber-400",
  },
  afterhours: {
    label: "After-Hours",
    dotClass: "bg-purple-400",
    pingClass: "bg-purple-400/60",
    textClass: "text-purple-400 drop-shadow-[0_0_8px_hsl(270_70%_60%/0.8)] drop-shadow-[0_0_20px_hsl(270_70%_60%/0.4)]",
    textShadow: "0 0 7px hsl(270 70% 60% / 0.8), 0 0 20px hsl(270 70% 60% / 0.4)",
    bgGlow: "bg-[radial-gradient(ellipse_at_center,hsl(270_70%_60%/0.12),transparent_70%)]",
    countdownClass: "text-purple-400",
  },
  futures: {
    label: "Futures Open",
    dotClass: "bg-cyan-400",
    pingClass: "bg-cyan-400/60",
    textClass: "text-cyan-400 drop-shadow-[0_0_6px_hsl(190_80%_55%/0.5)]",
    textShadow: "0 0 5px hsl(190 80% 55% / 0.4), 0 0 12px hsl(190 80% 55% / 0.15)",
    bgGlow: "bg-[radial-gradient(ellipse_at_center,hsl(190_80%_55%/0.06),transparent_70%)]",
    countdownClass: "text-cyan-400",
  },
  closed: {
    label: "Market Closed",
    dotClass: "bg-destructive",
    pingClass: "bg-destructive/40",
    textClass: "text-destructive drop-shadow-[0_0_8px_hsl(0_72%_51%/0.6)]",
    textShadow: "0 0 7px hsl(0 72% 51% / 0.6), 0 0 20px hsl(0 72% 51% / 0.3)",
    bgGlow: "bg-[radial-gradient(ellipse_at_center,hsl(0_72%_51%/0.1),transparent_70%)]",
    countdownClass: "text-muted-foreground",
  },
};

/* ─── Component ─── */
interface MarketStatusSignProps {
  /** Force all sessions to a specific demo state for previewing colors */
  demoSessions?: "all-active" | "all-closed";
}

const MarketStatusSign = ({ demoSessions }: MarketStatusSignProps = {}) => {
  const [state, setState] = useState(getMarketState);
  const [etNow, setEtNow] = useState(getETNow);
  const [clock, setClock] = useState("");
  const [dateStr, setDateStr] = useState("");
  const { weather } = useWeather();

  useEffect(() => {
    const tick = () => {
      setState(getMarketState());
      const et = getETNow();
      setEtNow(et);

      // Format clock: 12:29:04 PM ET
      const timeFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "numeric", minute: "2-digit", second: "2-digit",
        hour12: true,
      });
      setClock(timeFormatter.format(new Date()) + " ET");

      // Format date: Friday, April 3 EST
      const dateFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        weekday: "long", month: "long", day: "numeric",
      });
      setDateStr(dateFormatter.format(new Date()) + " EST");
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const cfg = statusConfig[state.status];
  const totalMin = etNow.hour * 60 + etNow.minute;

  const sessions = getSessions(totalMin).map((s) => {
    if (demoSessions === "all-active") return { ...s, active: true };
    if (demoSessions === "all-closed") return { ...s, active: false };
    return s;
  });

  return (
    <div className="glass-panel rounded-xl p-4 border-glow-purple relative overflow-hidden">
      <div className={`absolute inset-0 rounded-xl transition-all duration-1000 ${cfg.bgGlow}`} />

      {/* Row 1: Market status + clock + weather */}
      <div className="relative flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="relative">
              <div className={`w-3 h-3 rounded-full ${cfg.dotClass}`} />
              <div className={`absolute inset-0 w-3 h-3 rounded-full animate-ping ${cfg.pingClass}`} />
            </div>
            <span
              className={`text-lg font-black tracking-[0.25em] uppercase ${cfg.textClass}`}
              style={{ textShadow: cfg.textShadow }}
            >
              {cfg.label}
            </span>
          </div>
          <div className="pl-6">
            <p className="text-sm font-bold text-foreground tracking-wide">{clock}</p>
            <p className="text-[11px] text-muted-foreground">{dateStr}</p>
          </div>
        </div>

        {/* Weather + countdown */}
        <div className="text-right space-y-1.5">
          {weather && (
            <div className="flex items-center gap-2 justify-end">
              <span className="text-lg">{weather.icon}</span>
              <div>
                <p className="text-sm font-bold text-foreground">{weather.temp}°F</p>
                <p className="text-[10px] text-muted-foreground">{weather.location}</p>
              </div>
            </div>
          )}
          <div className="border-t border-border/10 pt-1.5">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {state.targetLabel}{" "}
              <span className="text-foreground font-bold">{state.targetTime}</span>
            </div>
            <div className={`text-sm font-mono font-bold tracking-[0.2em] ${cfg.countdownClass}`}>
              {state.countdown}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Global session indicators */}
      <div className="relative grid grid-cols-3 gap-1.5">
        {sessions.map((s) => (
          <div
            key={s.name}
            className={`
              relative rounded-lg px-2.5 py-2 text-center transition-all duration-700 border
              ${s.active
                ? `${s.bgActive} ${s.borderActive} ${s.glowActive}`
                : "bg-muted/5 border-border/10"
              }
            `}
          >
            {/* Pulse dot for active sessions */}
            {s.active && (
              <div className="absolute top-1.5 right-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${s.dotColor}`} />
                <div className={`absolute inset-0 w-1.5 h-1.5 rounded-full animate-ping ${s.dotColor}/60`} />
              </div>
            )}

            <div className={`flex items-center justify-center gap-1 mb-0.5 ${s.active ? s.textColor : "text-muted-foreground/30"}`}>
              {s.icon}
              <span className="text-[11px] font-bold">{s.name}</span>
            </div>
            <div className={`text-[9px] ${s.active ? "text-muted-foreground/70" : "text-muted-foreground/20"}`}>
              {s.hours} ET
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketStatusSign;
