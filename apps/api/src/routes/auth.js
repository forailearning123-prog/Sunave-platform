import argon2 from 'argon2';
import {
  PERMISSION,
  changePasswordSchema,
  fail,
  forgotPasswordSchema,
  loginSchema,
  ok,
  organizationOnboardingSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema
} from '@sunave/core';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { v4 as uuid } from 'uuid';
import { config } from '../config.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  signRefreshToken,
  verifyRefreshToken
} from '../security/tokens.js';

function toUserOutput(user, membership) {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    avatarUrl: user.avatar_url,
    timezone: user.timezone,
    language: user.language,
    organization: membership
      ? {
          id: membership.organization_id,
          name: membership.organization_name,
          industry: membership.industry,
          country: membership.country,
          role: membership.role
        }
      : null
  };
}

function setAuthCookies(res, { accessToken, refreshToken, csrfToken, rememberSession }) {
  const common = {
    secure: config.isProduction,
    sameSite: 'lax'
  };

  res.cookie('access_token', accessToken, {
    ...common,
    httpOnly: true,
    maxAge: config.accessTokenTtlSeconds * 1000
  });

  res.cookie('refresh_token', refreshToken, {
    ...common,
    httpOnly: true,
    maxAge: (rememberSession ? config.refreshTokenRememberTtlSeconds : config.refreshTokenTtlSeconds) * 1000,
    path: '/api/auth'
  });

  res.cookie('csrf_token', csrfToken, {
    ...common,
    httpOnly: false,
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}

function clearAuthCookies(res) {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token', { path: '/api/auth' });
  res.clearCookie('csrf_token');
}

function parseSchema(schema, payload) {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { error: fail('VALIDATION_ERROR', 'Validation failed.', parsed.error.flatten()) };
  }
  return { data: parsed.data };
}

export function buildAuthRouter(repo) {
  const router = Router();

  const loginRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
  const forgotRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });
  const authReadRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
  const authWriteRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });

  router.get('/csrf-token', (req, res) => {
    const csrfToken = req.csrfToken();
    res.cookie('csrf_token', csrfToken, {
      secure: config.isProduction,
      sameSite: 'lax',
      httpOnly: false,
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    return res.status(200).json(ok({ csrfToken }));
  });

  router.post('/register', authWriteRateLimit, async (req, res) => {
    const parsed = parseSchema(registerSchema, req.body);
    if (parsed.error) {
      return res.status(400).json(parsed.error);
    }

    const existing = await repo.findUserByEmail(parsed.data.email);
    if (existing) {
      return res.status(409).json(fail('EMAIL_ALREADY_EXISTS', 'Email is already registered.'));
    }

    const passwordHash = await argon2.hash(parsed.data.password);
    const user = await repo.createUser({ ...parsed.data, passwordHash });
    const refreshTokenValue = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshTokenValue);
    const expiresAt = new Date(Date.now() + (parsed.data.rememberSession ? config.refreshTokenRememberTtlSeconds : config.refreshTokenTtlSeconds) * 1000);
    const session = await repo.createSession({
      userId: user.id,
      refreshTokenHash,
      userAgent: req.get('user-agent') || '',
      ipAddress: req.ip || '',
      rememberSession: parsed.data.rememberSession,
      expiresAt
    });

    const membership = await repo.findMembership(user.id);
    const accessToken = generateAccessToken({ sub: user.id, sessionId: session.id, role: membership?.role || 'User' });
    const refreshToken = signRefreshToken(refreshTokenValue, session.id);
    const csrfToken = req.csrfToken();

    setAuthCookies(res, {
      accessToken,
      refreshToken,
      csrfToken,
      rememberSession: parsed.data.rememberSession
    });

    return res.status(201).json(ok({
      user: toUserOutput(user, membership),
      needsOrganization: !membership,
      csrfToken
    }));
  });

  router.post('/login', loginRateLimit, async (req, res) => {
    const parsed = parseSchema(loginSchema, req.body);
    if (parsed.error) {
      return res.status(400).json(parsed.error);
    }

    const user = await repo.findUserByEmail(parsed.data.email);
    if (!user || !(await argon2.verify(user.password_hash, parsed.data.password))) {
      return res.status(401).json(fail('INVALID_CREDENTIALS', 'Invalid email or password.'));
    }

    const refreshTokenValue = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshTokenValue);
    const expiresAt = new Date(Date.now() + (parsed.data.rememberSession ? config.refreshTokenRememberTtlSeconds : config.refreshTokenTtlSeconds) * 1000);
    const session = await repo.createSession({
      userId: user.id,
      refreshTokenHash,
      userAgent: req.get('user-agent') || '',
      ipAddress: req.ip || '',
      rememberSession: parsed.data.rememberSession,
      expiresAt
    });

    const membership = await repo.findMembership(user.id);
    const accessToken = generateAccessToken({
      sub: user.id,
      sessionId: session.id,
      role: membership?.role || 'User'
    });
    const refreshToken = signRefreshToken(refreshTokenValue, session.id);
    const csrfToken = req.csrfToken();

    setAuthCookies(res, {
      accessToken,
      refreshToken,
      csrfToken,
      rememberSession: parsed.data.rememberSession
    });

    return res.status(200).json(ok({
      user: toUserOutput(user, membership),
      needsOrganization: !membership,
      csrfToken
    }));
  });

  router.post('/refresh', authWriteRateLimit, async (req, res) => {
    const token = req.cookies.refresh_token;
    if (!token) {
      return res.status(401).json(fail('UNAUTHORIZED', 'Refresh token missing.'));
    }

    try {
      const decoded = verifyRefreshToken(token);
      const session = await repo.findSessionByHash(decoded.sessionId, hashToken(decoded.token));
      if (!session || session.revoked_at || new Date(session.expires_at) < new Date()) {
        return res.status(401).json(fail('UNAUTHORIZED', 'Session expired.'));
      }

      const user = await repo.findUserById(session.user_id);
      const membership = await repo.findMembership(user.id);
      const accessToken = generateAccessToken({
        sub: user.id,
        sessionId: session.id,
        role: membership?.role || 'User'
      });

      await repo.touchSession(session.id);
      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: 'lax',
        maxAge: config.accessTokenTtlSeconds * 1000
      });

      return res.status(200).json(ok({ user: toUserOutput(user, membership) }));
    } catch {
      return res.status(401).json(fail('UNAUTHORIZED', 'Invalid refresh token.'));
    }
  });

  router.post('/forgot-password', forgotRateLimit, async (req, res) => {
    const parsed = parseSchema(forgotPasswordSchema, req.body);
    if (parsed.error) {
      return res.status(400).json(parsed.error);
    }

    const user = await repo.findUserByEmail(parsed.data.email);
    let debugToken = null;

    if (user) {
      const token = `${uuid()}${uuid()}`;
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + config.passwordResetTtlMinutes * 60 * 1000);
      await repo.createPasswordResetToken(user.id, tokenHash, expiresAt);
      if (config.env !== 'production') {
        debugToken = token;
      }
    }

    return res.status(200).json(ok({
      message: 'If the account exists, a password reset link has been issued.',
      ...(debugToken ? { resetToken: debugToken } : {})
    }));
  });

  router.post('/reset-password', authWriteRateLimit, async (req, res) => {
    const parsed = parseSchema(resetPasswordSchema, req.body);
    if (parsed.error) {
      return res.status(400).json(parsed.error);
    }

    const tokenHash = hashToken(parsed.data.token);
    const tokenRecord = await repo.usePasswordResetToken(tokenHash);
    if (!tokenRecord) {
      return res.status(400).json(fail('INVALID_RESET_TOKEN', 'Reset token is invalid or expired.'));
    }

    const passwordHash = await argon2.hash(parsed.data.newPassword);
    await repo.updatePassword(tokenRecord.user_id, passwordHash);
    await repo.revokeAllSessions(tokenRecord.user_id);

    return res.status(200).json(ok({ message: 'Password has been reset.' }));
  });

  router.post('/change-password', authWriteRateLimit, requireAuth, async (req, res) => {
    const parsed = parseSchema(changePasswordSchema, req.body);
    if (parsed.error) {
      return res.status(400).json(parsed.error);
    }

    const user = await repo.findUserById(req.auth.sub);
    const fullUser = await repo.findUserByEmail(user.email);

    if (!(await argon2.verify(fullUser.password_hash, parsed.data.currentPassword))) {
      return res.status(401).json(fail('INVALID_CREDENTIALS', 'Current password is incorrect.'));
    }

    const passwordHash = await argon2.hash(parsed.data.newPassword);
    await repo.updatePassword(req.auth.sub, passwordHash);

    return res.status(200).json(ok({ message: 'Password updated successfully.' }));
  });

  router.get('/me', authReadRateLimit, requireAuth, requirePermission(PERMISSION.PROFILE_READ), async (req, res) => {
    const user = await repo.findUserById(req.auth.sub);
    const membership = await repo.findMembership(req.auth.sub);
    if (!user) {
      return res.status(404).json(fail('NOT_FOUND', 'User not found.'));
    }

    return res.status(200).json(ok({ user: toUserOutput(user, membership), needsOrganization: !membership }));
  });

  router.put('/profile', authWriteRateLimit, requireAuth, requirePermission(PERMISSION.PROFILE_WRITE), async (req, res) => {
    const parsed = parseSchema(profileSchema, req.body);
    if (parsed.error) {
      return res.status(400).json(parsed.error);
    }

    const user = await repo.updateUserProfile(req.auth.sub, parsed.data);
    const membership = await repo.findMembership(req.auth.sub);
    return res.status(200).json(ok({ user: toUserOutput(user, membership) }));
  });

  router.get('/sessions', authReadRateLimit, requireAuth, requirePermission(PERMISSION.SESSIONS_READ), async (req, res) => {
    const sessions = await repo.listActiveSessions(req.auth.sub);
    return res.status(200).json(ok({ sessions }));
  });

  router.post('/logout', authWriteRateLimit, requireAuth, async (req, res) => {
    await repo.revokeSession(req.auth.sessionId);
    clearAuthCookies(res);
    return res.status(200).json(ok({ message: 'Logged out successfully.' }));
  });

  router.post('/logout-all', authWriteRateLimit, requireAuth, requirePermission(PERMISSION.SESSIONS_WRITE), async (req, res) => {
    await repo.revokeAllSessions(req.auth.sub);
    clearAuthCookies(res);
    return res.status(200).json(ok({ message: 'All sessions revoked.' }));
  });

  router.post('/complete-onboarding', authWriteRateLimit, requireAuth, async (req, res) => {
    const parsed = parseSchema(organizationOnboardingSchema, req.body);
    if (parsed.error) {
      return res.status(400).json(parsed.error);
    }

    const existing = await repo.findMembership(req.auth.sub);
    if (existing) {
      return res.status(409).json(fail('ALREADY_ASSIGNED', 'User already belongs to an organization.'));
    }

    const organization = await repo.createOrganizationForOwner(
      req.auth.sub,
      parsed.data.organizationName,
      parsed.data.industry,
      parsed.data.country
    );

    return res.status(201).json(ok({ organization, redirectTo: '/dashboard' }));
  });

  return router;
}
