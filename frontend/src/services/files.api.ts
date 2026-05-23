/**
 * Files API — Frontend service for file CRUD operations.
 */

import { api } from './api.client';

export interface ProjectFileData {
  id: string;
  path: string;
  name: string;
  type: 'FILE' | 'DIRECTORY';
  language?: string | null;
  size: number;
  content?: string | null;
  parentPath?: string | null;
  updatedAt: string;
}

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'FILE' | 'DIRECTORY';
  language?: string | null;
  size: number;
  children?: FileTreeNode[];
}

export interface FileVersion {
  id: string;
  version: number;
  hash: string;
  changeType: string;
  createdAt: string;
}

export interface Snapshot {
  id: string;
  version: number;
  label: string | null;
  description: string | null;
  trigger: string;
  fileCount: number;
  totalSize: number;
  createdAt: string;
}

export const filesApi = {
  // File operations
  list: (projectId: string) =>
    api.get<ProjectFileData[]>(`/projects/${projectId}/files`),

  tree: (projectId: string) =>
    api.get<FileTreeNode[]>(`/projects/${projectId}/tree`),

  read: (fileId: string) =>
    api.get<ProjectFileData>(`/files/${fileId}`),

  create: (projectId: string, path: string, content: string) =>
    api.post<ProjectFileData>('/files', { projectId, path, content }),

  update: (fileId: string, content: string) =>
    api.patch<ProjectFileData>(`/files/${fileId}`, { content }),

  delete: (fileId: string) =>
    api.delete(`/files/${fileId}`),

  move: (fileId: string, newPath: string) =>
    api.post<ProjectFileData>('/files/move', { fileId, newPath }),

  createFolder: (projectId: string, path: string) =>
    api.post<ProjectFileData>('/folders', { projectId, path }),

  versions: (fileId: string) =>
    api.get<FileVersion[]>(`/files/${fileId}/versions`),

  restore: (fileId: string, versionId: string) =>
    api.post<ProjectFileData>(`/files/${fileId}/restore`, { versionId }),

  // Snapshot operations
  listSnapshots: (projectId: string) =>
    api.get<Snapshot[]>(`/projects/${projectId}/snapshots`),

  createSnapshot: (projectId: string, label?: string) =>
    api.post<Snapshot>(`/projects/${projectId}/snapshots`, { label }),

  restoreSnapshot: (projectId: string, snapshotId: string) =>
    api.post(`/projects/${projectId}/restore/${snapshotId}`, {}),
};
