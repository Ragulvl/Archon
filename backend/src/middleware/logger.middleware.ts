import morgan from 'morgan';
import { logger } from '../utils/logger';
import { env } from '../config/env';

// Stream morgan output through winston at http level
const stream = {
  write: (message: string) => logger.http(message.trim()),
};

// Use 'combined' (Apache format) in prod for structured log parsing
// Use 'dev' (colorized) in development
export const httpLogger = morgan(
  env.NODE_ENV === 'production' ? 'combined' : 'dev',
  { stream }
);
