import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PageBanner from "@/components/dashboard/PageBanner";
import NotificationSettings from "@/components/dashboard/NotificationSettings";

const DashboardSettings = () => {
  return (
    <DashboardLayout showTickerTape={false}>
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-5 space-y-6">
        <PageBanner
          title="SETTINGS"
          subtitle="Preferences · Alerts · Account"
          accentFrom="hsl(220, 15%, 50%)"
          accentTo="hsl(225, 15%, 40%)"
          gradientFrom="from-slate-800/15"
          gradientTo="to-slate-900/10"
        />
        <NotificationSettings />
      </div>
    </DashboardLayout>
  );
};

export default DashboardSettings;
