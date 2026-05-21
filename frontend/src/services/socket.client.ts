import { io, Socket } from 'socket.io-client';
import { WS_EVENTS, WS_CLIENT_EVENTS } from '@archon/shared';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
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
