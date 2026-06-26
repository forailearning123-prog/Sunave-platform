import {
  PERMISSION,
  SYSTEM_SETTINGS_CATEGORY,
  USER_PREFERENCE_CATEGORY,
  fail,
  ok,
  updateFeatureFlagSchema,
  updateSystemSettingsSchema,
  updateUserPreferencesSchema,
  createFeatureFlagAssignmentSchema
} from '@sunave/core';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg, requireOrgPermission } from '../middleware/tenant.js';

function parseSchema(schema, payload) {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { error: fail('VALIDATION_ERROR', 'Validation failed.', parsed.error.flatten()) };
  }
  return { data: parsed.data };
}

export function buildSettingsRouter(settingsRepo, configService, orgRepo, permService) {
  const router = Router();

  const readLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false });
  const writeLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });

  // ─── GET /api/settings ─────────────────────────────────────────────────────
  // Returns fully resolved settings for the current user+org context.
  router.get('/', readLimit, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const context = { userId: req.auth.sub, orgId: req.org.id };
    const categories = SYSTEM_SETTINGS_CATEGORY;
    const resolved = {};
    await Promise.all(
      categories.map(async (cat) => {
        resolved[cat] = await configService.get(cat, context);
      })
    );
    return res.status(200).json(ok({ settings: resolved }));
  });

  // ─── GET /api/settings/system ──────────────────────────────────────────────
  // System-level settings. Requires settings.manage permission.
  router.get('/system', readLimit, requireAuth, requireOrg(orgRepo),
    permService.requirePermission(PERMISSION.SETTINGS_MANAGE), async (_req, res) => {
      const settings = await settingsRepo.getSystemSettings();
      return res.status(200).json(ok({ settings }));
    });

  // ─── PUT /api/settings/system ──────────────────────────────────────────────
  router.put('/system', writeLimit, requireAuth, requireOrg(orgRepo),
    permService.requirePermission(PERMISSION.SETTINGS_MANAGE), async (req, res) => {
      const { category } = req.query;
      if (!category || !SYSTEM_SETTINGS_CATEGORY.includes(category)) {
        return res.status(400).json(
          fail('INVALID_CATEGORY', `category query param must be one of: ${SYSTEM_SETTINGS_CATEGORY.join(', ')}.`)
        );
      }
      const parsed = parseSchema(updateSystemSettingsSchema, req.body);
      if (parsed.error) return res.status(400).json(parsed.error);

      await settingsRepo.upsertSystemSettings(category, parsed.data.settings);
      configService.invalidate(`system:${category}`);
      return res.status(200).json(ok({ message: 'System settings updated.' }));
    });

  // ─── GET /api/settings/organization ───────────────────────────────────────
  // Returns org-level settings.
  router.get('/organization', readLimit, requireAuth, requireOrg(orgRepo),
    requireOrgPermission(PERMISSION.SETTINGS_READ), async (req, res) => {
      const settings = await orgRepo.getSettings(req.org.id);
      return res.status(200).json(ok({ settings }));
    });

  // ─── PUT /api/settings/organization ───────────────────────────────────────
  router.put('/organization', writeLimit, requireAuth, requireOrg(orgRepo),
    requireOrgPermission(PERMISSION.SETTINGS_WRITE), async (req, res) => {
      const { category } = req.query;
      const ALLOWED = ['general', 'branding', 'regional', 'billing', 'security', 'ai', 'notifications', 'storage'];
      if (!category || !ALLOWED.includes(category)) {
        return res.status(400).json(
          fail('INVALID_CATEGORY', `category query param must be one of: ${ALLOWED.join(', ')}.`)
        );
      }
      const parsed = parseSchema(updateSystemSettingsSchema, req.body);
      if (parsed.error) return res.status(400).json(parsed.error);

      await orgRepo.upsertSettings(req.org.id, category, parsed.data.settings);
      configService.invalidate(`org:${req.org.id}:${category}`);
      return res.status(200).json(ok({ message: 'Organization settings updated.' }));
    });

  // ─── GET /api/settings/user ────────────────────────────────────────────────
  // Returns user preferences for current user+org.
  router.get('/user', readLimit, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { category } = req.query;
    if (category && !USER_PREFERENCE_CATEGORY.includes(category)) {
      return res.status(400).json(
        fail('INVALID_CATEGORY', `category must be one of: ${USER_PREFERENCE_CATEGORY.join(', ')}.`)
      );
    }
    const prefs = await settingsRepo.getUserPreferences(req.auth.sub, req.org.id, category || null);
    return res.status(200).json(ok({ preferences: prefs ?? {} }));
  });

  // ─── PUT /api/settings/user ────────────────────────────────────────────────
  router.put('/user', writeLimit, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const parsed = parseSchema(updateUserPreferencesSchema, req.body);
    if (parsed.error) return res.status(400).json(parsed.error);

    await settingsRepo.upsertUserPreferences(
      req.auth.sub,
      req.org.id,
      parsed.data.category,
      parsed.data.preferences
    );
    configService.invalidate(`user:${req.auth.sub}:${req.org.id}:${parsed.data.category}`);
    return res.status(200).json(ok({ message: 'User preferences updated.' }));
  });

  // ─── GET /api/feature-flags ────────────────────────────────────────────────
  router.get('/feature-flags', readLimit, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const flags = await settingsRepo.listFeatureFlags();

    // Augment each flag with the effective value for this org/role context
    const context = { orgId: req.org.id, role: req.org.role };
    const enriched = await Promise.all(
      flags.map(async (flag) => ({
        ...flag,
        effectiveEnabled: await settingsRepo.isFeatureFlagEnabled(flag.key, context)
      }))
    );
    return res.status(200).json(ok({ featureFlags: enriched }));
  });

  // ─── PUT /api/feature-flags ────────────────────────────────────────────────
  // Updates a feature flag (global or with org/role assignment). Requires settings.manage.
  router.put('/feature-flags', writeLimit, requireAuth, requireOrg(orgRepo),
    permService.requirePermission(PERMISSION.SETTINGS_MANAGE), async (req, res) => {
      const { key } = req.query;
      if (!key || typeof key !== 'string') {
        return res.status(400).json(fail('MISSING_KEY', 'Query param "key" is required.'));
      }

      const flag = await settingsRepo.getFeatureFlag(key);
      if (!flag) {
        return res.status(404).json(fail('NOT_FOUND', 'Feature flag not found.'));
      }

      // If scope is provided, create/update an assignment rather than the global flag
      if (req.body.scope) {
        const parsed = parseSchema(createFeatureFlagAssignmentSchema, req.body);
        if (parsed.error) return res.status(400).json(parsed.error);

        const assignment = await settingsRepo.upsertFeatureFlagAssignment(
          key,
          parsed.data.scope,
          parsed.data.scopeId,
          parsed.data.enabled
        );
        configService.invalidate('feature_flags');
        return res.status(200).json(ok({ assignment }));
      }

      // Otherwise update the global flag
      const parsed = parseSchema(updateFeatureFlagSchema, req.body);
      if (parsed.error) return res.status(400).json(parsed.error);

      const updated = await settingsRepo.updateFeatureFlag(key, parsed.data);
      configService.invalidate('feature_flags');
      return res.status(200).json(ok({ featureFlag: updated }));
    });

  return router;
}
