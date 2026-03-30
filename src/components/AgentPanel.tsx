import { useEffect, useRef } from "react";
import type { LogEntry } from "@/pages/Index";

interface AgentPanelProps {
  logs: LogEntry[];
}

const statusConfig: Record<
  LogEntry["status"],
  { dot: string; text: string }
> = {
  running: { dot: "bg-yellow animate-pulse", text: "text-yellow/80" },
  done: { dot: "bg-green", text: "text-green/80" },
  error: { dot: "bg-red", text: "text-red/80" },
  warn: { dot: "bg-yellow", text: "text-yellow/70" },
  info: { dot: "bg-blue", text: "text-blue/70" },
};

const AgentPanel = ({ logs }: AgentPanelProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="w-56 bg-surface-1 border-l border-border flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-[11px] font-semibold text-foreground tracking-wide uppercase">
          Agent
        </span>
        {logs.length > 0 && (
          <span className="text-[9px] font-mono text-muted-foreground/40">
            {logs.length} entries
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-auto px-3 py-2 space-y-1.5"
      >
        {logs.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-[10px] text-muted-foreground/20 font-mono">
              Waiting for input…
            </p>
          </div>
        )}

        {logs.map((log) => {
          const config = statusConfig[log.status] || statusConfig.info;
          return (
            <div
              key={log.id}
              className="flex items-start gap-2 py-1 animate-in fade-in slide-in-from-right-2 duration-300"
            >
              <div
                className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${config.dot}`}
              />
              <div className="min-w-0">
                <p
                  className={`text-[10px] font-mono leading-tight break-words ${config.text}`}
                >
                  {log.message}
                </p>
                <p className="text-[8px] text-muted-foreground/20 font-mono mt-0.5">
                  {log.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AgentPanel;
