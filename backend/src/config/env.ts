import { z } from 'zod';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
  // Server
  PORT:         z.string().default('5000'),
  NODE_ENV:     z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // AI Providers
  OPENROUTER_API_KEY:  z.string().optional(),
  OPENROUTER_APP_NAME: z.string().default('Archon'),
  OPENROUTER_SITE_URL: z.string().default('https://archon.dinez.in'),
  GROQ_API_KEYS:       z.string().optional(),

  // AWS S3
  AWS_REGION:            z.string().default('ap-south-1'),
  AWS_S3_BUCKET:         z.string().default('archon-artifacts'),
  AWS_ACCESS_KEY_ID:     z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // Auth
  JWT_SECRET:     z.string().default('dev-secret-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Feature Flags
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  GUEST_MODE:     z.string().default('true'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

type EnvConfig = z.infer<typeof envSchema>;

function parseEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const msg = Object.entries(errors)
      .map(([k, v]) => `  ${k}: ${v?.join(', ')}`)
      .join('\n');
    throw new Error(`\n❌ Invalid environment configuration:\n${msg}\n`);
  }
  return result.data;
}

export const env = parseEnv();

export const isDev  = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
export const isGuestMode = env.GUEST_MODE === 'true';
