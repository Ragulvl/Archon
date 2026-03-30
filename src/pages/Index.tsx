import { useState, useCallback } from "react";
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

const AGENT_LOGS: string[] = [
  "Routing request...",
  "Selecting LLM provider...",
  "Generating system architecture...",
  "Building database schema...",
  "Designing API endpoints...",
  "Building frontend code...",
  "Optimizing output...",
  "Parsing response...",
];

let logId = 0;

const Index = () => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GeneratedData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [model, setModel] = useState<string | null>(null);

  const addLog = useCallback(
    (message: string, status: LogEntry["status"] = "info") => {
      setLogs((prev) => [
        ...prev,
        { id: ++logId, message, status, timestamp: new Date() },
      ]);
    },
    []
  );

  const simulateLogs = useCallback(() => {
    AGENT_LOGS.forEach((msg, i) => {
      setTimeout(() => {
        setLogs((prev) => [
          ...prev,
          {
            id: ++logId,
            message: msg,
            status: i < AGENT_LOGS.length - 1 ? "running" : "info",
            timestamp: new Date(),
          },
        ]);
      }, i * 800);
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);
    setData(null);
    setLogs([]);
    setModel(null);

    addLog("Starting generation...", "info");
    simulateLogs();

    try {
      const res = await fetch("http://localhost:5000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody.error || `Server returned ${res.status}`
        );
      }

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Generation failed");
      }

      setData(json.data);
      setModel(json.model || null);

      // Append server-side steps to logs
      if (json.steps && Array.isArray(json.steps)) {
        json.steps.forEach((s: { step: string; status: string }) => {
          addLog(s.step, s.status as LogEntry["status"]);
        });
      }

      addLog("✓ Generation complete", "done");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(message);
      addLog(`✗ Error: ${message}`, "error");
    } finally {
      setLoading(false);
    }
  }, [prompt, loading, addLog, simulateLogs]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <ArchonSidebar
          prompt={prompt}
          setPrompt={setPrompt}
          onGenerate={handleGenerate}
          loading={loading}
        />
        <MainPanel data={data} loading={loading} error={error} model={model} />
        <AgentPanel logs={logs} />
      </div>
      <StatusBar loading={loading} error={error} model={model} />
    </div>
  );
};

export default Index;
