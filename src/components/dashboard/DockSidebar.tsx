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
  Gift,
  Crosshair,
  Flame,
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

const mainNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Activity, label: "Signals", path: "/dashboard/signals" },
  { icon: BarChart3, label: "Market", path: "/dashboard/market" },
  { icon: Crosshair, label: "Scanner", path: "/dashboard/scanner" },
  { icon: Flame, label: "Trump Feed", path: "/dashboard/trump" },
  { icon: Users, label: "Chat", path: "/dashboard/community" },
];

const trackingNavItems = [
  { icon: Wallet, label: "P&L", path: "/dashboard/pnl" },
  { icon: Activity, label: "Performance", path: "/dashboard/performance" },
  { icon: Gift, label: "Referrals", path: "/dashboard/referrals" },
];

const systemNavItems = [
  { icon: PieChart, label: "Analytics", path: "/dashboard/analytics" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

const DockSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const renderNavItems = (items: typeof mainNavItems) =>
    items.map((item) => {
      const isActive =
        location.pathname === item.path ||
        (item.path === "/dashboard" && location.pathname === "/dashboard");

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
    });

  return (
    <Sidebar collapsible="icon" className="hidden lg:flex border-r border-border/40 bg-card/80 backdrop-blur-xl">
      <SidebarHeader className="p-3">
        <Link to="/" className="flex items-center gap-2.5 px-1">
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          {!collapsed && (
            <span className="font-bold text-sm text-foreground tracking-tight">JORTRADE</span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/50 px-3">Trading</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{renderNavItems(mainNavItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/50 px-3">Tracking</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{renderNavItems(trackingNavItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/50 px-3">System</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{renderNavItems(systemNavItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
