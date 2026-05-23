/**
 * Terminal — Output panel for build logs and command results.
 *
 * Currently read-only (output display). Will become interactive
 * when sandbox integration is complete.
 */

import { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, X, Maximize2, Minimize2, Trash2 } from 'lucide-react';

interface TerminalLine {
  id: string;
  type: 'stdout' | 'stderr' | 'system' | 'input';
  content: string;
  timestamp: number;
}

interface TerminalProps {
  lines?: TerminalLine[];
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function Terminal({ lines = [], isOpen = true, onToggle }: TerminalProps) {
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>(lines);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminalLines]);

  // Update lines from props
  useEffect(() => {
    if (lines.length > 0) {
      setTerminalLines(lines);
    }
  }, [lines]);

  if (!isOpen) return null;

  return (
    <div className={`flex flex-col bg-[#0a0a0f] border-t border-border/20 ${
      isExpanded ? 'h-[50vh]' : 'h-[180px]'
    } transition-all duration-200`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-1/20 border-b border-border/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3 h-3 text-muted-foreground/40" />
          <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Terminal</span>
          {terminalLines.length > 0 && (
            <span className="text-[9px] text-muted-foreground/30 bg-surface-2/20 px-1.5 py-0.5 rounded">
              {terminalLines.length} lines
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setTerminalLines([])}
            className="p-1 rounded hover:bg-surface-2/30 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
            title="Clear"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-surface-2/30 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
            title={isExpanded ? 'Minimize' : 'Maximize'}
          >
            {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
          <button
            onClick={onToggle}
            className="p-1 rounded hover:bg-surface-2/30 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Output */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed">
        {terminalLines.length === 0 ? (
          <div className="text-muted-foreground/20 italic">
            Terminal ready. Build output will appear here.
          </div>
        ) : (
          terminalLines.map(line => (
            <div key={line.id} className="flex">
              <span className={getLineColor(line.type)}>
                {line.content}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function getLineColor(type: TerminalLine['type']): string {
  switch (type) {
    case 'stdout':  return 'text-foreground/70';
    case 'stderr':  return 'text-red-400/80';
    case 'system':  return 'text-violet/60 italic';
    case 'input':   return 'text-green-400/80';
    default:        return 'text-muted-foreground/50';
  }
}

// ─── Helper to create terminal lines ─────────────────────────────────────────

export function createTerminalLine(
  content: string,
  type: TerminalLine['type'] = 'stdout'
): TerminalLine {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    content,
    timestamp: Date.now(),
  };
}
