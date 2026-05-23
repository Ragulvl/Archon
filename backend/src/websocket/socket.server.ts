import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { env, corsOrigins } from '../config/env';
import { wsLogger } from '../utils/logger';
import { setSocketServer } from '../services/ai/orchestrator.service';
import { registerChatHandlers } from './chat.handler';
import { attachRedisAdapter } from './redis.adapter';

let io: SocketServer;

export async function initSocketServer(httpServer: HttpServer): Promise<SocketServer> {
  io = new SocketServer(httpServer, {
    cors: {
      origin: corsOrigins.length === 1 && corsOrigins[0] === '*'
        ? '*'
        : corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    path: '/socket.io',
    pingTimeout: 60_000,
    pingInterval: 25_000,
    connectTimeout: 20_000,
    allowUpgrades: true,
    perMessageDeflate: { threshold: 1024 },
  });

  // Attach Redis adapter for PM2 cluster support
  await attachRedisAdapter(io);

  // Provide io to orchestrator for emitting streaming tokens
  setSocketServer(io);

  io.on('connection', (socket) => {
    wsLogger.debug(`Client connected: ${socket.id} from ${socket.handshake.address}`);

    // ── Room management ─────────────────────────────────────────
    socket.on('project:join', ({ projectId }: { projectId: string }) => {
      socket.join(`project:${projectId}`);
      wsLogger.debug(`Socket ${socket.id} joined project:${projectId}`);
    });

    socket.on('project:leave', ({ projectId }: { projectId: string }) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on('session:join', ({ sessionId }: { sessionId: string }) => {
      socket.join(`session:${sessionId}`);
      wsLogger.debug(`Socket ${socket.id} joined session:${sessionId}`);
    });

    // ── Chat handlers ────────────────────────────────────────────
    registerChatHandlers(io, socket);

    // ── Lifecycle ────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      wsLogger.debug(`Client disconnected: ${socket.id} (${reason})`);
    });

    socket.on('error', (err) => {
      wsLogger.error(`Socket error ${socket.id}:`, err);
    });
  });

  wsLogger.info(`Socket.IO initialized | CORS: ${corsOrigins.join(', ')}`);
  return io;
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.IO not initialized — call initSocketServer() first');
  return io;
}

/** Emit to all clients in a session room */
export function emitToSession(sessionId: string, event: string, data: unknown): void {
  getIO().to(`session:${sessionId}`).emit(event, data);
}

/** Emit to all clients in a project room */
export function emitToProject(projectId: string, event: string, data: unknown): void {
  getIO().to(`project:${projectId}`).emit(event, data);
}
