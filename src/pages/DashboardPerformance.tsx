import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PageBanner from "@/components/dashboard/PageBanner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Target, Flame, BarChart3,
  Calendar, ArrowUpRight, ArrowDownRight, Activity, Zap,
  Award, AlertTriangle, Clock
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Area, AreaChart, ReferenceLine
} from "recharts";

interface Trade {
  id: string;
  trade_date: string;
  amount: number;
  ticker: string | null;
  notes: string | null;
}

// ─── Stat Card ───────────────────────────────────────────────
const MetricCard = ({
  icon: Icon, label, value, sub, color = "text-primary", bgColor = "bg-primary/10"
}: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  color?: string; bgColor?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass-panel rounded-xl p-4 border-border/40"
  >
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
    </div>
    <p className="text-xl font-extrabold text-foreground">{value}</p>
    {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
  </motion.div>
);

// ─── Custom Tooltip ──────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel rounded-lg px-3 py-2 border border-border/50 text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-bold" style={{ color: p.color }}>
          {p.name}: ${Number(p.value).toFixed(2)}
        </p>
      ))}
    </div>
  );
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const DashboardPerformance = () => {
  const { session } = useAuth();
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch ALL trades for the user (all time)
  useEffect(() => {
    if (!session?.user?.id) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", session.user.id)
        .order("trade_date", { ascending: true });
      if (data) setAllTrades(data as Trade[]);
      setLoading(false);
    };
    fetch();
  }, [session?.user?.id]);

  // ─── Computed Metrics ────────────────────────────────────────
  const metrics = useMemo(() => {
    if (!allTrades.length) return null;

    // Group by date
    const byDate: Record<string, number> = {};
    const byTicker: Record<string, { total: number; count: number }> = {};
    const byWeekday: Record<number, { total: number; count: number }> = {};

    for (const t of allTrades) {
      byDate[t.trade_date] = (byDate[t.trade_date] || 0) + t.amount;

      if (t.ticker) {
        if (!byTicker[t.ticker]) byTicker[t.ticker] = { total: 0, count: 0 };
        byTicker[t.ticker].total += t.amount;
        byTicker[t.ticker].count++;
      }

      const dow = new Date(t.trade_date + "T12:00:00").getDay();
      if (!byWeekday[dow]) byWeekday[dow] = { total: 0, count: 0 };
      byWeekday[dow].total += t.amount;
      byWeekday[dow].count++;
    }

    const dailyPnL = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
    const dailyAmounts = dailyPnL.map(([, v]) => v);

    // Equity curve
    let cumulative = 0;
    const equityCurve = dailyPnL.map(([date, pnl]) => {
      cumulative += pnl;
      return {
        date: new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        rawDate: date,
        pnl,
        equity: cumulative,
      };
    });

    // Core stats
    const totalPnL = dailyAmounts.reduce((a, b) => a + b, 0);
    const winDays = dailyAmounts.filter(v => v > 0).length;
    const loseDays = dailyAmounts.filter(v => v < 0).length;
    const totalDays = dailyAmounts.length;
    const winRate = totalDays > 0 ? (winDays / totalDays) * 100 : 0;

    const avgWin = winDays > 0
      ? dailyAmounts.filter(v => v > 0).reduce((a, b) => a + b, 0) / winDays
      : 0;
    const avgLoss = loseDays > 0
      ? Math.abs(dailyAmounts.filter(v => v < 0).reduce((a, b) => a + b, 0) / loseDays)
      : 0;
    const profitFactor = avgLoss > 0
      ? (avgWin * winDays) / (avgLoss * loseDays)
      : avgWin > 0 ? Infinity : 0;

    const bestDay = dailyAmounts.length > 0 ? Math.max(...dailyAmounts) : 0;
    const worstDay = dailyAmounts.length > 0 ? Math.min(...dailyAmounts) : 0;

    // Max drawdown
    let peak = 0;
    let maxDD = 0;
    let runningPnL = 0;
    for (const amt of dailyAmounts) {
      runningPnL += amt;
      if (runningPnL > peak) peak = runningPnL;
      const dd = peak - runningPnL;
      if (dd > maxDD) maxDD = dd;
    }

    // Streaks
    let currentStreak = 0;
    let longestWin = 0;
    let longestLoss = 0;
    let tempWin = 0;
    let tempLoss = 0;
    for (const amt of dailyAmounts) {
      if (amt > 0) { tempWin++; tempLoss = 0; longestWin = Math.max(longestWin, tempWin); }
      else if (amt < 0) { tempLoss++; tempWin = 0; longestLoss = Math.max(longestLoss, tempLoss); }
      else { tempWin = 0; tempLoss = 0; }
    }
    // Current streak from end
    for (let i = dailyAmounts.length - 1; i >= 0; i--) {
      if (dailyAmounts[i] > 0) currentStreak++;
      else break;
    }

    // Weekday performance
    const weekdayData = [1, 2, 3, 4, 5].map((dow, idx) => ({
      day: WEEKDAYS[idx],
      avg: byWeekday[dow] ? byWeekday[dow].total / byWeekday[dow].count : 0,
      total: byWeekday[dow]?.total || 0,
      trades: byWeekday[dow]?.count || 0,
    }));

    // Top tickers (by total P&L)
    const tickerRanking = Object.entries(byTicker)
      .map(([ticker, data]) => ({ ticker, ...data, avg: data.total / data.count }))
      .sort((a, b) => b.total - a.total);

    // Monthly returns
    const byMonth: Record<string, number> = {};
    for (const [date, pnl] of dailyPnL) {
      const month = date.slice(0, 7);
      byMonth[month] = (byMonth[month] || 0) + pnl;
    }
    const monthlyReturns = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, pnl]) => ({
        month: new Date(month + "-15").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        pnl,
      }));

    return {
      totalPnL, winRate, winDays, loseDays, totalDays, avgWin, avgLoss,
      profitFactor, bestDay, worstDay, maxDD, currentStreak, longestWin, longestLoss,
      equityCurve, weekdayData, tickerRanking, monthlyReturns, totalTrades: allTrades.length,
    };
  }, [allTrades]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!metrics || allTrades.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <h2 className="text-lg font-bold text-foreground">No Trades Yet</h2>
            <p className="text-sm text-muted-foreground">Log trades in your P&L calendar to see performance analytics.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const {
    totalPnL, winRate, winDays, loseDays, totalDays, avgWin, avgLoss,
    profitFactor, bestDay, worstDay, maxDD, currentStreak, longestWin, longestLoss,
    equityCurve, weekdayData, tickerRanking, monthlyReturns, totalTrades
  } = metrics;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-5 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Performance
          </h1>
          <p className="text-sm text-muted-foreground">All-time trading analytics • {totalTrades} trades across {totalDays} days</p>
        </div>

        {/* ─── Top Metrics Grid ─────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            icon={totalPnL >= 0 ? TrendingUp : TrendingDown}
            label="Total P&L"
            value={`${totalPnL >= 0 ? "+" : ""}$${Math.abs(totalPnL).toFixed(2)}`}
            sub={`${totalDays} trading days`}
            color={totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}
            bgColor={totalPnL >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}
          />
          <MetricCard
            icon={Target}
            label="Win Rate"
            value={`${winRate.toFixed(1)}%`}
            sub={`${winDays}W / ${loseDays}L`}
            color={winRate >= 50 ? "text-emerald-400" : "text-red-400"}
            bgColor={winRate >= 50 ? "bg-emerald-500/10" : "bg-red-500/10"}
          />
          <MetricCard
            icon={Zap}
            label="Profit Factor"
            value={profitFactor === Infinity ? "∞" : profitFactor.toFixed(2)}
            sub={`Avg Win $${avgWin.toFixed(0)} / Avg Loss $${avgLoss.toFixed(0)}`}
            color={profitFactor >= 1.5 ? "text-emerald-400" : profitFactor >= 1 ? "text-amber-400" : "text-red-400"}
            bgColor={profitFactor >= 1.5 ? "bg-emerald-500/10" : profitFactor >= 1 ? "bg-amber-500/10" : "bg-red-500/10"}
          />
          <MetricCard
            icon={AlertTriangle}
            label="Max Drawdown"
            value={`-$${maxDD.toFixed(2)}`}
            sub="Peak-to-trough decline"
            color="text-red-400"
            bgColor="bg-red-500/10"
          />
        </div>

        {/* ─── Equity Curve ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel rounded-xl p-5 border-border/40"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Equity Curve</h2>
            <span className="text-[10px] text-muted-foreground ml-auto">Cumulative P&L over time</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurve}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(230, 85%, 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(230, 85%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(232, 25%, 14%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(225, 15%, 50%)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(225, 15%, 50%)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={0} stroke="hsl(225, 15%, 30%)" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="equity" stroke="hsl(230, 85%, 60%)" fill="url(#equityGrad)" strokeWidth={2} name="Equity" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* ─── Row: Monthly Returns + Streaks ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Monthly Returns */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-panel rounded-xl p-5 border-border/40 lg:col-span-2"
          >
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Monthly Returns</h2>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyReturns}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(232, 25%, 14%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(225, 15%, 50%)" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(225, 15%, 50%)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={0} stroke="hsl(225, 15%, 30%)" strokeDasharray="3 3" />
                  <Bar dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]}>
                    {monthlyReturns.map((entry, i) => (
                      <Cell key={i} fill={entry.pnl >= 0 ? "hsl(142, 71%, 45%)" : "hsl(0, 72%, 51%)"} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Streaks & Extremes */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel rounded-xl p-5 border-border/40 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Streaks & Extremes</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: "Current Win Streak", value: `${currentStreak} days`, icon: Flame, color: "text-emerald-400" },
                { label: "Longest Win Streak", value: `${longestWin} days`, icon: Award, color: "text-primary" },
                { label: "Longest Loss Streak", value: `${longestLoss} days`, icon: AlertTriangle, color: "text-red-400" },
                { label: "Best Day", value: `+$${bestDay.toFixed(0)}`, icon: ArrowUpRight, color: "text-emerald-400" },
                { label: "Worst Day", value: `-$${Math.abs(worstDay).toFixed(0)}`, icon: ArrowDownRight, color: "text-red-400" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
                  <div className="flex items-center gap-2">
                    <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                  <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ─── Row: Day of Week + Top Tickers ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Day of Week Performance */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-panel rounded-xl p-5 border-border/40"
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Best Trading Days</h2>
              <span className="text-[10px] text-muted-foreground ml-auto">Avg P&L by weekday</span>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(232, 25%, 14%)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(225, 15%, 50%)" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(225, 15%, 50%)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={0} stroke="hsl(225, 15%, 30%)" strokeDasharray="3 3" />
                  <Bar dataKey="avg" name="Avg P&L" radius={[4, 4, 0, 0]}>
                    {weekdayData.map((entry, i) => (
                      <Cell key={i} fill={entry.avg >= 0 ? "hsl(142, 71%, 45%)" : "hsl(0, 72%, 51%)"} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Top Tickers */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-panel rounded-xl p-5 border-border/40"
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Ticker Breakdown</h2>
              <span className="text-[10px] text-muted-foreground ml-auto">By total P&L</span>
            </div>
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {tickerRanking.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No ticker data — add tickers when logging trades</p>
              ) : (
                tickerRanking.slice(0, 10).map((t, i) => {
                  const maxAbs = Math.max(...tickerRanking.map(x => Math.abs(x.total)));
                  const barWidth = maxAbs > 0 ? (Math.abs(t.total) / maxAbs) * 100 : 0;
                  return (
                    <div key={t.ticker} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-foreground w-12 shrink-0">{t.ticker}</span>
                      <div className="flex-1 h-5 bg-muted/20 rounded-full overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all ${t.total >= 0 ? "bg-emerald-500/60" : "bg-red-500/60"}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold w-16 text-right shrink-0 ${t.total >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {t.total >= 0 ? "+" : ""}${t.total.toFixed(0)}
                      </span>
                      <span className="text-[10px] text-muted-foreground w-8 text-right shrink-0">{t.count}x</span>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default DashboardPerformance;
