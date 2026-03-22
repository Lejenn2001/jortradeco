import { motion } from "framer-motion";
import biddieRobot from "@/assets/biddie-robot.png";

const MeetBiddieSection = () => {
  return (
    <section className="relative py-28 overflow-hidden">
      {/* Subtle ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse,hsl(270_60%_35%_/_0.15)_0%,transparent_60%)]" />
        <div className="absolute inset-[80px] bg-[radial-gradient(ellipse,hsl(230_70%_40%_/_0.1)_0%,transparent_55%)]" />
      </div>

      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-semibold text-foreground border border-muted-foreground/30 rounded-full px-4 py-1.5 mb-6">
            How It Works
          </span>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center max-w-5xl mx-auto">
          {/* Left — JORTRADE */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
              The Platform
            </p>
            <h3 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight mb-4">
              JORTRADE
            </h3>
            <p className="text-lg text-primary font-semibold mb-4">
              The Intelligence Engine
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              A market intelligence platform built to help traders understand liquidity, positioning, sentiment, and probability-based opportunities using advanced data tools and analytics.
            </p>
          </motion.div>

          {/* Right — BIDDIE */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-center md:text-left"
          >
            <motion.img
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              src={biddieRobot}
              alt="Biddie - AI Trading Assistant"
              className="w-28 h-28 md:w-36 md:h-36 mx-auto md:mx-0 mb-6 drop-shadow-[0_0_25px_hsl(230_85%_60%_/_0.35)]"
            />
            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
              Your AI Assistant
            </p>
            <h3 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight mb-4">
              BIDDIE
            </h3>
            <p className="text-lg text-primary font-semibold mb-4">
              The AI Strategist
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Biddie interprets market conditions, explains potential setups, and helps you navigate insights — your personal AI strategist inside JORTRADE.
            </p>
          </motion.div>
        </div>

        {/* Divider line */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16 h-px bg-gradient-to-r from-transparent via-border to-transparent max-w-3xl mx-auto"
        />
      </div>
    </section>
  );
};

export default MeetBiddieSection;
