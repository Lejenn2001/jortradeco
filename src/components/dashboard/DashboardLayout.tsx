import { Search, PanelLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DockSidebar from "./DockSidebar";
import MobileNavBar from "./MobileNavBar";
import SignalAlerts from "./SignalAlerts";
import TickerTape from "./TickerTape";

interface Props {
  children: React.ReactNode;
  showTickerTape?: boolean;
}

const DashboardLayout = ({ children, showTickerTape = true }: Props) => {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "Trader";

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-background overflow-hidden relative">
        <DockSidebar />

        <div className="flex-1 flex flex-col min-w-0 relative z-10">
          {/* Slim header */}
          <header className="h-14 flex items-center justify-between px-5 border-b border-border/30 bg-card/30 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="hidden lg:flex h-8 w-8 text-muted-foreground hover:text-foreground" />
              <span className="text-sm text-foreground">
                <span className="text-muted-foreground">Welcome back, </span>
                <span className="font-semibold">{firstName}</span>
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-1.5 max-w-[200px]">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="bg-transparent border-none shadow-none focus-visible:ring-0 text-xs h-auto p-0 placeholder:text-muted-foreground/60"
                />
              </div>
              <SignalAlerts />
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">
                  {firstName.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </header>

          {showTickerTape && <TickerTape />}

          <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
            {children}
          </main>
        </div>

        <MobileNavBar />
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
