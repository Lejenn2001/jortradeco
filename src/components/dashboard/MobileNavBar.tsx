import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Activity, BarChart3, Users, Settings } from "lucide-react";

const mobileNavItems = [
  { icon: LayoutDashboard, label: "Home", path: "/dashboard" },
  { icon: Activity, label: "Signals", path: "/dashboard/signals" },
  { icon: Users, label: "Chat", path: "/dashboard/community" },
  { icon: BarChart3, label: "Market", path: "/dashboard/market" },
  { icon: Settings, label: "More", path: "/dashboard/settings" },
];

const MobileNavBar = () => {
  const location = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border/40">
      <div className="flex items-center justify-around py-2 px-1">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === "/dashboard" && location.pathname === "/dashboard");

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNavBar;
