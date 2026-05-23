/**
 * MonacoEditor — Real code editor replacing the read-only Prism.js viewer.
 */

import { useRef, useCallback } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import { useFilesStore } from '../../store/files.store';
import { filesApi } from '../../services/files.api';

interface MonacoEditorProps {
  fileId: string;
  content: string;
  language: string;
  readOnly?: boolean;
}

export default function MonacoEditor({ fileId, content, language, readOnly = false }: MonacoEditorProps) {
  const editorRef = useRef<any>(null);
  const { updateFileContent } = useFilesStore();
  const saveTimeoutRef = useRef<number | null>(null);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Configure editor theme
    monaco.editor.defineTheme('archon-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'c084fc' },
        { token: 'string', foreground: '7dd3fc' },
        { token: 'number', foreground: 'fbbf24' },
        { token: 'type', foreground: '34d399' },
      ],
      colors: {
        'editor.background': '#0a0a0f',
        'editor.foreground': '#e5e7eb',
        'editor.lineHighlightBackground': '#1a1a2e30',
        'editor.selectionBackground': '#7c3aed30',
        'editor.inactiveSelectionBackground': '#7c3aed15',
        'editorLineNumber.foreground': '#4b5563',
        'editorLineNumber.activeForeground': '#a78bfa',
        'editor.selectionHighlightBackground': '#7c3aed20',
        'editorCursor.foreground': '#a78bfa',
        'editorIndentGuide.background': '#1f2937',
        'editorIndentGuide.activeBackground': '#374151',
      },
    });
    monaco.editor.setTheme('archon-dark');

    // Add Ctrl+S save binding
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveFile();
    });
  }, []);

  const handleChange: OnChange = useCallback((value) => {
    if (!value || readOnly) return;

    // Update local state immediately
    updateFileContent(fileId, value);

    // Debounced auto-save (2 seconds)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      filesApi.update(fileId, value).catch(err =>
        console.error('Auto-save failed:', err)
      );
    }, 2000);
  }, [fileId, readOnly, updateFileContent]);

  const saveFile = useCallback(async () => {
    if (!editorRef.current || readOnly) return;
    const value = editorRef.current.getValue();
    try {
      await filesApi.update(fileId, value);
    } catch (err) {
      console.error('Save failed:', err);
    }
  }, [fileId, readOnly]);

  return (
    <Editor
      height="100%"
      language={monacoLanguage(language)}
      value={content}
      onChange={handleChange}
      onMount={handleMount}
      options={{
        readOnly,
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
        fontLigatures: true,
        minimap: { enabled: true, scale: 2 },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        renderLineHighlight: 'all',
        bracketPairColorization: { enabled: true },
        autoIndent: 'full',
        formatOnPaste: true,
        tabSize: 2,
        wordWrap: 'on',
        padding: { top: 12 },
        lineNumbers: 'on',
        glyphMargin: false,
        folding: true,
        scrollbar: {
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
          verticalSliderSize: 6,
        },
      }}
      loading={
        <div className="flex items-center justify-center h-full bg-background">
          <div className="w-5 h-5 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
        </div>
      }
    />
  );
}

function monacoLanguage(lang?: string): string {
  const map: Record<string, string> = {
    typescript: 'typescript', javascript: 'javascript', tsx: 'typescript',
    jsx: 'javascript', css: 'css', scss: 'scss', html: 'html',
    json: 'json', markdown: 'markdown', sql: 'sql', python: 'python',
    yaml: 'yaml', xml: 'xml', bash: 'shell', dockerfile: 'dockerfile',
    graphql: 'graphql', prisma: 'prisma',
  };
  return map[lang ?? ''] ?? 'plaintext';
}
