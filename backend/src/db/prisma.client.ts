import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { dbLogger } from '../utils/logger';

declare global {
  // Prevent connection pool exhaustion during hot-reload in development
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: env.NODE_ENV === 'development'
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'stdout', level: 'warn' },
          { emit: 'stdout', level: 'error' },
        ]
      : [
          { emit: 'stdout', level: 'warn' },
          { emit: 'stdout', level: 'error' },
        ],
    datasources: {
      db: { url: env.DATABASE_URL },
    },
  });

  if (env.NODE_ENV === 'development') {
    // Log slow queries in dev
    (client.$on as Function)('query', (e: { query: string; duration: number }) => {
      if (e.duration > 500) {
        dbLogger.warn(`Slow query (${e.duration}ms): ${e.query}`);
      }
    });
  }

  return client;
}

// In development reuse the same instance across hot-reloads
const prisma: PrismaClient = globalThis.__prisma ?? createPrismaClient();

if (env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

export default prisma;

/** Test the database connection — used by /health/db */
export async function pingDatabase(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    dbLogger.error('DB ping failed:', err);
    return { ok: false, latencyMs: Date.now() - start };
  }
}

/** Call this on server shutdown */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  dbLogger.info('Prisma disconnected.');
}
