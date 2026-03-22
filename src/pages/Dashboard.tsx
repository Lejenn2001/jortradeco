import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-lg"
      >
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
          <Lock className="h-7 w-7 text-primary" />
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
          Dashboard Coming Soon
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed mb-8">
          The full JORTRADE AI dashboard is being built. Sign up for early access
          to be first in line when it launches.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-8 py-6 text-base font-semibold">
            Sign Up for Early Access
          </Button>
          <Link to="/">
            <Button variant="outline" className="rounded-full px-8 py-6 text-base font-semibold border-muted-foreground/30 hover:bg-muted/30 w-full">
              ← Back to Home
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
