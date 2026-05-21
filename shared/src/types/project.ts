export type ProjectStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  userId: string;
  status: ProjectStatus;
  thumbnail?: string | null;
  techStack?: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    sessions: number;
    artifacts: number;
  };
}

export interface ProjectContext {
  id: string;
  projectId: string;
  summary?: string | null;
  techStack?: Record<string, string> | null;
  decisions?: Array<{ timestamp: string; decision: string }> | null;
  lastUpdated: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}
