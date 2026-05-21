import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import { APP_NAME, APP_VERSION } from './config/constants';
import { logger } from './utils/logger';
import { httpLogger } from './middleware/logger.middleware';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import { initSocketServer } from './websocket/socket.server';
import { disconnectPrisma } from './db/prisma.client';
import apiRouter from './api/v1';

// ─── Express App ─────────────────────────────────────────────────

const app = express();

// ─── Security & Performance Middleware ───────────────────────────

app.use(helmet({
  contentSecurityPolicy: false, // handled by frontend
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: env.CORS_ORIGIN.split(',').map(o => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(compression());
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true, limit: '4mb' }));
app.use(httpLogger);

// ─── Rate Limiting ────────────────────────────────────────────────

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,    // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please slow down.' },
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, error: 'Chat rate limit exceeded. Please wait a moment.' },
});

// ─── Health Check ─────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  });
});

// ─── API Routes ───────────────────────────────────────────────────

app.use('/api/v1', apiLimiter, authMiddleware, apiRouter);
app.use('/api/v1/chat/message', chatLimiter); // extra limit on AI calls

// ─── Legacy Route (preserve backward compat) ──────────────────────

// The old /generate endpoint still works so existing integrations don't break
app.post('/generate', authMiddleware, async (req, res, next) => {
  try {
    const { generateLegacy } = await import('./services/ai/orchestrator.service');
    const result = await generateLegacy(req.body.prompt);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// ─── Error Handling ───────────────────────────────────────────────

app.use(notFoundMiddleware);
app.use(errorMiddleware);

// ─── HTTP Server + Socket.IO ─────────────────────────────────────

const server = http.createServer(app);
initSocketServer(server);

// ─── Start ────────────────────────────────────────────────────────

server.listen(Number(env.PORT), () => {
  logger.info(`\n🏗️  ${APP_NAME} v${APP_VERSION} running`);
  logger.info(`   Mode:    ${env.NODE_ENV}`);
  logger.info(`   Port:    ${env.PORT}`);
  logger.info(`   Storage: ${env.STORAGE_DRIVER}`);
  logger.info(`   Guest:   ${env.GUEST_MODE === 'true' ? 'enabled' : 'disabled'}\n`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────

async function shutdown(signal: string) {
  logger.info(`\n${signal} received. Shutting down gracefully…`);
  server.close(async () => {
    await disconnectPrisma();
    logger.info('Server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Force-shutdown after timeout.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

export default app;
