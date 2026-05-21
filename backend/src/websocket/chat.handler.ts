import { Server as SocketServer, Socket } from 'socket.io';
import { orchestrate } from '../services/ai/orchestrator.service';
import { GUEST_USER_ID } from '../config/constants';
import { wsLogger } from '../utils/logger';
import { autoTitleSession } from '../services/chat/chat.service';
import prisma from '../db/prisma.client';

export function registerChatHandlers(io: SocketServer, socket: Socket): void {

  // Client sends a chat message over WebSocket (alternative to REST)
  socket.on('chat:send', async (payload: {
    sessionId: string;
    projectId: string;
    content: string;
  }) => {
    const { sessionId, projectId, content } = payload;

    if (!sessionId || !projectId || !content?.trim()) {
      socket.emit('chat:error', { error: 'Missing sessionId, projectId, or content' });
      return;
    }

    try {
      // Join the session room to receive streaming tokens
      socket.join(`session:${sessionId}`);

      // Check message count for auto-title
      const msgCount = await prisma.chatMessage.count({ where: { sessionId } });
      if (msgCount === 0) autoTitleSession(sessionId, content);

      await orchestrate({
        sessionId,
        projectId,
        userMessage: content.trim(),
        userId:      GUEST_USER_ID,
      });
    } catch (err) {
      wsLogger.error('chat:send error:', err);
      socket.emit('chat:error', { error: (err as Error).message });
    }
  });

  // Cancel an in-flight generation (best-effort)
  socket.on('agent:cancel', ({ jobId }: { jobId: string }) => {
    wsLogger.info(`Cancel requested for job ${jobId}`);
    // In a full impl, signal the AbortController associated with the jobId
    socket.emit('agent:cancelled', { jobId });
  });
}
