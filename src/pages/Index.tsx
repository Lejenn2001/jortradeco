import HeroSection from "@/components/HeroSection";
import WhatWeDoSection from "@/components/WhatWeDoSection";
import AIWorkflowSection from "@/components/AIWorkflowSection";
import RealTimeGuidanceSection from "@/components/RealTimeGuidanceSection";
import DashboardPreview from "@/components/DashboardPreview";
import FeaturesGridSection from "@/components/FeaturesGridSection";
import CTASection from "@/components/CTASection";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <DashboardPreview />
      <WhatWeDoSection />
      <AIWorkflowSection />
      <RealTimeGuidanceSection />
      <FeaturesGridSection />
      <CTASection />
      <FAQSection />
      <Footer />
    </div>
  );
};

export default Index;
