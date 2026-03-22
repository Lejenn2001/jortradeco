import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Check, Zap, Crown, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const plans = [
  {
    id: "founding",
    name: "Founding 50",
    price: "$50",
    period: "/mo",
    badge: "Limited",
    desc: "Lock in the lowest rate forever. Only 50 spots.",
    icon: Star,
    features: [
      "Full AI dashboard access",
      "Real-time trade signals",
      "AI confidence scores",
      "Community access",
      "5-day free trial",
    ],
    highlight: true,
  },
  {
    id: "monthly",
    name: "Monthly",
    price: "$99",
    period: "/mo",
    badge: null,
    desc: "Full access with no commitment. Cancel anytime.",
    icon: Zap,
    features: [
      "Full AI dashboard access",
      "Real-time trade signals",
      "AI confidence scores",
      "Community access",
      "5-day free trial",
    ],
    highlight: false,
  },
  {
    id: "lifetime",
    name: "Lifetime",
    price: "$1,500",
    period: "one-time",
    badge: "Best Value",
    desc: "Pay once, trade forever. Never worry about renewals.",
    icon: Crown,
    features: [
      "Everything in Monthly",
      "Priority support",
      "1-on-1 onboarding call",
      "Lifetime updates",
      "Founding member status",
    ],
    highlight: false,
  },
];

const Signup = () => {
  const [selectedPlan, setSelectedPlan] = useState("founding");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email to confirm your account!");
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background px-6 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse,hsl(230_70%_45%_/_0.15)_0%,transparent_60%)]" />
        <div className="absolute inset-[80px] bg-[radial-gradient(ellipse,hsl(270_60%_40%_/_0.12)_0%,transparent_55%)]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <Link to="/" className="inline-block text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          ← Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground text-base max-w-lg mx-auto">
            Start with a 5-day free trial. No credit card required to explore.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative glass-panel rounded-2xl p-6 cursor-pointer transition-all ${
                selectedPlan === plan.id
                  ? "border-primary/50 ring-2 ring-primary/20"
                  : "border-glow-blue hover:border-primary/30"
              } ${plan.highlight ? "md:-mt-4 md:mb-[-16px]" : ""}`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-6 text-[10px] font-bold bg-primary text-primary-foreground px-3 py-1 rounded-full uppercase tracking-wider">
                  {plan.badge}
                </span>
              )}
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <plan.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-foreground font-bold text-lg mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl font-extrabold text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <p className="text-muted-foreground text-xs mb-5">{plan.desc}</p>
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-md mx-auto"
        >
          <div className="glass-panel rounded-2xl p-8 border-glow-blue">
            <h2 className="text-xl font-bold text-foreground mb-6 text-center">Create Your Account</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Full Name</label>
                <Input
                  placeholder="Jordan Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-muted/30 border-border/50 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-muted/30 border-border/50 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-muted/30 border-border/50 rounded-lg"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-full py-6 text-base font-semibold mt-2"
              >
                {loading ? "Creating account..." : "Start 5-Day Free Trial"}
              </Button>

              <p className="text-center text-[11px] text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;
