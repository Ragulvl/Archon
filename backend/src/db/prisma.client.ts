import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

declare global {
  // Allow global prisma instance in development to prevent connection pool exhaustion on hot-reload
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: env.NODE_ENV === 'development'
      ? ['warn', 'error']
      : ['error'],
    datasources: {
      db: { url: env.DATABASE_URL },
    },
  });
}

// In development, reuse the same instance across hot-reloads
const prisma: PrismaClient =
  globalThis.__prisma ?? createPrismaClient();

if (env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

export default prisma;

/** Call this on server shutdown */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
