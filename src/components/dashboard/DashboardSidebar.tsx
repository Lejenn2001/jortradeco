import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  BarChart3,
  MessageSquare,
  Wallet,
  Settings,
  LogOut,
  Bot,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Activity, label: "Signals", path: "/dashboard/signals" },
  { icon: BarChart3, label: "Market View", path: "/dashboard/market" },
  { icon: MessageSquare, label: "AI Chat", path: "/dashboard/chat" },
  { icon: Wallet, label: "Portfolio", path: "/dashboard/portfolio" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

const DashboardSidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-[240px] h-screen glass-panel border-r border-border/60 flex flex-col p-4 shrink-0">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 px-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <span className="font-display text-sm font-bold text-foreground tracking-wider">JORTRADE</span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === "/dashboard" && location.pathname === "/dashboard");
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border/40 pt-4 mt-4">
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive transition-colors w-full">
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
