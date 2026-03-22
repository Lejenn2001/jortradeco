import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Users, MessageCircle, TrendingUp, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

const perks = [
  {
    icon: MessageCircle,
    title: "1-on-1 Sessions",
    desc: "Private calls to review your trades, strategies, and growth plan.",
  },
  {
    icon: TrendingUp,
    title: "Live Market Walkthroughs",
    desc: "Watch real setups unfold with guided commentary and Q&A.",
  },
  {
    icon: Users,
    title: "Community Access",
    desc: "Join a private group of serious traders sharing ideas and setups daily.",
  },
  {
    icon: Calendar,
    title: "Weekly Game Plans",
    desc: "Start every week with a structured outlook and key levels to watch.",
  },
];

const MentorshipSection = () => {
  return (
    <section className="relative py-28 bg-background overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse,hsl(270_60%_35%_/_0.15)_0%,transparent_60%)]" />
        <div className="absolute inset-[80px] bg-[radial-gradient(ellipse,hsl(230_70%_45%_/_0.1)_0%,transparent_55%)]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — copy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-block text-xs font-semibold text-foreground border border-muted-foreground/30 rounded-full px-4 py-1.5 mb-8">
              Mentorship
            </span>

            <h2 className="text-4xl md:text-5xl font-extrabold text-foreground leading-[1.1] mb-6">
              Need a Human Edge?
              <br />
              <span className="text-primary">We've Got You.</span>
            </h2>

            <p className="text-muted-foreground text-base leading-relaxed mb-8 max-w-lg">
              Biddie handles the data — but sometimes you need a real mentor in your corner.
              Get direct access to experienced traders who'll help you level up faster.
            </p>

            <Button className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-8 py-6 text-base font-semibold">
              Learn About Mentorship
            </Button>
          </motion.div>

          {/* Right — perks grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {perks.map((perk, i) => (
              <motion.div
                key={perk.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-panel rounded-xl p-6 border-glow-blue"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <perk.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-foreground font-bold text-sm mb-2">{perk.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{perk.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MentorshipSection;
