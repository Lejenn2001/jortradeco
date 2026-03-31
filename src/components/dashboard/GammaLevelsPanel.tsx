import { useState } from "react";
import { motion } from "framer-motion";
import { Activity, ArrowDown, ArrowUp, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface GexData {
  gammaFlip: number | null;
  callWall: { price: number; gex: number } | null;
  putWall: { price: number; gex: number } | null;
  keyMagnet: { price: number; gex: number };
  dealerPositioning: string;
}

interface GammaLevelsPanelProps {
  ticker?: string;
  gexData?: GexData | null;
}

const GammaLevelsPanel = ({ ticker = "SPX", gexData: externalGex }: GammaLevelsPanelProps) => {
  const [gex, setGex] = useState<GexData | null>(externalGex || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGex = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("ticker-analysis", {
        body: { ticker },
      });
      if (fnError) throw fnError;
      if (data?.gex) {
        setGex(data.gex);
      } else {
        setError("No GEX data available");
      }
    } catch (e: any) {
      setError(e.message || "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  const isShortGamma = gex?.dealerPositioning?.includes("Short");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold tracking-tight text-foreground">
            Gamma Levels
          </h3>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {ticker}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchGex}
          disabled={loading}
          className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          {gex ? "Refresh" : "Load"}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive mb-3">{error}</p>
      )}

      {!gex && !loading && !error && (
        <div className="text-center py-6">
          <Zap className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground/60">
            Click Load to fetch real-time gamma levels
          </p>
        </div>
      )}

      {loading && !gex && (
        <div className="text-center py-6">
          <RefreshCw className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
          <p className="text-xs text-muted-foreground/60">Fetching GEX data...</p>
        </div>
      )}

      {gex && (
        <div className="space-y-3">
          {/* Dealer Positioning */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
            isShortGamma
              ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          }`}>
            <Zap className="w-3.5 h-3.5" />
            {gex.dealerPositioning}
          </div>

          {/* Levels Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Gamma Flip */}
            {gex.gammaFlip && (
              <LevelCard
                label="Gamma Flip"
                value={`$${gex.gammaFlip.toLocaleString()}`}
                icon={<Activity className="w-3 h-3" />}
                color="text-primary"
                bgColor="bg-primary/5"
                borderColor="border-primary/20"
              />
            )}

            {/* Key Magnet */}
            <LevelCard
              label="Key Magnet"
              value={`$${gex.keyMagnet.price.toLocaleString()}`}
              icon={<Zap className="w-3 h-3" />}
              color="text-amber-400"
              bgColor="bg-amber-500/5"
              borderColor="border-amber-500/20"
            />

            {/* Call Wall */}
            {gex.callWall && (
              <LevelCard
                label="Call Wall"
                value={`$${gex.callWall.price.toLocaleString()}`}
                icon={<ArrowUp className="w-3 h-3" />}
                color="text-emerald-400"
                bgColor="bg-emerald-500/5"
                borderColor="border-emerald-500/20"
                sub="Resistance"
              />
            )}

            {/* Put Wall */}
            {gex.putWall && (
              <LevelCard
                label="Put Wall"
                value={`$${gex.putWall.price.toLocaleString()}`}
                icon={<ArrowDown className="w-3 h-3" />}
                color="text-red-400"
                bgColor="bg-red-500/5"
                borderColor="border-red-500/20"
                sub="Support"
              />
            )}
          </div>

          <p className="text-[9px] text-muted-foreground/40 text-center pt-1">
            Based on real-time gamma exposure from options OI
          </p>
        </div>
      )}
    </motion.div>
  );
};

const LevelCard = ({
  label,
  value,
  icon,
  color,
  bgColor,
  borderColor,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  sub?: string;
}) => (
  <div className={`rounded-xl ${bgColor} border ${borderColor} p-3`}>
    <div className={`flex items-center gap-1.5 mb-1 ${color}`}>
      {icon}
      <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-sm font-bold text-foreground">{value}</p>
    {sub && <p className="text-[9px] text-muted-foreground/50 mt-0.5">{sub}</p>}
  </div>
);

export default GammaLevelsPanel;
