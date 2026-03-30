import { useState, useCallback } from "react";
import { Copy, Check, Download, Loader2 } from "lucide-react";
import type { GeneratedData } from "@/pages/Index";

interface MainPanelProps {
  data: GeneratedData | null;
  loading: boolean;
  error: string | null;
  model: string | null;
}

const tabs = [
  { id: "architecture", label: "Architecture" },
  { id: "code", label: "Code" },
  { id: "files", label: "Files" },
];

const MainPanel = ({ data, loading, error, model }: MainPanelProps) => {
  const [activeTab, setActiveTab] = useState("architecture");

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-0 min-w-0">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border bg-surface-1/50">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2.5 text-[11px] font-medium tracking-wide transition-colors ${
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground/60 hover:text-muted-foreground"
              }`}
            >
              {tab.label}
              {isActive && (
                <div className="absolute bottom-0 left-2 right-2 h-px bg-primary" />
              )}
            </button>
          );
        })}

        {/* Model badge */}
        {model && (
          <div className="ml-auto mr-4 text-[10px] font-mono text-muted-foreground/40">
            via {model}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto p-6">
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground/50 font-mono">
              Generating architecture & code…
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-lg border border-red/20 bg-red/5 p-4">
            <p className="text-sm text-red font-mono">Error: {error}</p>
          </div>
        )}

        {!data && !loading && !error && (
          <div className="flex-1 flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground/50">
              Describe your project and hit Generate.
            </p>
          </div>
        )}

        {data && !loading && (
          <>
            {activeTab === "architecture" && (
              <ArchitectureView architecture={data.architecture} />
            )}
            {activeTab === "code" && <CodeView frontend={data.frontend} />}
            {activeTab === "files" && (
              <FilesView data={data} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* ─── Architecture Tab ─────────────────────────────────────── */
function ArchitectureView({
  architecture,
}: {
  architecture?: GeneratedData["architecture"];
}) {
  if (!architecture) {
    return (
      <p className="text-sm text-muted-foreground/40">
        No architecture data available.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Features */}
      {architecture.features && (
        <Section title="Features">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-[11px] font-semibold text-primary mb-2 uppercase tracking-wider">
                User Features
              </h4>
              <ul className="space-y-1">
                {architecture.features.user?.map((f, i) => (
                  <li
                    key={i}
                    className="text-xs text-foreground/80 font-mono flex items-start gap-2"
                  >
                    <span className="text-primary mt-0.5">▸</span> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-semibold text-accent mb-2 uppercase tracking-wider">
                Admin Features
              </h4>
              <ul className="space-y-1">
                {architecture.features.admin?.map((f, i) => (
                  <li
                    key={i}
                    className="text-xs text-foreground/80 font-mono flex items-start gap-2"
                  >
                    <span className="text-accent mt-0.5">▸</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>
      )}

      {/* System Architecture */}
      {architecture.systemArchitecture && (
        <Section title="System Architecture">
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(architecture.systemArchitecture).map(([k, v]) => (
              <div
                key={k}
                className="bg-surface-1 rounded-md p-3 border border-border"
              >
                <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-semibold">
                  {k.replace(/_/g, " ")}
                </span>
                <p className="text-xs text-foreground/90 font-mono mt-1">{v}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Database Schema */}
      {architecture.databaseSchema && (
        <Section title="Database Schema">
          {Object.entries(architecture.databaseSchema).map(([table, cols]) => (
            <div key={table} className="mb-4">
              <h4 className="text-xs font-semibold text-cyan mb-2 font-mono">
                {table}
              </h4>
              <div className="bg-surface-1 rounded-md border border-border overflow-hidden">
                <table className="w-full text-[11px] font-mono">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-3 py-1.5 text-muted-foreground/60">
                        Column
                      </th>
                      <th className="text-left px-3 py-1.5 text-muted-foreground/60">
                        Type
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(cols as Record<string, string>).map(([col, type]) => (
                      <tr key={col} className="border-b border-border/50">
                        <td className="px-3 py-1.5 text-foreground/90">
                          {col}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground/70">
                          {type}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* API Endpoints */}
      {architecture.apiEndpoints && architecture.apiEndpoints.length > 0 && (
        <Section title="API Endpoints">
          <div className="bg-surface-1 rounded-md border border-border overflow-hidden">
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-1.5 text-muted-foreground/60 w-20">
                    Method
                  </th>
                  <th className="text-left px-3 py-1.5 text-muted-foreground/60">
                    Path
                  </th>
                  <th className="text-left px-3 py-1.5 text-muted-foreground/60">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {architecture.apiEndpoints.map((ep, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-3 py-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          ep.method === "GET"
                            ? "bg-green/10 text-green"
                            : ep.method === "POST"
                            ? "bg-blue/10 text-blue"
                            : ep.method === "PUT"
                            ? "bg-yellow/10 text-yellow"
                            : ep.method === "DELETE"
                            ? "bg-red/10 text-red"
                            : "bg-surface-2 text-foreground"
                        }`}
                      >
                        {ep.method}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-foreground/90">
                      {ep.path}
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground/70">
                      {ep.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Tech Stack */}
      {architecture.techStack && (
        <Section title="Tech Stack">
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(architecture.techStack).map(([k, v]) => (
              <div
                key={k}
                className="bg-surface-1 rounded-md p-3 border border-border"
              >
                <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-semibold">
                  {k}
                </span>
                <p className="text-xs text-foreground/90 font-mono mt-1">{v}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Scaling Strategy */}
      {architecture.scalingStrategy && (
        <Section title="Scaling Strategy">
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(architecture.scalingStrategy).map(([k, v]) => (
              <div
                key={k}
                className="bg-surface-1 rounded-md p-3 border border-border"
              >
                <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-semibold">
                  {k}
                </span>
                <p className="text-xs text-foreground/90 font-mono mt-1">{v}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

/* ─── Code Tab ─────────────────────────────────────────────── */
function CodeView({
  frontend,
}: {
  frontend?: GeneratedData["frontend"];
}) {
  if (!frontend) {
    return (
      <p className="text-sm text-muted-foreground/40">
        No frontend code generated.
      </p>
    );
  }

  const files = Object.entries(frontend) as [string, string][];

  return (
    <div className="space-y-4">
      {files.map(([filename, code]) => (
        <CodeBlock key={filename} filename={filename} code={code} />
      ))}
    </div>
  );
}

/* ─── Files Tab ────────────────────────────────────────────── */
function FilesView({ data }: { data: GeneratedData }) {
  const [copied, setCopied] = useState(false);

  const handleDownload = useCallback(async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const docs = zip.folder("docs")!;

    if (data.architecture) {
      // ── architecture.md — features, system arch, tech stack, scaling ──
      let md = "# Architecture\n\n";

      if (data.architecture.features) {
        md += "## Features\n\n### User Features\n";
        data.architecture.features.user?.forEach((f) => (md += `- ${f}\n`));
        md += "\n### Admin Features\n";
        data.architecture.features.admin?.forEach((f) => (md += `- ${f}\n`));
        md += "\n";
      }

      if (data.architecture.systemArchitecture) {
        md += "## System Architecture\n\n";
        Object.entries(data.architecture.systemArchitecture).forEach(
          ([k, v]) => (md += `- **${k}**: ${v}\n`)
        );
        md += "\n";
      }

      if (data.architecture.techStack) {
        md += "## Tech Stack\n\n";
        Object.entries(data.architecture.techStack).forEach(
          ([k, v]) => (md += `- **${k}**: ${v}\n`)
        );
        md += "\n";
      }

      if (data.architecture.scalingStrategy) {
        md += "## Scaling Strategy\n\n";
        Object.entries(data.architecture.scalingStrategy).forEach(
          ([k, v]) => (md += `- **${k}**: ${v}\n`)
        );
      }

      docs.file("architecture.md", md);

      // ── schema.sql — database schema as SQL ──
      if (data.architecture.databaseSchema) {
        let sql = "-- Database Schema\n-- Generated by Archon\n\n";
        Object.entries(data.architecture.databaseSchema).forEach(([table, cols]) => {
          sql += `CREATE TABLE ${table} (\n`;
          const entries = Object.entries(cols as Record<string, string>);
          entries.forEach(([col, type], i) => {
            sql += `  ${col} ${type}${i < entries.length - 1 ? "," : ""}\n`;
          });
          sql += ");\n\n";
        });
        docs.file("schema.sql", sql);
      }

      // ── api-endpoints.md — API routes ──
      if (data.architecture.apiEndpoints && data.architecture.apiEndpoints.length > 0) {
        let api = "# API Endpoints\n\n";
        api += "| Method | Path | Description |\n|--------|------|-------------|\n";
        data.architecture.apiEndpoints.forEach(
          (ep) => (api += `| ${ep.method} | ${ep.path} | ${ep.description} |\n`)
        );
        docs.file("api-endpoints.md", api);
      }
    }

    // ── Frontend files — each as its own file ──
    if (data.frontend) {
      Object.entries(data.frontend).forEach(([filename, code]) => {
        zip.file(filename, code as string);
      });
    }

    // Generate and download ZIP
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "archon-project.zip";
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [data]);

  const frontendFiles = data.frontend ? Object.keys(data.frontend) : [];
  const archSections = data.architecture ? Object.keys(data.architecture) : [];

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex gap-2">
        <button
          id="download-btn"
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-1 border border-border rounded-md text-[11px] text-foreground/80 hover:bg-surface-2 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Download ZIP
        </button>
        <button
          id="copy-all-btn"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-1 border border-border rounded-md text-[11px] text-foreground/80 hover:bg-surface-2 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green" /> Copied!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" /> Copy All
            </>
          )}
        </button>
      </div>

      {/* File tree */}
      <Section title="Project Structure">
        <div className="bg-surface-1 rounded-md border border-border p-4 font-mono text-xs">
          <div className="text-foreground/90">📁 archon-project/</div>

          {/* Frontend files */}
          {frontendFiles.length > 0 && (
            <div className="ml-4 mt-1 space-y-0.5">
              {frontendFiles.map((file, i) => (
                <div key={file} className="text-foreground/70 flex items-center gap-1.5">
                  <span className="text-muted-foreground/40">
                    {i === frontendFiles.length - 1 && archSections.length === 0 ? "└──" : "├──"}
                  </span>
                  <span className="text-cyan">{file}</span>
                </div>
              ))}
            </div>
          )}

          {/* Docs folder */}
          {archSections.length > 0 && (
            <div className="ml-4 mt-1 space-y-0.5">
              <div className="text-foreground/70 flex items-center gap-1.5">
                <span className="text-muted-foreground/40">└──</span>
                <span className="text-foreground/90">📁 docs/</span>
              </div>
              <div className="ml-6 space-y-0.5">
                {data.architecture?.features && (
                  <div className="text-foreground/70 flex items-center gap-1.5">
                    <span className="text-muted-foreground/40">├──</span>
                    <span className="text-yellow">architecture.md</span>
                  </div>
                )}
                {data.architecture?.databaseSchema && (
                  <div className="text-foreground/70 flex items-center gap-1.5">
                    <span className="text-muted-foreground/40">├──</span>
                    <span className="text-green">schema.sql</span>
                  </div>
                )}
                {data.architecture?.apiEndpoints && data.architecture.apiEndpoints.length > 0 && (
                  <div className="text-foreground/70 flex items-center gap-1.5">
                    <span className="text-muted-foreground/40">└──</span>
                    <span className="text-yellow">api-endpoints.md</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

/* ─── Reusable Components ──────────────────────────────────── */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-foreground/90 mb-3 uppercase tracking-wider border-b border-border pb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function CodeBlock({ filename, code }: { filename: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine language hint from filename for basic highlighting label
  const ext = filename.split(".").pop() || "";
  const langMap: Record<string, string> = {
    html: "HTML",
    css: "CSS",
    js: "JavaScript",
    ts: "TypeScript",
    json: "JSON",
  };
  const lang = langMap[ext] || ext.toUpperCase();

  return (
    <div className="rounded-lg border border-border bg-surface-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-2/50 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-foreground/80">
            {filename}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-3 text-muted-foreground/50 uppercase tracking-wider">
            {lang}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-foreground transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-green" /> Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" /> Copy
            </>
          )}
        </button>
      </div>
      {/* Code */}
      <div className="p-4 overflow-auto max-h-[400px]">
        <pre className="text-[11px] leading-relaxed font-mono text-foreground/80 whitespace-pre-wrap">
          {code}
        </pre>
      </div>
    </div>
  );
}

export default MainPanel;
