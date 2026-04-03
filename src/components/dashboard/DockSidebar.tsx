import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  BarChart3,
  Settings,
  LogOut,
  Bot,
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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Users, label: "Jortrade Chat", path: "/dashboard/community" },
  { icon: Activity, label: "Decision Engine", path: "/dashboard/signals" },
  { icon: Crosshair, label: "Breakout Scanner", path: "/dashboard/scanner" },
  { icon: BarChart3, label: "Market View", path: "/dashboard/market" },
  { icon: PieChart, label: "Analytics", path: "/dashboard/analytics" },
  { icon: Megaphone, label: "Trump Feed", path: "/dashboard/trump" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

const DockSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isAdmin } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const allNavItems = isAdmin
    ? [...navItems, { icon: ShieldCheck, label: "Admin", path: "/dashboard/admin" }]
    : navItems;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

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
          <SidebarGroupContent>
            <SidebarMenu>
              {allNavItems.map((item) => {
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
              })}
            </SidebarMenu>
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
