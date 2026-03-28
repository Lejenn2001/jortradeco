import { useState, useEffect } from "react";
import { Globe, Moon, Landmark, Building2 } from "lucide-react";

interface SessionInfo {
  name: string;
  icon: React.ReactNode;
  hours: string;
  active: boolean;
  color: string;
  glowColor: string;
}

function getETTime() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: true, weekday: "short",
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";

  const hourFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit", minute: "2-digit",
    hour12: false,
  });
  const hParts = hourFormatter.formatToParts(now);
  const h24 = parseInt(hParts.find((p) => p.type === "hour")?.value || "0") % 24;
  const min = parseInt(hParts.find((p) => p.type === "minute")?.value || "0");

  return {
    display: `${get("hour")}:${get("minute")} ${get("dayPeriod")} ET`,
    weekday: get("weekday"),
    totalMin: h24 * 60 + min,
  };
}

function getSessions(totalMin: number): SessionInfo[] {
  // All times in ET minutes
  // Asia: 7 PM - 4 AM ET  (1140 - 240, wraps midnight)
  // London: 3 AM - 12 PM ET (180 - 720)
  // New York: 9:30 AM - 4 PM ET (570 - 960)
  const asiaActive = totalMin >= 1140 || totalMin < 240;
  const londonActive = totalMin >= 180 && totalMin < 720;
  const nyActive = totalMin >= 570 && totalMin < 960;

  return [
    {
      name: "Asia",
      icon: <Moon className="h-3.5 w-3.5" />,
      hours: "7 PM – 4 AM ET",
      active: asiaActive,
      color: "text-cyan-400",
      glowColor: "shadow-[0_0_12px_hsl(190_80%_55%/0.4)]",
    },
    {
      name: "London",
      icon: <Landmark className="h-3.5 w-3.5" />,
      hours: "3 AM – 12 PM ET",
      active: londonActive,
      color: "text-amber-400",
      glowColor: "shadow-[0_0_12px_hsl(45_93%_47%/0.4)]",
    },
    {
      name: "New York",
      icon: <Building2 className="h-3.5 w-3.5" />,
      hours: "9:30 AM – 4 PM ET",
      active: nyActive,
      color: "text-green-400",
      glowColor: "shadow-[0_0_12px_hsl(142_71%_45%/0.4)]",
    },
  ];
}

/** Option 4 — Status Row with chip badges */
export const SessionStatusRow = () => {
  const [time, setTime] = useState(getETTime);
  const sessions = getSessions(time.totalMin);

  useEffect(() => {
    const id = setInterval(() => setTime(getETTime()), 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-3 flex-wrap px-1 py-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
        <Globe className="h-3.5 w-3.5" />
        <span className="font-mono">{time.display}</span>
      </div>

      <div className="flex items-center gap-2">
        {sessions.map((s) => (
          <div
            key={s.name}
            className={`
              flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-500
              ${s.active
                ? `${s.color} bg-white/[0.06] border border-current/20 ${s.glowColor}`
                : "text-muted-foreground/40 border border-transparent"
              }
            `}
          >
            {s.icon}
            <span className="font-semibold">{s.name}</span>
            {s.active && (
              <span className="hidden sm:inline text-[10px] opacity-70 ml-0.5">
                ({s.hours})
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/** Option 2 — Heatmap Strip with connected segments */
export const SessionHeatmapStrip = () => {
  const [time, setTime] = useState(getETTime);
  const sessions = getSessions(time.totalMin);

  useEffect(() => {
    const id = setInterval(() => setTime(getETTime()), 10_000);
    return () => clearInterval(id);
  }, []);

  const activeColors: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    Asia: {
      bg: "bg-cyan-500/15",
      border: "border-cyan-400/50",
      text: "text-cyan-400",
      glow: "shadow-[inset_0_0_20px_hsl(190_80%_55%/0.15),0_0_15px_hsl(190_80%_55%/0.2)]",
    },
    London: {
      bg: "bg-amber-500/15",
      border: "border-amber-400/50",
      text: "text-amber-400",
      glow: "shadow-[inset_0_0_20px_hsl(45_93%_47%/0.15),0_0_15px_hsl(45_93%_47%/0.2)]",
    },
    "New York": {
      bg: "bg-green-500/15",
      border: "border-green-400/50",
      text: "text-green-400",
      glow: "shadow-[inset_0_0_20px_hsl(142_71%_45%/0.15),0_0_15px_hsl(142_71%_45%/0.2)]",
    },
  };

  return (
    <div className="space-y-2 px-1 py-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Globe className="h-3.5 w-3.5" />
        <span className="font-mono">{time.display}</span>
      </div>

      <div className="grid grid-cols-3 gap-1">
        {sessions.map((s) => {
          const colors = activeColors[s.name];
          return (
            <div
              key={s.name}
              className={`
                relative rounded-lg px-3 py-2.5 text-center transition-all duration-700 border
                ${s.active
                  ? `${colors.bg} ${colors.border} ${colors.glow}`
                  : "bg-muted/10 border-border/20"
                }
              `}
            >
              {/* Active pulse dot */}
              {s.active && (
                <div className="absolute top-1.5 right-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${s.name === "Asia" ? "bg-cyan-400" : s.name === "London" ? "bg-amber-400" : "bg-green-400"}`} />
                  <div className={`absolute inset-0 w-1.5 h-1.5 rounded-full animate-ping ${s.name === "Asia" ? "bg-cyan-400/60" : s.name === "London" ? "bg-amber-400/60" : "bg-green-400/60"}`} />
                </div>
              )}

              <div className={`flex items-center justify-center gap-1 mb-0.5 ${s.active ? colors.text : "text-muted-foreground/40"}`}>
                {s.icon}
                <span className="text-xs font-bold">{s.name}</span>
              </div>
              <div className={`text-[10px] ${s.active ? "text-muted-foreground" : "text-muted-foreground/30"}`}>
                {s.hours}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SessionStatusRow;
