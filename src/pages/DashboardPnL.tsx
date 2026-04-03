import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PageBanner from "@/components/dashboard/PageBanner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Flame, Trophy, Calendar as CalendarIcon, Plus, Trash2, Copy, Check, Gift, Users, Share2, TrendingUp, TrendingDown, Target, BarChart3, Zap, Award, AlertTriangle, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { motion } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Area, AreaChart, ReferenceLine
} from "recharts";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_PERF = ["Mon", "Tue", "Wed", "Thu", "Fri"];

interface Trade {
  id: string;
  trade_date: string;
  amount: number;
  ticker: string | null;
  notes: string | null;
}

const TIERS = [
  { count: 1, label: "First Referral", reward: "50% off your next month", icon: Gift },
  { count: 3, label: "Bronze", reward: "1 month free", icon: Trophy },
  { count: 10, label: "Gold", reward: "1 month free + Founder Referrer badge", icon: Trophy },
];

// ─── Chart Tooltip ───
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

// ─── Metric Card ───
const MetricCard = ({
  icon: Icon, label, value, sub, color = "text-primary", bgColor = "bg-primary/10"
}: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  color?: string; bgColor?: string;
}) => (
  <div className="glass-panel rounded-xl p-4 border-border/40">
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
    </div>
    <p className="text-xl font-extrabold text-foreground">{value}</p>
    {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

const DashboardPnL = () => {
  const { profile, session, user } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "Trader";
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [ticker, setTicker] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [detailDate, setDetailDate] = useState<string | null>(null);

  // Referral state
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [refLoading, setRefLoading] = useState(true);

  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Fetch trades for current month
  useEffect(() => {
    if (!session?.user?.id) return;
    const fetchTrades = async () => {
      setLoading(true);
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
      setLoading(false);
    };
    fetchTrades();
  }, [session?.user?.id, year, month, daysInMonth]);

  // Fetch ALL trades for performance
  useEffect(() => {
    if (!session?.user?.id) return;
    const fetchAll = async () => {
      const { data } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", session.user.id)
        .order("trade_date", { ascending: true });
      if (data) setAllTrades(data as Trade[]);
    };
    fetchAll();
  }, [session?.user?.id]);

  // Fetch referral data
  useEffect(() => {
    if (!user) return;
    const fetchRefData = async () => {
      const [codeRes, refRes, rewardRes] = await Promise.all([
        supabase.from("referral_codes").select("code").eq("user_id", user.id).single(),
        supabase.from("referrals").select("*").eq("referrer_id", user.id).order("created_at", { ascending: false }),
        supabase.from("referral_rewards").select("*").eq("user_id", user.id),
      ]);
      if (codeRes.data) setReferralCode(codeRes.data.code);
      if (refRes.data) setReferrals(refRes.data);
      if (rewardRes.data) setRewards(rewardRes.data);
      setRefLoading(false);
    };
    fetchRefData();
  }, [user]);

  // ─── P&L Aggregation ───
  const pnlData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of trades) map[t.trade_date] = (map[t.trade_date] || 0) + Number(t.amount);
    return map;
  }, [trades]);

  const entries = Object.values(pnlData);
  const totalPnL = entries.reduce((a, b) => a + b, 0);
  const winDays = entries.filter((v) => v > 0).length;
  const loseDays = entries.filter((v) => v < 0).length;
  const winRate = entries.length > 0 ? Math.round((winDays / entries.length) * 100) : 0;
  const bestDay = entries.length > 0 ? Math.max(...entries) : 0;
  const worstDay = entries.length > 0 ? Math.min(...entries) : 0;

  const sortedDates = Object.keys(pnlData).sort().reverse();
  let streak = 0;
  for (const d of sortedDates) {
    if (pnlData[d] > 0) streak++;
    else break;
  }

  // ─── Performance Metrics ───
  const perfMetrics = useMemo(() => {
    if (!allTrades.length) return null;
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
    let cumulative = 0;
    const equityCurve = dailyPnL.map(([date, pnl]) => {
      cumulative += pnl;
      return { date: new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }), pnl, equity: cumulative };
    });

    const total = dailyAmounts.reduce((a, b) => a + b, 0);
    const wD = dailyAmounts.filter(v => v > 0).length;
    const lD = dailyAmounts.filter(v => v < 0).length;
    const wr = dailyAmounts.length > 0 ? (wD / dailyAmounts.length) * 100 : 0;
    const avgWin = wD > 0 ? dailyAmounts.filter(v => v > 0).reduce((a, b) => a + b, 0) / wD : 0;
    const avgLoss = lD > 0 ? Math.abs(dailyAmounts.filter(v => v < 0).reduce((a, b) => a + b, 0) / lD) : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * wD) / (avgLoss * lD) : avgWin > 0 ? Infinity : 0;
    let peak = 0, maxDD = 0, runPnL = 0;
    for (const amt of dailyAmounts) { runPnL += amt; if (runPnL > peak) peak = runPnL; const dd = peak - runPnL; if (dd > maxDD) maxDD = dd; }

    let cStreak = 0, lWin = 0, lLoss = 0, tW = 0, tL = 0;
    for (const amt of dailyAmounts) {
      if (amt > 0) { tW++; tL = 0; lWin = Math.max(lWin, tW); }
      else if (amt < 0) { tL++; tW = 0; lLoss = Math.max(lLoss, tL); }
      else { tW = 0; tL = 0; }
    }
    for (let i = dailyAmounts.length - 1; i >= 0; i--) { if (dailyAmounts[i] > 0) cStreak++; else break; }

    const weekdayData = [1, 2, 3, 4, 5].map((dow, idx) => ({
      day: WEEKDAYS_PERF[idx],
      avg: byWeekday[dow] ? byWeekday[dow].total / byWeekday[dow].count : 0,
    }));

    const tickerRanking = Object.entries(byTicker).map(([t, d]) => ({ ticker: t, ...d, avg: d.total / d.count })).sort((a, b) => b.total - a.total);

    const byMonth: Record<string, number> = {};
    for (const [date, pnl] of dailyPnL) { const m = date.slice(0, 7); byMonth[m] = (byMonth[m] || 0) + pnl; }
    const monthlyReturns = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([m, p]) => ({
      month: new Date(m + "-15").toLocaleDateString("en-US", { month: "short", year: "2-digit" }), pnl: p,
    }));

    return { total, wr, wD, lD, avgWin, avgLoss, profitFactor, maxDD, cStreak, lWin, lLoss,
      bestDay: dailyAmounts.length > 0 ? Math.max(...dailyAmounts) : 0,
      worstDay: dailyAmounts.length > 0 ? Math.min(...dailyAmounts) : 0,
      equityCurve, weekdayData, tickerRanking, monthlyReturns, totalDays: dailyAmounts.length };
  }, [allTrades]);

  // ─── Handlers ───
  const handleDayClick = (d: number) => {
    const date = new Date(year, month, d);
    if (date.getDay() === 0 || date.getDay() === 6) return;
    if (date > new Date()) return;
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayTrades = trades.filter((t) => t.trade_date === key);
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
      setTrades((prev) => prev.filter((t) => t.id !== tradeId));
      toast({ title: "Trade deleted" });
      const remaining = trades.filter((t) => t.id !== tradeId && t.trade_date === detailDate);
      if (remaining.length === 0) setDetailDate(null);
    }
  };

  const detailTrades = detailDate ? trades.filter((t) => t.trade_date === detailDate) : [];
  const detailTotal = detailTrades.reduce((s, t) => s + Number(t.amount), 0);

  // Referral helpers
  const paidCount = referrals.filter((r) => r.status === "paid").length;
  const referralLink = referralCode ? `${window.location.origin}/signup?ref=${referralCode}` : "";
  const handleCopy = () => { navigator.clipboard.writeText(referralLink); setCopied(true); sonnerToast.success("Referral link copied!"); setTimeout(() => setCopied(false), 2000); };
  const nextTier = TIERS.find((t) => paidCount < t.count) || TIERS[TIERS.length - 1];
  const progress = Math.min((paidCount / nextTier.count) * 100, 100);

  // Calendar cells
  const calendarCells = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarCells.push(<div key={`empty-${i}`} className="aspect-square" />);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const pnl = pnlData[key];
    const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
    const date = new Date(year, month, d);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isFuture = date > new Date();
    const isClickable = !isWeekend && !isFuture;
    calendarCells.push(
      <div key={d} onClick={() => isClickable && handleDayClick(d)}
        className={`aspect-square rounded-xl border transition-all flex flex-col items-center justify-center gap-0.5 text-xs
          ${isClickable ? "cursor-pointer hover:border-primary/50 hover:scale-105" : ""}
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
        {!isWeekend && !isFuture && pnl === undefined && <Plus className="h-3 w-3 text-muted-foreground/30" />}
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-5 space-y-5">
        <PageBanner
          title="PROFIT & LOSS"
          subtitle="Financial Results & Calendar"
          accentFrom="hsl(20, 90%, 55%)"
          accentTo="hsl(350, 80%, 60%)"
          gradientFrom="from-orange-900/15"
          gradientTo="to-rose-900/10"
        />

        <Tabs defaultValue="calendar" className="space-y-5">
          <TabsList className="bg-muted/30 border border-border/40">
            <TabsTrigger value="calendar" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <CalendarIcon className="h-3.5 w-3.5 mr-1.5" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Performance
            </TabsTrigger>
            <TabsTrigger value="referrals" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Gift className="h-3.5 w-3.5 mr-1.5" /> Referrals
            </TabsTrigger>
          </TabsList>

          {/* ─── CALENDAR TAB ─── */}
          <TabsContent value="calendar" className="space-y-5">
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
              <p className="text-xs text-muted-foreground text-center mb-3">Click any weekday to log a trade</p>
              <div className="grid grid-cols-7 gap-2 mb-2">
                {DAYS.map((d) => (
                  <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">{calendarCells}</div>
            </div>

            <div className="glass-panel rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <p className="text-sm text-muted-foreground">
                  {entries.length === 0
                    ? `Start logging your trades ${firstName}! Click any day on the calendar.`
                    : totalPnL > 0
                      ? `Great month so far ${firstName}! Keep the momentum going.`
                      : `Stay disciplined ${firstName}. Every trader has rough patches.`}
                </p>
              </div>
            </div>
          </TabsContent>

          {/* ─── PERFORMANCE TAB ─── */}
          <TabsContent value="performance" className="space-y-5">
            {!perfMetrics || allTrades.length === 0 ? (
              <div className="glass-panel rounded-xl p-8 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-foreground">No Trades Yet</h2>
                <p className="text-sm text-muted-foreground">Log trades in the Calendar tab to see performance analytics.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <MetricCard icon={perfMetrics.total >= 0 ? TrendingUp : TrendingDown} label="Total P&L"
                    value={`${perfMetrics.total >= 0 ? "+" : ""}$${Math.abs(perfMetrics.total).toFixed(2)}`}
                    sub={`${perfMetrics.totalDays} trading days`}
                    color={perfMetrics.total >= 0 ? "text-emerald-400" : "text-red-400"}
                    bgColor={perfMetrics.total >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"} />
                  <MetricCard icon={Target} label="Win Rate" value={`${perfMetrics.wr.toFixed(1)}%`}
                    sub={`${perfMetrics.wD}W / ${perfMetrics.lD}L`}
                    color={perfMetrics.wr >= 50 ? "text-emerald-400" : "text-red-400"}
                    bgColor={perfMetrics.wr >= 50 ? "bg-emerald-500/10" : "bg-red-500/10"} />
                  <MetricCard icon={Zap} label="Profit Factor"
                    value={perfMetrics.profitFactor === Infinity ? "∞" : perfMetrics.profitFactor.toFixed(2)}
                    sub={`Avg Win $${perfMetrics.avgWin.toFixed(0)} / Avg Loss $${perfMetrics.avgLoss.toFixed(0)}`}
                    color={perfMetrics.profitFactor >= 1.5 ? "text-emerald-400" : "text-amber-400"}
                    bgColor={perfMetrics.profitFactor >= 1.5 ? "bg-emerald-500/10" : "bg-amber-500/10"} />
                  <MetricCard icon={AlertTriangle} label="Max Drawdown" value={`-$${perfMetrics.maxDD.toFixed(2)}`}
                    sub="Peak-to-trough" color="text-red-400" bgColor="bg-red-500/10" />
                </div>

                {/* Equity Curve */}
                <div className="glass-panel rounded-xl p-5 border-border/40">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">Equity Curve</h2>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={perfMetrics.equityCurve}>
                        <defs>
                          <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(230, 85%, 60%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(230, 85%, 60%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(232, 25%, 14%)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(225, 15%, 50%)" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(225, 15%, 50%)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip content={<ChartTooltip />} />
                        <ReferenceLine y={0} stroke="hsl(225, 15%, 30%)" strokeDasharray="3 3" />
                        <Area type="monotone" dataKey="equity" stroke="hsl(230, 85%, 60%)" fill="url(#eqGrad)" strokeWidth={2} name="Equity" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Monthly + Streaks */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="glass-panel rounded-xl p-5 border-border/40 lg:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold text-foreground">Monthly Returns</h2>
                    </div>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={perfMetrics.monthlyReturns}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(232, 25%, 14%)" />
                          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(225, 15%, 50%)" }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(225, 15%, 50%)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                          <Tooltip content={<ChartTooltip />} />
                          <ReferenceLine y={0} stroke="hsl(225, 15%, 30%)" strokeDasharray="3 3" />
                          <Bar dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]}>
                            {perfMetrics.monthlyReturns.map((entry, i) => (
                              <Cell key={i} fill={entry.pnl >= 0 ? "hsl(142, 71%, 45%)" : "hsl(0, 72%, 51%)"} fillOpacity={0.8} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="glass-panel rounded-xl p-5 border-border/40 space-y-3">
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold text-foreground">Streaks</h2>
                    </div>
                    {[
                      { label: "Current Win Streak", value: `${perfMetrics.cStreak} days`, icon: Flame, color: "text-emerald-400" },
                      { label: "Longest Win", value: `${perfMetrics.lWin} days`, icon: Award, color: "text-primary" },
                      { label: "Longest Loss", value: `${perfMetrics.lLoss} days`, icon: AlertTriangle, color: "text-red-400" },
                      { label: "Best Day", value: `+$${perfMetrics.bestDay.toFixed(0)}`, icon: ArrowUpRight, color: "text-emerald-400" },
                      { label: "Worst Day", value: `-$${Math.abs(perfMetrics.worstDay).toFixed(0)}`, icon: ArrowDownRight, color: "text-red-400" },
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
                </div>

                {/* Weekday + Tickers */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="glass-panel rounded-xl p-5 border-border/40">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold text-foreground">Best Trading Days</h2>
                    </div>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={perfMetrics.weekdayData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(232, 25%, 14%)" />
                          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(225, 15%, 50%)" }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(225, 15%, 50%)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                          <Tooltip content={<ChartTooltip />} />
                          <ReferenceLine y={0} stroke="hsl(225, 15%, 30%)" strokeDasharray="3 3" />
                          <Bar dataKey="avg" name="Avg P&L" radius={[4, 4, 0, 0]}>
                            {perfMetrics.weekdayData.map((entry, i) => (
                              <Cell key={i} fill={entry.avg >= 0 ? "hsl(142, 71%, 45%)" : "hsl(0, 72%, 51%)"} fillOpacity={0.8} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="glass-panel rounded-xl p-5 border-border/40">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold text-foreground">Ticker Breakdown</h2>
                    </div>
                    <div className="space-y-2 max-h-44 overflow-y-auto">
                      {perfMetrics.tickerRanking.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No ticker data — add tickers when logging trades</p>
                      ) : (
                        perfMetrics.tickerRanking.slice(0, 10).map((t) => {
                          const maxAbs = Math.max(...perfMetrics.tickerRanking.map(x => Math.abs(x.total)));
                          const barWidth = maxAbs > 0 ? (Math.abs(t.total) / maxAbs) * 100 : 0;
                          return (
                            <div key={t.ticker} className="flex items-center gap-3">
                              <span className="text-xs font-bold text-foreground w-12 shrink-0">{t.ticker}</span>
                              <div className="flex-1 h-5 bg-muted/20 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${t.total >= 0 ? "bg-emerald-500/60" : "bg-red-500/60"}`} style={{ width: `${barWidth}%` }} />
                              </div>
                              <span className={`text-xs font-bold w-16 text-right shrink-0 ${t.total >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {t.total >= 0 ? "+" : ""}${t.total.toFixed(0)}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* ─── REFERRALS TAB ─── */}
          <TabsContent value="referrals" className="space-y-5">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-6 border-glow-blue">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Share2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Your Referral Link</h2>
                  <p className="text-xs text-muted-foreground">Share this link to start earning</p>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 bg-muted/30 border border-border/50 rounded-lg px-4 py-3 text-sm text-muted-foreground font-mono truncate">
                  {refLoading ? "Loading..." : referralLink || "No code generated yet"}
                </div>
                <Button onClick={handleCopy} variant="outline" size="icon" className="shrink-0 border-border/50" disabled={!referralCode}>
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel rounded-2xl p-6 border-glow-blue">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-foreground">Your Progress</h2>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">{paidCount} paid referral{paidCount !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <div className="relative mb-8">
                <div className="h-3 bg-muted/40 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full" />
                </div>
                <div className="flex justify-between mt-2">
                  {TIERS.map((tier) => {
                    const reached = paidCount >= tier.count;
                    return (
                      <div key={tier.count} className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                          reached ? "bg-primary border-primary text-primary-foreground" : "bg-muted/30 border-border/50 text-muted-foreground"
                        }`}>{tier.count}</div>
                        <span className={`text-[10px] mt-1 ${reached ? "text-primary font-semibold" : "text-muted-foreground"}`}>{tier.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-3">
                {TIERS.map((tier) => {
                  const reached = paidCount >= tier.count;
                  const claimed = rewards.some((r) => r.tier === tier.count && r.claimed);
                  return (
                    <div key={tier.count} className={`flex items-center gap-4 p-4 rounded-xl border ${reached ? "border-primary/30 bg-primary/5" : "border-border/30 bg-muted/10"}`}>
                      <tier.icon className={`h-5 w-5 shrink-0 ${reached ? "text-primary" : "text-muted-foreground/40"}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${reached ? "text-foreground" : "text-muted-foreground"}`}>{tier.count} referral{tier.count > 1 ? "s" : ""}</span>
                          {reached && <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full">{claimed ? "CLAIMED" : "UNLOCKED"}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{tier.reward}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {referrals.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel rounded-2xl p-6 border-glow-blue">
                <h2 className="font-semibold text-foreground mb-4">Your Referrals</h2>
                <div className="space-y-2">
                  {referrals.map((ref) => (
                    <div key={ref.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border border-border/20">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center">
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm text-foreground font-medium">Referral #{ref.referred_user_id.slice(0, 6)}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(ref.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        ref.status === "paid" ? "bg-green-500/20 text-green-400" : ref.status === "trial" ? "bg-yellow-500/20 text-yellow-400" : "bg-muted/20 text-muted-foreground"
                      }`}>{ref.status.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Trade Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-panel border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Log Trade</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedDate && new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Profit / Loss ($)</Label>
              <Input type="number" step="0.01" placeholder="e.g. 250 or -100" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-muted/30 border-border/50" />
              <p className="text-[10px] text-muted-foreground mt-1">Use negative for losses</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Ticker (optional)</Label>
              <Input placeholder="e.g. SPY, AAPL" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} className="bg-muted/30 border-border/50" />
            </div>
            <div>
              <Label className="text-muted-foreground">Notes (optional)</Label>
              <Input placeholder="e.g. Caught the morning dip" value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-muted/30 border-border/50" />
            </div>
            <Button onClick={handleSave} disabled={!amount || saving} className="w-full" variant="hero">
              {saving ? "Saving..." : "Log Trade"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Day Detail Dialog */}
      <Dialog open={!!detailDate} onOpenChange={(open) => !open && setDetailDate(null)}>
        <DialogContent className="glass-panel border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {detailDate && new Date(detailDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </DialogTitle>
            <DialogDescription>
              <span className={`font-bold ${detailTotal >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                Day Total: {detailTotal >= 0 ? "+" : ""}${detailTotal.toFixed(2)}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {detailTrades.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                <div>
                  <span className={`font-bold text-sm ${Number(t.amount) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {Number(t.amount) >= 0 ? "+" : ""}${Number(t.amount).toFixed(2)}
                  </span>
                  {t.ticker && <span className="text-xs text-muted-foreground ml-2">{t.ticker}</span>}
                  {t.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{t.notes}</p>}
                </div>
                <button onClick={() => handleDelete(t.id)} className="p-1 hover:bg-red-500/20 rounded transition-colors">
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
            ))}
          </div>
          <Button variant="hero" className="w-full" onClick={() => {
            setSelectedDate(detailDate!); setAmount(""); setTicker(""); setNotes(""); setDetailDate(null); setDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-1" /> Add Another Trade
          </Button>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DashboardPnL;
