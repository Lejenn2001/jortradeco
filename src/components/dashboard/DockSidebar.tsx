import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  BarChart3,
  Wallet,
  Settings,
  LogOut,
  Bot,
  Users,
  PieChart,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Users, label: "Chat", path: "/dashboard/community" },
  { icon: Activity, label: "Signals", path: "/dashboard/signals" },
  { icon: BarChart3, label: "Market", path: "/dashboard/market" },
  { icon: Wallet, label: "P&L", path: "/dashboard/pnl" },
  { icon: PieChart, label: "Analytics", path: "/dashboard/analytics" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

const DockSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-[68px] flex-col items-center py-4 z-50 bg-card/80 backdrop-blur-xl border-r border-border/40">
      {/* Logo */}
      <Link to="/" className="mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors">
          <Bot className="h-5 w-5 text-primary" />
        </div>
      </Link>

      {/* Nav Icons */}
      <nav className="flex-1 flex flex-col items-center gap-1">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path === "/dashboard" && location.pathname === "/dashboard");

          return (
            <Link
              key={item.path}
              to={item.path}
              className="group relative"
            >
              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? "bg-primary/20 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <item.icon className="h-[18px] w-[18px]" />
              </motion.div>

              {/* Tooltip */}
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-card border border-border/60 text-xs font-medium text-foreground whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 shadow-lg z-[60]">
                {item.label}
              </div>

              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="dock-active"
                  className="absolute -left-[2px] top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="group relative w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
      >
        <LogOut className="h-[18px] w-[18px]" />
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-card border border-border/60 text-xs font-medium text-foreground whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 shadow-lg">
          Sign Out
        </div>
      </button>
    </aside>
  );
};

export default DockSidebar;
