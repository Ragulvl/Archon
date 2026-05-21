export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

export interface ChatSession {
  id: string;
  projectId: string;
  title?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
  _count?: { messages: number };
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  metadata?: MessageMetadata | null;
  tokenCount?: number | null;
  createdAt: string;
  artifacts?: import('./artifact').Artifact[];
}

export interface MessageMetadata {
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  agentPipeline?: string[];
  intentType?: IntentType;
  durationMs?: number;
}

export type IntentType =
  | 'new_build'
  | 'modify_ui'
  | 'modify_api'
  | 'modify_db'
  | 'fix_bug'
  | 'add_feature'
  | 'explain'
  | 'regenerate';

export interface CreateSessionInput {
  projectId: string;
  title?: string;
}

export interface SendMessageInput {
  sessionId: string;
  projectId: string;
  content: string;
}

export interface StreamChunk {
  type: 'token' | 'done' | 'error' | 'agent_status';
  token?: string;
  message?: ChatMessage;
  artifacts?: import('./artifact').Artifact[];
  agent?: string;
  status?: string;
  progress?: number;
  error?: string;
}
