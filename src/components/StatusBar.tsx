import { Loader2, Wifi, WifiOff } from "lucide-react";

interface StatusBarProps {
  loading: boolean;
  error: string | null;
  model: string | null;
}

const StatusBar = ({ loading, error, model }: StatusBarProps) => {
  return (
    <div className="flex items-center justify-between h-7 glass-heavy border-t border-border/30 px-5 select-none text-[10px] font-mono text-muted-foreground/30 relative z-10">
      {/* Left — status */}
      <div className="flex items-center gap-3">
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin text-violet/60" />
            <span className="text-violet/50">Generating…</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red shadow-[0_0_6px_rgba(239,68,68,0.4)]" />
            <span className="text-red/60">Error</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green shadow-[0_0_6px_rgba(34,197,94,0.3)]" />
            <span className="text-green/40">Ready</span>
          </div>
        )}

        <div className="w-px h-3 bg-border/20" />

        <div className="flex items-center gap-1.5">
          <Wifi className="w-3 h-3 text-green/30" />
          <span className="text-muted-foreground/20">Connected</span>
        </div>
      </div>

      {/* Right — info */}
      <div className="flex items-center gap-3">
        {model && (
          <>
            <span className="text-muted-foreground/20">Model: {model}</span>
            <div className="w-px h-3 bg-border/20" />
          </>
        )}
        <span className="text-muted-foreground/20">Archon v0.1.0</span>
      </div>
    </div>
  );
};

export default StatusBar;
