import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { fail } from '@sunave/core';
import { createPool } from './db/pool.js';
import { runMigrations } from './db/migrate.js';
import { buildAuthRouter } from './routes/auth.js';
import { buildOrganizationsRouter } from './routes/organizations.js';
import { buildUsersRouter } from './routes/users.js';
import { buildTeamsRouter } from './routes/teams.js';
import { buildRolesRouter } from './routes/roles.js';
import { createAuthRepository } from './repositories/authRepository.js';
import { createOrganizationRepository } from './repositories/organizationRepository.js';
import { createUserRepository } from './repositories/userRepository.js';
import { createTeamRepository } from './repositories/teamRepository.js';
import { createRoleRepository } from './repositories/roleRepository.js';
import { createPermissionService } from './services/permissionService.js';
import { config } from './config.js';

export async function createApp({ pool } = {}) {
  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false }));
  app.use('/api', csrf({
    cookie: {
      key: '_csrf_secret',
      sameSite: 'lax',
      secure: config.isProduction,
      httpOnly: true
    }
  }));

  const dbPool = pool || createPool();

  if (config.runMigrationsOnBoot) {
    await runMigrations(dbPool);
  }

  const authRepo = createAuthRepository(dbPool);
  const orgRepo = createOrganizationRepository(dbPool);
  const userRepo = createUserRepository(dbPool);
  const teamRepo = createTeamRepository(dbPool);
  const roleRepo = createRoleRepository(dbPool);
  const permService = createPermissionService(dbPool);

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/auth', buildAuthRouter(authRepo));
  app.use('/api/organizations', buildOrganizationsRouter(orgRepo));
  app.use('/api/users', buildUsersRouter(userRepo, orgRepo, permService));
  app.use('/api/teams', buildTeamsRouter(teamRepo, orgRepo, permService));
  app.use('/api/roles', buildRolesRouter(roleRepo, orgRepo, permService));

  app.use((_req, res) => {
    res.status(404).json(fail('NOT_FOUND', 'Resource not found.'));
  });

  app.use((err, _req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }
    if (err.code === 'EBADCSRFTOKEN') {
      return res.status(403).json(fail('CSRF_VALIDATION_FAILED', 'CSRF validation failed.'));
    }
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json(fail('INTERNAL_ERROR', 'An unexpected error occurred.'));
    return undefined;
  });

  app.locals.pool = dbPool;

  return app;
}
