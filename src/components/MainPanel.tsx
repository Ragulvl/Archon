import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Copy, Check, Download, Loader2, Layers, Code2, FolderTree, Eye, Smartphone, Tablet, Monitor } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Prism from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-json";
import type { GeneratedData } from "@/pages/Index";

/** Strip JSON-wrapping artifacts from code values the backend sometimes returns */
function cleanCode(raw: string): string {
  let s = raw;
  // If the whole string is wrapped as a JSON value like {"..."}, unwrap it
  if (s.startsWith('{"') && s.endsWith('"}')) {
    try {
      const parsed = JSON.parse(s);
      // If parse yields a single-key object with a string value, use that
      const vals = Object.values(parsed).filter((v): v is string => typeof v === "string");
      if (vals.length === 1) s = vals[0];
    } catch { /* not valid JSON, keep as-is */ }
  }
  // Also try unwrapping plain quoted strings like "<!DOCTYPE..."
  if (s.startsWith('"') && s.endsWith('"')) {
    try {
      const unquoted = JSON.parse(s);
      if (typeof unquoted === "string") s = unquoted;
    } catch { /* keep as-is */ }
  }
  return s;
}

interface MainPanelProps {
  data: GeneratedData | null;
  loading: boolean;
  error: string | null;
  model: string | null;
}

const tabs = [
  { id: "architecture", label: "Architecture", icon: Layers },
  { id: "code", label: "Code", icon: Code2 },
  { id: "files", label: "Files", icon: FolderTree },
  { id: "preview", label: "Preview", icon: Eye },
];

const MainPanel = ({ data, loading, error, model }: MainPanelProps) => {
  const [activeTab, setActiveTab] = useState("architecture");

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-0 min-w-0 relative">
      {/* Subtle ambient gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-violet/[0.02] rounded-full blur-3xl pointer-events-none" />

      {/* Tab bar */}
      <div className="flex items-center border-b border-border/30 bg-surface-1/30 backdrop-blur-sm px-2 relative z-10">
        <div className="flex items-center gap-0.5 py-1.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3.5 py-2 text-[11px] font-medium tracking-wide transition-all duration-300 rounded-lg flex items-center gap-1.5 ${
                  isActive
                    ? "text-white"
                    : "text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-surface-2/30"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="tab-pill"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))" }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <Icon className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Model badge */}
        {model && (
          <div className="ml-auto mr-2 text-[9px] font-mono text-muted-foreground/30 px-2 py-1 rounded-md glass">
            via {model}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto p-6 relative z-10 flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center h-full gap-4"
            >
              <SkeletonLoader />
            </motion.div>
          )}

          {error && !loading && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-red/20 bg-red/5 p-5 glass"
            >
              <p className="text-sm text-red font-mono">Error: {error}</p>
            </motion.div>
          )}

          {!data && !loading && !error && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <EmptyState />
            </motion.div>
          )}

          {data && !loading && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === "architecture" && (
                <ArchitectureView architecture={data.architecture} />
              )}
              {activeTab === "code" && <CodeView frontend={data.frontend} />}
              {activeTab === "files" && <FilesView data={data} />}
              {activeTab === "preview" && <PreviewView data={data} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ─── Empty State ──────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[400px] relative">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 rounded-full bg-violet/10 blur-[80px] animate-orb-float" />
        <div className="absolute w-48 h-48 rounded-full bg-purple/10 blur-[60px] animate-orb-float" style={{ animationDelay: "-4s" }} />
        <div className="absolute w-32 h-32 rounded-full bg-blue/5 blur-[50px] animate-orb-float" style={{ animationDelay: "-8s" }} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4 animate-fade-in-up">
        <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-2 glow-border">
          <Layers className="w-7 h-7 text-violet/60" />
        </div>
        <h2 className="text-2xl font-bold gradient-text tracking-tight">
          Describe your vision
        </h2>
        <p className="text-sm text-muted-foreground/40 text-center max-w-sm leading-relaxed">
          Archon will generate a full-stack architecture, database schema, API endpoints, and a working React frontend.
        </p>
      </div>
    </div>
  );
}

