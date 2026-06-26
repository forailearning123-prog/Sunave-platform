import { fail, hasPermission } from '@sunave/core';
import { verifyAccessToken } from '../security/tokens.js';

export function requireAuth(req, res, next) {
  const token = req.cookies.access_token;
  if (!token) {
    return res.status(401).json(fail('UNAUTHORIZED', 'Authentication required.'));
  }

  try {
    req.auth = verifyAccessToken(token);
    return next();
  } catch {
    return res.status(401).json(fail('UNAUTHORIZED', 'Invalid or expired session.'));
  }
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.auth?.role || !hasPermission(req.auth.role, permission)) {
      return res.status(403).json(fail('FORBIDDEN', 'Insufficient permissions.'));
    }

    return next();
  };
}
