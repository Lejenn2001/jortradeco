import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  BarChart3,
  Settings,
  LogOut,
  Users,
  PieChart,
  Crosshair,
  Megaphone,
  ShieldCheck,
} from "lucide-react";
import jortradeLogo from "@/assets/jortrade_logo_dark.png";
  Users,
  PieChart,
  Crosshair,
  Megaphone,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Users, label: "Jortrade Chat", path: "/dashboard/community" },
];

const tradingItems = [
  { icon: Activity, label: "Decision Engine", path: "/dashboard/signals" },
  { icon: Crosshair, label: "Breakout Scanner", path: "/dashboard/scanner" },
  { icon: BarChart3, label: "Market View", path: "/dashboard/market" },
];

const insightItems = [
  { icon: PieChart, label: "Analytics", path: "/dashboard/analytics" },
  { icon: Megaphone, label: "Trump Feed", path: "/dashboard/trump" },
];

const settingsItems = [
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

const DockSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isAdmin } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const finalInsightItems = isAdmin
    ? [...insightItems, { icon: ShieldCheck, label: "Admin", path: "/dashboard/admin" }]
    : insightItems;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const renderGroup = (label: string, items: typeof mainItems) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/50">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                  <Link to={item.path} className="flex items-center gap-2.5">
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" className="hidden lg:flex border-r border-border/40 bg-card/80 backdrop-blur-xl">
      <SidebarHeader className="p-3">
        <Link to="/" className="flex flex-col items-center gap-1 px-1 py-2">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
            <span className="text-primary font-black text-lg tracking-tighter leading-none" style={{ fontFamily: "'Inter', sans-serif" }}>
              JT
            </span>
          </div>
          {!collapsed && (
            <span className="text-[10px] font-bold text-muted-foreground tracking-[0.25em] uppercase mt-0.5">JORTRADE</span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {renderGroup("Main", mainItems)}
        {renderGroup("Trading", tradingItems)}
        {renderGroup("Insights", finalInsightItems)}
        {renderGroup("Account", settingsItems)}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip="Sign Out"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default DockSidebar;
