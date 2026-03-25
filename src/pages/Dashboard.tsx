import { useMemo } from "react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import SignalFeedPanel from "@/components/dashboard/SignalFeedPanel";
import AIChatPanel from "@/components/dashboard/AIChatPanel";
import PortfolioPanel from "@/components/dashboard/PortfolioPanel";
import MarketStatusSign from "@/components/dashboard/MarketStatusSign";
import TickerTape from "@/components/dashboard/TickerTape";
import PerformanceSnapshot from "@/components/dashboard/PerformanceSnapshot";
import { useMarketData } from "@/hooks/useMarketData";

const Dashboard = () => {
  const { signals, whaleAlerts, loading } = useMarketData();

  // Dashboard only shows the absolute best — top 2-3 highest conviction
  const topSignals = useMemo(() => {
    // Prioritize live signals over examples
    const live = signals.filter(s => s.source === 'live');
    const examples = signals.filter(s => s.source !== 'live');
    const sorted = [
      ...live.sort((a, b) => (b.convictionScore ?? 0) - (a.convictionScore ?? 0)),
      ...examples.sort((a, b) => (b.convictionScore ?? 0) - (a.convictionScore ?? 0)),
    ];
    return sorted
      .filter(s => (s.convictionScore ?? s.confidence * 10) >= 60)
      .slice(0, 3);
  }, [signals]);

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <TickerTape />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
          <MarketStatusSign />
          <PerformanceSnapshot />

          <div className="grid lg:grid-cols-5 gap-4 lg:gap-6">
            <div className="lg:col-span-2 max-h-[600px]">
              <AIChatPanel />
            </div>
            <div className="lg:col-span-3 grid grid-cols-1 gap-4 lg:gap-6">
              <SignalFeedPanel signals={topSignals} loading={loading} />
              <PortfolioPanel whaleAlerts={whaleAlerts} loading={loading} limit={6} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
