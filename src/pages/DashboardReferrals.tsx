import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Gift, Users, Trophy, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PageBanner from "@/components/dashboard/PageBanner";

const TIERS = [
  { count: 1, label: "First Referral", reward: "50% off your next month", icon: Gift },
  { count: 3, label: "Bronze", reward: "1 month free", icon: Trophy },
  { count: 10, label: "Gold", reward: "1 month free + Founder Referrer badge", icon: Trophy },
];

const DashboardReferrals = () => {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [codeRes, refRes, rewardRes] = await Promise.all([
        supabase.from("referral_codes").select("code").eq("user_id", user.id).single(),
        supabase.from("referrals").select("*").eq("referrer_id", user.id).order("created_at", { ascending: false }),
        supabase.from("referral_rewards").select("*").eq("user_id", user.id),
      ]);
      if (codeRes.data) setReferralCode(codeRes.data.code);
      if (refRes.data) setReferrals(refRes.data);
      if (rewardRes.data) setRewards(rewardRes.data);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const paidCount = referrals.filter((r) => r.status === "paid").length;
  const referralLink = referralCode
    ? `${window.location.origin}/signup?ref=${referralCode}`
    : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "Join JORTRADE",
        text: "Get AI-powered trading signals. Use my referral link:",
        url: referralLink,
      });
    } else {
      handleCopy();
    }
  };

  const nextTier = TIERS.find((t) => paidCount < t.count) || TIERS[TIERS.length - 1];
  const progress = Math.min((paidCount / nextTier.count) * 100, 100);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
            Referral Program
          </h1>
          <p className="text-muted-foreground text-sm">
            Invite traders, earn rewards. Every milestone unlocks a one-time perk.
          </p>
        </motion.div>

        {/* Referral Link Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-panel rounded-2xl p-6 border-glow-blue"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Share2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Your Referral Link</h2>
              <p className="text-xs text-muted-foreground">Share this link to start earning</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 bg-muted/30 border border-border/50 rounded-lg px-4 py-3 text-sm text-muted-foreground font-mono truncate">
              {loading ? "Loading..." : referralLink || "No code generated yet"}
            </div>
            <Button
              onClick={handleCopy}
              variant="outline"
              size="icon"
              className="shrink-0 border-border/50"
              disabled={!referralCode}
            >
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              onClick={handleShare}
              className="shrink-0 bg-primary text-primary-foreground"
              disabled={!referralCode}
            >
              Share
            </Button>
          </div>
        </motion.div>

        {/* Progress & Tiers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass-panel rounded-2xl p-6 border-glow-blue"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Your Progress</h2>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-foreground">
                {paidCount} paid referral{paidCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative mb-8">
            <div className="h-3 bg-muted/40 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
              />
            </div>
            {/* Milestone markers */}
            <div className="flex justify-between mt-2">
              {TIERS.map((tier) => {
                const reached = paidCount >= tier.count;
                return (
                  <div key={tier.count} className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                        reached
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-muted/30 border-border/50 text-muted-foreground"
                      }`}
                    >
                      {tier.count}
                    </div>
                    <span className={`text-[10px] mt-1 ${reached ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                      {tier.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tier cards */}
          <div className="space-y-3">
            {TIERS.map((tier) => {
              const reached = paidCount >= tier.count;
              const claimed = rewards.some((r) => r.tier === tier.count && r.claimed);
              return (
                <div
                  key={tier.count}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    reached
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/30 bg-muted/10"
                  }`}
                >
                  <tier.icon
                    className={`h-5 w-5 shrink-0 ${
                      reached ? "text-primary" : "text-muted-foreground/40"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${reached ? "text-foreground" : "text-muted-foreground"}`}>
                        {tier.count} referral{tier.count > 1 ? "s" : ""}
                      </span>
                      {reached && (
                        <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          {claimed ? "CLAIMED" : "UNLOCKED"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{tier.reward}</p>
                  </div>
                  {reached && !claimed && (
                    <Button size="sm" variant="outline" className="text-xs border-primary/30 text-primary">
                      Claim
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Referral List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="glass-panel rounded-2xl p-6 border-glow-blue"
        >
          <h2 className="font-semibold text-foreground mb-4">Your Referrals</h2>
          {referrals.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No referrals yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Share your link to start earning rewards
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {referrals.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border border-border/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-foreground font-medium">
                        Referral #{ref.referred_user_id.slice(0, 6)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(ref.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      ref.status === "paid"
                        ? "bg-green-500/20 text-green-400"
                        : ref.status === "trial"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-muted/20 text-muted-foreground"
                    }`}
                  >
                    {ref.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardReferrals;
