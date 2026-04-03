import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Activity, BarChart3, Users, Flame, Crosshair, Wallet, Settings, MoreHorizontal } from "lucide-react";
import { useState } from "react";

const primaryNavItems = [
  { icon: LayoutDashboard, label: "Home", path: "/dashboard" },
  { icon: Activity, label: "Signals", path: "/dashboard/signals" },
  { icon: Users, label: "Chat", path: "/dashboard/community" },
  { icon: BarChart3, label: "Market", path: "/dashboard/market" },
  { icon: MoreHorizontal, label: "More", path: "__more__" },
];

const moreNavItems = [
  { icon: Crosshair, label: "Scanner", path: "/dashboard/scanner" },
  { icon: Flame, label: "Trump", path: "/dashboard/trump" },
  { icon: Wallet, label: "P&L", path: "/dashboard/pnl" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

const MobileNavBar = () => {
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = moreNavItems.some((item) => location.pathname === item.path);

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setShowMore(false)}>
          <div className="absolute bottom-16 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/40 rounded-t-2xl shadow-2xl">
            <div className="grid grid-cols-4 gap-1 p-3">
              {moreNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setShowMore(false)}
                    className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl transition-colors ${
                      isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[9px] font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border/40">
        <div className="flex items-center justify-around py-2 px-1">
          {primaryNavItems.map((item) => {
            if (item.path === "__more__") {
              return (
                <button
                  key="more"
                  onClick={() => setShowMore(!showMore)}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                    isMoreActive || showMore ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[9px] font-medium">{item.label}</span>
                </button>
              );
            }

            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[9px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default MobileNavBar;
