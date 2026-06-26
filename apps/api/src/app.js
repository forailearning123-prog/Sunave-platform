import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { fail } from '@sunave/core';
import { createPool } from './db/pool.js';
import { runMigrations } from './db/migrate.js';
import { buildAuthRouter } from './routes/auth.js';
import { createAuthRepository } from './repositories/authRepository.js';
import { config } from './config.js';

export async function createApp({ pool } = {}) {
  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  const dbPool = pool || createPool();

  if (config.runMigrationsOnBoot) {
    await runMigrations(dbPool);
  }

  const repo = createAuthRepository(dbPool);

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/auth', buildAuthRouter(repo));

  app.use((_req, res) => {
    res.status(404).json(fail('NOT_FOUND', 'Resource not found.'));
  });

  app.use((err, _req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json(fail('INTERNAL_ERROR', 'An unexpected error occurred.'));
    return undefined;
  });

  app.locals.pool = dbPool;

  return app;
}
