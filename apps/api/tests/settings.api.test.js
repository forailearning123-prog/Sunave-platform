import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { newDb } from 'pg-mem';
import { createApp } from '../src/app.js';

describe('Settings API', () => {
  let app;
  let pool;

  const fetchCsrf = async (agent) => {
    const res = await agent.get('/api/auth/csrf-token');
    return res.body.data.csrfToken;
  };

  const register = async (agent, email = 'owner@settings.test', password = 'Strong!Pass123') => {
    const csrf = await fetchCsrf(agent);
    const res = await agent
      .post('/api/auth/register')
      .set('x-csrf-token', csrf)
      .send({ firstName: 'Jane', lastName: 'Doe', email, password });
    return { csrf: res.body.data.csrfToken, user: res.body.data.user };
  };

  const createOrg = async (agent, csrf, name = 'Settings Corp') => {
    const res = await agent
      .post('/api/organizations')
      .set('x-csrf-token', csrf)
      .send({ name, industry: 'Technology', country: 'US' });
    return res.body.data.organization;
  };

  beforeAll(async () => {
    const db = newDb();
    const { Pool } = db.adapters.createPg();
    pool = new Pool();
    app = await createApp({ pool });
  });

  afterAll(async () => {
    await pool.end();
  });

  // ─── User Preferences ─────────────────────────────────────────────────────

  describe('User Preferences', () => {
    let agent;
    let csrf;

    beforeAll(async () => {
      agent = request.agent(app);
      ({ csrf } = await register(agent, 'prefs@settings.test'));
      await createOrg(agent, csrf);
    });

    describe('GET /api/settings/user', () => {
      it('returns empty preferences for a new user', async () => {
        const res = await agent.get('/api/settings/user');
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.preferences).toBeDefined();
      });

      it('returns 401 for unauthenticated request', async () => {
        const anon = request.agent(app);
        const anonCsrf = await fetchCsrf(anon);
        const res = await anon
          .get('/api/settings/user')
          .set('x-csrf-token', anonCsrf);
        expect(res.statusCode).toBe(401);
      });

      it('returns 400 for an invalid category', async () => {
        const res = await agent.get('/api/settings/user?category=invalid');
        expect(res.statusCode).toBe(400);
      });
    });

    describe('PUT /api/settings/user', () => {
      it('saves appearance preferences', async () => {
        const res = await agent
          .put('/api/settings/user')
          .set('x-csrf-token', csrf)
          .send({ category: 'appearance', preferences: { theme: 'dark', sidebarMode: 'collapsed' } });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('retrieves saved appearance preferences', async () => {
        const res = await agent.get('/api/settings/user?category=appearance');
        expect(res.statusCode).toBe(200);
        expect(res.body.data.preferences.theme).toBe('dark');
        expect(res.body.data.preferences.sidebarMode).toBe('collapsed');
      });

      it('saves notification preferences', async () => {
        const res = await agent
          .put('/api/settings/user')
          .set('x-csrf-token', csrf)
          .send({ category: 'notifications', preferences: { emailEnabled: false, inAppEnabled: true } });
        expect(res.statusCode).toBe(200);
      });

      it('returns 400 for invalid category', async () => {
        const res = await agent
          .put('/api/settings/user')
          .set('x-csrf-token', csrf)
          .send({ category: 'unknown', preferences: {} });
        expect(res.statusCode).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('returns 401 for unauthenticated request', async () => {
        const anon = request.agent(app);
        const anonCsrf = await fetchCsrf(anon);
        const res = await anon
          .put('/api/settings/user')
          .set('x-csrf-token', anonCsrf)
          .send({ category: 'appearance', preferences: { theme: 'light' } });
        expect(res.statusCode).toBe(401);
      });
    });
  });

  // ─── Organization Settings ─────────────────────────────────────────────────

  describe('Organization Settings', () => {
    let agent;
    let csrf;

    beforeAll(async () => {
      agent = request.agent(app);
      ({ csrf } = await register(agent, 'orgsettings@settings.test'));
      await createOrg(agent, csrf, 'Org Settings Inc');
    });

    describe('GET /api/settings/organization', () => {
      it('returns org settings for Owner', async () => {
        const res = await agent.get('/api/settings/organization');
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.settings).toBeDefined();
      });
    });

    describe('PUT /api/settings/organization', () => {
      it('updates org general settings', async () => {
        const res = await agent
          .put('/api/settings/organization?category=general')
          .set('x-csrf-token', csrf)
          .send({ settings: { displayName: 'Custom Display', description: 'Test org' } });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('persists the org setting', async () => {
        const res = await agent.get('/api/settings/organization');
        expect(res.statusCode).toBe(200);
        expect(res.body.data.settings.general?.displayName).toBe('Custom Display');
      });

      it('returns 400 for invalid category', async () => {
        const res = await agent
          .put('/api/settings/organization?category=invalid')
          .set('x-csrf-token', csrf)
          .send({ settings: {} });
        expect(res.statusCode).toBe(400);
      });
    });
  });

  // ─── System Settings ──────────────────────────────────────────────────────

  describe('System Settings', () => {
    let ownerAgent;
    let ownerCsrf;

    beforeAll(async () => {
      ownerAgent = request.agent(app);
      ({ csrf: ownerCsrf } = await register(ownerAgent, 'sysowner@settings.test'));
      await createOrg(ownerAgent, ownerCsrf, 'Sys Settings Corp');
    });

    describe('GET /api/settings/system', () => {
      it('returns system settings for Owner (who has settings.manage)', async () => {
        const res = await ownerAgent.get('/api/settings/system');
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.settings).toBeDefined();
      });
    });

    describe('PUT /api/settings/system', () => {
      it('updates system general settings for Owner', async () => {
        const res = await ownerAgent
          .put('/api/settings/system?category=general')
          .set('x-csrf-token', ownerCsrf)
          .send({ settings: { platformName: 'Sunave Test', maintenanceMode: false } });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('returns 400 for invalid category', async () => {
        const res = await ownerAgent
          .put('/api/settings/system?category=unknown_cat')
          .set('x-csrf-token', ownerCsrf)
          .send({ settings: {} });
        expect(res.statusCode).toBe(400);
      });
    });
  });

  // ─── Resolved Settings ────────────────────────────────────────────────────

  describe('Resolved Settings GET /api/settings', () => {
    let agent;
    let csrf;

    beforeAll(async () => {
      agent = request.agent(app);
      ({ csrf } = await register(agent, 'resolved@settings.test'));
      await createOrg(agent, csrf, 'Resolved Corp');
    });

    it('returns merged resolved settings', async () => {
      const res = await agent.get('/api/settings');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      const { settings } = res.body.data;
      expect(settings).toBeDefined();
      expect(settings.general).toBeDefined();
      expect(settings.appearance).toBeDefined();
      expect(settings.security).toBeDefined();
      expect(settings.notifications).toBeDefined();
    });

    it('user overrides are reflected in resolved settings', async () => {
      await agent
        .put('/api/settings/user')
        .set('x-csrf-token', csrf)
        .send({ category: 'appearance', preferences: { theme: 'light' } });

      const res = await agent.get('/api/settings');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.settings.appearance.theme).toBe('light');
    });
  });

  // ─── Feature Flags ────────────────────────────────────────────────────────

  describe('Feature Flags', () => {
    let agent;
    let csrf;

    beforeAll(async () => {
      agent = request.agent(app);
      ({ csrf } = await register(agent, 'flags@settings.test'));
      await createOrg(agent, csrf, 'Flags Corp');
    });

    describe('GET /api/settings/feature-flags', () => {
      it('returns all seeded feature flags', async () => {
        const res = await agent.get('/api/settings/feature-flags');
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.featureFlags)).toBe(true);
        expect(res.body.data.featureFlags.length).toBeGreaterThanOrEqual(10);
        const keys = res.body.data.featureFlags.map((f) => f.key);
        expect(keys).toContain('ai_enabled');
        expect(keys).toContain('marketplace_enabled');
        expect(keys).toContain('audit_enabled');
      });

      it('includes effectiveEnabled field', async () => {
        const res = await agent.get('/api/settings/feature-flags');
        expect(res.statusCode).toBe(200);
        const flag = res.body.data.featureFlags.find((f) => f.key === 'audit_enabled');
        expect(flag).toBeDefined();
        expect(typeof flag.effectiveEnabled).toBe('boolean');
        expect(flag.effectiveEnabled).toBe(true); // audit_enabled is seeded as true
      });

      it('returns 401 without auth', async () => {
        const anon = request.agent(app);
        const anonCsrf = await fetchCsrf(anon);
        const res = await anon
          .get('/api/settings/feature-flags')
          .set('x-csrf-token', anonCsrf);
        expect(res.statusCode).toBe(401);
      });
    });

    describe('PUT /api/settings/feature-flags', () => {
      it('Owner can update a feature flag', async () => {
        const res = await agent
          .put('/api/settings/feature-flags?key=ai_enabled')
          .set('x-csrf-token', csrf)
          .send({ enabled: true });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.featureFlag.enabled).toBe(true);
      });

      it('updated flag is reflected in list', async () => {
        const res = await agent.get('/api/settings/feature-flags');
        const flag = res.body.data.featureFlags.find((f) => f.key === 'ai_enabled');
        expect(flag.enabled).toBe(true);
      });

      it('returns 404 for unknown flag key', async () => {
        const res = await agent
          .put('/api/settings/feature-flags?key=nonexistent_flag')
          .set('x-csrf-token', csrf)
          .send({ enabled: true });
        expect(res.statusCode).toBe(404);
      });

      it('returns 400 when key param is missing', async () => {
        const res = await agent
          .put('/api/settings/feature-flags')
          .set('x-csrf-token', csrf)
          .send({ enabled: true });
        expect(res.statusCode).toBe(400);
      });
    });
  });
});
