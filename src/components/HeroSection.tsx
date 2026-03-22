import { TrendingUp, CheckCircle2, Bell, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import tradingBg from "@/assets/trading-bg.jpg";
import biddieRobot from "@/assets/biddie-robot.png";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={tradingBg} alt="" className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 pt-8">
        {/* Nav */}
        <nav className="flex items-center gap-3 mb-20">
          <TrendingUp className="h-7 w-7 text-primary" />
          <span className="font-display text-xl font-bold tracking-wider text-foreground">JORTRADE</span>
        </nav>

        {/* Hero content */}
        <div className="grid lg:grid-cols-5 gap-12 items-center">
          <div className="lg:col-span-3 space-y-6">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
              Accurate <span className="text-gradient-green">Signals</span>.
              <br />
              Intelligent Trading.
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              Your Personal Trading Agent.
            </p>

            {/* Chart placeholder area with BUY/SELL labels */}
            <div className="relative h-48 max-w-xl mt-8">
              <svg viewBox="0 0 600 180" className="w-full h-full" preserveAspectRatio="none">
                {/* Red line (sell signal) */}
                <polyline
                  points="0,140 50,130 100,120 140,100 170,110 200,90 230,80 260,95 300,70 340,85 370,60 400,75 430,50 460,65 500,40 540,55 580,30 600,35"
                  fill="none"
                  stroke="hsl(0 72% 51%)"
                  strokeWidth="2.5"
                  opacity="0.7"
                />
                {/* Green line (buy signal) */}
                <polyline
                  points="0,150 50,145 100,135 140,140 170,125 200,130 230,110 260,115 300,95 340,90 370,100 400,80 430,70 460,60 500,50 540,35 580,25 600,20"
                  fill="none"
                  stroke="hsl(142 71% 45%)"
                  strokeWidth="2.5"
                />
                {/* Area fill under green line */}
                <linearGradient id="greenFade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142 71% 45%)" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="hsl(142 71% 45%)" stopOpacity="0" />
                </linearGradient>
                <polygon
                  points="0,150 50,145 100,135 140,140 170,125 200,130 230,110 260,115 300,95 340,90 370,100 400,80 430,70 460,60 500,50 540,35 580,25 600,20 600,180 0,180"
                  fill="url(#greenFade)"
                />
              </svg>
              {/* BUY label */}
              <div className="absolute left-[28%] top-[45%] flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-xs font-bold text-primary">BUY</span>
              </div>
              {/* SELL label */}
              <div className="absolute left-[60%] top-[20%] flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <span className="text-xs font-bold text-destructive">SELL</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 text-sm text-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>87% Win Rate</span>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-400" />
                <span>Real-Time Alerts</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-muted-foreground" />
                <span>AI-Powered Insights</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-4 pt-2">
              <Button variant="hero" size="lg" className="px-8 text-base">
                Get Started
              </Button>
              <Button variant="heroOutline" size="lg" className="px-8 text-base">
                Learn More
              </Button>
            </div>
          </div>

          {/* Right side - Robot + Chat */}
          <div className="lg:col-span-2 flex flex-col items-center lg:items-end">
            {/* Speech bubble */}
            <div className="glass-panel rounded-2xl px-5 py-3 mb-4 max-w-xs text-sm text-foreground">
              Hi there! How can I assist you today?
              <div className="absolute -bottom-2 right-8 w-4 h-4 glass-panel rotate-45 border-t-0 border-l-0" />
            </div>

            {/* Robot */}
            <div className="relative w-64 h-64 lg:w-80 lg:h-80">
              <img src={biddieRobot} alt="Biddie AI Assistant" className="w-full h-full object-contain drop-shadow-[0_0_30px_hsl(142_71%_45%_/_0.3)]" />
            </div>

            {/* Ask Biddie card */}
            <div className="glass-panel rounded-xl p-4 w-72 mt-2 border-glow-green">
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
          </div>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-8 mt-16 justify-center lg:justify-start">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-sm text-foreground">Accurate Trade Signals</div>
              <div className="text-xs text-muted-foreground max-w-[200px]">Pinpoint buy and sell signals with proven accuracy.</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Brain className="h-5 w-5 text-accent" />
            </div>
            <div>
              <div className="font-semibold text-sm text-foreground">Personalized AI Guidance</div>
              <div className="text-xs text-muted-foreground max-w-[200px]">Get custom trading advice tailored to you.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
