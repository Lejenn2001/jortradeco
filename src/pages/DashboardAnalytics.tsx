import { useState, useEffect } from "react";
import { Users, UserPlus, MessageSquare, TrendingUp, BarChart3, ShieldAlert, Shield, ShieldCheck, ShieldX, Anchor, Gauge } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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

interface MemberWithRoles {
  id: string;
  full_name: string;
  created_at: string;
  roles: string[];
}

const DashboardAnalytics = () => {
  const { session } = useAuth();
  const [members, setMembers] = useState<MemberWithRoles[]>([]);
  const [chatCount, setChatCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [apiUsageToday, setApiUsageToday] = useState(0);
  const [apiUsageMinute, setApiUsageMinute] = useState(0);

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

  const loadMembers = async () => {
    const { data, error } = await supabase.functions.invoke("manage-roles", {
      body: { action: "list" },
    });
    if (error) {
      console.error("Failed to load members:", error);
      return;
    }
    if (data?.members) setMembers(data.members);

    const chatRes = await supabase.from("chat_messages").select("id", { count: "exact", head: true });
    if (chatRes.count !== null) setChatCount(chatRes.count);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin !== true) return;
    loadMembers();
  }, [isAdmin]);

  const toggleAdmin = async (userId: string, currentlyAdmin: boolean) => {
    setTogglingId(userId);
    const { data, error } = await supabase.functions.invoke("manage-roles", {
      body: {
        action: currentlyAdmin ? "revoke" : "grant",
        user_id: userId,
        role: "admin",
      },
    });
    if (error || data?.error) {
      toast({
        title: "Error",
        description: data?.error || error?.message || "Failed to update role",
        variant: "destructive",
      });
    } else {
      toast({
        title: currentlyAdmin ? "Admin removed" : "Admin granted",
        description: currentlyAdmin ? "User is no longer an admin." : "User is now an admin.",
      });
      await loadMembers();
    }
    setTogglingId(null);
  };

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
          <div className="mb-6">
            <h1 className="text-xl font-display font-bold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground">Member activity and platform overview</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard icon={Users} label="Total Members" value={members.length} color="bg-primary" />
                <StatCard icon={UserPlus} label="New Today" value={newToday} color="bg-emerald-500" />
                <StatCard icon={TrendingUp} label="This Week" value={newThisWeek} subtitle="New signups" color="bg-purple-500" />
                <StatCard icon={MessageSquare} label="Chat Messages" value={chatCount} color="bg-amber-500" />
              </div>

              {/* Members Table with Role Management */}
              <div className="glass-panel rounded-xl border-border/40 overflow-hidden">
                <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Members & Roles</h2>
                  <span className="text-xs text-muted-foreground ml-auto">{members.length} total</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Name</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Joined</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Role</th>
                        <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => {
                        const memberIsAdmin = m.roles.includes("admin");
                        const isSelf = m.id === session?.user?.id;
                        return (
                          <tr key={m.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                            <td className="px-5 py-3 text-foreground">
                              {m.full_name || "Unknown"}
                              {isSelf && <span className="text-xs text-muted-foreground ml-2">(you)</span>}
                            </td>
                            <td className="px-5 py-3 text-muted-foreground">{formatDate(m.created_at)}</td>
                            <td className="px-5 py-3">
                              {memberIsAdmin ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                                  <ShieldCheck className="h-3 w-3" /> Admin
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Member</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              {!isSelf && (
                                <Button
                                  size="sm"
                                  variant={memberIsAdmin ? "destructive" : "outline"}
                                  className="text-xs h-7 px-3"
                                  disabled={togglingId === m.id}
                                  onClick={() => toggleAdmin(m.id, memberIsAdmin)}
                                >
                                  {togglingId === m.id ? (
                                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                  ) : memberIsAdmin ? (
                                    <><ShieldX className="h-3 w-3 mr-1" /> Remove Admin</>
                                  ) : (
                                    <><ShieldCheck className="h-3 w-3 mr-1" /> Make Admin</>
                                  )}
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {members.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">No members yet</td>
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
