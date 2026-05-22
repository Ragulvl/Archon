import { io, Socket } from 'socket.io-client';
import { WS_EVENTS, WS_CLIENT_EVENTS } from '@archon/shared';

// ─── Socket URL Resolution ────────────────────────────────────────────────────
// Priority:
//   1. VITE_SOCKET_URL env var (explicit cross-origin URL, e.g. https://api.yourdomain.com)
//   2. Relative '' (same-origin) — works behind Nginx where /socket.io is proxied
const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL as string | undefined) ?? '';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      withCredentials: true,
    });

    // Debug lifecycle events
    socket.on('connect', () => {
      console.debug('[Socket] Connected:', socket?.id);
    });
    socket.on('disconnect', (reason) => {
      console.debug('[Socket] Disconnected:', reason);
    });
    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });
  }
  return socket;
}

/** Disconnect and reset the socket instance (e.g. on logout) */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinProject(projectId: string): void {
  getSocket().emit(WS_CLIENT_EVENTS.JOIN_PROJECT, { projectId });
}

export function leaveProject(projectId: string): void {
  getSocket().emit(WS_CLIENT_EVENTS.LEAVE_PROJECT, { projectId });
}

export function joinSession(sessionId: string): void {
  getSocket().emit('session:join', { sessionId });
}

export function sendChatMessage(sessionId: string, projectId: string, content: string): void {
  getSocket().emit(WS_CLIENT_EVENTS.CHAT_SEND, { sessionId, projectId, content });
}

export function cancelGeneration(jobId: string): void {
  getSocket().emit(WS_CLIENT_EVENTS.AGENT_CANCEL, { jobId });
}

export { WS_EVENTS };
