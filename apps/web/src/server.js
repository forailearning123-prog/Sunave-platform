import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');
const port = Number(process.env.WEB_PORT || 3000);
const apiTarget = process.env.WEB_API_TARGET || `http://localhost:${process.env.API_PORT || 8080}`;

const app = express();
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 2000, standardHeaders: true, legacyHeaders: false }));

app.use('/api', createProxyMiddleware({
  target: apiTarget,
  changeOrigin: true
}));

app.use('/assets', express.static(path.join(publicDir, 'assets')));

const pageRoutes = {
  '/auth/login': 'auth/login.html',
  '/auth/register': 'auth/register.html',
  '/auth/forgot-password': 'auth/forgot-password.html',
  '/auth/reset-password': 'auth/reset-password.html',
  '/auth/organization': 'auth/organization.html',
  '/account/profile': 'account/profile.html',
  '/organizations': 'organizations/index.html',
  '/organizations/new': 'organizations/new.html',
  '/organizations/settings': 'organizations/settings.html',
  '/organizations/members': 'organizations/members.html',
  '/organizations/invitations': 'organizations/invitations.html',
  '/users': 'users/index.html',
  '/users/detail': 'users/detail.html',
  '/teams': 'teams/index.html',
  '/teams/detail': 'teams/detail.html',
  '/roles': 'roles/index.html',
  '/permissions': 'permissions/index.html',
  '/settings': 'settings/index.html',
  '/settings/general': 'settings/general.html',
  '/settings/appearance': 'settings/appearance.html',
  '/settings/notifications': 'settings/notifications.html',
  '/settings/security': 'settings/security.html',
  '/settings/branding': 'settings/branding.html',
  '/settings/ai': 'settings/ai.html',
  '/settings/system': 'settings/system.html',
  '/settings/feature-flags': 'settings/feature-flags.html',
  '/goals': 'goals/index.html',
  '/goals/new': 'goals/new.html',
  '/goals/detail': 'goals/detail.html',
  '/projects': 'projects/index.html',
  '/projects/detail': 'projects/detail.html',
  '/tasks': 'tasks/index.html',
  '/timeline': 'timeline/index.html',
  '/dashboard': 'dashboard.html',
  // ─── Admin: AI Gateway & Provider Management ────────────────────────────
  '/admin/ai/providers':      'admin/ai/providers.html',
  '/admin/ai/health':         'admin/ai/health.html',
  '/admin/ai/configuration':  'admin/ai/configuration.html',
  '/': 'auth/login.html'
};

for (const [route, file] of Object.entries(pageRoutes)) {
  app.get(route, (_req, res) => {
    res.sendFile(path.join(publicDir, file));
  });
}

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Sunave web listening on port ${port}`);
});
