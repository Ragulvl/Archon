import { z } from 'zod';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// ─── .env Discovery ──────────────────────────────────────────────────────────
// Search multiple candidate paths so the server works both in dev (tsx watch)
// and in production (node dist/backend/src/server.js from inside /backend).
const envCandidates = [
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend/.env'),
  path.join(__dirname, '../../.env'),       // dev: backend/src/config → backend/
  path.join(__dirname, '../../../.env'),    // dist: backend/dist/backend/src/config → backend/
  path.join(__dirname, '../../../../.env'), // dist alt depth
];

for (const p of envCandidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const envSchema = z.object({
  // Server
  PORT:     z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database (PostgreSQL)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // AI Providers
  OPENROUTER_API_KEY:  z.string().optional(),
  OPENROUTER_APP_NAME: z.string().default('Archon'),
  OPENROUTER_SITE_URL: z.string().default('https://archon.dinez.in'),
  GROQ_API_KEYS:       z.string().optional(),


  // Auth (JWT)
  JWT_SECRET:     z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // CORS — comma-separated list of allowed origins
  CORS_ORIGIN:  z.string().default('http://localhost:5173'),
  FRONTEND_URL: z.string().optional(), // explicit public frontend URL for emails/redirects

  // Redis (optional — for future session store / queues)
  REDIS_URL: z.string().optional(),

  // Feature flags
  STORAGE_DRIVER: z.enum(['local']).default('local'),
  GUEST_MODE:     z.string().default('true'),
}).superRefine((data, ctx) => {
  // Enforce strong JWT_SECRET in production
  if (data.NODE_ENV === 'production' && data.JWT_SECRET.length < 32) {
    ctx.addIssue({
      code: z.ZodIssueCode.too_small,
      minimum: 32,
      type: 'string',
      inclusive: true,
      message: 'JWT_SECRET must be at least 32 characters in production. Run: openssl rand -base64 32',
      path: ['JWT_SECRET'],
    });
  }
});

type EnvConfig = z.infer<typeof envSchema>;

function parseEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const msg = Object.entries(errors)
      .map(([k, v]) => `  ${k}: ${v?.join(', ')}`)
      .join('\n');
    // eslint-disable-next-line no-console
    console.error(`\n❌ Invalid environment configuration:\n${msg}\n`);
    process.exit(1);
  }
  return result.data;
}

export const env = parseEnv();

export const isDev       = env.NODE_ENV === 'development';
export const isProd      = env.NODE_ENV === 'production';
export const isGuestMode = env.GUEST_MODE === 'true';

// Derived: list of allowed CORS origins
export const corsOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean);
