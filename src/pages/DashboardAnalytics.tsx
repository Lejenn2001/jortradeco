import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PageBanner from "@/components/dashboard/PageBanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Zap, Calendar as CalendarIcon, Trophy, ChevronLeft, ChevronRight,
  Plus, Trash2, TrendingUp, TrendingDown, Target, Clock, Award,
  Lightbulb, CheckCircle2, XCircle, Loader2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dbRecordToSignal } from "@/lib/signalMapper";
import type { MarketSignal } from "@/hooks/useMarketData";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Trade {
  id: string;
  trade_date: string;
  amount: number;
  ticker: string | null;
  notes: string | null;
}

type TabType = "overview" | "my_trades" | "pnl_calendar";

const DashboardAnalytics = () => {
  const { session, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Overview state
  const [todaySignals, setTodaySignals] = useState<MarketSignal[]>([]);
  const [weekSignals, setWeekSignals] = useState<MarketSignal[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [calendarDate, setCalendarDate] = useState(new Date());

  // My Trades state
  const [userTrades, setUserTrades] = useState<any[]>([]);
  const [tradesLoading, setTradesLoading] = useState(true);

  // P&L Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [trades, setTrades] = useState<Trade[]>([]);
  const [pnlLoading, setPnlLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [amount, setAmount] = useState("");
  const [ticker, setTicker] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [detailDate, setDetailDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  // ── OVERVIEW: Load signal stats ──
  useEffect(() => {
    const load = async () => {
      setOverviewLoading(true);
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);

      const [todayRes, weekRes] = await Promise.all([
        supabase.from("signal_outcomes").select("*")
          .gte("created_at", todayStart.toISOString())
          .order("created_at", { ascending: false }).limit(300),
        supabase.from("signal_outcomes").select("*")
          .gte("created_at", weekStart.toISOString())
          .order("created_at", { ascending: false }).limit(1000),
      ]);

      if (todayRes.data) setTodaySignals(todayRes.data.filter((s: any) => s.review_status !== "wrong").map(dbRecordToSignal));
      if (weekRes.data) setWeekSignals(weekRes.data.filter((s: any) => s.review_status !== "wrong").map(dbRecordToSignal));
      setOverviewLoading(false);
    };
    load();
  }, []);

  // Overview stats
  const todayPending = todaySignals.filter(s => !s.outcome || s.outcome === "pending").length;
  const todayWins = todaySignals.filter(s => s.outcome === "win").length;
  const todayLosses = todaySignals.filter(s => s.outcome === "loss").length;
  const todayWinRate = todayWins + todayLosses > 0 ? Math.round((todayWins / (todayWins + todayLosses)) * 100) : 0;

  const weekWins = weekSignals.filter(s => s.outcome === "win").length;
  const weekLosses = weekSignals.filter(s => s.outcome === "loss").length;
  const weekPending = weekSignals.filter(s => !s.outcome || s.outcome === "pending").length;
  const weekWinRate = weekWins + weekLosses > 0 ? Math.round((weekWins / (weekWins + weekLosses)) * 100) : 0;

  // Daily signal calendar data
  const dailySignalStats = useMemo(() => {
    const map: Record<string, { total: number; wins: number; losses: number }> = {};
    for (const s of weekSignals) {
      const date = (s.createdAt || "").split("T")[0];
      if (!date) continue;
      if (!map[date]) map[date] = { total: 0, wins: 0, losses: 0 };
      map[date].total++;
      if (s.outcome === "win") map[date].wins++;
      if (s.outcome === "loss") map[date].losses++;
    }
    return map;
  }, [weekSignals]);

  // ── MY TRADES: Load user's "I Took This Trade" data ──
  useEffect(() => {
    if (!session?.user?.id) return;
    const load = async () => {
      setTradesLoading(true);
      const { data } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", session.user.id)
        .order("trade_date", { ascending: false });
      if (data) setUserTrades(data);
      setTradesLoading(false);
    };
    load();
  }, [session?.user?.id]);

  const myTradeStats = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const weekTrades = userTrades.filter(t => new Date(t.trade_date) >= weekStart);
    const total = weekTrades.length;
    const wins = weekTrades.filter(t => t.amount > 0).length;
    const losses = weekTrades.filter(t => t.amount < 0).length;
    const pending = weekTrades.filter(t => t.amount === 0).length;
    const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

    const allWins = userTrades.filter(t => t.amount > 0).length;
    const allLosses = userTrades.filter(t => t.amount < 0).length;
    const allPending = userTrades.filter(t => t.amount === 0).length;
    const allWinRate = allWins + allLosses > 0 ? Math.round((allWins / (allWins + allLosses)) * 100) : 0;

    // Learning insights
    const byDay: Record<string, { wins: number; total: number }> = {};
    const byTicker: Record<string, { wins: number; total: number }> = {};
    for (const t of userTrades) {
      const dow = new Date(t.trade_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });
      if (!byDay[dow]) byDay[dow] = { wins: 0, total: 0 };
      byDay[dow].total++;
      if (t.amount > 0) byDay[dow].wins++;
      if (t.ticker) {
        if (!byTicker[t.ticker]) byTicker[t.ticker] = { wins: 0, total: 0 };
        byTicker[t.ticker].total++;
        if (t.amount > 0) byTicker[t.ticker].wins++;
      }
    }
    const bestDay = Object.entries(byDay).sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))[0];
    const bestTicker = Object.entries(byTicker).sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))[0];

    return { total, wins, losses, pending, winRate, allTotal: userTrades.length, allWins, allLosses, allPending, allWinRate, bestDay, bestTicker };
  }, [userTrades]);

  // ── P&L CALENDAR ──
  useEffect(() => {
    if (!session?.user?.id) return;
    const fetchTrades = async () => {
      setPnlLoading(true);
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
      const { data } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", session.user.id)
        .gte("trade_date", startDate)
        .lte("trade_date", endDate)
        .order("trade_date", { ascending: true });
      if (data) setTrades(data as Trade[]);
      setPnlLoading(false);
    };
    fetchTrades();
  }, [session?.user?.id, year, month, daysInMonth]);

  const pnlData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of trades) map[t.trade_date] = (map[t.trade_date] || 0) + Number(t.amount);
    return map;
  }, [trades]);

  const entries = Object.values(pnlData);
  const totalPnL = entries.reduce((a, b) => a + b, 0);
  const winDays = entries.filter(v => v > 0).length;
  const loseDays = entries.filter(v => v < 0).length;
  const winRate = entries.length > 0 ? Math.round((winDays / entries.length) * 100) : 0;
  const bestDay = entries.length > 0 ? Math.max(...entries) : 0;
  const worstDay = entries.length > 0 ? Math.min(...entries) : 0;
  let streak = 0;
  const sortedDates = Object.keys(pnlData).sort().reverse();
  for (const d of sortedDates) { if (pnlData[d] > 0) streak++; else break; }

  const handleDayClick = (d: number) => {
    const date = new Date(year, month, d);
    if (date.getDay() === 0 || date.getDay() === 6) return;
    if (date > new Date()) return;
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayTrades = trades.filter(t => t.trade_date === key);
    if (dayTrades.length > 0) { setDetailDate(key); }
    else { setSelectedDate(key); setAmount(""); setTicker(""); setNotes(""); setDialogOpen(true); }
  };

  const handleSave = async () => {
    if (!session?.user?.id || !amount) return;
    setSaving(true);
    const { error } = await supabase.from("trades").insert({
      user_id: session.user.id, trade_date: selectedDate, amount: parseFloat(amount),
      ticker: ticker || null, notes: notes || null,
    } as any);
    if (error) { toast({ title: "Error saving trade", description: error.message, variant: "destructive" }); }
    else {
      toast({ title: "Trade logged!" });
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
      const { data } = await supabase.from("trades").select("*").eq("user_id", session.user.id)
        .gte("trade_date", startDate).lte("trade_date", endDate).order("trade_date", { ascending: true });
      if (data) setTrades(data as Trade[]);
      setDialogOpen(false);
    }
    setSaving(false);
  };

  const handleDelete = async (tradeId: string) => {
    const { error } = await supabase.from("trades").delete().eq("id", tradeId);
    if (!error) {
      setTrades(prev => prev.filter(t => t.id !== tradeId));
      toast({ title: "Trade deleted" });
      const remaining = trades.filter(t => t.id !== tradeId && t.trade_date === detailDate);
      if (remaining.length === 0) setDetailDate(null);
    }
  };

  const detailTrades = detailDate ? trades.filter(t => t.trade_date === detailDate) : [];
  const detailTotal = detailTrades.reduce((s, t) => s + Number(t.amount), 0);

  const tabs = [
    { id: "overview" as TabType, label: "Overview" },
    { id: "my_trades" as TabType, label: "My Trades" },
    { id: "pnl_calendar" as TabType, label: "P&L Calendar" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-5 space-y-5">
        {/* Banner with tabs */}
        <div className="relative overflow-hidden rounded-2xl border border-border/10 bg-card/80">
          <svg className="absolute inset-0 w-full h-full opacity-[0.35]" viewBox="0 0 1000 200" preserveAspectRatio="none">
            {[40, 95, 150, 205, 260, 315, 370, 425, 480, 535, 590, 645, 700, 755, 810, 865, 920].map((x, i) => {
              const heights = [60, 45, 80, 35, 70, 90, 50, 65, 40, 85, 55, 75, 30, 60, 45, 70, 55];
              const tops = [70, 85, 50, 95, 60, 30, 80, 65, 90, 45, 75, 55, 100, 70, 85, 50, 75];
              const green = i % 3 !== 0;
              return (
                <g key={i}>
                  <line x1={x} y1={tops[i] - 15} x2={x} y2={tops[i] + heights[i] + 15} stroke={green ? "hsl(var(--primary))" : "hsl(var(--accent))"} strokeWidth="1" opacity="0.3" />
                  <rect x={x - 8} y={tops[i]} width="16" height={heights[i]} fill={green ? "hsl(var(--primary))" : "hsl(var(--accent))"} rx="1" opacity="0.2" />
                </g>
              );
            })}
          </svg>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/3 to-primary/5" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />

          <div className="relative px-6 py-7 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-10 rounded-full bg-gradient-to-b from-primary via-accent to-primary/50" />
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-[0.15em] uppercase bg-gradient-to-r from-foreground via-foreground to-foreground/50 bg-clip-text text-transparent">
                  ANALYTICS
                </h1>
                <p className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-semibold mt-0.5">
                  Performance & Tracking
                </p>
              </div>
            </div>

            {/* Tab switcher in banner */}
            <div className="flex items-center gap-1 bg-muted/30 rounded-xl p-1 border border-border/30">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            {overviewLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Today */}
                  <div className="glass-panel rounded-xl p-5 border-border/40">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="text-sm font-bold text-foreground uppercase">Today</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{todaySignals.length} signals</span>
                    </div>
                    {todayWins + todayLosses > 0 ? (
                      <p className={`text-3xl font-black ${todayWinRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>{todayWinRate}%</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">—&nbsp;&nbsp;all pending</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">{todayWins} Wins</span>
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 font-bold">{todayLosses} Losses</span>
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-muted/30 text-muted-foreground border border-border/30 font-bold">{todayPending} Pending</span>
                    </div>
                  </div>

                  {/* This Week */}
                  <div className="glass-panel rounded-xl p-5 border-border/40">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-bold text-foreground uppercase">This Week</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{weekSignals.length} signals</span>
                    </div>
                    <p className={`text-3xl font-black ${weekWinRate >= 50 ? "text-emerald-400" : weekWinRate > 0 ? "text-red-400" : "text-muted-foreground"}`}>
                      {weekWins + weekLosses > 0 ? `${weekWinRate}%` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">win rate</p>
                    <div className="flex gap-2 mt-3">
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">{weekWins} Wins</span>
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 font-bold">{weekLosses} Losses</span>
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-muted/30 text-muted-foreground border border-border/30 font-bold">{weekPending} Pending</span>
                    </div>
                  </div>
                </div>

                {/* Daily Signal Calendar */}
                <div className="glass-panel rounded-xl p-5 border-border/40">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-bold text-foreground">Daily Signal Calendar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))} className="p-1 hover:bg-muted/50 rounded"><ChevronLeft className="h-4 w-4 text-muted-foreground" /></button>
                      <span className="text-sm font-semibold text-foreground">{calendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                      <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))} className="p-1 hover:bg-muted/50 rounded"><ChevronRight className="h-4 w-4 text-muted-foreground" /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {DAYS.map(d => <div key={d} className="text-[10px] text-muted-foreground font-medium py-1">{d}</div>)}
                    {Array.from({ length: new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay() }, (_, i) => (
                      <div key={`e-${i}`} />
                    ))}
                    {Array.from({ length: new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate() }, (_, i) => {
                      const day = i + 1;
                      const dateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const stats = dailySignalStats[dateStr];
                      const isToday = new Date().toDateString() === new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day).toDateString();
                      const wr = stats && stats.wins + stats.losses > 0 ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100) : null;

                      return (
                        <div key={day} className={`aspect-square rounded-lg border flex flex-col items-center justify-center gap-0.5 text-xs
                          ${isToday ? "ring-2 ring-primary/50 border-primary/30" : "border-border/30"}
                          ${wr !== null && wr >= 70 ? "bg-emerald-500/10" : ""}
                          ${wr !== null && wr >= 50 && wr < 70 ? "bg-emerald-500/5" : ""}
                          ${wr !== null && wr >= 30 && wr < 50 ? "bg-amber-500/10" : ""}
                          ${wr !== null && wr < 30 ? "bg-red-500/10" : ""}
                        `}>
                          <span className={`font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>{day}</span>
                          {wr !== null && (
                            <span className={`text-[9px] font-bold ${wr >= 50 ? "text-emerald-400" : "text-red-400"}`}>{wr}%</span>
                          )}
                          {stats && <span className="text-[8px] text-muted-foreground/60">{stats.total}s</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30" /> 70%+</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/15" /> 50-69%</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500/20" /> 30-49%</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/20" /> &lt;30%</span>
                    <span className="ml-auto flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border border-muted-foreground/30" /> Today</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ MY TRADES TAB ═══ */}
        {activeTab === "my_trades" && (
          <div className="space-y-5">
            {tradesLoading ? (
              <div className="flex items-center justify-center h-40"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>
            ) : (
              <>
                {/* This week performance */}
                <div className="glass-panel rounded-xl p-5 border-border/40 border-l-4 border-l-emerald-500/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-bold text-foreground">My Trading Performance</span>
                    <span className="text-xs text-muted-foreground ml-2">This Week</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="text-center p-3 rounded-lg bg-muted/20">
                      <p className="text-2xl font-black text-foreground">{myTradeStats.total}</p>
                      <p className="text-[10px] text-muted-foreground">Total</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-2xl font-black text-emerald-400">{myTradeStats.winRate}%</p>
                      <p className="text-[10px] text-muted-foreground">Win Rate</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-2xl font-black text-emerald-400">{myTradeStats.wins}</p>
                      <p className="text-[10px] text-muted-foreground">Wins</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-2xl font-black text-red-400">{myTradeStats.losses}</p>
                      <p className="text-[10px] text-muted-foreground">Losses</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/20">
                      <p className="text-2xl font-black text-foreground">{myTradeStats.pending}</p>
                      <p className="text-[10px] text-muted-foreground">Pending</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-3">
                    * Tracking trades you marked with "I Took This Trade" — your personal win/loss record based on signal outcomes.
                  </p>
                </div>

                {/* All-time stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="glass-panel rounded-xl p-4 border-border/40">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Total Trades</span>
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-2xl font-black text-foreground">{myTradeStats.allTotal}</p>
                  </div>
                  <div className="glass-panel rounded-xl p-4 border-border/40">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Wins</span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-black text-foreground">{myTradeStats.allWins}</p>
                    <p className="text-[10px] text-muted-foreground">{myTradeStats.allWinRate}% rate</p>
                  </div>
                  <div className="glass-panel rounded-xl p-4 border-border/40">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Losses</span>
                      <XCircle className="h-4 w-4 text-red-400" />
                    </div>
                    <p className="text-2xl font-black text-foreground">{myTradeStats.allLosses}</p>
                  </div>
                  <div className="glass-panel rounded-xl p-4 border-border/40">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Pending</span>
                      <Clock className="h-4 w-4 text-amber-400" />
                    </div>
                    <p className="text-2xl font-black text-foreground">{myTradeStats.allPending}</p>
                  </div>
                </div>

                {/* Learning Insights */}
                {(myTradeStats.bestDay || myTradeStats.bestTicker) && (
                  <div className="glass-panel rounded-xl p-5 border-border/40 bg-gradient-to-r from-amber-500/5 to-transparent">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="h-4 w-4 text-amber-400" />
                      <span className="text-sm font-bold text-foreground">Learning Insights</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">AI-POWERED</span>
                    </div>
                    <div className="space-y-2">
                      {myTradeStats.bestDay && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span className="text-xs text-foreground">
                            Your best day is <span className="font-bold">{myTradeStats.bestDay[0]}</span> ({Math.round((myTradeStats.bestDay[1].wins / myTradeStats.bestDay[1].total) * 100)}% win rate)
                          </span>
                        </div>
                      )}
                      {myTradeStats.bestTicker && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span className="text-xs text-foreground">
                            Your best ticker is <span className="font-bold">{myTradeStats.bestTicker[0]}</span> ({Math.round((myTradeStats.bestTicker[1].wins / myTradeStats.bestTicker[1].total) * 100)}% over {myTradeStats.bestTicker[1].total} trades)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ P&L CALENDAR TAB ═══ */}
        {activeTab === "pnl_calendar" && (
          <div className="space-y-5">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="glass-panel rounded-xl p-4 border-l-4 border-l-primary/50">
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
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Win Streak</p>
                <p className="text-xl font-extrabold text-foreground">{streak} days</p>
              </div>
            </div>

            {/* Calendar */}
            <div className="glass-panel rounded-xl p-5 border-border/40">
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1.5 hover:bg-muted/50 rounded-lg">
                  <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                </button>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">{currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                </div>
                <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1.5 hover:bg-muted/50 rounded-lg">
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground text-center mb-3">Click any weekday to log a trade</p>
              <div className="grid grid-cols-7 gap-1">
                {DAYS.map(d => <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground uppercase py-1">{d}</div>)}
                {Array.from({ length: firstDayOfMonth }, (_, i) => <div key={`e-${i}`} className="aspect-square" />)}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const d = i + 1;
                  const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                  const pnl = pnlData[key];
                  const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
                  const date = new Date(year, month, d);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const isFuture = date > new Date();
                  const isClickable = !isWeekend && !isFuture;

                  return (
                    <div key={d} onClick={() => isClickable && handleDayClick(d)}
                      className={`aspect-square rounded-xl border transition-all flex flex-col items-center justify-center gap-0.5 text-xs
                        ${isClickable ? "cursor-pointer hover:border-primary/50 hover:scale-105" : ""}
                        ${isToday ? "ring-2 ring-primary/50" : ""}
                        ${isWeekend ? "bg-muted/20 border-border/20" : "border-border/40"}
                        ${pnl !== undefined && pnl > 0 ? "bg-emerald-500/10 border-emerald-500/30" : ""}
                        ${pnl !== undefined && pnl < 0 ? "bg-red-500/10 border-red-500/30" : ""}
                      `}
                    >
                      <span className={`font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>{d}</span>
                      {pnl !== undefined && (
                        <span className={`text-[10px] font-bold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {pnl >= 0 ? "+" : ""}${Math.abs(pnl).toFixed(0)}
                        </span>
                      )}
                      {!isWeekend && !isFuture && pnl === undefined && <Plus className="h-3 w-3 text-muted-foreground/30" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detail dialog for existing trades */}
            {detailDate && (
              <Dialog open={!!detailDate} onOpenChange={() => setDetailDate(null)}>
                <DialogContent className="bg-card border-border/50">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">
                      Trades on {new Date(detailDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    {detailTrades.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                        <div>
                          <p className={`text-sm font-bold ${t.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {t.amount >= 0 ? "+" : ""}${t.amount.toFixed(2)}
                            {t.ticker && <span className="ml-2 text-xs text-muted-foreground font-normal">{t.ticker}</span>}
                          </p>
                          {t.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{t.notes}</p>}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(t.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-border/30 text-right">
                      <span className={`text-sm font-bold ${detailTotal >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        Total: {detailTotal >= 0 ? "+" : ""}${detailTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}

        {/* Add Trade Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-card border-border/50">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Log Trade — {selectedDate && new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">P&L Amount ($)</Label>
                <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 150 or -75" className="mt-1 bg-muted/30 border-border/50" />
              </div>
              <div>
                <Label className="text-muted-foreground">Ticker (optional)</Label>
                <Input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="e.g. SPY" className="mt-1 bg-muted/30 border-border/50" maxLength={5} />
              </div>
              <div>
                <Label className="text-muted-foreground">Notes (optional)</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Quick note..." className="mt-1 bg-muted/30 border-border/50" />
              </div>
              <Button onClick={handleSave} disabled={saving || !amount} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Trade
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default DashboardAnalytics;
