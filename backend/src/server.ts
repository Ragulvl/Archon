import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { env, corsOrigins } from './config/env';
import { APP_NAME, APP_VERSION } from './config/constants';
import { logger } from './utils/logger';
import { httpLogger } from './middleware/logger.middleware';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import { initSocketServer } from './websocket/socket.server';
import { disconnectPrisma, pingDatabase } from './db/prisma.client';
import apiRouter from './api/v1';

// ─── Express App ─────────────────────────────────────────────────────────────

const app = express();

// Trust the first proxy (Nginx) — required for rate limiter, X-Forwarded-For
app.set('trust proxy', 1);

// ─── Security & Performance Middleware ───────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: false,     // Handled by frontend meta tags
  crossOriginEmbedderPolicy: false, // Required for some iframe embeds
  hsts: env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true }
    : false,
}));

app.use(cors({
  origin: corsOrigins.length === 1 && corsOrigins[0] === '*'
    ? '*'
    : (origin, cb) => {
        // Allow requests with no origin (mobile apps, curl, same-origin)
        if (!origin || corsOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: origin ${origin} not allowed`));
      },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(compression());
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true, limit: '4mb' }));
app.use(httpLogger);

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please slow down.' },
  skip: (req) => req.path === '/health' || req.path.startsWith('/health/'),
});

// Stricter limit for AI chat (expensive)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Chat rate limit exceeded. Please wait a moment.' },
});

// ─── Health Endpoints ─────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
    uptime: Math.floor(process.uptime()),
  });
});

app.get('/health/db', async (_req, res) => {
  const result = await pingDatabase();
  res.status(result.ok ? 200 : 503).json({
    status: result.ok ? 'ok' : 'error',
    latencyMs: result.latencyMs,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/storage', async (_req, res) => {
  if (env.STORAGE_DRIVER === 's3') {
    try {
      // Lightweight check: list at most 1 object from the bucket
      const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
      const s3 = new S3Client({ region: env.AWS_REGION });
      await s3.send(new ListObjectsV2Command({ Bucket: env.AWS_S3_BUCKET, MaxKeys: 1 }));
      res.json({ status: 'ok', driver: 's3', bucket: env.AWS_S3_BUCKET });
    } catch (err) {
      res.status(503).json({
        status: 'error',
        driver: 's3',
        error: (err as Error).message,
      });
    }
  } else {
    // Local storage — just report disk is accessible
    res.json({ status: 'ok', driver: 'local' });
  }
});

// ─── API Routes ───────────────────────────────────────────────────────────────

// Apply chat rate limiter to AI message routes
app.use('/api/v1/chat/message', chatLimiter);

app.use('/api/v1', apiLimiter, authMiddleware, apiRouter);

// ─── Legacy Route (backward-compat) ───────────────────────────────────────────

app.post('/generate', authMiddleware, async (req, res, next) => {
  try {
    const { generateLegacy } = await import('./services/ai/orchestrator.service');
    const result = await generateLegacy(req.body.prompt as string);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// ─── Error Handling ───────────────────────────────────────────────────────────

app.use(notFoundMiddleware);
app.use(errorMiddleware);

// ─── HTTP Server + Socket.IO ──────────────────────────────────────────────────

const server = http.createServer(app);

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = Number(env.PORT) || 5000;

(async () => {
  // Init Socket.IO with Redis adapter (async for Redis connection)
  await initSocketServer(server);

  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`\n🏗️  ${APP_NAME} v${APP_VERSION} running`);
    logger.info(`   Mode:    ${env.NODE_ENV}`);
    logger.info(`   Port:    ${PORT}`);
    logger.info(`   Storage: ${env.STORAGE_DRIVER}`);
    logger.info(`   CORS:    ${corsOrigins.join(', ')}`);
    logger.info(`   Guest:   ${env.GUEST_MODE === 'true' ? 'enabled' : 'disabled'}\n`);
  });
})();

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  logger.info(`\n${signal} received. Shutting down gracefully…`);

  server.close(async () => {
    logger.info('HTTP server closed.');
    await disconnectPrisma();
    logger.info('Shutdown complete.');
    process.exit(0);
  });

  // Force-kill after 15 s if shutdown hangs
  setTimeout(() => {
    logger.error('Force-shutdown after timeout.');
    process.exit(1);
  }, 15_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});

export default app;
