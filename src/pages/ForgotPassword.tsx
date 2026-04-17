import { motion } from "framer-motion";
import Disclaimer from "@/components/Disclaimer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success("Reset link sent — check your inbox");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]">
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,hsl(230_70%_45%_/_0.2)_0%,transparent_60%)]" />
        <div className="absolute inset-[80px] rounded-full bg-[radial-gradient(circle,hsl(270_60%_40%_/_0.15)_0%,transparent_55%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-panel rounded-2xl p-8 border-glow-blue">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-foreground mb-2">Reset Password</h1>
            <p className="text-muted-foreground text-sm">
              {sent
                ? "Check your email for a reset link"
                : "Enter your email and we'll send you a reset link"}
            </p>
          </div>

          {!sent && (
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-full py-6 text-base font-semibold mt-2"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}

          {sent && (
            <div className="text-center text-sm text-muted-foreground space-y-2">
              <p>We sent a link to <span className="text-foreground font-medium">{email}</span>.</p>
              <p>Click the link in the email to set a new password.</p>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            Remembered it?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">Back to sign in</Link>
          </p>
        </div>
      </motion.div>
      <div className="absolute bottom-0 left-0 right-0">
        <Disclaimer />
      </div>
    </div>
  );
};

export default ForgotPassword;
