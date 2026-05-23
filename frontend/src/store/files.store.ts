/**
 * Files Store — Zustand state management for the file system.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ProjectFileData, FileTreeNode, Snapshot } from '../services/files.api';

interface FilesStore {
  // State
  files: ProjectFileData[];
  fileTree: FileTreeNode[];
  openFiles: ProjectFileData[];        // Files currently open in editor tabs
  activeFileId: string | null;         // Currently focused file
  snapshots: Snapshot[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setFiles: (files: ProjectFileData[]) => void;
  setFileTree: (tree: FileTreeNode[]) => void;
  openFile: (file: ProjectFileData) => void;
  closeFile: (fileId: string) => void;
  setActiveFile: (fileId: string | null) => void;
  updateFileContent: (fileId: string, content: string) => void;
  setSnapshots: (snapshots: Snapshot[]) => void;
  addFile: (file: ProjectFileData) => void;
  removeFile: (fileId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useFilesStore = create<FilesStore>()(
  devtools(
    (set) => ({
      files:        [],
      fileTree:     [],
      openFiles:    [],
      activeFileId: null,
      snapshots:    [],
      isLoading:    false,
      error:        null,

      setFiles: (files) => set({ files }),
      setFileTree: (fileTree) => set({ fileTree }),

      openFile: (file) => set((state) => {
        const alreadyOpen = state.openFiles.some(f => f.id === file.id);
        return {
          openFiles: alreadyOpen ? state.openFiles : [...state.openFiles, file],
          activeFileId: file.id,
        };
      }),

      closeFile: (fileId) => set((state) => {
        const newOpen = state.openFiles.filter(f => f.id !== fileId);
        return {
          openFiles: newOpen,
          activeFileId: state.activeFileId === fileId
            ? (newOpen.length > 0 ? newOpen[newOpen.length - 1].id : null)
            : state.activeFileId,
        };
      }),

      setActiveFile: (fileId) => set({ activeFileId: fileId }),

      updateFileContent: (fileId, content) => set((state) => ({
        openFiles: state.openFiles.map(f =>
          f.id === fileId ? { ...f, content } : f
        ),
        files: state.files.map(f =>
          f.id === fileId ? { ...f, content } : f
        ),
      })),

      setSnapshots: (snapshots) => set({ snapshots }),

      addFile: (file) => set((state) => ({
        files: [...state.files, file],
      })),

      removeFile: (fileId) => set((state) => ({
        files: state.files.filter(f => f.id !== fileId),
        openFiles: state.openFiles.filter(f => f.id !== fileId),
        activeFileId: state.activeFileId === fileId ? null : state.activeFileId,
      })),

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
    }),
    { name: 'FilesStore' }
  )
);
