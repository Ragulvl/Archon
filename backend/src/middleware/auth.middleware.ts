import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env, isGuestMode } from '../config/env';
import { GUEST_USER_ID } from '../config/constants';

export interface AuthPayload {
  userId: string;
  isGuest: boolean;
}

declare global {
  namespace Express {
    interface Request {
      auth: AuthPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Guest mode — attach a guest identity and continue
  if (isGuestMode) {
    req.auth = { userId: GUEST_USER_ID, isGuest: true };
    return next();
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing authorization token' });
    return;
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    req.auth = payload;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

/** Optional auth — attaches guest if no token provided */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  if (isGuestMode || !req.headers.authorization) {
    req.auth = { userId: GUEST_USER_ID, isGuest: true };
    return next();
  }
  authMiddleware(req, _res, next);
}
