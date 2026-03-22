import { TrendingUp, CheckCircle2, Bell, Brain, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import tradingBg from "@/assets/trading-bg.jpg";
import biddieRobot from "@/assets/biddie-robot.png";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const HeroSection = () => {
  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-hero">
      {/* Background layers */}
      <div className="absolute inset-0">
        <img src={tradingBg} alt="" className="w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        {/* Ambient glow orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-40 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-[100px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 pt-8">
        {/* Nav */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-16"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <span className="font-display text-xl font-bold tracking-wider text-foreground">JORTRADE</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <span className="hover:text-foreground cursor-pointer transition-colors">Features</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Dashboard</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Pricing</span>
            <Button variant="hero" size="sm">Get Started</Button>
          </div>
        </motion.nav>

        {/* Hero content */}
        <div className="grid lg:grid-cols-5 gap-12 items-center">
          <div className="lg:col-span-3 space-y-7">
            <motion.h1
              custom={0}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight"
            >
              Accurate <span className="text-gradient-blue">Signals</span>.
              <br />
              Intelligent Trading.
            </motion.h1>

            <motion.p
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="text-lg text-muted-foreground max-w-md"
            >
              Your Personal Trading Agent — powered by AI that reads the market so you don't have to.
            </motion.p>

            {/* Chart */}
            <motion.div
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="relative h-48 max-w-xl"
            >
              <svg viewBox="0 0 600 180" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="blueFade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(230 85% 60%)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="hsl(230 85% 60%)" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(230 85% 60%)" />
                    <stop offset="100%" stopColor="hsl(270 75% 60%)" />
                  </linearGradient>
                </defs>
                {/* Red line (sell) */}
                <polyline
                  points="0,140 50,130 100,120 140,100 170,110 200,90 230,80 260,95 300,70 340,85 370,60 400,75 430,50 460,65 500,40 540,55 580,30 600,35"
                  fill="none"
                  stroke="hsl(0 72% 51%)"
                  strokeWidth="2"
                  opacity="0.5"
                />
                {/* Blue/purple gradient line (buy) */}
                <polyline
                  points="0,150 50,145 100,135 140,140 170,125 200,130 230,110 260,115 300,95 340,90 370,100 400,80 430,70 460,60 500,50 540,35 580,25 600,20"
                  fill="none"
                  stroke="url(#lineGrad)"
                  strokeWidth="2.5"
                />
                <polygon
                  points="0,150 50,145 100,135 140,140 170,125 200,130 230,110 260,115 300,95 340,90 370,100 400,80 430,70 460,60 500,50 540,35 580,25 600,20 600,180 0,180"
                  fill="url(#blueFade)"
                />
              </svg>
              <div className="absolute left-[28%] top-[45%] flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-xs font-bold text-primary">BUY</span>
              </div>
              <div className="absolute left-[60%] top-[20%] flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <span className="text-xs font-bold text-destructive">SELL</span>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="flex flex-wrap gap-6 text-sm text-foreground"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>87% Win Rate</span>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-accent" />
                <span>Real-Time Alerts</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-muted-foreground" />
                <span>AI-Powered Insights</span>
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div
              custom={4}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="flex gap-4 pt-2"
            >
              <Button variant="hero" size="lg" className="px-8 text-base">
                Get Started
              </Button>
              <Button variant="heroOutline" size="lg" className="px-8 text-base">
                Learn More
              </Button>
            </motion.div>
          </div>

          {/* Right side - Robot + Chat */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.7, ease: "easeOut" }}
            className="lg:col-span-2 flex flex-col items-center lg:items-end"
          >
            {/* Speech bubble */}
            <div className="glass-panel rounded-2xl px-5 py-3 mb-4 max-w-xs text-sm text-foreground border-glow-purple">
              Hi there! How can I assist you today?
              <div className="absolute -bottom-2 right-8 w-4 h-4 glass-panel rotate-45 border-t-0 border-l-0" />
            </div>

            {/* Robot */}
            <div className="relative w-64 h-64 lg:w-80 lg:h-80 animate-float">
              <img
                src={biddieRobot}
                alt="Biddie AI Assistant"
                className="w-full h-full object-contain drop-shadow-[0_0_40px_hsl(230_85%_60%_/_0.35)]"
              />
            </div>

            {/* Ask Biddie card */}
            <div className="glass-panel rounded-xl p-4 w-72 mt-2 border-glow-blue">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-primary text-lg">🤖</span>
                  <span className="font-semibold text-foreground text-sm">Ask Biddie</span>
                </div>
                <span className="text-muted-foreground">💬</span>
              </div>
              <div className="text-xs text-muted-foreground mb-2">Example Prompts</div>
              <div className="space-y-2 mb-3">
                {["What's the best trade today?", "Should I buy or sell?", "Analyze the market for me."].map((q) => (
                  <div key={q} className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" />
                    <span>{q}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  readOnly
                  placeholder="Ask me anything..."
                  className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-xs text-muted-foreground border border-border focus:outline-none"
                />
                <button className="bg-primary/20 text-primary rounded-lg p-2 hover:bg-primary/30 transition-colors">
                  <TrendingUp className="h-3 w-3" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20"
        >
          {[
            { icon: TrendingUp, title: "Accurate Trade Signals", desc: "Pinpoint buy and sell signals with proven accuracy.", color: "text-primary" },
            { icon: Brain, title: "Personalized AI Guidance", desc: "Get custom trading advice tailored to you.", color: "text-accent" },
            { icon: Shield, title: "Risk Management", desc: "Smart stop-loss and position sizing built in.", color: "text-glow-cyan" },
          ].map((f) => (
            <div key={f.title} className="glass-panel rounded-xl p-5 border-glow-purple hover:border-glow-blue transition-all duration-300 group">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <f.icon className={`h-5 w-5 ${f.color}`} />
              </div>
              <div className="font-semibold text-sm text-foreground mb-1">{f.title}</div>
              <div className="text-xs text-muted-foreground">{f.desc}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
