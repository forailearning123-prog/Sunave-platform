import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function generateAccessToken(payload) {
  return jwt.sign(payload, config.accessTokenSecret, {
    expiresIn: config.accessTokenTtlSeconds,
    issuer: 'sunave-auth'
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.accessTokenSecret, { issuer: 'sunave-auth' });
}

export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

export function signRefreshToken(token, sessionId) {
  return jwt.sign({ token, sessionId }, config.refreshTokenSecret, {
    expiresIn: config.refreshTokenRememberTtlSeconds,
    issuer: 'sunave-auth'
  });
}

export function verifyRefreshToken(signedToken) {
  return jwt.verify(signedToken, config.refreshTokenSecret, { issuer: 'sunave-auth' });
}

export function hashToken(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function generateCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}
