import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Code2, FolderTree, Eye, Download, Monitor, Tablet, Smartphone, Copy, Check, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useUIStore } from '../../store/ui.store';
import { useFilesStore } from '../../store/files.store';
import { useChatStore } from '../../store/chat.store';
import { useParams } from 'react-router-dom';
import { downloadZipUrl } from '../../services/artifacts.api';
import { validateComponentCode } from '../../utils/previewValidator';
import { sendChatMessage } from '../../services/socket.client';
import type { ArtifactPayload } from '@archon/shared';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import FileExplorer from './FileExplorer';
import EditorTabs from './EditorTabs';
import MonacoEditor from './MonacoEditor';

const TABS = [
  { id: 'architecture', label: 'Architecture', icon: Layers },
  { id: 'code',         label: 'Code',         icon: Code2 },
  { id: 'files',        label: 'Files',         icon: FolderTree },
  { id: 'preview',      label: 'Preview',       icon: Eye },
] as const;

type TabId = typeof TABS[number]['id'];

export default function ArtifactTabs() {
  const { activeTab, setActiveTab, currentArtifactData, previewViewport, setPreviewViewport } = useUIStore();
  const { id: projectId } = useParams<{ id: string }>();
  const data = currentArtifactData;

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border/20 bg-surface-1/20 px-2 flex-shrink-0">
        <div className="flex items-center gap-0.5 py-1.5">
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3.5 py-2 text-[11px] font-medium rounded-lg flex items-center gap-1.5 transition-all duration-200 ${
                  active ? 'text-white' : 'text-muted-foreground/40 hover:text-muted-foreground/60 hover:bg-surface-2/20'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="artifact-tab-pill"
                    className="absolute inset-0 rounded-lg bg-violet/15 border border-violet/20"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <Icon className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
        {projectId && data && (
          <a
            href={downloadZipUrl(projectId)}
            download
            className="ml-auto mr-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] text-muted-foreground/40 hover:text-muted-foreground/60 hover:bg-surface-2/20 transition-all"
          >
            <Download className="w-3 h-3" /> ZIP
          </a>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {!data ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState />
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`h-full ${activeTab === 'code' || activeTab === 'files' ? 'overflow-hidden' : 'overflow-auto'}`}
            >
              {activeTab === 'architecture' && <ArchitectureView data={data} />}
              {activeTab === 'code'         && <InteractiveEditorView projectId={projectId!} />}
              {activeTab === 'files'        && (
                <div className="h-full max-w-sm border-r border-border/20 bg-surface-1/5">
                  <FileExplorer projectId={projectId!} />
                </div>
              )}
              {activeTab === 'preview'      && <PreviewView data={data} viewport={previewViewport} setViewport={setPreviewViewport} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Interactive Editor View ───────────────────────────────────────

function InteractiveEditorView({ projectId }: { projectId: string }) {
  const { openFiles, activeFileId } = useFilesStore();
  const activeFile = openFiles.find(f => f.id === activeFileId);

  return (
    <div className="h-full flex overflow-hidden bg-background">
      <div className="w-[200px] border-r border-border/20 flex-shrink-0 bg-surface-1/10">
        <FileExplorer projectId={projectId} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <EditorTabs />
        <div className="flex-1 min-h-0 relative bg-[#0a0a0f]">
          {activeFile ? (
            <MonacoEditor
              fileId={activeFile.id}
              content={activeFile.content || ''}
              language={activeFile.language || 'javascript'}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground/30 text-xs italic">
              Select a file from the explorer to edit
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-violet/5 blur-2xl scale-150" />
        <div className="relative w-16 h-16 rounded-2xl bg-surface-2/50 border border-border/20 flex items-center justify-center">
          <Layers className="w-7 h-7 text-muted-foreground/20" />
        </div>
      </div>
      <div className="text-center">
        <h3 className="text-base font-semibold mb-1.5 bg-gradient-to-r from-violet/80 to-purple/80 bg-clip-text text-transparent">
          Describe your vision
        </h3>
        <p className="text-xs text-muted-foreground/40 max-w-xs leading-relaxed">
          Type a message in the chat to generate your architecture, code, and live preview.
        </p>
      </div>
    </div>
  );
}

// ── Architecture View ─────────────────────────────────────────────

function ArchitectureView({ data }: { data: ArtifactPayload }) {
  const arch = data.architecture;
  if (!arch) return <p className="p-6 text-xs text-muted-foreground/40">No architecture data yet.</p>;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {arch.features && (
        <Section title="Features">
          <div className="grid grid-cols-2 gap-4">
            <FeatureList title="User" items={arch.features.user} color="text-violet" />
            <FeatureList title="Admin" items={arch.features.admin} color="text-purple" />
          </div>
        </Section>
      )}
      {arch.systemArchitecture && (
        <Section title="System Architecture">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(arch.systemArchitecture).map(([k, v]) => (
              <div key={k} className="bg-surface-2/30 border border-border/15 rounded-xl p-3 hover:bg-surface-2/50 transition-colors">
                <p className="text-[10px] text-violet/50 uppercase tracking-wider font-semibold mb-1">{k.replace(/_/g,' ')}</p>
                <p className="text-xs text-foreground/80 font-mono">{v}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
      {arch.databaseSchema && (
        <Section title="Database Schema">
          {Object.entries(arch.databaseSchema).map(([table, cols]) => (
            <div key={table} className="mb-3">
              <h4 className="text-xs font-semibold text-cyan/70 font-mono mb-1.5">{table}</h4>
              <div className="bg-surface-2/30 border border-border/15 rounded-xl overflow-hidden">
                <table className="w-full text-[11px] font-mono">
                  <thead>
                    <tr className="border-b border-border/20">
                      <th className="text-left px-3 py-2 text-muted-foreground/40">Column</th>
                      <th className="text-left px-3 py-2 text-muted-foreground/40">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(cols as Record<string, string>).map(([col, type]) => (
                      <tr key={col} className="border-b border-border/10 hover:bg-surface-2/30 transition-colors">
                        <td className="px-3 py-1.5 text-foreground/80">{col}</td>
                        <td className="px-3 py-1.5 text-muted-foreground/50">{type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </Section>
      )}
      {arch.apiEndpoints && arch.apiEndpoints.length > 0 && (
        <Section title="API Endpoints">
          <div className="bg-surface-2/30 border border-border/15 rounded-xl overflow-hidden">
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="border-b border-border/20">
                  <th className="text-left px-3 py-2 text-muted-foreground/40 w-16">Method</th>
                  <th className="text-left px-3 py-2 text-muted-foreground/40">Path</th>
                  <th className="text-left px-3 py-2 text-muted-foreground/40">Description</th>
                </tr>
              </thead>
              <tbody>
                {arch.apiEndpoints.map((ep, i) => (
                  <tr key={i} className="border-b border-border/10 hover:bg-surface-2/30 transition-colors">
                    <td className="px-3 py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        ep.method === 'GET' ? 'bg-green/10 text-green' :
                        ep.method === 'POST' ? 'bg-blue/10 text-blue' :
                        ep.method === 'PUT' || ep.method === 'PATCH' ? 'bg-yellow/10 text-yellow' :
                        'bg-red/10 text-red'
                      }`}>{ep.method}</span>
                    </td>
                    <td className="px-3 py-1.5 text-foreground/80">{ep.path}</td>
                    <td className="px-3 py-1.5 text-muted-foreground/50">{ep.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
      {arch.techStack && (
        <Section title="Tech Stack">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(arch.techStack).map(([k, v]) => (
              <div key={k} className="bg-surface-2/30 border border-border/15 rounded-xl p-3">
                <p className="text-[10px] text-violet/50 uppercase tracking-wider font-semibold mb-1">{k}</p>
                <p className="text-xs text-foreground/80 font-mono">{v}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function FeatureList({ title, items, color }: { title: string; items?: string[]; color: string }) {
  return (
    <div>
      <h4 className={`text-[10px] font-semibold ${color} uppercase tracking-wider mb-2`}>{title} Features</h4>
      <ul className="space-y-1.5">
        {items?.map((f, i) => (
          <li key={i} className="text-xs text-foreground/70 font-mono flex items-start gap-1.5">
            <span className={`${color} opacity-60 mt-0.5`}>▸</span> {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}

// ── Code View ─────────────────────────────────────────────────────

function CodeView({ data }: { data: ArtifactPayload }) {
  const fileMap = data.frontend ?? (data as any).files;
  if (!fileMap) return <p className="p-6 text-xs text-muted-foreground/40">No code generated yet.</p>;

  const files = Object.entries(fileMap as Record<string, string>).sort(([a], [b]) => {
    const order = ['App.jsx', 'App.tsx', 'main.jsx', 'main.tsx', 'index.css', 'index.html'];
    return (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b));
  });

  return (
    <div className="p-4 space-y-4">
      {files.map(([filename, code]) => (
        <CodeBlock key={filename} filename={filename} code={cleanCode(code)} />
      ))}
    </div>
  );
}

function CodeBlock({ filename, code }: { filename: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const lang = filename.endsWith('.css') ? 'css' : filename.endsWith('.html') ? 'markup' : 'javascript';
  const highlighted = useMemo(() => {
    try { return Prism.highlight(code, Prism.languages[lang] ?? Prism.languages.javascript, lang); }
    catch { return code; }
  }, [code, lang]);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-border/20 bg-surface-1/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/15 bg-surface-2/20">
        <span className="text-xs font-mono text-muted-foreground/60">{filename}</span>
        <button onClick={copy} className="flex items-center gap-1 text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors">
          {copied ? <><Check className="w-3 h-3 text-green" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[11px] leading-relaxed font-mono max-h-[500px]">
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}

// ── Files View ────────────────────────────────────────────────────

function FilesView({ data, projectId }: { data: ArtifactPayload; projectId: string }) {
  const fileMap = data.frontend ?? (data as any).files;
  const files = fileMap ? Object.keys(fileMap as Record<string, string>) : [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">Project Structure</h3>
        <a href={downloadZipUrl(projectId)} download className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-muted-foreground/50 hover:text-foreground/70 hover:bg-surface-2/30 border border-border/20 transition-all">
          <Download className="w-3 h-3" /> Download ZIP
        </a>
      </div>
      <div className="bg-surface-2/20 border border-border/15 rounded-xl p-4 font-mono text-xs">
        <div className="text-foreground/70 mb-2">📁 project/</div>
        {files.includes('index.html') && <FileRow name="index.html" color="text-yellow" indent={1} />}
        <FileRow name="package.json" color="text-green" indent={1} />
        <FileRow name="vite.config.js" color="text-green" indent={1} />
        <div className="text-foreground/60 ml-4">📁 src/</div>
        {files.filter(f => f !== 'index.html').map(f => (
          <FileRow key={f} name={f} color={f.endsWith('.jsx') || f.endsWith('.tsx') ? 'text-cyan' : f.endsWith('.css') ? 'text-purple' : 'text-foreground/60'} indent={2} />
        ))}
        <div className="text-foreground/60 ml-4">📁 docs/</div>
        <FileRow name="architecture.json" color="text-yellow" indent={2} />
      </div>
    </div>
  );
}

function FileRow({ name, color, indent }: { name: string; color: string; indent: number }) {
  return (
    <div className={`flex items-center gap-1.5 text-foreground/60 mb-1`} style={{ paddingLeft: `${indent * 16}px` }}>
      <span className="text-muted-foreground/20">├──</span>
      <span className={color}>{name}</span>
    </div>
  );
}

// ── Preview View ──────────────────────────────────────────────────

function PreviewView({ data, viewport, setViewport }: {
  data: ArtifactPayload;
  viewport: 'desktop' | 'tablet' | 'mobile';
  setViewport: (v: 'desktop' | 'tablet' | 'mobile') => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const WIDTHS = { desktop: '100%', tablet: '768px', mobile: '375px' };

  const { files: storeFiles } = useFilesStore();
  const { id: projectId } = useParams<{ id: string }>();

  const fileMap = useMemo(() => {
    if (storeFiles.length > 0) {
      const map: Record<string, string> = {};
      for (const f of storeFiles) {
        if (f.type === 'FILE') {
          const cleanPath = f.path.replace(/^src\//, '');
          map[cleanPath] = f.content || '';
        }
      }
      return map;
    }
    return data.frontend ?? (data as any).files;
  }, [storeFiles, data]);

  // ── Build srcDoc with pre-Babel validation ────────────────────────
  const srcDoc = useMemo(() => {
    // Reset any previous error each time fileMap changes
    setPreviewError(null);

    if (!fileMap) return '';
    const fm = fileMap as Record<string, string>;
    const css    = cleanCode(fm['index.css'] ?? fm['src/index.css'] ?? fm['styles.css'] ?? '');
    const html   = cleanCode(fm['index.html'] ?? '');

    // Collect all component code from all JSX/TSX files
    const componentFiles = Object.entries(fm)
      .filter(([name]) => /\.(jsx|tsx)$/i.test(name) && !/(main|index)\.(jsx|tsx)$/i.test(name))
      .sort(([a], [b]) => {
        // App.jsx last so it can reference other components
        if (/App\.(jsx|tsx)$/i.test(a)) return 1;
        if (/App\.(jsx|tsx)$/i.test(b)) return -1;
        return a.localeCompare(b);
      });

    // ── Validate each component file before joining ───────────────────
    const processedCodes: string[] = [];
    for (const [filename, rawCode] of componentFiles) {
      const stripped = stripImportsExports(cleanCode(rawCode));
      const validation = validateComponentCode(stripped);

      if (validation.ok) {
        // Code is clean — use as-is
        processedCodes.push(stripped);
      } else if (validation.fixedCode) {
        // Auto-fix succeeded — use fixed code silently
        console.info(`[Archon Preview] Auto-fixed bare return in ${filename}`);
        processedCodes.push(validation.fixedCode);
      } else {
        // Unfixable — block preview and surface error
        setPreviewError(validation.error ?? 'The AI generated invalid React code.');
        return '';
      }
    }

    const allComponentCode = processedCodes.join('\n\n');

    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const linkTags  = (headMatch?.[1]?.match(/<link[^>]*>/gi) ?? []).join('\n');
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title      = titleMatch?.[1] ?? 'Preview';
    const extScriptTags = (headMatch?.[1]?.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) ?? [])
      .filter(tag => !/src\/|main|module/i.test(tag))
      .join('\n');

    return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${title}</title>${linkTags}
<style>${css}</style>
<script src="https://cdn.tailwindcss.com"></script>
${extScriptTags}
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head><body><div id="root"></div>
<script type="text/babel" data-presets="react">
const {useState,useEffect,useRef,useCallback,useMemo,Fragment}=React;
${allComponentCode}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
</script></body></html>`;
  }, [fileMap]);

  useEffect(() => {
    setReady(false);
    const t = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(t);
  }, [srcDoc]);

  // Regenerate handler — sends a fresh message via the existing socket
  const handleRegenerate = useCallback(() => {
    const { activeSession } = useChatStore.getState();
    if (!activeSession || !projectId) return;
    sendChatMessage(activeSession.id, projectId, 'Regenerate the application. The previous attempt had invalid code structure.');
  }, [projectId]);

  if (!fileMap) return <p className="p-6 text-xs text-muted-foreground/40">No preview available.</p>;

  return (
    <div className="flex flex-col h-full">
      {/* Viewport toolbar */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/15 flex-shrink-0">
        {(['desktop', 'tablet', 'mobile'] as const).map(v => {
          const Icon = v === 'desktop' ? Monitor : v === 'tablet' ? Tablet : Smartphone;
          return (
            <button key={v} onClick={() => setViewport(v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                viewport === v ? 'bg-surface-2/50 border border-border/30 text-foreground/80' : 'text-muted-foreground/30 hover:text-muted-foreground/50'
              }`}>
              <Icon className="w-3.5 h-3.5" />{v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          );
        })}
        <div className="ml-auto text-[9px] font-mono text-muted-foreground/20">⚛ React Preview</div>
      </div>

      {/* Content: error panel OR iframe */}
      <div className="flex-1 overflow-auto bg-[#1a1a2e] p-4">
        {previewError ? (
          <PreviewErrorPanel message={previewError} onRegenerate={handleRegenerate} />
        ) : (
          <div className="mx-auto transition-all duration-500 rounded-xl overflow-hidden shadow-2xl" style={{ width: WIDTHS[viewport], minHeight: 500 }}>
            {!ready && (
              <div className="flex items-center justify-center h-64 bg-surface-1/50">
                <Loader2 className="w-4 h-4 animate-spin text-violet/40" />
              </div>
            )}
            <iframe
              ref={iframeRef}
              srcDoc={srcDoc}
              sandbox="allow-scripts"
              title="Live Preview"
              className={`w-full bg-white transition-opacity duration-300 ${ready ? 'opacity-100' : 'opacity-0'}`}
              style={{ minHeight: 600, border: 'none', display: 'block' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Preview Error Panel ───────────────────────────────────────────

function PreviewErrorPanel({ message, onRegenerate }: { message: string; onRegenerate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 p-8">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-red/5 blur-2xl scale-150" />
        <div className="relative w-16 h-16 rounded-2xl bg-red/10 border border-red/20 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red/60" />
        </div>
      </div>
      <div className="text-center max-w-sm">
        <h3 className="text-sm font-semibold mb-2 text-foreground/80">Preview Failed</h3>
        <p className="text-xs text-muted-foreground/50 leading-relaxed">{message}</p>
      </div>
      <button
        id="preview-regenerate-btn"
        onClick={onRegenerate}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet/15 border border-violet/25 text-violet/80 text-xs font-medium hover:bg-violet/25 hover:border-violet/40 transition-all duration-200"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Regenerate
      </button>
    </div>
  );
}

function cleanCode(raw: string): string {
  let s = raw;
  if (s.startsWith('{"') && s.endsWith('"}')) {
    try {
      const parsed = JSON.parse(s);
      const vals = Object.values(parsed).filter((v): v is string => typeof v === 'string');
      if (vals.length === 1) s = vals[0];
    } catch { /* keep as-is */ }
  }
  if (s.startsWith('"') && s.endsWith('"')) {
    try { const u = JSON.parse(s); if (typeof u === 'string') s = u; } catch { /* keep */ }
  }
  return s;
}

/**
 * Strip import/export statements for inline Babel preview.
 * Handles:
 *   - import ... from '...'
 *   - export default function App() { ... }  → function App() { ... }
 *   - export default App;                    → (removed)
 *   - export function Foo() { ... }          → function Foo() { ... }
 *   - export const Foo = ...                 → const Foo = ...
 *   - export { ... }                         → (removed)
 */
function stripImportsExports(code: string): string {
  return code
    // Remove multiline and single line imports (import ... from '...')
    .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"]\s*;?/g, '')
    // Remove side-effect imports (import './style.css')
    .replace(/import\s+['"][^'"]+['"]\s*;?/g, '')
    // Remove export ... from '...'
    .replace(/export\s+[\s\S]*?from\s+['"][^'"]+['"]\s*;?/g, '')
    // Remove type imports (TypeScript)
    .replace(/^\s*import\s+type\s+.*$/gm, '')
    // `export default function App()` → `function App()`
    .replace(/^\s*export\s+default\s+function\s+/gm, 'function ')
    // `export default class App` → `class App`
    .replace(/^\s*export\s+default\s+class\s+/gm, 'class ')
    // `export default App;` or `export default App` → removed
    .replace(/^\s*export\s+default\s+\w+\s*;?\s*$/gm, '')
    // `export function Foo()` → `function Foo()`
    .replace(/^\s*export\s+function\s+/gm, 'function ')
    // `export const Foo` → `const Foo`
    .replace(/^\s*export\s+const\s+/gm, 'const ')
    // `export let` → `let`
    .replace(/^\s*export\s+let\s+/gm, 'let ')
    // `export { ... }` lines → removed
    .replace(/^\s*export\s*\{[^}]*\}\s*;?\s*$/gm, '')
    .trim();
}

