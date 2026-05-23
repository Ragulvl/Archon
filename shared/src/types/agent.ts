export type AgentType =
  | 'PLANNER'
  | 'ARCHITECTURE'
  | 'FRONTEND'
  | 'BACKEND'
  | 'DATABASE'
  | 'REPAIR'
  | 'EXPLAIN'
  | 'QA'
  | 'DEPLOY';

export type AgentStatus = 'idle' | 'running' | 'done' | 'error' | 'skipped';

export interface AgentState {
  agent: AgentType;
  status: AgentStatus;
  progress: number; // 0-100
  message?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AgentPipelineState {
  jobId: string;
  sessionId: string;
  projectId: string;
  agents: AgentState[];
  currentAgent?: AgentType;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface AgentResult {
  agent: AgentType;
  success: boolean;
  output?: Record<string, unknown>;
  tokensUsed?: number;
  model?: string;
  durationMs?: number;
  error?: string;
}
