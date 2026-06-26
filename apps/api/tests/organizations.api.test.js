import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { newDb } from 'pg-mem';
import { createApp } from '../src/app.js';

describe('organizations api', () => {
  let app;
  let pool;

  const fetchCsrf = async (agent) => {
    const res = await agent.get('/api/auth/csrf-token');
    return res.body.data.csrfToken;
  };

  const register = async (agent, email = 'owner@example.com', password = 'Strong!Pass123') => {
    const csrf = await fetchCsrf(agent);
    const res = await agent
      .post('/api/auth/register')
      .set('x-csrf-token', csrf)
      .send({ firstName: 'Jane', lastName: 'Doe', email, password });
    return { csrf: res.body.data.csrfToken, user: res.body.data.user };
  };

  const login = async (agent, email = 'owner@example.com', password = 'Strong!Pass123') => {
    const csrf = await fetchCsrf(agent);
    const res = await agent
      .post('/api/auth/login')
      .set('x-csrf-token', csrf)
      .send({ email, password });
    return { csrf: res.body.data.csrfToken, user: res.body.data.user };
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

  // ─── CREATE ORGANIZATION ──────────────────────────────────────────────────

  describe('POST /api/organizations', () => {
    it('creates an organization for authenticated user', async () => {
      const agent = request.agent(app);
      const { csrf } = await register(agent);

      const res = await agent
        .post('/api/organizations')
        .set('x-csrf-token', csrf)
        .send({ name: 'Acme Corp', industry: 'Technology', country: 'US' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.organization.name).toBe('Acme Corp');
      expect(res.body.data.organization.slug).toBeDefined();
      expect(res.body.data.organization.status).toBe('active');
    });

    it('returns 401 for unauthenticated request', async () => {
      const agent = request.agent(app);
      const csrf = await fetchCsrf(agent);
      const res = await agent
        .post('/api/organizations')
        .set('x-csrf-token', csrf)
        .send({ name: 'Ghost Org', industry: 'Tech', country: 'US' });
      expect(res.statusCode).toBe(401);
    });

    it('returns 400 for missing required fields', async () => {
      const agent = request.agent(app);
      const { csrf } = await register(agent, 'user2@example.com');
      const res = await agent
        .post('/api/organizations')
        .set('x-csrf-token', csrf)
        .send({ name: 'No Country' });
      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ─── LIST ORGANIZATIONS ───────────────────────────────────────────────────

  describe('GET /api/organizations', () => {
    it('lists organizations for authenticated user', async () => {
      const agent = request.agent(app);
      const { csrf } = await register(agent, 'lister@example.com');
      await agent.post('/api/organizations').set('x-csrf-token', csrf).send({ name: 'Org A', industry: 'Retail', country: 'UK' });
      await agent.post('/api/organizations').set('x-csrf-token', csrf).send({ name: 'Org B', industry: 'Finance', country: 'US' });

      const res = await agent.get('/api/organizations');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.organizations.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ─── GET CURRENT ORGANIZATION ─────────────────────────────────────────────

  describe('GET /api/organizations/current', () => {
    it('returns current organization after creation', async () => {
      const agent = request.agent(app);
      const { csrf } = await register(agent, 'current@example.com');
      const createRes = await agent
        .post('/api/organizations')
        .set('x-csrf-token', csrf)
        .send({ name: 'Current Org', industry: 'Healthcare', country: 'CA' });

      expect(createRes.statusCode).toBe(201);

      const res = await agent.get('/api/organizations/current');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.organization.name).toBe('Current Org');
      expect(res.body.data.organization.role).toBe('Owner');
    });
  });

  // ─── GET / UPDATE / ARCHIVE / RESTORE ────────────────────────────────────

  describe('single org operations', () => {
    let orgId;
    let orgAgent;
    let orgCsrf;

    beforeAll(async () => {
      orgAgent = request.agent(app);
      const { csrf } = await register(orgAgent, 'org-ops@example.com');
      orgCsrf = csrf;
      const createRes = await orgAgent
        .post('/api/organizations')
        .set('x-csrf-token', orgCsrf)
        .send({ name: 'Edit Me', industry: 'SaaS', country: 'DE' });
      orgId = createRes.body.data.organization.id;
    });

    it('GET /api/organizations/:id returns org for member', async () => {
      const res = await orgAgent.get(`/api/organizations/${orgId}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.organization.id).toBe(orgId);
    });

    it('GET /api/organizations/:id returns 403 for non-member', async () => {
      const stranger = request.agent(app);
      const { csrf } = await register(stranger, 'stranger@example.com');
      await stranger.post('/api/organizations').set('x-csrf-token', csrf).send({ name: 'Stranger Org', industry: 'Bio', country: 'FR' });
      const res = await stranger.get(`/api/organizations/${orgId}`);
      expect(res.statusCode).toBe(403);
    });

    it('PUT /api/organizations/:id updates organization', async () => {
      const res = await orgAgent
        .put(`/api/organizations/${orgId}`)
        .set('x-csrf-token', orgCsrf)
        .send({ name: 'Edited Name', phone: '+1-555-0100' });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.organization.name).toBe('Edited Name');
      expect(res.body.data.organization.phone).toBe('+1-555-0100');
    });

    it('POST /api/organizations/:id/archive archives organization', async () => {
      const res = await orgAgent
        .post(`/api/organizations/${orgId}/archive`)
        .set('x-csrf-token', orgCsrf);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.organization.status).toBe('archived');
    });

    it('POST /api/organizations/:id/restore restores organization', async () => {
      const res = await orgAgent
        .post(`/api/organizations/${orgId}/restore`)
        .set('x-csrf-token', orgCsrf);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.organization.status).toBe('active');
    });
  });

  // ─── SWITCH ORGANIZATION ──────────────────────────────────────────────────

  describe('POST /api/organizations/switch', () => {
    it('switches active organization', async () => {
      const agent = request.agent(app);
      const { csrf } = await register(agent, 'switcher@example.com');
      const r1 = await agent.post('/api/organizations').set('x-csrf-token', csrf).send({ name: 'Switch Org 1', industry: 'Tech', country: 'US' });
      const r2 = await agent.post('/api/organizations').set('x-csrf-token', csrf).send({ name: 'Switch Org 2', industry: 'Retail', country: 'US' });

      const switchRes = await agent
        .post('/api/organizations/switch')
        .set('x-csrf-token', csrf)
        .send({ organizationId: r2.body.data.organization.id });

      expect(switchRes.statusCode).toBe(200);
      expect(switchRes.body.data.organization.name).toBe('Switch Org 2');

      const currentRes = await agent.get('/api/organizations/current');
      expect(currentRes.body.data.organization.name).toBe('Switch Org 2');
    });

    it('returns 403 when switching to an org the user does not belong to', async () => {
      const ownerAgent = request.agent(app);
      const { csrf: ownerCsrf } = await register(ownerAgent, 'switch-owner@example.com');
      const otherOrg = await ownerAgent.post('/api/organizations').set('x-csrf-token', ownerCsrf).send({ name: 'Private Org', industry: 'Tech', country: 'US' });

      const intruder = request.agent(app);
      const { csrf: intruderCsrf } = await register(intruder, 'intruder@example.com');

      const res = await intruder
        .post('/api/organizations/switch')
        .set('x-csrf-token', intruderCsrf)
        .send({ organizationId: otherOrg.body.data.organization.id });

      expect(res.statusCode).toBe(403);
    });
  });

  // ─── MEMBER MANAGEMENT ────────────────────────────────────────────────────

  describe('member management', () => {
    let adminAgent;
    let adminCsrf;
    let memberAgent;
    let memberOrgId;
    let inviteToken;

    beforeAll(async () => {
      adminAgent = request.agent(app);
      const { csrf } = await register(adminAgent, 'admin-member@example.com');
      adminCsrf = csrf;
      const orgRes = await adminAgent
        .post('/api/organizations')
        .set('x-csrf-token', adminCsrf)
        .send({ name: 'Member Org', industry: 'Consulting', country: 'US' });
      memberOrgId = orgRes.body.data.organization.id;
    });

    it('GET /api/organizations/members lists members', async () => {
      const res = await adminAgent.get('/api/organizations/members');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.members).toHaveLength(1);
      expect(res.body.data.members[0].role).toBe('Owner');
    });

    it('POST /api/organizations/invite sends an invitation', async () => {
      const res = await adminAgent
        .post('/api/organizations/invite')
        .set('x-csrf-token', adminCsrf)
        .send({ email: 'newmember@example.com', role: 'User' });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.invitation.email).toBe('newmember@example.com');
      inviteToken = res.body.data.inviteToken;
      expect(inviteToken).toBeDefined();
    });

    it('GET /api/organizations/invitations lists invitations', async () => {
      const res = await adminAgent.get('/api/organizations/invitations');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.invitations.length).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/organizations/invitations/accept accepts an invitation', async () => {
      memberAgent = request.agent(app);
      const { csrf: memberCsrf } = await register(memberAgent, 'newmember@example.com');

      const res = await memberAgent
        .post('/api/organizations/invitations/accept')
        .set('x-csrf-token', memberCsrf)
        .send({ token: inviteToken });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.organizationId).toBe(memberOrgId);
    });

    it('member is now visible in members list', async () => {
      const res = await adminAgent.get('/api/organizations/members');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.members.length).toBe(2);
    });

    it('PUT /api/organizations/members/:id updates member role', async () => {
      const membersRes = await adminAgent.get('/api/organizations/members');
      const newMember = membersRes.body.data.members.find((m) => m.role === 'User');

      const res = await adminAgent
        .put(`/api/organizations/members/${newMember.id}`)
        .set('x-csrf-token', adminCsrf)
        .send({ role: 'Manager', title: 'Project Manager' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.member.role).toBe('Manager');
      expect(res.body.data.member.title).toBe('Project Manager');
    });

    it('DELETE /api/organizations/members/:id removes a non-owner member', async () => {
      const membersRes = await adminAgent.get('/api/organizations/members');
      const removable = membersRes.body.data.members.find((m) => m.role !== 'Owner');

      const res = await adminAgent
        .delete(`/api/organizations/members/${removable.id}`)
        .set('x-csrf-token', adminCsrf);

      expect(res.statusCode).toBe(200);
    });

    it('DELETE /api/organizations/members/:id cannot remove Owner', async () => {
      const membersRes = await adminAgent.get('/api/organizations/members');
      const owner = membersRes.body.data.members.find((m) => m.role === 'Owner');

      const res = await adminAgent
        .delete(`/api/organizations/members/${owner.id}`)
        .set('x-csrf-token', adminCsrf);

      expect(res.statusCode).toBe(404);
    });
  });

  // ─── SETTINGS ─────────────────────────────────────────────────────────────

  describe('organization settings', () => {
    let settingsAgent;
    let settingsCsrf;

    beforeAll(async () => {
      settingsAgent = request.agent(app);
      const { csrf } = await register(settingsAgent, 'settings-user@example.com');
      settingsCsrf = csrf;
      await settingsAgent.post('/api/organizations').set('x-csrf-token', settingsCsrf).send({ name: 'Settings Org', industry: 'AI', country: 'US' });
    });

    it('PUT /api/organizations/settings/:category updates settings', async () => {
      const res = await settingsAgent
        .put('/api/organizations/settings/general')
        .set('x-csrf-token', settingsCsrf)
        .send({ settings: { displayName: 'My Org', description: 'Best Org Ever' } });

      expect(res.statusCode).toBe(200);
    });

    it('GET /api/organizations/settings returns all settings', async () => {
      const res = await settingsAgent.get('/api/organizations/settings');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.settings.general).toBeDefined();
      expect(res.body.data.settings.general.displayName).toBe('My Org');
    });

    it('returns 400 for invalid category', async () => {
      const res = await settingsAgent
        .put('/api/organizations/settings/unknown-category')
        .set('x-csrf-token', settingsCsrf)
        .send({ settings: {} });
      expect(res.statusCode).toBe(400);
    });
  });

  // ─── MULTI-TENANT ISOLATION ───────────────────────────────────────────────

  describe('multi-tenant isolation', () => {
    let tenantA;
    let tenantB;
    let orgAId;
    let orgBId;
    let csrfA;
    let csrfB;

    beforeAll(async () => {
      tenantA = request.agent(app);
      tenantB = request.agent(app);
      const { csrf: ca } = await register(tenantA, 'tenant-a@example.com');
      csrfA = ca;
      const { csrf: cb } = await register(tenantB, 'tenant-b@example.com');
      csrfB = cb;

      const rA = await tenantA.post('/api/organizations').set('x-csrf-token', csrfA).send({ name: 'Tenant A Org', industry: 'Tech', country: 'US' });
      orgAId = rA.body.data.organization.id;

      const rB = await tenantB.post('/api/organizations').set('x-csrf-token', csrfB).send({ name: 'Tenant B Org', industry: 'Finance', country: 'US' });
      orgBId = rB.body.data.organization.id;
    });

    it('tenant A cannot read tenant B organization', async () => {
      const res = await tenantA.get(`/api/organizations/${orgBId}`);
      expect(res.statusCode).toBe(403);
    });

    it('tenant B cannot read tenant A organization', async () => {
      const res = await tenantB.get(`/api/organizations/${orgAId}`);
      expect(res.statusCode).toBe(403);
    });

    it('tenant A cannot update tenant B organization', async () => {
      const res = await tenantA
        .put(`/api/organizations/${orgBId}`)
        .set('x-csrf-token', csrfA)
        .send({ name: 'Stolen Name' });
      expect(res.statusCode).toBe(403);
    });

    it('tenant A cannot archive tenant B organization', async () => {
      const res = await tenantA
        .post(`/api/organizations/${orgBId}/archive`)
        .set('x-csrf-token', csrfA);
      expect(res.statusCode).toBe(403);
    });

    it('tenant A members list is isolated from tenant B', async () => {
      const resA = await tenantA.get('/api/organizations/members');
      const resB = await tenantB.get('/api/organizations/members');
      const idsA = resA.body.data.members.map((m) => m.organizationId);
      const idsB = resB.body.data.members.map((m) => m.organizationId);

      expect(idsA.every((id) => id === orgAId)).toBe(true);
      expect(idsB.every((id) => id === orgBId)).toBe(true);
    });
  });
});
