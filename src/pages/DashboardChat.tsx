import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AIChatPanel from "@/components/dashboard/AIChatPanel";

const DashboardChat = () => {
  return (
    <DashboardLayout showTickerTape={false}>
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-5 h-full">
        <div className="h-[calc(100vh-120px)]">
          <AIChatPanel />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardChat;
