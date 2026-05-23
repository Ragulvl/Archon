/**
 * EditorTabs — Tab bar for open files, VS Code style.
 */

import { X, Circle } from 'lucide-react';
import { useFilesStore } from '../../store/files.store';

export default function EditorTabs() {
  const { openFiles, activeFileId, setActiveFile, closeFile } = useFilesStore();

  if (openFiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground/20">
        <div className="text-center">
          <p className="text-[13px] font-medium mb-1">No file open</p>
          <p className="text-[11px]">Select a file from the explorer or generate code</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center bg-surface-1/20 border-b border-border/20 overflow-x-auto no-scrollbar flex-shrink-0">
      {openFiles.map(file => {
        const isActive = file.id === activeFileId;
        const ext = file.name.split('.').pop()?.toLowerCase();

        return (
          <button
            key={file.id}
            onClick={() => setActiveFile(file.id)}
            className={`
              group flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono
              border-r border-border/10 whitespace-nowrap transition-all
              ${isActive
                ? 'bg-background text-foreground border-t-2 border-t-violet'
                : 'bg-transparent text-muted-foreground/50 hover:bg-surface-1/30 hover:text-foreground/70 border-t-2 border-t-transparent'
              }
            `}
          >
            <Circle className={`w-2 h-2 flex-shrink-0 ${getExtColor(ext)}`} fill="currentColor" />
            <span>{file.name}</span>
            <span
              onClick={(e) => { e.stopPropagation(); closeFile(file.id); }}
              className="ml-1 p-0.5 rounded hover:bg-surface-2/50 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-2.5 h-2.5" />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function getExtColor(ext?: string): string {
  switch (ext) {
    case 'tsx': case 'ts': return 'text-blue-400';
    case 'jsx': case 'js': return 'text-yellow-400';
    case 'css': case 'scss': return 'text-purple-400';
    case 'html': return 'text-orange-400';
    case 'json': return 'text-green-400';
    default: return 'text-muted-foreground/30';
  }
}
