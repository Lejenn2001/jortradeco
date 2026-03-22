import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const CTASection = () => {
  return (
    <section className="relative py-28 overflow-hidden">
      {/* Radial glow background */}
      <div className="absolute inset-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse,hsl(270_60%_35%_/_0.25)_0%,transparent_60%)]" />
        <div className="absolute inset-[40px] bg-[radial-gradient(ellipse,hsl(30_70%_40%_/_0.2)_0%,transparent_55%)]" />
        <div className="absolute inset-[100px] bg-[radial-gradient(ellipse,hsl(300_50%_45%_/_0.15)_0%,transparent_50%)]" />
      </div>

      {/* Corner decorations */}
      <div className="absolute top-6 left-6 w-4 h-px bg-muted-foreground/20" />
      <div className="absolute top-6 left-6 w-px h-4 bg-muted-foreground/20" />
      <div className="absolute top-6 right-6 w-4 h-px bg-muted-foreground/20" />
      <div className="absolute top-6 right-6 w-px h-4 bg-muted-foreground/20" />
      <div className="absolute bottom-6 left-6 w-4 h-px bg-muted-foreground/20" />
      <div className="absolute bottom-6 left-6 w-px h-4 bg-muted-foreground/20" />
      <div className="absolute bottom-6 right-6 w-4 h-px bg-muted-foreground/20" />
      <div className="absolute bottom-6 right-6 w-px h-4 bg-muted-foreground/20" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="relative z-10 container mx-auto px-6 text-center"
      >
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.1] max-w-2xl mx-auto">
          Ready to Trade Smarter?
        </h2>

        <p className="text-muted-foreground mt-6 max-w-xl mx-auto text-base leading-relaxed">
          Let Biddie do the heavy lifting — you focus on pulling the trigger at the right time.
        </p>

        <Button className="mt-10 bg-foreground text-background hover:bg-foreground/90 rounded-full px-10 py-6 text-base font-semibold">
          Chat with Biddie
        </Button>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="relative z-10 container mx-auto px-6 mt-20"
      >
        <div className="grid grid-cols-3 gap-8 border-t border-border pt-10">
          {[
            "24/7 Market Scanning",
            "AI Confidence Scores",
            "Futures • Options • Stocks",
          ].map((text) => (
            <div key={text} className="text-center">
              <span className="text-xl md:text-2xl font-extrabold text-foreground">{text}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default CTASection;
