import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

// ─── Prisma Error → HTTP Status Map ─────────────────────────────────────────

function handlePrismaError(err: Prisma.PrismaClientKnownRequestError): AppError {
  const appErr = new Error() as AppError;

  switch (err.code) {
    case 'P2002': // Unique constraint violation
      appErr.statusCode = 409;
      appErr.message = `A record with that value already exists (${(err.meta?.target as string[])?.join(', ')}).`;
      break;
    case 'P2025': // Record not found
      appErr.statusCode = 404;
      appErr.message = 'Record not found.';
      break;
    case 'P2003': // Foreign key constraint
      appErr.statusCode = 400;
      appErr.message = 'Invalid reference: related record does not exist.';
      break;
    case 'P2014': // Relation violation
      appErr.statusCode = 400;
      appErr.message = 'Relation constraint violated.';
      break;
    default:
      appErr.statusCode = 500;
      appErr.message = 'Database error.';
      logger.error('Unhandled Prisma error', { code: err.code, meta: err.meta });
  }

  return appErr;
}

// ─── Central Error Middleware ────────────────────────────────────────────────

export function errorMiddleware(
  err: AppError | Prisma.PrismaClientKnownRequestError | Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = handlePrismaError(err);
    res.status(mapped.statusCode ?? 500).json({
      success: false,
      error: mapped.message,
    });
    return;
  }

  // Handle Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      error: 'Invalid data provided to database.',
    });
    return;
  }

  // Handle app errors
  const appErr = err as AppError;
  const statusCode = appErr.statusCode ?? 500;
  const isServerError = statusCode >= 500;

  if (isServerError) {
    logger.error('[Server Error]', {
      message: appErr.message,
      stack: appErr.stack,
      path: req.path,
      method: req.method,
    });
  }

  res.status(statusCode).json({
    success: false,
    error: isServerError ? 'Internal server error' : appErr.message,
    ...(process.env.NODE_ENV !== 'production' && isServerError
      ? { stack: appErr.stack }
      : {}),
  });
}

export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
  });
}

export function createError(message: string, statusCode = 500): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  return err;
}
