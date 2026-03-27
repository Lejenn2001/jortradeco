import { motion } from "framer-motion";

interface Props {
  sentiment: "bullish" | "bearish" | "neutral";
}

const AmbientBackground = ({ sentiment }: Props) => {
  const gradients = {
    bullish: {
      primary: "hsl(230 85% 60% / 0.08)",
      secondary: "hsl(270 75% 60% / 0.06)",
      accent: "hsl(142 71% 45% / 0.04)",
    },
    bearish: {
      primary: "hsl(0 72% 51% / 0.06)",
      secondary: "hsl(270 75% 60% / 0.04)",
      accent: "hsl(230 85% 60% / 0.03)",
    },
    neutral: {
      primary: "hsl(230 85% 60% / 0.05)",
      secondary: "hsl(270 75% 60% / 0.04)",
      accent: "hsl(200 90% 55% / 0.03)",
    },
  };

  const g = gradients[sentiment];

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <motion.div
        key={sentiment}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 20%, ${g.primary}, transparent 70%),
            radial-gradient(ellipse 60% 40% at 80% 80%, ${g.secondary}, transparent 60%),
            radial-gradient(ellipse 40% 30% at 50% 50%, ${g.accent}, transparent 50%)
          `,
        }}
      />
    </div>
  );
};

export default AmbientBackground;
