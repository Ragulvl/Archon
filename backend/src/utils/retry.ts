import { logger } from './logger';

interface RetryOptions {
  retries?: number;
  delayMs?: number;
  backoffFactor?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Retry an async function with exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 2,
    delayMs = 500,
    backoffFactor = 2,
    onRetry,
  } = options;

  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < retries) {
        const waitMs = delayMs * Math.pow(backoffFactor, attempt);
        onRetry?.(attempt + 1, lastError);
        logger.debug(`Retry ${attempt + 1}/${retries} after ${waitMs}ms: ${lastError.message}`);
        await sleep(waitMs);
      }
    }
  }

  throw lastError;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRateLimitError(err: Error): boolean {
  return err.message.includes('429') || err.message.toLowerCase().includes('rate_limit');
}

export function isContextLengthError(err: Error): boolean {
  return (
    err.message.includes('413') ||
    err.message.toLowerCase().includes('context length') ||
    err.message.toLowerCase().includes('too large')
  );
}
