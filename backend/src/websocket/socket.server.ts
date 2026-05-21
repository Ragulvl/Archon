import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { env } from '../config/env';
import { wsLogger } from '../utils/logger';
import { setSocketServer } from '../services/ai/orchestrator.service';
import { registerChatHandlers } from './chat.handler';

let io: SocketServer;

export function initSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin:  env.CORS_ORIGIN.split(',').map(o => o.trim()),
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Provide io to orchestrator for emitting
  setSocketServer(io);

  io.on('connection', (socket) => {
    wsLogger.debug(`Client connected: ${socket.id}`);

    // Room management — join a session room for targeted events
    socket.on('project:join', ({ projectId }: { projectId: string }) => {
      socket.join(`project:${projectId}`);
      wsLogger.debug(`Socket ${socket.id} joined project:${projectId}`);
    });

    socket.on('project:leave', ({ projectId }: { projectId: string }) => {
      socket.leave(`project:${projectId}`);
    });

    // Join session room for chat:token events
    socket.on('session:join', ({ sessionId }: { sessionId: string }) => {
      socket.join(`session:${sessionId}`);
      wsLogger.debug(`Socket ${socket.id} joined session:${sessionId}`);
    });

    registerChatHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      wsLogger.debug(`Client disconnected: ${socket.id} (${reason})`);
    });

    socket.on('error', (err) => {
      wsLogger.error(`Socket error ${socket.id}:`, err);
    });
  });

  wsLogger.info('Socket.IO server initialized');
  return io;
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}
