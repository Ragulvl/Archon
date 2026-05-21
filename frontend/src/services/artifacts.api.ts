import { api } from './api.client';
import type { Artifact } from '@archon/shared';

export const artifactsApi = {
  list:          (projectId: string) => api.get<Artifact[]>(`/artifacts/${projectId}`),
  getLatest:     (projectId: string) => api.get<Artifact>(`/artifacts/${projectId}/latest`),
  getFiles:      (id: string)        => api.get<unknown[]>(`/artifacts/${id}/files`),
};

export function downloadZipUrl(projectId: string): string {
  return `/api/v1/export/zip/${projectId}`;
}
