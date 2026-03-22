import HeroSection from "@/components/HeroSection";
import WhatWeDoSection from "@/components/WhatWeDoSection";
import MeetBiddieSection from "@/components/MeetBiddieSection";
import AIWorkflowSection from "@/components/AIWorkflowSection";
import RealTimeGuidanceSection from "@/components/RealTimeGuidanceSection";
import DashboardPreview from "@/components/DashboardPreview";
import FeaturesGridSection from "@/components/FeaturesGridSection";
import MentorshipSection from "@/components/MentorshipSection";
import CTASection from "@/components/CTASection";
import FAQSection from "@/components/FAQSection";
import Disclaimer from "@/components/Disclaimer";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(230,30%,8%)] via-[hsl(260,25%,6%)] via-50% to-[hsl(230,25%,5%)]">
      <HeroSection />
      <DashboardPreview />
      <WhatWeDoSection />
      <MeetBiddieSection />
      <AIWorkflowSection />
      <RealTimeGuidanceSection />
      <FeaturesGridSection />
      <MentorshipSection />
      <CTASection />
      <FAQSection />
      <Disclaimer />
      <Footer />
    </div>
  );
};

export default Index;
