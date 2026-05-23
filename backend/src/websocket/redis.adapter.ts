/**
 * Redis Adapter for Socket.IO — Enables multi-process Socket.IO with PM2 cluster.
 *
 * Without this, Socket.IO + PM2 cluster mode = broken WebSocket connections.
 * The Redis adapter ensures events are broadcast across all PM2 workers.
 */

import { Server as SocketServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { env } from '../config/env';
import { wsLogger } from '../utils/logger';

/**
 * Attach Redis pub/sub adapter to Socket.IO server.
 * Only activates if REDIS_URL is configured.
 * Falls back to default in-memory adapter for single-process dev.
 */
export async function attachRedisAdapter(io: SocketServer): Promise<void> {
  if (!env.REDIS_URL) {
    wsLogger.info('Socket.IO: No REDIS_URL configured — using in-memory adapter (single process only)');
    return;
  }

  try {
    const pubClient = createClient({ url: env.REDIS_URL });
    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) => wsLogger.error('Redis pub client error:', err));
    subClient.on('error', (err) => wsLogger.error('Redis sub client error:', err));

    await Promise.all([pubClient.connect(), subClient.connect()]);

    io.adapter(createAdapter(pubClient, subClient));

    wsLogger.info(`Socket.IO: Redis adapter connected (${env.REDIS_URL})`);
  } catch (err) {
    wsLogger.error('Socket.IO: Failed to connect Redis adapter — falling back to in-memory:', err);
    // Don't crash the server — fall back to in-memory (works for single process)
  }
}
