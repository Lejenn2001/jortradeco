import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import tradingBg from "@/assets/trading-bg.jpg";
import { ArrowRight, Zap } from "lucide-react";

const CTASection = () => {
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute inset-0">
        <img src={tradingBg} alt="" className="w-full h-full object-cover opacity-15" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/60" />
        {/* Glow orbs */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 left-1/3 w-80 h-40 bg-accent/8 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="relative z-10 container mx-auto px-6 text-center"
      >
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
          <Zap className="h-3 w-3" />
          LIMITED EARLY ACCESS
        </div>

        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground max-w-2xl mx-auto leading-tight">
          Trade Smarter with{" "}
          <span className="text-gradient-blue">JORTRADE</span>
        </h2>

        <p className="text-muted-foreground mt-4 max-w-lg mx-auto">
          Join the next generation of traders using AI-powered signals, real-time analysis, and intelligent guidance.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Button variant="hero" size="lg" className="px-10 text-base group">
            Join Now
            <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button variant="heroOutline" size="lg" className="px-10 text-base">
            View Demo
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          No credit card required • Cancel anytime
        </p>
      </motion.div>
    </section>
  );
};

export default CTASection;
