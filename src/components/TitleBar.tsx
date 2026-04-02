import { Sparkles } from "lucide-react";

const TitleBar = () => {
  return (
    <div className="relative flex items-center h-12 bg-surface-1/80 backdrop-blur-md border-b border-border/50 px-5 select-none z-10">
      {/* Logo + Brand */}
      <div className="flex items-center gap-3">
        <div className="relative w-7 h-7 flex items-center justify-center">
          <img
            src="/Logo.png"
            alt="Archon"
            className="w-7 h-7 object-contain rounded-md"
            onError={(e) => {
              // Fallback to sparkle icon if logo not found
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
            }}
          />
          <Sparkles className="w-5 h-5 text-violet hidden" />
          <div className="absolute inset-0 rounded-md bg-violet/10 blur-md opacity-0 hover:opacity-100 transition-opacity duration-500" />
        </div>
        <span className="text-sm font-bold gradient-text tracking-tight">
          Archon
        </span>
      </div>

      {/* Center — tagline */}
      <div className="hidden sm:flex flex-1 justify-center">
        <span className="text-[10px] text-muted-foreground/40 font-medium tracking-widest uppercase">
          AI System Architect
        </span>
      </div>

      {/* Right — version badge */}
      <div className="ml-auto flex items-center gap-3">
        <div className="px-2.5 py-1 rounded-full glass text-[9px] font-mono text-muted-foreground/50 tracking-wider">
          v1.0.0
        </div>
      </div>

      {/* Bottom gradient accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] gradient-line opacity-40" />
    </div>
  );
};

export default TitleBar;
