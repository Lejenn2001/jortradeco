import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Target, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  total: number;
  wins: number;
  pending: number;
  streak: number;
}

const PerformanceSnapshot = () => {
  const [stats, setStats] = useState<Stats>({ total: 0, wins: 0, pending: 0, streak: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data } = await supabase
          .from("signal_outcomes")
          .select("outcome, resolved_at")
          .gte("created_at", sevenDaysAgo)
          .order("created_at", { ascending: false });

        if (data) {
          const total = data.filter(d => d.outcome !== "pending").length;
          const wins = data.filter(d => d.outcome === "win").length;
          const pending = data.filter(d => d.outcome === "pending").length;

          // Calculate streak
          let streak = 0;
          for (const d of data) {
            if (d.outcome === "win") streak++;
            else if (d.outcome !== "pending") break;
          }

          setStats({ total, wins, pending, streak });
        }
      } catch (e) {
        console.error("Performance fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const winRate = stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;

  if (loading) {
    return (
      <div className="glass-panel rounded-xl p-4 border-glow-green animate-pulse h-20" />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-panel rounded-xl p-4 border-glow-green"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-semibold text-foreground">This Week's Performance</span>
        </div>
        {stats.streak >= 3 && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
            <Flame className="h-3 w-3" />
            {stats.streak}W Streak
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-lg font-bold text-emerald-400">{winRate}%</div>
          <div className="text-[9px] text-muted-foreground">Win Rate</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">
            {stats.wins}/{stats.total}
          </div>
          <div className="text-[9px] text-muted-foreground">Signals Hit</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-primary">{stats.pending}</div>
          <div className="text-[9px] text-muted-foreground">Pending</div>
        </div>
      </div>
    </motion.div>
  );
};

export default PerformanceSnapshot;
