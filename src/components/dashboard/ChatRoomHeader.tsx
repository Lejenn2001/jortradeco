import { useState, useEffect } from "react";
import { Users, Clock, MapPin } from "lucide-react";
import { useWeather, getBiddieOutfit } from "@/hooks/useWeather";
import { motion } from "framer-motion";

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
  const { weather } = useWeather();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = currentTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/New_York",
  });

  const dateStr = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });

  const biddieOutfit = weather ? getBiddieOutfit(weather.condition) : "looking fresh 🤖";

  return (
    <div className="space-y-3">
      {/* Top bar: Time + Weather + Online */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Live Clock */}
        <div className="glass-panel rounded-xl px-4 py-2.5 flex items-center gap-2.5">
          <Clock className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-display font-bold text-foreground tracking-wide">{timeStr}</p>
            <p className="text-[10px] text-muted-foreground">{dateStr} EST</p>
          </div>
        </div>

        {/* Weather */}
        {weather && (
          <div className="glass-panel rounded-xl px-4 py-2.5 flex items-center gap-2.5">
            <span className="text-xl">{weather.icon}</span>
            <div>
              <p className="text-sm font-semibold text-foreground">{weather.temp}°F</p>
              <div className="flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">{weather.location}</p>
              </div>
            </div>
          </div>
        )}

        {/* Online Count */}
        <div className="glass-panel rounded-xl px-4 py-2.5 flex items-center gap-2.5 border border-hsl(var(--success))/20">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <Users className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">{onlineCount} online</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Title */}
        <div className="text-right">
          <h1 className="text-lg font-display font-bold text-gradient-blue tracking-wider">JORTRADE CHAT</h1>
          <p className="text-[10px] text-muted-foreground">Talk trades · Share setups · Build together</p>
        </div>
      </div>

      {/* Biddie + Quote Row */}
      <div className="glass-panel rounded-xl p-3 border-glow-blue flex items-center gap-4">
        {/* Biddie Avatar */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="flex-shrink-0"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-3xl relative">
            🤖
            {weather && (
              <span className="absolute -bottom-1 -right-1 text-sm">
                {weather.condition === "Rainy" || weather.condition === "Showers" || weather.condition === "Drizzle" ? "☂️" :
                 weather.condition === "Snowy" || weather.condition === "Snow Showers" ? "🧣" :
                 weather.condition === "Clear" ? "😎" :
                 weather.condition === "Thunderstorm" ? "⚡" : ""}
              </span>
            )}
          </div>
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-xs font-semibold text-primary">Biddie AI</p>
            <span className="text-[10px] text-muted-foreground">is rocking {biddieOutfit}</span>
          </div>
          <p className="text-xs text-muted-foreground/80 italic truncate">"{quote}"</p>
        </div>

        {/* Greeting */}
        <div className="hidden md:block text-right flex-shrink-0">
          <p className="text-xs text-muted-foreground">Welcome back</p>
          <p className="text-sm font-semibold text-foreground">{firstName} 👋</p>
        </div>
      </div>
    </div>
  );
};

export default ChatRoomHeader;
