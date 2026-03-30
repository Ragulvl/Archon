import { Loader2 } from "lucide-react";

interface StatusBarProps {
  loading: boolean;
  error: string | null;
  model: string | null;
}

const StatusBar = ({ loading, error, model }: StatusBarProps) => {
  return (
    <div className="flex items-center justify-between h-6 bg-surface-1 border-t border-border px-4 select-none text-[10px] font-mono text-muted-foreground/30">
      <div className="flex items-center gap-2">
        {loading ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span className="text-primary/70">Generating…</span>
          </>
        ) : error ? (
          <>
            <div className="w-1.5 h-1.5 rounded-full bg-red" />
            <span className="text-red/70">Error</span>
          </>
        ) : (
          <>
            <div className="w-1.5 h-1.5 rounded-full bg-green" />
            <span>Ready</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        {model && <span>Model: {model}</span>}
        <span>Archon v0.1.0</span>
      </div>
    </div>
  );
};

export default StatusBar;
