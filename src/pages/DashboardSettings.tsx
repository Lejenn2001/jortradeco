import DashboardLayout from "@/components/dashboard/DashboardLayout";
import NotificationSettings from "@/components/dashboard/NotificationSettings";

const DashboardSettings = () => {
  return (
    <DashboardLayout showTickerTape={false}>
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-5 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your alert preferences</p>
        </div>
        <NotificationSettings />
      </div>
    </DashboardLayout>
  );
};

export default DashboardSettings;
