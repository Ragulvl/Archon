import morgan from 'morgan';
import { logger } from '../utils/logger';
import { env } from '../config/env';

// Stream morgan output through winston
const stream = {
  write: (message: string) => logger.http(message.trim()),
};

export const httpLogger = morgan(
  env.NODE_ENV === 'production' ? 'combined' : 'dev',
  { stream }
);
