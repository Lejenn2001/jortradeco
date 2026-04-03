import { useState } from "react";
import { Users } from "lucide-react";
import { motion } from "framer-motion";
import biddieRobot from "@/assets/biddie-robot.png";

const QUOTES = [
  "The stock market is a device for transferring money from the impatient to the patient.",
  "Risk comes from not knowing what you're doing.",
  "Be fearful when others are greedy, greedy when others are fearful.",
  "The trend is your friend until it bends at the end.",
  "Cut your losses short and let your winners run.",
  "Plan your trade and trade your plan.",
  "In trading, the impossible happens about twice a year.",
  "Markets can stay irrational longer than you can stay solvent.",
  "Don't try to catch a falling knife.",
  "The best trade is the one you don't take.",
  "Discipline is the bridge between goals and accomplishment.",
  "Every master was once a disaster.",
  "Stay hungry. Stay humble. Stay in the game.",
  "The money is made in the waiting.",
];

interface ChatRoomHeaderProps {
  onlineCount: number;
  firstName: string;
}

const ChatRoomHeader = ({ onlineCount, firstName }: ChatRoomHeaderProps) => {
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  return (
    <div className="space-y-2">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-xl border border-border/10 bg-card/80">
        {/* Candlestick SVG background */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.6]" viewBox="0 0 1000 100" preserveAspectRatio="none">
          {[40, 95, 150, 205, 260, 315, 370, 425, 480, 535, 590, 645, 700, 755, 810, 865, 920].map((x, i) => {
            const heights = [30, 22, 40, 18, 35, 45, 25, 32, 20, 42, 28, 38, 15, 30, 22, 35, 28];
            const tops = [35, 42, 25, 48, 30, 15, 40, 32, 45, 22, 38, 28, 50, 35, 42, 25, 38];
            const green = i % 3 !== 0;
            return (
              <g key={i}>
                <line x1={x} y1={tops[i] - 8} x2={x} y2={tops[i] + heights[i] + 8} stroke={green ? "hsl(var(--primary))" : "hsl(var(--accent))"} strokeWidth="1.5" opacity="0.5" />
                <rect x={x - 6} y={tops[i]} width="12" height={heights[i]} fill={green ? "hsl(var(--primary))" : "hsl(var(--accent))"} rx="1" opacity="0.4" />
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-accent/5 to-blue-500/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-card/20 to-transparent" />

        <div className="relative px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full bg-gradient-to-b from-blue-400 via-primary to-blue-400/50" />
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-[0.15em] uppercase bg-gradient-to-r from-foreground via-foreground to-foreground/50 bg-clip-text text-transparent">
                JORTRADE CHAT
              </h1>
              <p className="text-[9px] uppercase tracking-[0.3em] text-blue-400/80 font-semibold">
                Talk Trades · Share Setups · Build Together
              </p>
            </div>
          </div>

          {/* Online count badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Users className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400">{onlineCount} online</span>
          </div>
        </div>
      </div>

      {/* Biddie Quote Card */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center gap-3">
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="flex-shrink-0"
        >
          <img
            src={biddieRobot}
            alt="Biddie"
            className="w-12 h-12 object-contain drop-shadow-[0_0_12px_hsl(230_85%_60%_/_0.4)]"
          />
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-primary mb-0.5">Biddie AI</p>
          <p className="text-[11px] text-muted-foreground/80 italic truncate">"{quote}"</p>
        </div>
      </div>
    </div>
  );
};

export default ChatRoomHeader;
