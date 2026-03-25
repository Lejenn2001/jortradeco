import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import SignalFeedPanel from "@/components/dashboard/SignalFeedPanel";
import PortfolioPanel from "@/components/dashboard/PortfolioPanel";
import MarketStatusSign from "@/components/dashboard/MarketStatusSign";
import { useMarketData } from "@/hooks/useMarketData";

const Dashboard = () => {
  const { signals, whaleAlerts, loading } = useMarketData();

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
          <MarketStatusSign />

          <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
            <div>
              <SignalFeedPanel signals={signals} loading={loading} />
            </div>
            <div>
              <PortfolioPanel whaleAlerts={whaleAlerts} loading={loading} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
