import HeroSection from "@/components/HeroSection";
import DashboardPreview from "@/components/DashboardPreview";
import CTASection from "@/components/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <DashboardPreview />
      <CTASection />
    </div>
  );
};

export default Index;
