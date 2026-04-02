import { Loader2, Sparkles, Zap, MessageSquare, ShoppingCart, LayoutDashboard, CheckSquare } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ArchonSidebarProps {
  prompt: string;
  setPrompt: (value: string) => void;
  onGenerate: () => void;
  loading: boolean;
}

const SUGGESTIONS = [
  { icon: ShoppingCart, label: "E-commerce platform" },
  { icon: LayoutDashboard, label: "Analytics dashboard" },
  { icon: CheckSquare, label: "Task management app" },
  { icon: MessageSquare, label: "Real-time chat app" },
];

const ArchonSidebar = ({
  prompt,
  setPrompt,
  onGenerate,
  loading,
}: ArchonSidebarProps) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      onGenerate();
    }
  };

  const handleSuggestionClick = (label: string) => {
    setPrompt(`Build a ${label.toLowerCase()} with user authentication, a responsive dashboard, and a modern UI.`);
  };

  return (
    <div className="w-72 glass-heavy border-r border-border/30 flex flex-col h-full relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-violet/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="px-4 py-3.5 border-b border-border/30 flex items-center gap-2 relative z-10">
        <Sparkles className="w-3.5 h-3.5 text-violet" />
        <span className="text-[11px] font-semibold text-foreground/90 tracking-wide uppercase">
          Prompt
        </span>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col gap-3 relative z-10">
        {/* Textarea container with glow on focus */}
        <div
          className={`relative flex-1 rounded-xl transition-all duration-500 ${
            isFocused
              ? "glow-border"
              : "border border-border/40"
          }`}
        >
          <textarea
            id="prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="What do you want to build today?"
            disabled={loading}
            className="w-full h-full bg-surface-0/50 rounded-xl p-3.5 pb-8 text-xs text-foreground/90 placeholder:text-muted-foreground/25 resize-none focus:outline-none font-mono leading-relaxed disabled:opacity-40 transition-colors"
          />
          {/* Bottom toolbar */}
          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground/25 font-mono">
              {prompt.length > 0 ? `${prompt.length} chars` : ""}
            </span>
            <kbd className="text-[9px] text-muted-foreground/20 font-mono px-1.5 py-0.5 rounded border border-border/30 bg-surface-2/30">
              ⌘ Enter
            </kbd>
          </div>
        </div>

        {/* Suggestion chips — shown when prompt is empty */}
        <AnimatePresence>
          {!prompt.trim() && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-2 gap-1.5"
            >
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => handleSuggestionClick(s.label)}
                  className="flex items-center gap-1.5 px-2.5 py-2 text-[9px] text-muted-foreground/50 rounded-lg border border-border/20 bg-surface-1/30 hover:bg-surface-2/50 hover:text-foreground/70 hover:border-violet/20 transition-all duration-300 text-left"
                >
                  <s.icon className="w-3 h-3 flex-shrink-0 text-violet/40" />
                  <span className="truncate">{s.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generate button */}
        <button
          id="generate-btn"
          onClick={onGenerate}
          disabled={loading || !prompt.trim()}
          className={`relative w-full py-3 rounded-xl text-xs font-semibold tracking-wide 
            flex items-center justify-center gap-2 transition-all duration-500
            disabled:opacity-30 disabled:cursor-not-allowed overflow-hidden
            ${loading
              ? "bg-surface-2 text-foreground/70"
              : "text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            }`}
          style={
            loading
              ? undefined
              : { background: "linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)" }
          }
        >
          {/* Glow pulse when idle with text */}
          {!loading && prompt.trim() && (
            <div className="absolute inset-0 animate-glow-pulse rounded-xl pointer-events-none" />
          )}

          {/* Shimmer sweep on loading */}
          {loading && (
            <div
              className="absolute inset-0 animate-shimmer pointer-events-none opacity-20"
              style={{
                backgroundImage: "linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)",
                backgroundSize: "200% 100%",
              }}
            />
          )}

          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5" />
              Generate
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ArchonSidebar;
