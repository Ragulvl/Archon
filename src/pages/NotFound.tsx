import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-noise relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute w-72 h-72 rounded-full bg-violet/10 blur-[100px] animate-orb-float top-1/4 left-1/4" />
      <div className="absolute w-56 h-56 rounded-full bg-purple/10 blur-[80px] animate-orb-float bottom-1/4 right-1/4" style={{ animationDelay: "-5s" }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center glass rounded-2xl p-10 max-w-md"
      >
        <h1 className="text-6xl font-bold gradient-text mb-3">404</h1>
        <p className="text-lg text-muted-foreground/50 mb-6">
          This page doesn't exist
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-violet/20"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Archon
        </a>
      </motion.div>
    </div>
  );
};

export default NotFound;
