import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Radial glow background */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px]">
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,hsl(270_75%_40%_/_0.4)_0%,transparent_60%)]" />
        <div className="absolute inset-[60px] rounded-full bg-[radial-gradient(circle,hsl(30_80%_40%_/_0.35)_0%,transparent_55%)]" />
        <div className="absolute inset-[140px] rounded-full bg-[radial-gradient(circle,hsl(300_60%_50%_/_0.25)_0%,transparent_50%)]" />
        <div className="absolute inset-[200px] rounded-full bg-[radial-gradient(circle,hsl(40_70%_45%_/_0.2)_0%,transparent_45%)]" />
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,hsl(230_25%_5%_/_0.7)_0%,transparent_35%)]" />
      </div>

      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-6"
      >
        <span className="font-display text-lg font-bold tracking-wider text-foreground">JORTRADE</span>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <span className="hover:text-foreground cursor-pointer transition-colors">Features</span>
          <span className="hover:text-foreground cursor-pointer transition-colors">Dashboard</span>
          <span className="hover:text-foreground cursor-pointer transition-colors">Pricing</span>
          <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-5 text-xs font-semibold">
            Get Started
          </Button>
        </div>
      </motion.nav>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex items-center justify-center gap-1 mb-4"
        >
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-foreground text-foreground" />
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-sm font-medium text-muted-foreground tracking-wide mb-6"
        >
          AI Trading Intelligence Platform
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-foreground"
        >
          Trade With Confidence
          <br />
          Using Your AI Assistant
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-muted-foreground mt-6 max-w-2xl mx-auto text-base md:text-lg leading-relaxed"
        >
          JORTRADE helps traders spot opportunities, understand market conditions, and
          make more structured trading decisions with AI guidance.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mt-10"
        >
          <Button className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-8 py-6 text-base font-semibold">
            Get Early Access
          </Button>
          <Button variant="outline" className="rounded-full px-8 py-6 text-base font-semibold border-muted-foreground/30 hover:bg-muted/30">
            View AI Features
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
