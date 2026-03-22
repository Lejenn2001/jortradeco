import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatsBar from "@/components/dashboard/StatsBar";
import SignalFeedPanel from "@/components/dashboard/SignalFeedPanel";
import MarketChartPanel from "@/components/dashboard/MarketChartPanel";
import AIChatPanel from "@/components/dashboard/AIChatPanel";
import PortfolioPanel from "@/components/dashboard/PortfolioPanel";

const Dashboard = () => {
  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Stats */}
          <StatsBar />

          {/* Main grid: signals + chart */}
          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <SignalFeedPanel />
            </div>
            <div className="lg:col-span-3">
              <MarketChartPanel />
            </div>
          </div>

          {/* Bottom grid: chat + portfolio */}
          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
              <AIChatPanel />
            </div>
            <div className="lg:col-span-2">
              <PortfolioPanel />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
