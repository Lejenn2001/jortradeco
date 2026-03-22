import { Button } from "@/components/ui/button";
import tradingBg from "@/assets/trading-bg.jpg";

const CTASection = () => {
  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0">
        <img src={tradingBg} alt="" className="w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/70" />
      </div>
      <div className="relative z-10 container mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          Trade Smarter with JORTRADE
        </h2>
        <p className="text-primary font-medium mt-3">
          Join Now & Boost Your Profits!
        </p>
        <Button variant="hero" size="lg" className="mt-8 px-12 text-base">
          Join Now
        </Button>
      </div>
    </section>
  );
};

export default CTASection;
