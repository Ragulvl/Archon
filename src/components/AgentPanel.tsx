import { useEffect, useRef } from "react";
import { Activity, Check, AlertCircle, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { LogEntry } from "@/pages/Index";

interface AgentPanelProps {
  logs: LogEntry[];
  loading?: boolean;
}

const STEPS = [
  { key: "routing", label: "Route" },
  { key: "architecture", label: "Arch" },
  { key: "database", label: "DB" },
  { key: "api", label: "API" },
  { key: "frontend", label: "Code" },
  { key: "done", label: "Done" },
];

const statusConfig: Record<
  LogEntry["status"],
  { dot: string; text: string; glow: string }
> = {
  running: { dot: "bg-violet", text: "text-violet/80", glow: "shadow-[0_0_8px_rgba(99,102,241,0.4)]" },
  done: { dot: "bg-green", text: "text-green/80", glow: "" },
  error: { dot: "bg-red", text: "text-red/80", glow: "shadow-[0_0_8px_rgba(239,68,68,0.4)]" },
  warn: { dot: "bg-yellow", text: "text-yellow/70", glow: "" },
  info: { dot: "bg-blue", text: "text-blue/70", glow: "" },
};

function getActiveStep(logs: LogEntry[]): number {
  if (logs.length === 0) return -1;
  const lastMsg = logs[logs.length - 1]?.message.toLowerCase() || "";
  if (lastMsg.includes("complete") || lastMsg.includes("✓")) return 5;
  if (lastMsg.includes("frontend") || lastMsg.includes("building frontend")) return 4;
  if (lastMsg.includes("api") || lastMsg.includes("endpoint")) return 3;
  if (lastMsg.includes("database") || lastMsg.includes("schema")) return 2;
  if (lastMsg.includes("architecture") || lastMsg.includes("generating")) return 1;
  if (lastMsg.includes("routing") || lastMsg.includes("selecting") || lastMsg.includes("starting")) return 0;
  return Math.min(Math.floor(logs.length / 2), 5);
}

const AgentPanel = ({ logs, loading = false }: AgentPanelProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeStep = getActiveStep(logs);
  const isActive = loading;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="w-60 glass-heavy border-l border-border/30 flex flex-col h-full relative overflow-hidden">
      {/* Top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-[1px] gradient-line opacity-30" />

      {/* Ambient glow */}
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-violet/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="px-4 py-3.5 border-b border-border/30 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Activity className="w-3.5 h-3.5 text-violet/60" />
            {isActive && (
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-violet animate-pulse" />
            )}
          </div>
          <span className="text-[11px] font-semibold text-foreground/90 tracking-wide uppercase">
            Agent
          </span>
        </div>
        {logs.length > 0 && (
          <span className="text-[9px] font-mono text-muted-foreground/30 px-2 py-0.5 rounded-md glass">
            {logs.length}
          </span>
        )}
      </div>

      {/* Progress stepper */}
      {logs.length > 0 && (
        <div className="px-4 py-3 border-b border-border/20 relative z-10">
          <div className="flex items-center justify-between">
            {STEPS.map((step, i) => {
              const isCompleted = i < activeStep;
              const isCurrent = i === activeStep;
              return (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                        isCompleted
                          ? "bg-green scale-100"
                          : isCurrent
                          ? "bg-violet animate-pulse scale-110 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                          : "bg-surface-3/50 scale-90"
                      }`}
                    >
                      {isCompleted && (
                        <Check className="w-2.5 h-2.5 text-background" />
                      )}
                    </div>
                    <span className={`text-[7px] font-mono transition-colors duration-300 ${
                      isCompleted ? "text-green/60" : isCurrent ? "text-violet/70" : "text-muted-foreground/20"
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`w-3 h-px mx-0.5 mt-[-8px] transition-colors duration-500 ${
                      i < activeStep ? "bg-green/40" : "bg-surface-3/30"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Log entries */}
      <div ref={scrollRef} className="flex-1 overflow-auto px-3 py-2 space-y-1 relative z-10">
        {logs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-10 h-10 rounded-xl glass flex items-center justify-center">
              <Activity className="w-4 h-4 text-muted-foreground/20" />
            </div>
            <p className="text-[10px] text-muted-foreground/20 font-mono text-center">
              Waiting for input…
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {logs.map((log, index) => {
            const config = statusConfig[log.status] || statusConfig.info;
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: 10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.02 }}
                className="flex items-start gap-2.5 py-1.5 px-2 rounded-lg hover:bg-surface-2/20 transition-colors group"
              >
                <div
                  className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 transition-all duration-300 ${config.dot} ${
                    log.status === "running" ? `animate-pulse ${config.glow}` : ""
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-[10px] font-mono leading-tight break-words ${config.text}`}>
                    {log.message}
                  </p>
                  <p className="text-[8px] text-muted-foreground/15 font-mono mt-0.5">
                    {log.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Thinking animation */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 py-2 px-2"
          >
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet/50 animate-bounce-dot" />
              <span className="w-1.5 h-1.5 rounded-full bg-violet/50 animate-bounce-dot" style={{ animationDelay: "0.16s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-violet/50 animate-bounce-dot" style={{ animationDelay: "0.32s" }} />
            </div>
            <span className="text-[9px] text-violet/40 font-mono">thinking</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AgentPanel;
