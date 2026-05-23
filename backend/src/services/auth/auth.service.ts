/**
 * Authentication Service — Real signup, login, and JWT management.
 *
 * Supports:
 * - Email/password registration
 * - Login with JWT token generation
 * - Token refresh
 * - Password hashing with bcrypt
 * - Guest mode fallback
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../db/prisma.client';
import { env } from '../../config/env';
import { createError } from '../../middleware/error.middleware';
import { aiLogger } from '../../utils/logger';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  tokens: AuthTokens;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_EXPIRY = '30d';

// ─── Register ────────────────────────────────────────────────────────────────

export async function register(input: RegisterInput): Promise<AuthResult> {
  const { email, password, name } = input;

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createError('Invalid email address', 400);
  }

  // Validate password strength
  if (password.length < 8) {
    throw createError('Password must be at least 8 characters', 400);
  }

  // Check if user exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw createError('Email already registered', 409);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Generate refresh token
  const refreshToken = generateRefreshToken();

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      name: name ?? email.split('@')[0],
      passwordHash,
      refreshToken,
    },
  });

  // Generate tokens
  const tokens = generateTokens(user.id);

  aiLogger.info(`User registered: ${email}`);

  return {
    user: { id: user.id, email: user.email!, name: user.name },
    tokens: { ...tokens, refreshToken },
  };
}

// ─── Login ───────────────────────────────────────────────────────────────────

export async function login(input: LoginInput): Promise<AuthResult> {
  const { email, password } = input;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    throw createError('Invalid email or password', 401);
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw createError('Invalid email or password', 401);
  }

  // Generate new refresh token
  const refreshToken = generateRefreshToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  const tokens = generateTokens(user.id);

  aiLogger.info(`User logged in: ${email}`);

  return {
    user: { id: user.id, email: user.email!, name: user.name },
    tokens: { ...tokens, refreshToken },
  };
}

// ─── Refresh Token ───────────────────────────────────────────────────────────

export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
  const user = await prisma.user.findFirst({ where: { refreshToken } });
  if (!user) {
    throw createError('Invalid refresh token', 401);
  }

  // Generate new tokens
  const newRefreshToken = generateRefreshToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: newRefreshToken },
  });

  const tokens = generateTokens(user.id);

  return { ...tokens, refreshToken: newRefreshToken };
}

// ─── Logout ──────────────────────────────────────────────────────────────────

export async function logout(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
}

// ─── Get User ────────────────────────────────────────────────────────────────

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
  });
  if (!user) throw createError('User not found', 404);
  return user;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateTokens(userId: string): { accessToken: string; expiresIn: string } {
  const accessToken = jwt.sign(
    { userId, isGuest: false },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );

  return { accessToken, expiresIn: env.JWT_EXPIRES_IN };
}

function generateRefreshToken(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(48).toString('hex');
}
