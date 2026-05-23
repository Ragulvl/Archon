/**
 * Auth API Router — Registration, login, token refresh, logout.
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as authService from '../../services/auth/auth.service';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

// POST /api/v1/auth/register — Create new account
router.post('/register', wrap(async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, error: 'email and password are required' });
    return;
  }
  const result = await authService.register({ email, password, name });
  res.status(201).json({ success: true, data: result });
}));

// POST /api/v1/auth/login — Authenticate
router.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, error: 'email and password are required' });
    return;
  }
  const result = await authService.login({ email, password });
  res.json({ success: true, data: result });
}));

// POST /api/v1/auth/refresh — Refresh access token
router.post('/refresh', wrap(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ success: false, error: 'refreshToken is required' });
    return;
  }
  const tokens = await authService.refreshAccessToken(refreshToken);
  res.json({ success: true, data: tokens });
}));

// POST /api/v1/auth/logout — Invalidate refresh token
router.post('/logout', authMiddleware, wrap(async (req, res) => {
  await authService.logout(req.auth.userId);
  res.json({ success: true, data: { loggedOut: true } });
}));

// GET /api/v1/auth/me — Get current user
router.get('/me', authMiddleware, wrap(async (req, res) => {
  if (req.auth.isGuest) {
    res.json({ success: true, data: { id: req.auth.userId, isGuest: true } });
    return;
  }
  const user = await authService.getUserById(req.auth.userId);
  res.json({ success: true, data: user });
}));

export default router;
