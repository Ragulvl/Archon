import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import TitleBar from "@/components/TitleBar";
import ArchonSidebar from "@/components/ArchonSidebar";
import MainPanel from "@/components/MainPanel";
import AgentPanel from "@/components/AgentPanel";
import StatusBar from "@/components/StatusBar";

export interface GeneratedData {
  architecture?: {
    features?: { user?: string[]; admin?: string[] };
    systemArchitecture?: Record<string, string>;
    databaseSchema?: Record<string, Record<string, string>>;
    apiEndpoints?: { method: string; path: string; description: string }[];
    techStack?: Record<string, string>;
    scalingStrategy?: Record<string, string>;
  };
  frontend?: {
    "index.html"?: string;
    "style.css"?: string;
    "script.js"?: string;
  };
}

export interface LogEntry {
  id: number;
  message: string;
  status: "running" | "done" | "error" | "warn" | "info";
  timestamp: Date;
}

const PHASE_MESSAGES = [
  "Routing request…",
  "Selecting LLM provider…",
  "Generating system architecture…",
  "Building database schema…",
  "Designing API endpoints…",
  "Building frontend code…",
  "Optimizing output…",
  "Parsing response…",
];

let logId = 0;

const Index = () => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GeneratedData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [model, setModel] = useState<string | null>(null);

  // Track timer IDs so we can cancel them when the API responds
  const timerIds = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Track whether the API has responded so late timers don't fire
  const apiDone = useRef(false);

  const clearSimulation = useCallback(() => {
    timerIds.current.forEach(clearTimeout);
    timerIds.current = [];
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || loading) return;

    // Reset state
    setLoading(true);
    setError(null);
    setData(null);
    setModel(null);
    apiDone.current = false;
    clearSimulation();

    // Build initial log with "starting" entry
    const startEntry: LogEntry = {
      id: ++logId,
      message: "Starting generation…",
      status: "running",
      timestamp: new Date(),
    };
    setLogs([startEntry]);

    // Start simulated phase messages (these show progress while waiting for API)
    PHASE_MESSAGES.forEach((msg, i) => {
      const timerId = setTimeout(() => {
        // Don't add simulated logs if the API already responded
        if (apiDone.current) return;
        setLogs((prev) => [
          ...prev,
          {
            id: ++logId,
            message: msg,
            status: "running" as const,
            timestamp: new Date(),
          },
        ]);
      }, (i + 1) * 800);
      timerIds.current.push(timerId);
    });

    try {
      const res = await fetch("/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      // Mark API as done — stops any remaining simulated logs
      apiDone.current = true;
      clearSimulation();

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Server returned ${res.status}`);
      }

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Generation failed");
      }

      setData(json.data);
      setModel(json.model || null);

      // Replace all simulated logs with clean final log sequence
      const finalLogs: LogEntry[] = PHASE_MESSAGES.map((msg) => ({
        id: ++logId,
        message: msg,
        status: "done" as const,
        timestamp: new Date(),
      }));

      // Add any real steps from the backend
      if (json.steps && Array.isArray(json.steps)) {
        json.steps.forEach((s: { step: string; status: string }) => {
          finalLogs.push({
            id: ++logId,
            message: s.step,
            status: s.status as LogEntry["status"],
            timestamp: new Date(),
          });
        });
      }

      // Add completion message at the end
      finalLogs.push({
        id: ++logId,
        message: "✓ Generation complete",
        status: "done",
        timestamp: new Date(),
      });

      setLogs(finalLogs);
    } catch (err: unknown) {
      apiDone.current = true;
      clearSimulation();

      const message =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(message);

      // Show clean error log — keep existing logs, mark all as done, add error
      setLogs((prev) => {
        const cleaned: LogEntry[] = prev.map((l) => ({
          ...l,
          status: "done" as const,
        }));
        cleaned.push({
          id: ++logId,
          message: `✗ ${message}`,
          status: "error" as const,
          timestamp: new Date(),
        });
        return cleaned;
      });
    } finally {
      setLoading(false);
    }
  }, [prompt, loading, clearSimulation]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background bg-noise">
      <TitleBar />
      <motion.div
        className="flex flex-1 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <ArchonSidebar
          prompt={prompt}
          setPrompt={setPrompt}
          onGenerate={handleGenerate}
          loading={loading}
        />
        <MainPanel data={data} loading={loading} error={error} model={model} />
        <AgentPanel logs={logs} loading={loading} />
      </motion.div>
      <StatusBar loading={loading} error={error} model={model} />
    </div>
  );
};

export default Index;
