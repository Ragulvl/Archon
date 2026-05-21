export type ArtifactType =
  | 'ARCHITECTURE'
  | 'FRONTEND'
  | 'BACKEND'
  | 'DATABASE'
  | 'API_ROUTES'
  | 'DEPLOYMENT'
  | 'FULL_BUILD';

export interface Artifact {
  id: string;
  projectId: string;
  messageId?: string | null;
  type: ArtifactType;
  name: string;
  content: string; // JSON-encoded payload
  version: number;
  storagePath?: string | null;
  createdAt: string;
  updatedAt: string;
  files?: GeneratedFile[];
}

export interface GeneratedFile {
  id: string;
  artifactId: string;
  path: string;      // e.g. "src/App.jsx"
  content: string;
  language?: string | null;
  sizeBytes?: number | null;
  createdAt: string;
}

/** The structured payload stored in Artifact.content (JSON) */
export interface ArtifactPayload {
  architecture?: {
    features?: { user?: string[]; admin?: string[] };
    systemArchitecture?: Record<string, string>;
    databaseSchema?: Record<string, Record<string, string>>;
    apiEndpoints?: { method: string; path: string; description: string }[];
    techStack?: Record<string, string>;
    scalingStrategy?: Record<string, string>;
  };
  frontend?: Record<string, string>; // filename → code
  backend?: Record<string, string>;
  database?: { schema: string; migrations?: string[] };
}

export interface RegenerateInput {
  projectId: string;
  sessionId: string;
  artifactType: ArtifactType;
  instruction?: string;
}
