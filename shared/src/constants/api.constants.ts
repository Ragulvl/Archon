export const API_BASE = '/api/v1';

export const API_ROUTES = {
  // Projects
  PROJECTS:              `${API_BASE}/projects`,
  PROJECT:               (id: string) => `${API_BASE}/projects/${id}`,

  // Chat
  CHAT_SESSION:          `${API_BASE}/chat/session`,
  CHAT_SESSION_BY_ID:   (id: string) => `${API_BASE}/chat/session/${id}`,
  CHAT_HISTORY:          (sessionId: string) => `${API_BASE}/chat/history/${sessionId}`,
  CHAT_MESSAGE:          `${API_BASE}/chat/message`,

  // Artifacts
  ARTIFACTS:             (projectId: string) => `${API_BASE}/artifacts/${projectId}`,
  ARTIFACT_FILES:        (id: string) => `${API_BASE}/artifacts/${id}/files`,
  ARTIFACTS_REGENERATE:  `${API_BASE}/artifacts/regenerate`,

  // Export
  EXPORT_ZIP:            (projectId: string) => `${API_BASE}/export/zip/${projectId}`,

  // Storage
  STORAGE_UPLOAD:        `${API_BASE}/storage/upload`,

  // Health
  HEALTH:                '/health',
  STATS:                 `${API_BASE}/stats`,
} as const;

export const DEFAULT_PROJECT_NAME = 'Untitled Project';

export const SUPPORTED_LANGUAGES: Record<string, string> = {
  'jsx':  'javascript',
  'tsx':  'typescript',
  'js':   'javascript',
  'ts':   'typescript',
  'css':  'css',
  'html': 'html',
  'json': 'json',
  'md':   'markdown',
  'sql':  'sql',
  'sh':   'bash',
  'yaml': 'yaml',
  'yml':  'yaml',
};

/** Server → Client WebSocket events */
export const WS_EVENTS = {
  CHAT_TOKEN:      'chat:token',
  CHAT_DONE:       'chat:done',
  CHAT_ERROR:      'chat:error',
  AGENT_STATUS:    'agent:status',
  AGENT_PIPELINE:  'agent:pipeline',
  AGENT_CANCELLED: 'agent:cancelled',
  ARTIFACT_UPDATE: 'artifact:update',
  PROJECT_UPDATE:  'project:update',
} as const;

/** Client → Server WebSocket events */
export const WS_CLIENT_EVENTS = {
  JOIN_PROJECT:  'project:join',
  LEAVE_PROJECT: 'project:leave',
  CHAT_SEND:     'chat:send',
  AGENT_CANCEL:  'agent:cancel',
} as const;

