/**
 * Sandbox Interface — Abstract execution environment for project code.
 *
 * This is the abstraction layer that allows swapping between:
 * - Docker containers (self-hosted)
 * - E2B sandboxes (API-based)
 * - Firecracker microVMs (advanced)
 * - WebContainers (browser-side, frontend only)
 *
 * The interface defines what ALL sandbox implementations must support.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SandboxConfig {
  projectId: string;
  userId: string;
  image?: string;       // Docker image or E2B template
  timeout?: number;     // Max execution time (ms)
  memoryMB?: number;    // Memory limit
  cpuCount?: number;    // CPU allocation
  ports?: number[];     // Ports to expose
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

export interface SandboxStatus {
  id: string;
  projectId: string;
  state: 'creating' | 'running' | 'stopped' | 'error' | 'destroyed';
  previewUrl?: string;
  ports: Record<number, string>; // port → public URL
  createdAt: string;
  memoryUsageMB?: number;
  cpuPercent?: number;
}

export interface FileUpload {
  path: string;
  content: string;
}

// ─── Interface ───────────────────────────────────────────────────────────────

export interface ISandbox {
  /** Create and start a new sandbox */
  create(config: SandboxConfig): Promise<SandboxStatus>;

  /** Execute a command in the sandbox */
  exec(sandboxId: string, command: string, cwd?: string): Promise<CommandResult>;

  /** Upload files to the sandbox */
  uploadFiles(sandboxId: string, files: FileUpload[]): Promise<void>;

  /** Download a file from the sandbox */
  downloadFile(sandboxId: string, path: string): Promise<string>;

  /** Get current sandbox status */
  getStatus(sandboxId: string): Promise<SandboxStatus>;

  /** Stop the sandbox */
  stop(sandboxId: string): Promise<void>;

  /** Destroy the sandbox and clean up */
  destroy(sandboxId: string): Promise<void>;

  /** Get the preview URL for a running app */
  getPreviewUrl(sandboxId: string, port: number): Promise<string>;

  /** Stream command output (for terminal) */
  execStream(
    sandboxId: string,
    command: string,
    onStdout: (data: string) => void,
    onStderr: (data: string) => void,
    cwd?: string
  ): Promise<CommandResult>;
}

// ─── Convenience Functions ───────────────────────────────────────────────────

/**
 * Run npm install in the sandbox.
 */
export async function npmInstall(sandbox: ISandbox, sandboxId: string, packages?: string[]): Promise<CommandResult> {
  const cmd = packages && packages.length > 0
    ? `npm install ${packages.join(' ')}`
    : 'npm install';
  return sandbox.exec(sandboxId, cmd);
}

/**
 * Run npm build.
 */
export async function npmBuild(sandbox: ISandbox, sandboxId: string): Promise<CommandResult> {
  return sandbox.exec(sandboxId, 'npm run build');
}

/**
 * Run npm dev server.
 */
export async function npmRunDev(sandbox: ISandbox, sandboxId: string): Promise<CommandResult> {
  return sandbox.exec(sandboxId, 'npm run dev', undefined);
}

/**
 * Run tests.
 */
export async function npmRunTests(sandbox: ISandbox, sandboxId: string): Promise<CommandResult> {
  return sandbox.exec(sandboxId, 'npm test');
}
