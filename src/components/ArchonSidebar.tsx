import { Loader2 } from "lucide-react";

interface ArchonSidebarProps {
  prompt: string;
  setPrompt: (value: string) => void;
  onGenerate: () => void;
  loading: boolean;
}

const ArchonSidebar = ({
  prompt,
  setPrompt,
  onGenerate,
  loading,
}: ArchonSidebarProps) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      onGenerate();
    }
  };

  return (
    <div className="w-72 bg-surface-1 border-r border-border flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <span className="text-[11px] font-semibold text-foreground tracking-wide uppercase">
          Prompt
        </span>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <textarea
          id="prompt-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you want to build..."
          disabled={loading}
          className="flex-1 min-h-[140px] bg-surface-0 border border-border rounded-md p-3 text-xs text-foreground placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 font-mono leading-relaxed disabled:opacity-50"
        />
        <p className="mt-2 text-[10px] text-muted-foreground/30 font-mono">
          Ctrl+Enter to generate
        </p>
        <button
          id="generate-btn"
          onClick={onGenerate}
          disabled={loading || !prompt.trim()}
          className="mt-2 w-full bg-primary text-primary-foreground py-2.5 rounded-md text-xs font-semibold tracking-wide hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating…
            </>
          ) : (
            "Generate"
          )}
        </button>
      </div>
    </div>
  );
};

export default ArchonSidebar;
