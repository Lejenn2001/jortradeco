import { useState } from "react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Flame, Trophy, Calendar as CalendarIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Generate mock P&L data for the current month
const generateMockPnL = (year: number, month: number) => {
  const data: Record<string, number> = {};
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const day = date.getDay();
    // Skip weekends
    if (day === 0 || day === 6) continue;
    // Skip future dates
    if (date > new Date()) continue;
    
    // Random P&L between -500 and 1500 (slightly bullish bias)
    const pnl = Math.round((Math.random() * 2000 - 500) * 100) / 100;
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    data[key] = pnl;
  }
  return data;
};

const DashboardPnL = () => {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "Trader";
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const [pnlData] = useState(() => generateMockPnL(year, month));

  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Stats
  const entries = Object.values(pnlData);
  const totalPnL = entries.reduce((a, b) => a + b, 0);
  const winDays = entries.filter((v) => v > 0).length;
  const loseDays = entries.filter((v) => v < 0).length;
  const winRate = entries.length > 0 ? Math.round((winDays / entries.length) * 100) : 0;
  const bestDay = entries.length > 0 ? Math.max(...entries) : 0;
  const worstDay = entries.length > 0 ? Math.min(...entries) : 0;

  // Streak calculation
  const sortedDates = Object.keys(pnlData).sort().reverse();
  let streak = 0;
  for (const d of sortedDates) {
    if (pnlData[d] > 0) streak++;
    else break;
  }

  const calendarCells = [];
  // Empty cells for days before the 1st
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarCells.push(<div key={`empty-${i}`} className="aspect-square" />);
  }
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const pnl = pnlData[key];
    const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
    const date = new Date(year, month, d);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    calendarCells.push(
      <div
        key={d}
        className={`aspect-square rounded-xl border transition-all flex flex-col items-center justify-center gap-0.5 text-xs
          ${isToday ? "ring-2 ring-primary/50" : ""}
          ${isWeekend ? "bg-muted/20 border-border/20" : "border-border/40"}
          ${pnl !== undefined && pnl > 0 ? "bg-emerald-500/10 border-emerald-500/30" : ""}
          ${pnl !== undefined && pnl < 0 ? "bg-red-500/10 border-red-500/30" : ""}
          ${pnl !== undefined && pnl === 0 ? "bg-muted/30 border-border/40" : ""}
        `}
      >
        <span className={`font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>{d}</span>
        {pnl !== undefined && (
          <span className={`text-[10px] font-bold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {pnl >= 0 ? "+" : ""}${Math.abs(pnl).toFixed(0)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="glass-panel rounded-xl p-4 border-glow-blue">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Monthly P&L</p>
              <p className={`text-xl font-extrabold ${totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
              </p>
            </div>
            <div className="glass-panel rounded-xl p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Win Rate</p>
              <p className="text-xl font-extrabold text-foreground">{winRate}%</p>
            </div>
            <div className="glass-panel rounded-xl p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Win / Loss Days</p>
              <p className="text-xl font-extrabold text-foreground">
                <span className="text-emerald-400">{winDays}</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span className="text-red-400">{loseDays}</span>
              </p>
            </div>
            <div className="glass-panel rounded-xl p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Best Day</p>
              <p className="text-xl font-extrabold text-emerald-400">+${bestDay.toFixed(0)}</p>
            </div>
            <div className="glass-panel rounded-xl p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Worst Day</p>
              <p className="text-xl font-extrabold text-red-400">-${Math.abs(worstDay).toFixed(0)}</p>
            </div>
            <div className="glass-panel rounded-xl p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                <Flame className="h-3 w-3 text-primary" /> Win Streak
              </p>
              <p className="text-xl font-extrabold text-primary">{streak} days</p>
            </div>
          </div>

          {/* Calendar */}
          <div className="glass-panel rounded-xl border-glow-purple p-5">
            <div className="flex items-center justify-between mb-5">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <ChevronLeft className="h-5 w-5 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-bold text-foreground">{monthName}</h2>
              </div>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarCells}
            </div>
          </div>

          {/* Motivational footer */}
          <div className="glass-panel rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <p className="text-sm text-muted-foreground">
                {totalPnL > 0
                  ? `Great month so far ${firstName}! Keep the momentum going.`
                  : `Stay disciplined ${firstName}. Every trader has rough patches.`}
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardPnL;
