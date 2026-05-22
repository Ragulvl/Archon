import winston from 'winston';
import path from 'path';
import fs from 'fs';

// ─── Log Directory ────────────────────────────────────────────────────────────
// Resolve logs/ at repo root regardless of cwd
const LOG_DIR = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const IS_PROD = process.env.NODE_ENV === 'production';

// ─── Formats ─────────────────────────────────────────────────────────────────

const { combine, timestamp, printf, colorize, errors } = winston.format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} ${level}: ${stack ?? message}${metaStr}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  winston.format.json()
);

// ─── Transports ───────────────────────────────────────────────────────────────

const transports: winston.transport[] = [
  new winston.transports.Console({
    silent: process.env.NODE_ENV === 'test',
  }),
];

if (IS_PROD) {
  // Separate error log
  transports.push(
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,  // 10 MB
      maxFiles: 5,
      tailable: true,
    })
  );
  // Combined log (info and above)
  transports.push(
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize: 20 * 1024 * 1024,  // 20 MB
      maxFiles: 10,
      tailable: true,
    })
  );
}

// ─── Logger ───────────────────────────────────────────────────────────────────

export const logger = winston.createLogger({
  // Winston's built-in levels: error, warn, info, http, verbose, debug, silly
  level: IS_PROD ? 'http' : 'debug',
  format: IS_PROD ? prodFormat : devFormat,
  transports,
  exitOnError: false,
});

// ─── Child loggers per domain ─────────────────────────────────────────────────
export const aiLogger      = logger.child({ domain: 'AI' });
export const dbLogger      = logger.child({ domain: 'DB' });
export const wsLogger      = logger.child({ domain: 'WS' });
export const storageLogger = logger.child({ domain: 'Storage' });
