/**
 * FileExplorer — Tree-based file browser for the IDE.
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronDown, File, Folder, FolderOpen,
  Plus, Trash2, FilePlus, FolderPlus, RefreshCw
} from 'lucide-react';
import { useFilesStore } from '../../store/files.store';
import { filesApi } from '../../services/files.api';
import type { FileTreeNode, ProjectFileData } from '../../services/files.api';

interface FileExplorerProps {
  projectId: string;
}

export default function FileExplorer({ projectId }: FileExplorerProps) {
  const { fileTree, setFileTree, openFile, setLoading } = useFilesStore();
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['src']));

  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      const tree = await filesApi.tree(projectId);
      setFileTree(tree);
    } catch (err) {
      console.error('Failed to load file tree:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, setFileTree, setLoading]);

  useEffect(() => { loadTree(); }, [loadTree]);

  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  }, []);

  const handleFileClick = useCallback(async (node: FileTreeNode) => {
    if (node.type === 'DIRECTORY') {
      toggleExpand(node.path);
      return;
    }
    try {
      const file = await filesApi.read(node.id);
      openFile(file);
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  }, [openFile, toggleExpand]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/20 bg-surface-1/30 flex-shrink-0">
        <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Explorer</span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={loadTree}
            className="p-1 rounded hover:bg-surface-2/30 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          <button
            className="p-1 rounded hover:bg-surface-2/30 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
            title="New File"
          >
            <FilePlus className="w-3 h-3" />
          </button>
          <button
            className="p-1 rounded hover:bg-surface-2/30 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
            title="New Folder"
          >
            <FolderPlus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {fileTree.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <Folder className="w-8 h-8 text-muted-foreground/15 mx-auto mb-2" />
            <p className="text-[11px] text-muted-foreground/30">No files yet</p>
            <p className="text-[10px] text-muted-foreground/20 mt-1">
              Send a message to generate code
            </p>
          </div>
        ) : (
          fileTree.map(node => (
            <TreeNode
              key={node.path}
              node={node}
              depth={0}
              expandedPaths={expandedPaths}
              onToggle={toggleExpand}
              onClick={handleFileClick}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Tree Node Component ─────────────────────────────────────────────────────

interface TreeNodeProps {
  node: FileTreeNode;
  depth: number;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onClick: (node: FileTreeNode) => void;
}

function TreeNode({ node, depth, expandedPaths, onToggle, onClick }: TreeNodeProps) {
  const isDir = node.type === 'DIRECTORY';
  const isExpanded = expandedPaths.has(node.path);
  const { activeFileId } = useFilesStore();
  const isActive = activeFileId === node.id;

  const iconColor = getFileIconColor(node.name, node.language);

  return (
    <>
      <button
        onClick={() => onClick(node)}
        className={`w-full flex items-center gap-1 px-2 py-[3px] text-[11px] font-mono hover:bg-surface-2/30 transition-colors ${
          isActive ? 'bg-violet/10 text-foreground' : 'text-foreground/70'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isDir ? (
          <>
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-yellow-500/60 flex-shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-yellow-500/60 flex-shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="w-3 flex-shrink-0" />
            <File className={`w-3.5 h-3.5 flex-shrink-0 ${iconColor}`} />
          </>
        )}
        <span className="truncate ml-0.5">{node.name}</span>
      </button>

      {isDir && isExpanded && node.children && (
        <AnimatePresence>
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {node.children
              .sort((a, b) => {
                // Directories first, then alphabetical
                if (a.type !== b.type) return a.type === 'DIRECTORY' ? -1 : 1;
                return a.name.localeCompare(b.name);
              })
              .map(child => (
                <TreeNode
                  key={child.path}
                  node={child}
                  depth={depth + 1}
                  expandedPaths={expandedPaths}
                  onToggle={onToggle}
                  onClick={onClick}
                />
              ))}
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
}

function getFileIconColor(name: string, language?: string | null): string {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx': case 'ts': return 'text-blue-400/70';
    case 'jsx': case 'js': return 'text-yellow-400/70';
    case 'css': case 'scss': return 'text-purple-400/70';
    case 'html': return 'text-orange-400/70';
    case 'json': return 'text-green-400/70';
    case 'md': return 'text-muted-foreground/40';
    case 'svg': case 'png': case 'jpg': return 'text-pink-400/70';
    default: return 'text-muted-foreground/40';
  }
}
