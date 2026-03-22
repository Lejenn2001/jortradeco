import { useState, useEffect } from "react";
import { Users, UserPlus, MessageSquare, TrendingUp, BarChart3, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtitle?: string;
  color: string;
}

const StatCard = ({ icon: Icon, label, value, subtitle, color }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass-panel rounded-xl p-5 border-border/40"
  >
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
    {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
  </motion.div>
);

interface MemberRow {
  id: string;
  full_name: string;
  created_at: string;
}

const DashboardAnalytics = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [chatCount, setChatCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!session?.user?.id) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [session?.user?.id]);

  useEffect(() => {
    if (isAdmin !== true) return;
    const load = async () => {
      const [profilesRes, chatRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, created_at").order("created_at", { ascending: false }),
        supabase.from("chat_messages").select("id", { count: "exact", head: true }),
      ]);
      if (profilesRes.data) setMembers(profilesRes.data);
      if (chatRes.count !== null) setChatCount(chatRes.count);
      setLoading(false);
    };
    load();
  }, [isAdmin]);

  const today = new Date().toISOString().split("T")[0];
  const newToday = members.filter((m) => m.created_at.startsWith(today)).length;

  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);
  const newThisWeek = members.filter((m) => new Date(m.created_at) >= thisWeekStart).length;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (isAdmin === null) {
    return (
      <div className="h-screen flex bg-background overflow-hidden">
        <DashboardSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="h-screen flex bg-background overflow-hidden">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 flex items-center justify-center bg-mesh">
            <div className="text-center space-y-3">
              <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="text-lg font-bold text-foreground">Admin Access Only</h2>
              <p className="text-sm text-muted-foreground">You don't have permission to view this page.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-mesh">
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard icon={Users} label="Total Members" value={members.length} color="bg-primary" />
                <StatCard icon={UserPlus} label="New Today" value={newToday} color="bg-emerald-500" />
                <StatCard icon={TrendingUp} label="This Week" value={newThisWeek} subtitle="New signups" color="bg-purple-500" />
                <StatCard icon={MessageSquare} label="Chat Messages" value={chatCount} color="bg-amber-500" />
              </div>

              {/* Members Table */}
              <div className="glass-panel rounded-xl border-border/40 overflow-hidden">
                <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Members</h2>
                  <span className="text-xs text-muted-foreground ml-auto">{members.length} total</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Name</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => (
                        <tr key={m.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3 text-foreground">{m.full_name || "Unknown"}</td>
                          <td className="px-5 py-3 text-muted-foreground">{formatDate(m.created_at)}</td>
                        </tr>
                      ))}
                      {members.length === 0 && (
                        <tr>
                          <td colSpan={2} className="px-5 py-8 text-center text-muted-foreground">No members yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardAnalytics;
