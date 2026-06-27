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
import { buildSettingsRouter } from './routes/settings.js';
import { buildDashboardRouter } from './routes/dashboard.js';
import { createDashboardService } from './services/dashboardService.js';
import { createAuthRepository } from './repositories/authRepository.js';
import { createOrganizationRepository } from './repositories/organizationRepository.js';
import { createUserRepository } from './repositories/userRepository.js';
import { createTeamRepository } from './repositories/teamRepository.js';
import { createRoleRepository } from './repositories/roleRepository.js';
import { createSettingsRepository } from './repositories/settingsRepository.js';
import { createGoalRepository } from './repositories/goalRepository.js';
import { createProjectRepository } from './repositories/projectRepository.js';
import { createMilestoneRepository } from './repositories/milestoneRepository.js';
import { createTaskRepository } from './repositories/taskRepository.js';
import { createCommentRepository } from './repositories/commentRepository.js';
import { createAttachmentRepository } from './repositories/attachmentRepository.js';
import { createActivityRepository } from './repositories/activityRepository.js';
import { createAiProviderRepository } from './repositories/aiProviderRepository.js';
import { createAiModelRepository } from './repositories/aiModelRepository.js';
import { createAiCapabilityRepository } from './repositories/aiCapabilityRepository.js';
import { createAiUsageRepository } from './repositories/aiUsageRepository.js';
import { createConversationRepository } from './repositories/conversationRepository.js';
import { createPromptRepository } from './repositories/promptRepository.js';
import { createRuntimeRepository } from './repositories/runtimeRepository.js';
import { createPermissionService } from './services/permissionService.js';
import { createConfigurationService } from './services/configurationService.js';
import { createAiGatewayService } from './services/aiGatewayService.js';
import { createCredentialService } from './services/credentialService.js';
import { createRuntimeService } from './services/runtimeService.js';
import { buildConversationsRouter } from './routes/conversations.js';
import { buildPromptsRouter } from './routes/prompts.js';
import { buildRuntimeRouter } from './routes/runtime.js';
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
  const settingsRepo = createSettingsRepository(dbPool);
  const permService = createPermissionService(dbPool);
  const configService = createConfigurationService(settingsRepo, orgRepo);

  // Goals & Projects platform repositories
  const goalRepo       = createGoalRepository(dbPool);
  const projectRepo    = createProjectRepository(dbPool);
  const milestoneRepo  = createMilestoneRepository(dbPool);
  const taskRepo       = createTaskRepository(dbPool);
  const commentRepo    = createCommentRepository(dbPool);
  const attachmentRepo = createAttachmentRepository(dbPool);
  const activityRepo   = createActivityRepository(dbPool);

  // AI Gateway platform
  const aiProviderRepo      = createAiProviderRepository(dbPool);
  const aiModelRepo         = createAiModelRepository(dbPool);
  const aiCapabilityRepo    = createAiCapabilityRepository(dbPool);
  const aiUsageRepo         = createAiUsageRepository(dbPool);
  const credentialService   = createCredentialService();
  const aiGatewayService    = createAiGatewayService(aiProviderRepo);

  // AI Runtime Platform
  const conversationRepo   = createConversationRepository(dbPool);
  const promptRepo         = createPromptRepository(dbPool);
  const runtimeRepo        = createRuntimeRepository(dbPool);
  const runtimeService     = createRuntimeService(aiGatewayService, conversationRepo, promptRepo, runtimeRepo, aiUsageRepo);

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/auth', buildAuthRouter(authRepo));
  app.use('/api/organizations', buildOrganizationsRouter(orgRepo));
  app.use('/api/users', buildUsersRouter(userRepo, orgRepo, permService));
  app.use('/api/teams', buildTeamsRouter(teamRepo, orgRepo, permService));
  app.use('/api/roles', buildRolesRouter(roleRepo, orgRepo, permService));
  app.use('/api/settings', buildSettingsRouter(settingsRepo, configService, orgRepo, permService));

  const dashboardService = createDashboardService();
  app.use('/api/dashboard', buildDashboardRouter(dashboardService));
  app.use('/api/ai', buildAiRouter(
    aiProviderRepo, aiGatewayService, credentialService, orgRepo, permService,
    aiModelRepo, aiCapabilityRepo, aiUsageRepo
  ));
  app.use('/api/conversations', buildConversationsRouter(conversationRepo, runtimeService));
  app.use('/api/prompts', buildPromptsRouter(promptRepo));
  app.use('/api/runtime', buildRuntimeRouter(runtimeService, runtimeRepo));

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