/* ─── Skeleton Loader ──────────────────────────────────────── */
function SkeletonLoader() {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-xs text-muted-foreground/40 font-mono">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-violet/60" />
          Generating architecture & React code
          <span className="inline-flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-violet/50 animate-bounce-dot" />
            <span className="w-1 h-1 rounded-full bg-violet/50 animate-bounce-dot" style={{ animationDelay: "0.16s" }} />
            <span className="w-1 h-1 rounded-full bg-violet/50 animate-bounce-dot" style={{ animationDelay: "0.32s" }} />
          </span>
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl glass p-4 space-y-3" style={{ animationDelay: `${i * 150}ms` }}>
          <div className="h-3 w-24 rounded-full bg-surface-3/50 animate-shimmer" style={{ backgroundImage: "linear-gradient(90deg, transparent, rgba(99,102,241,0.08), transparent)", backgroundSize: "200% 100%" }} />
          <div className="space-y-2">
            <div className="h-2.5 w-full rounded-full bg-surface-2/50 animate-shimmer" style={{ backgroundImage: "linear-gradient(90deg, transparent, rgba(99,102,241,0.05), transparent)", backgroundSize: "200% 100%", animationDelay: "0.1s" }} />
            <div className="h-2.5 w-3/4 rounded-full bg-surface-2/50 animate-shimmer" style={{ backgroundImage: "linear-gradient(90deg, transparent, rgba(99,102,241,0.05), transparent)", backgroundSize: "200% 100%", animationDelay: "0.2s" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

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
        <Section title="Features" icon={<Layers className="w-3.5 h-3.5" />}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-[11px] font-semibold text-violet mb-2.5 uppercase tracking-wider">
                User Features
              </h4>
              <ul className="space-y-1.5">
                {architecture.features.user?.map((f, i) => (
                  <li key={i} className="text-xs text-foreground/75 font-mono flex items-start gap-2">
                    <span className="text-violet/60 mt-0.5">▸</span> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-semibold text-purple mb-2.5 uppercase tracking-wider">
                Admin Features
              </h4>
              <ul className="space-y-1.5">
                {architecture.features.admin?.map((f, i) => (
                  <li key={i} className="text-xs text-foreground/75 font-mono flex items-start gap-2">
                    <span className="text-purple/60 mt-0.5">▸</span> {f}
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
                className="glass rounded-xl p-3.5 hover:bg-surface-2/30 transition-all duration-300 hover:-translate-y-0.5 group"
              >
                <span className="text-[10px] text-violet/50 uppercase tracking-wider font-semibold group-hover:text-violet/70 transition-colors">
                  {k.replace(/_/g, " ")}
                </span>
                <p className="text-xs text-foreground/85 font-mono mt-1.5">{v}</p>
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
              <div className="glass rounded-xl overflow-hidden">
                <table className="w-full text-[11px] font-mono">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left px-3.5 py-2 text-muted-foreground/50">Column</th>
                      <th className="text-left px-3.5 py-2 text-muted-foreground/50">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(cols as Record<string, string>).map(([col, type]) => (
                      <tr key={col} className="border-b border-border/20 hover:bg-surface-2/20 transition-colors">
                        <td className="px-3.5 py-2 text-foreground/85">{col}</td>
                        <td className="px-3.5 py-2 text-muted-foreground/60">{type}</td>
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
          <div className="glass rounded-xl overflow-hidden">
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left px-3.5 py-2 text-muted-foreground/50 w-20">Method</th>
                  <th className="text-left px-3.5 py-2 text-muted-foreground/50">Path</th>
                  <th className="text-left px-3.5 py-2 text-muted-foreground/50">Description</th>
                </tr>
              </thead>
              <tbody>
                {architecture.apiEndpoints.map((ep, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-surface-2/20 transition-colors">
                    <td className="px-3.5 py-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        ep.method === "GET" ? "bg-green/10 text-green"
                        : ep.method === "POST" ? "bg-blue/10 text-blue"
                        : ep.method === "PUT" ? "bg-yellow/10 text-yellow"
                        : ep.method === "DELETE" ? "bg-red/10 text-red"
                        : "bg-surface-2 text-foreground"
                      }`}>
                        {ep.method}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 text-foreground/85">{ep.path}</td>
                    <td className="px-3.5 py-2 text-muted-foreground/60">{ep.description}</td>
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
              <div key={k} className="glass rounded-xl p-3.5 hover:bg-surface-2/30 transition-all duration-300 hover:-translate-y-0.5">
                <span className="text-[10px] text-violet/50 uppercase tracking-wider font-semibold">{k}</span>
                <p className="text-xs text-foreground/85 font-mono mt-1.5">{v}</p>
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
              <div key={k} className="glass rounded-xl p-3.5 hover:bg-surface-2/30 transition-all duration-300 hover:-translate-y-0.5">
                <span className="text-[10px] text-violet/50 uppercase tracking-wider font-semibold">{k}</span>
                <p className="text-xs text-foreground/85 font-mono mt-1.5">{v}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

/* ─── Code Tab ─────────────────────────────────────────────── */
function CodeView({ frontend }: { frontend?: GeneratedData["frontend"]; }) {
  if (!frontend) {
    return (
      <p className="text-sm text-muted-foreground/40">No frontend code generated.</p>
    );
  }

  // Sort files: App.jsx first, then main.jsx, then index.css, then index.html, then rest
  const FILE_ORDER = ["App.jsx", "main.jsx", "index.css", "index.html"];
  const files = Object.entries(frontend).sort(([a], [b]) => {
    const ai = FILE_ORDER.indexOf(a);
    const bi = FILE_ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-4">
      {files.map(([filename, code]) => (
        <CodeBlock key={filename} filename={filename} code={cleanCode(code)} />
      ))}
    </div>
  );
}

/* ─── Preview Tab ──────────────────────────────────────────── */
function PreviewView({ data }: { data: GeneratedData }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [previewReady, setPreviewReady] = useState(false);

  const viewportWidths = { desktop: "100%", tablet: "768px", mobile: "375px" };

  // Build an in-browser React preview using Babel standalone + React UMD
  const srcDoc = useMemo(() => {
    if (!data.frontend) return "";

    const css = cleanCode(data.frontend["index.css"] || "");
    const appJsx = cleanCode(data.frontend["App.jsx"] || "");
    const indexHtml = cleanCode(data.frontend["index.html"] || "");

    // Extract <head> content from the generated index.html for CDN links (Font Awesome, Google Fonts)
    const headMatch = indexHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const headContent = headMatch ? headMatch[1] : "";
    // Pull out only <link> and <meta> tags from head
    const linkTags = (headContent.match(/<link[^>]*>/gi) || []).join("\n");
    const metaTags = (headContent.match(/<meta[^>]*>/gi) || []).join("\n");

    // Extract title
    const titleMatch = indexHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : "Preview";

    // Clean the App.jsx: remove import/export statements for inline execution
    const cleanedAppJsx = appJsx
      .replace(/^\s*import\s+.*?['"]\s*;?\s*$/gm, "")  // Remove all import lines
      .replace(/^\s*export\s+default\s+\w+\s*;?\s*$/gm, "")  // Remove export default App;
      .trim();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${metaTags}
  <title>${title}</title>
  ${linkTags}
  <style>${css}</style>
  <!-- React UMD -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <!-- Babel Standalone for JSX transpilation -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react">
    const { useState, useEffect, useRef, useCallback, useMemo } = React;

    ${cleanedAppJsx}

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(App));
  <\/script>
</body>
</html>`;
  }, [data.frontend]);

  useEffect(() => {
    setPreviewReady(false);
    const timer = setTimeout(() => setPreviewReady(true), 500);
    return () => clearTimeout(timer);
  }, [srcDoc]);

  if (!data.frontend) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground/40">No frontend code to preview.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      {/* Viewport toolbar */}
      <div className="flex items-center gap-2">
        {([
          { id: "desktop", icon: Monitor, label: "Desktop" },
          { id: "tablet", icon: Tablet, label: "Tablet" },
          { id: "mobile", icon: Smartphone, label: "Mobile" },
        ] as const).map((v) => (
          <button
            key={v.id}
            onClick={() => setViewport(v.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-300 ${
              viewport === v.id
                ? "glass text-foreground/80 glow-border"
                : "text-muted-foreground/40 hover:text-muted-foreground/60 hover:bg-surface-2/30"
            }`}
          >
            <v.icon className="w-3.5 h-3.5" />
            {v.label}
          </button>
        ))}

        {/* React badge */}
        <div className="ml-auto flex items-center gap-1.5 text-[9px] text-muted-foreground/30 font-mono px-2 py-1 rounded-md glass">
          <span className="text-cyan/50">⚛</span> React Preview
        </div>
      </div>

      {/* Iframe container */}
      <div className="flex-1 flex items-stretch justify-center min-h-0">
        <div
          className="glass rounded-xl overflow-hidden transition-all duration-500 flex flex-col"
          style={{ width: viewportWidths[viewport], maxWidth: "100%", minHeight: "calc(100vh - 180px)" }}
        >
          {!previewReady && (
            <div className="flex-1 flex items-center justify-center bg-surface-1/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground/40 font-mono">
                <Loader2 className="w-4 h-4 animate-spin text-violet/50" />
                Loading React preview…
              </div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            srcDoc={srcDoc}
            className={`w-full flex-1 bg-white rounded-xl border-0 transition-opacity duration-300 ${previewReady ? 'opacity-100' : 'opacity-0 absolute'}`}
            sandbox="allow-scripts"
            title="React Preview"
            style={{ minHeight: "500px" }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Files Tab ────────────────────────────────────────────── */
function FilesView({ data }: { data: GeneratedData }) {
  const [copied, setCopied] = useState(false);

  const handleDownload = useCallback(async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const src = zip.folder("src")!;

    // — Build a proper Vite + React project ZIP —

    // package.json
    zip.file("package.json", JSON.stringify({
      name: "archon-react-project",
      private: true,
      version: "1.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview",
      },
      dependencies: {
        react: "^18.3.1",
        "react-dom": "^18.3.1",
      },
      devDependencies: {
        "@vitejs/plugin-react": "^4.3.1",
        vite: "^5.4.0",
      },
    }, null, 2));

    // vite.config.js
    zip.file("vite.config.js", `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`);

    // README.md
    zip.file("README.md", `# Archon Generated React Project

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Built with
- React 18
- Vite 5
- Generated by [Archon](https://archon.dinez.in)
`);

    // Frontend source files → src/
    if (data.frontend) {
      Object.entries(data.frontend).forEach(([filename, code]) => {
        if (filename === "index.html") {
          // index.html goes at root (Vite convention)
          zip.file("index.html", cleanCode(code));
        } else {
          // All other files go in src/
          src.file(filename, cleanCode(code));
        }
      });
    }

    // Architecture docs
    const docs = zip.folder("docs")!;
    if (data.architecture) {
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
        Object.entries(data.architecture.systemArchitecture).forEach(([k, v]) => (md += `- **${k}**: ${v}\n`));
        md += "\n";
      }
      if (data.architecture.techStack) {
        md += "## Tech Stack\n\n";
        Object.entries(data.architecture.techStack).forEach(([k, v]) => (md += `- **${k}**: ${v}\n`));
        md += "\n";
      }
      if (data.architecture.scalingStrategy) {
        md += "## Scaling Strategy\n\n";
        Object.entries(data.architecture.scalingStrategy).forEach(([k, v]) => (md += `- **${k}**: ${v}\n`));
      }
      docs.file("architecture.md", md);
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
      if (data.architecture.apiEndpoints && data.architecture.apiEndpoints.length > 0) {
        let api = "# API Endpoints\n\n";
        api += "| Method | Path | Description |\n|--------|------|-------------|\n";
        data.architecture.apiEndpoints.forEach(
          (ep) => (api += `| ${ep.method} | ${ep.path} | ${ep.description} |\n`)
        );
        docs.file("api-endpoints.md", api);
      }
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "archon-react-project.zip";
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

  // Separate root files vs nested files (like components/Navbar.jsx)
  const rootFiles = frontendFiles.filter((f) => !f.includes("/") && f !== "index.html");
  const nestedFiles = frontendFiles.filter((f) => f.includes("/"));
  const hasIndexHtml = frontendFiles.includes("index.html");

  // Group nested files by directory
  const nestedDirs: Record<string, string[]> = {};
  nestedFiles.forEach((f) => {
    const parts = f.split("/");
    const dir = parts.slice(0, -1).join("/");
    if (!nestedDirs[dir]) nestedDirs[dir] = [];
    nestedDirs[dir].push(parts[parts.length - 1]);
  });

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex gap-2">
        <button
          id="download-btn"
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3.5 py-2 glass rounded-lg text-[11px] text-foreground/70 hover:text-foreground hover:bg-surface-2/40 transition-all duration-300"
        >
          <Download className="w-3.5 h-3.5" /> Download ZIP
        </button>
        <button
          id="copy-all-btn"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3.5 py-2 glass rounded-lg text-[11px] text-foreground/70 hover:text-foreground hover:bg-surface-2/40 transition-all duration-300"
        >
          {copied ? (
            <><Check className="w-3.5 h-3.5 text-green" /> Copied!</>
          ) : (
            <><Copy className="w-3.5 h-3.5" /> Copy All</>
          )}
        </button>
      </div>

      {/* File tree */}
      <Section title="Project Structure">
        <div className="glass rounded-xl p-5 font-mono text-xs">
          <div className="text-foreground/85">📁 archon-react-project/</div>

          {/* Root project files */}
          <div className="ml-4 mt-1.5 space-y-1">
            {hasIndexHtml && (
              <div className="text-foreground/65 flex items-center gap-1.5">
                <span className="text-muted-foreground/30">├──</span>
                <span className="text-yellow">index.html</span>
              </div>
            )}
            <div className="text-foreground/65 flex items-center gap-1.5">
              <span className="text-muted-foreground/30">├──</span>
              <span className="text-green">package.json</span>
            </div>
            <div className="text-foreground/65 flex items-center gap-1.5">
              <span className="text-muted-foreground/30">├──</span>
              <span className="text-green">vite.config.js</span>
            </div>
            <div className="text-foreground/65 flex items-center gap-1.5">
              <span className="text-muted-foreground/30">├──</span>
              <span className="text-foreground/85">📁 src/</span>
            </div>

            {/* src/ contents */}
            <div className="ml-6 space-y-1">
              {rootFiles.map((file, i) => (
                <div key={file} className="text-foreground/65 flex items-center gap-1.5">
                  <span className="text-muted-foreground/30">
                    {i < rootFiles.length - 1 || Object.keys(nestedDirs).length > 0 ? "├──" : "└──"}
                  </span>
                  <span className={file.endsWith(".jsx") ? "text-cyan" : file.endsWith(".css") ? "text-purple" : "text-foreground/65"}>
                    {file}
                  </span>
                </div>
              ))}

              {/* Nested directories (e.g., components/) */}
              {Object.entries(nestedDirs).map(([dir, files], di) => (
                <div key={dir}>
                  <div className="text-foreground/65 flex items-center gap-1.5">
                    <span className="text-muted-foreground/30">
                      {di < Object.keys(nestedDirs).length - 1 ? "├──" : "└──"}
                    </span>
                    <span className="text-foreground/85">📁 {dir}/</span>
                  </div>
                  <div className="ml-6 space-y-1">
                    {files.map((file, fi) => (
                      <div key={file} className="text-foreground/65 flex items-center gap-1.5">
                        <span className="text-muted-foreground/30">
                          {fi < files.length - 1 ? "├──" : "└──"}
                        </span>
                        <span className="text-cyan">{file}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Docs */}
            {archSections.length > 0 && (
              <>
                <div className="text-foreground/65 flex items-center gap-1.5">
                  <span className="text-muted-foreground/30">└──</span>
                  <span className="text-foreground/85">📁 docs/</span>
                </div>
                <div className="ml-6 space-y-1">
                  {data.architecture?.features && (
                    <div className="text-foreground/65 flex items-center gap-1.5">
                      <span className="text-muted-foreground/30">├──</span>
                      <span className="text-yellow">architecture.md</span>
                    </div>
                  )}
                  {data.architecture?.databaseSchema && (
                    <div className="text-foreground/65 flex items-center gap-1.5">
                      <span className="text-muted-foreground/30">├──</span>
                      <span className="text-green">schema.sql</span>
                    </div>
                  )}
                  {data.architecture?.apiEndpoints && data.architecture.apiEndpoints.length > 0 && (
                    <div className="text-foreground/65 flex items-center gap-1.5">
                      <span className="text-muted-foreground/30">└──</span>
                      <span className="text-yellow">api-endpoints.md</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}

/* ─── Reusable Components ──────────────────────────────────── */
function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-foreground/80 mb-3.5 uppercase tracking-wider flex items-center gap-2">
        {icon && <span className="text-violet/50">{icon}</span>}
        <span>{title}</span>
        <div className="flex-1 h-px bg-border/30 ml-2" />
      </h3>
      {children}
    </div>
  );
}

function CodeBlock({ filename, code }: { filename: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  const ext = filename.split(".").pop() || "";
  const langMap: Record<string, { label: string; prism: string }> = {
    html: { label: "HTML", prism: "markup" },
    css: { label: "CSS", prism: "css" },
    js: { label: "JavaScript", prism: "javascript" },
    jsx: { label: "React JSX", prism: "javascript" },
    ts: { label: "TypeScript", prism: "typescript" },
    tsx: { label: "React TSX", prism: "typescript" },
    json: { label: "JSON", prism: "json" },
  };
  const lang = langMap[ext] || { label: ext.toUpperCase(), prism: ext };

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl glass overflow-hidden group hover:-translate-y-0.5 transition-all duration-300 hover:shadow-lg hover:shadow-violet/5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-2/30 border-b border-border/20">
        <div className="flex items-center gap-2.5">
          <div className="w-0.5 h-4 rounded-full" style={{ background: "linear-gradient(180deg, #6366f1, #a855f7)" }} />
          <span className="text-[11px] font-mono text-foreground/75">{filename}</span>
          <span className="text-[9px] px-2 py-0.5 rounded-md glass text-muted-foreground/40 uppercase tracking-wider">
            {lang.label}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-muted-foreground/30 hover:text-foreground/70 transition-all duration-300 px-2 py-1 rounded-md hover:bg-surface-3/30"
        >
          {copied ? (
            <><Check className="w-3 h-3 text-green" /> Copied</>
          ) : (
            <><Copy className="w-3 h-3" /> Copy</>
          )}
        </button>
      </div>
      {/* Code */}
      <div className="p-4 overflow-auto max-h-[400px]">
        <pre className="text-[11px] leading-relaxed whitespace-pre-wrap">
          <code ref={codeRef} className={`language-${lang.prism}`}>
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
}

export default MainPanel;
