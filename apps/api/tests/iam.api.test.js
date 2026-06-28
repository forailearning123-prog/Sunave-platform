import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { newDb } from 'pg-mem';
import { createApp } from '../src/app.js';

describe('IAM api', () => {
  let app;
  let pool;

  const fetchCsrf = async (agent) => {
    const res = await agent.get('/api/auth/csrf-token');
    return res.body.data.csrfToken;
  };

  const register = async (agent, email = 'owner@iam.test', password = 'Strong!Pass123') => {
    const csrf = await fetchCsrf(agent);
    const res = await agent
      .post('/api/auth/register')
      .set('x-csrf-token', csrf)
      .send({ firstName: 'Jane', lastName: 'Doe', email, password });
    return { csrf: res.body.data.csrfToken, user: res.body.data.user };
  };

  const createOrg = async (agent, csrf, name = 'IAM Corp') => {
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

  // ─── PERMISSIONS ──────────────────────────────────────────────────────────

  describe('GET /api/roles/permissions', () => {
    let agent;
    let csrf;

    beforeAll(async () => {
      agent = request.agent(app);
      ({ csrf } = await register(agent, 'perm-owner@iam.test'));
      await createOrg(agent, csrf);
    });

    it('returns all seeded permissions for Owner', async () => {
      const res = await agent.get('/api/roles/permissions');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.permissions.length).toBeGreaterThanOrEqual(21);
      const names = res.body.data.permissions.map((p) => p.name);
      expect(names).toContain('users.read');
      expect(names).toContain('teams.manage');
      expect(names).toContain('billing.manage');
    });

    it('returns 401 without authentication', async () => {
      const anon = request.agent(app);
      const anonCsrf = await fetchCsrf(anon);
      const res = await anon
        .get('/api/roles/permissions')
        .set('x-csrf-token', anonCsrf);
      expect(res.statusCode).toBe(401);
    });
  });

  // ─── ROLES ────────────────────────────────────────────────────────────────

  describe('roles CRUD', () => {
    let agent;
    let csrf;
    let customRoleId;

    beforeAll(async () => {
      agent = request.agent(app);
      ({ csrf } = await register(agent, 'roles-owner@iam.test'));
      await createOrg(agent, csrf, 'Roles Org');
    });

    it('GET /api/roles lists system roles', async () => {
      const res = await agent.get('/api/roles');
      expect(res.statusCode).toBe(200);
      const names = res.body.data.roles.map((r) => r.name);
      expect(names).toContain('Owner');
      expect(names).toContain('Admin');
      expect(names).toContain('Manager');
      expect(names).toContain('User');
      expect(names).toContain('Guest');
    });

    it('POST /api/roles creates a custom role', async () => {
      const res = await agent
        .post('/api/roles')
        .set('x-csrf-token', csrf)
        .send({ name: 'Engineer', description: 'Engineering team role' });
      expect(res.statusCode).toBe(201);
      expect(res.body.data.role.name).toBe('Engineer');
      expect(res.body.data.role.systemRole).toBe(false);
      customRoleId = res.body.data.role.id;
    });

    it('POST /api/roles returns 409 for duplicate name', async () => {
      const res = await agent
        .post('/api/roles')
        .set('x-csrf-token', csrf)
        .send({ name: 'Engineer' });
      expect(res.statusCode).toBe(409);
    });

    it('GET /api/roles/:id returns role with permissions', async () => {
      const res = await agent.get(`/api/roles/${customRoleId}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.role.id).toBe(customRoleId);
      expect(Array.isArray(res.body.data.role.permissions)).toBe(true);
    });

    it('PUT /api/roles/:id updates custom role', async () => {
      const res = await agent
        .put(`/api/roles/${customRoleId}`)
        .set('x-csrf-token', csrf)
        .send({ name: 'Senior Engineer', description: 'Updated description' });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.role.name).toBe('Senior Engineer');
    });

    it('PUT /api/roles/:id/permissions assigns permissions', async () => {
      const permsRes = await agent.get('/api/roles/permissions');
      const readPerm = permsRes.body.data.permissions.find((p) => p.name === 'users.read');
      const teamsPerm = permsRes.body.data.permissions.find((p) => p.name === 'teams.read');
      expect(readPerm).toBeDefined();

      const res = await agent
        .put(`/api/roles/${customRoleId}/permissions`)
        .set('x-csrf-token', csrf)
        .send({ permissionIds: [readPerm.id, teamsPerm.id] });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.permissions).toHaveLength(2);
    });

    it('DELETE /api/roles/:id deletes custom role', async () => {
      const res = await agent
        .delete(`/api/roles/${customRoleId}`)
        .set('x-csrf-token', csrf);
      expect(res.statusCode).toBe(200);
    });

    it('DELETE /api/roles/:id returns 403 for system role', async () => {
      const rolesRes = await agent.get('/api/roles');
      const ownerRole = rolesRes.body.data.roles.find((r) => r.name === 'Owner');
      const res = await agent
        .delete(`/api/roles/${ownerRole.id}`)
        .set('x-csrf-token', csrf);
      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('PUT /api/roles/:id returns 403 for system role', async () => {
      const rolesRes = await agent.get('/api/roles');
      const adminRole = rolesRes.body.data.roles.find((r) => r.name === 'Admin');
      const res = await agent
        .put(`/api/roles/${adminRole.id}`)
        .set('x-csrf-token', csrf)
        .send({ name: 'SuperAdmin' });
      expect(res.statusCode).toBe(403);
    });
  });

  // ─── USERS ────────────────────────────────────────────────────────────────

  describe('users CRUD', () => {
    let agent;
    let csrf;
    let createdUserId;

    beforeAll(async () => {
      agent = request.agent(app);
      ({ csrf } = await register(agent, 'admin@iam.test'));
      await createOrg(agent, csrf, 'Users Org');
    });

    it('GET /api/users returns org members', async () => {
      const res = await agent.get('/api/users');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/users creates a new user', async () => {
      const res = await agent
        .post('/api/users')
        .set('x-csrf-token', csrf)
        .send({
          firstName: 'Bob',
          lastName: 'Smith',
          email: 'bob.smith@iam.test',
          jobTitle: 'Developer',
          department: 'Engineering',
          role: 'User'
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.data.user.email).toBe('bob.smith@iam.test');
      expect(res.body.data.user.status).toBe('invited');
      expect(res.body.data.user.jobTitle).toBe('Developer');
      createdUserId = res.body.data.user.id;
    });

    it('GET /api/users/:id returns user details', async () => {
      const res = await agent.get(`/api/users/${createdUserId}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.user.id).toBe(createdUserId);
    });

    it('PUT /api/users/:id updates user profile', async () => {
      const res = await agent
        .put(`/api/users/${createdUserId}`)
        .set('x-csrf-token', csrf)
        .send({ jobTitle: 'Senior Developer', department: 'Platform' });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.user.jobTitle).toBe('Senior Developer');
      expect(res.body.data.user.department).toBe('Platform');
    });

    it('POST /api/users/:id/roles assigns a new role', async () => {
      const res = await agent
        .post(`/api/users/${createdUserId}/roles`)
        .set('x-csrf-token', csrf)
        .send({ role: 'Manager' });
      expect(res.statusCode).toBe(200);
    });

    it('DELETE /api/users/:id archives the user (soft delete)', async () => {
      const res = await agent
        .delete(`/api/users/${createdUserId}`)
        .set('x-csrf-token', csrf);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.user.status).toBe('archived');
    });

    it('GET /api/users returns 401 for unauthenticated request', async () => {
      const anon = request.agent(app);
      const res = await anon.get('/api/users');
      expect(res.statusCode).toBe(401);
    });
  });

  // ─── PERMISSION GUARD — Guest cannot manage users ─────────────────────────

  describe('RBAC permission enforcement', () => {
    let ownerAgent;
    let ownerCsrf;
    let guestAgent;
    let guestCsrf;

    beforeAll(async () => {
      ownerAgent = request.agent(app);
      ({ csrf: ownerCsrf } = await register(ownerAgent, 'rbac-owner@iam.test'));
      await createOrg(ownerAgent, ownerCsrf, 'RBAC Org');

      // Invite and register a guest
      const inviteRes = await ownerAgent
        .post('/api/organizations/invite')
        .set('x-csrf-token', ownerCsrf)
        .send({ email: 'rbac-guest@iam.test', role: 'Guest' });
      const inviteToken = inviteRes.body.data.inviteToken;

      guestAgent = request.agent(app);
      ({ csrf: guestCsrf } = await register(guestAgent, 'rbac-guest@iam.test'));
      await guestAgent
        .post('/api/organizations/invitations/accept')
        .set('x-csrf-token', guestCsrf)
        .send({ token: inviteToken });
    });

    it('Owner can access GET /api/users', async () => {
      const res = await ownerAgent.get('/api/users');
      expect(res.statusCode).toBe(200);
    });

    it('Guest cannot create users (403)', async () => {
      const res = await guestAgent
        .post('/api/users')
        .set('x-csrf-token', guestCsrf)
        .send({
          firstName: 'Eve',
          lastName: 'stuber',
          email: 'eve@iam.test',
          role: 'User'
        });
      expect(res.statusCode).toBe(403);
    });

    it('Guest cannot create teams (403)', async () => {
      const res = await guestAgent
        .post('/api/teams')
        .set('x-csrf-token', guestCsrf)
        .send({ name: 'stuber Team' });
      expect(res.statusCode).toBe(403);
    });

    it('Guest cannot manage roles (403)', async () => {
      const res = await guestAgent
        .post('/api/roles')
        .set('x-csrf-token', guestCsrf)
        .send({ name: 'EvilRole' });
      expect(res.statusCode).toBe(403);
    });

    it('Guest CAN read teams (permitted)', async () => {
      const res = await guestAgent.get('/api/teams');
      expect(res.statusCode).toBe(200);
    });
  });

  // ─── TEAMS ────────────────────────────────────────────────────────────────

  describe('teams CRUD', () => {
    let agent;
    let csrf;
    let parentTeamId;
    let childTeamId;

    beforeAll(async () => {
      agent = request.agent(app);
      ({ csrf } = await register(agent, 'team-owner@iam.test'));
      await createOrg(agent, csrf, 'Team Org');
    });

    it('GET /api/teams returns empty list initially', async () => {
      const res = await agent.get('/api/teams');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.teams).toHaveLength(0);
    });

    it('POST /api/teams creates a team', async () => {
      const res = await agent
        .post('/api/teams')
        .set('x-csrf-token', csrf)
        .send({ name: 'Technology', description: 'Tech department', color: '#3b82f6' });
      expect(res.statusCode).toBe(201);
      expect(res.body.data.team.name).toBe('Technology');
      expect(res.body.data.team.color).toBe('#3b82f6');
      parentTeamId = res.body.data.team.id;
    });

    it('POST /api/teams creates a nested child team', async () => {
      const res = await agent
        .post('/api/teams')
        .set('x-csrf-token', csrf)
        .send({ name: 'Development', parentTeamId });
      expect(res.statusCode).toBe(201);
      expect(res.body.data.team.parentTeamId).toBe(parentTeamId);
      childTeamId = res.body.data.team.id;
    });

    it('GET /api/teams returns tree with nested children', async () => {
      const res = await agent.get('/api/teams');
      expect(res.statusCode).toBe(200);
      const tech = res.body.data.teams.find((t) => t.id === parentTeamId);
      expect(tech).toBeDefined();
      expect(tech.children.length).toBe(1);
      expect(tech.children[0].id).toBe(childTeamId);
    });

    it('GET /api/teams?flat=true returns flat list', async () => {
      const res = await agent.get('/api/teams?flat=true');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.teams.length).toBe(2);
    });

    it('GET /api/teams/:id returns team with members', async () => {
      const res = await agent.get(`/api/teams/${parentTeamId}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.team.id).toBe(parentTeamId);
      expect(Array.isArray(res.body.data.team.members)).toBe(true);
    });

    it('PUT /api/teams/:id updates team', async () => {
      const res = await agent
        .put(`/api/teams/${parentTeamId}`)
        .set('x-csrf-token', csrf)
        .send({ name: 'Engineering', description: 'Updated description' });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.team.name).toBe('Engineering');
    });

    it('POST /api/teams/:id/members adds a member', async () => {
      // Get the owner user id
      const usersRes = await agent.get('/api/users');
      const ownerId = usersRes.body.data.users[0].id;

      const res = await agent
        .post(`/api/teams/${parentTeamId}/members`)
        .set('x-csrf-token', csrf)
        .send({ userId: ownerId, role: 'lead' });
      expect(res.statusCode).toBe(201);
      expect(res.body.data.member.role).toBe('lead');
    });

    it('GET /api/teams/:id shows the added member', async () => {
      const res = await agent.get(`/api/teams/${parentTeamId}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.team.members.length).toBe(1);
      expect(res.body.data.team.members[0].role).toBe('lead');
    });

    it('DELETE /api/teams/:id/members/:userId removes a member', async () => {
      const usersRes = await agent.get('/api/users');
      const ownerId = usersRes.body.data.users[0].id;

      const res = await agent
        .delete(`/api/teams/${parentTeamId}/members/${ownerId}`)
        .set('x-csrf-token', csrf);
      expect(res.statusCode).toBe(200);
    });

    it('POST /api/teams/:id/archive archives a team', async () => {
      const res = await agent
        .post(`/api/teams/${childTeamId}/archive`)
        .set('x-csrf-token', csrf);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.team.archived).toBe(true);
    });

    it('archived team not shown in default list', async () => {
      const res = await agent.get('/api/teams?flat=true');
      expect(res.statusCode).toBe(200);
      const ids = res.body.data.teams.map((t) => t.id);
      expect(ids).not.toContain(childTeamId);
    });

    it('POST /api/teams/:id/restore restores an archived team', async () => {
      const res = await agent
        .post(`/api/teams/${childTeamId}/restore`)
        .set('x-csrf-token', csrf);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.team.archived).toBe(false);
    });

    it('DELETE /api/teams/:id deletes a team', async () => {
      const res = await agent
        .delete(`/api/teams/${childTeamId}`)
        .set('x-csrf-token', csrf);
      expect(res.statusCode).toBe(200);
    });
  });

  // ─── NESTED TEAM HIERARCHY ────────────────────────────────────────────────

  describe('nested team hierarchy', () => {
    let agent;
    let csrf;

    beforeAll(async () => {
      agent = request.agent(app);
      ({ csrf } = await register(agent, 'hierarchy@iam.test'));
      await createOrg(agent, csrf, 'Hierarchy Org');
    });

    it('builds multi-level hierarchy correctly', async () => {
      const r1 = await agent
        .post('/api/teams').set('x-csrf-token', csrf)
        .send({ name: 'Company' });
      const companyId = r1.body.data.team.id;

      const r2 = await agent
        .post('/api/teams').set('x-csrf-token', csrf)
        .send({ name: 'Technology', parentTeamId: companyId });
      const techId = r2.body.data.team.id;

      await agent
        .post('/api/teams').set('x-csrf-token', csrf)
        .send({ name: 'Development', parentTeamId: techId });

      await agent
        .post('/api/teams').set('x-csrf-token', csrf)
        .send({ name: 'QA', parentTeamId: techId });

      const res = await agent.get('/api/teams');
      expect(res.statusCode).toBe(200);

      const company = res.body.data.teams.find((t) => t.name === 'Company');
      expect(company).toBeDefined();
      expect(company.children).toHaveLength(1);

      const tech = company.children[0];
      expect(tech.name).toBe('Technology');
      expect(tech.children).toHaveLength(2);

      const childNames = tech.children.map((c) => c.name).sort();
      expect(childNames).toEqual(['Development', 'QA']);
    });
  });

  // ─── MULTI-TENANT ISOLATION ───────────────────────────────────────────────

  describe('IAM multi-tenant isolation', () => {
    let tenantA;
    let tenantB;
    let csrfA;
    let csrfB;
    let orgBTeamId;

    beforeAll(async () => {
      tenantA = request.agent(app);
      tenantB = request.agent(app);

      ({ csrf: csrfA } = await register(tenantA, 'iso-a@iam.test'));
      await createOrg(tenantA, csrfA, 'ISO Org A');

      ({ csrf: csrfB } = await register(tenantB, 'iso-b@iam.test'));
      await createOrg(tenantB, csrfB, 'ISO Org B');

      const teamRes = await tenantB
        .post('/api/teams').set('x-csrf-token', csrfB)
        .send({ name: 'Org B Secret Team' });
      orgBTeamId = teamRes.body.data.team.id;
    });

    it('tenant A cannot see tenant B teams', async () => {
      const resA = await tenantA.get('/api/teams?flat=true');
      const idsA = resA.body.data.teams.map((t) => t.id);
      expect(idsA).not.toContain(orgBTeamId);
    });

    it('tenant A cannot get tenant B team by id', async () => {
      const res = await tenantA.get(`/api/teams/${orgBTeamId}`);
      expect(res.statusCode).toBe(404);
    });

    it('tenant A cannot update tenant B team', async () => {
      const res = await tenantA
        .put(`/api/teams/${orgBTeamId}`)
        .set('x-csrf-token', csrfA)
        .send({ name: 'Stolen Name' });
      expect(res.statusCode).toBe(404);
    });

    it('tenant A users list is isolated from tenant B', async () => {
      const resA = await tenantA.get('/api/users');
      const resB = await tenantB.get('/api/users');
      const orgAIds = resA.body.data.users.map((u) => u.id);
      const orgBIds = resB.body.data.users.map((u) => u.id);
      const overlap = orgAIds.filter((id) => orgBIds.includes(id));
      expect(overlap).toHaveLength(0);
    });
  });

  // ─── USER STATUS TRANSITIONS ──────────────────────────────────────────────

  describe('user status management', () => {
    let agent;
    let csrf;
    let targetUserId;

    beforeAll(async () => {
      agent = request.agent(app);
      ({ csrf } = await register(agent, 'status-owner@iam.test'));
      await createOrg(agent, csrf, 'Status Org');

      const res = await agent
        .post('/api/users')
        .set('x-csrf-token', csrf)
        .send({ firstName: 'Target', lastName: 'User', email: 'target@iam.test', role: 'User' });
      targetUserId = res.body.data.user.id;
    });

    it('can suspend a user', async () => {
      const res = await agent
        .put(`/api/users/${targetUserId}`)
        .set('x-csrf-token', csrf)
        .send({ status: 'suspended' });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.user.status).toBe('suspended');
    });

    it('can reactivate a user', async () => {
      const res = await agent
        .put(`/api/users/${targetUserId}`)
        .set('x-csrf-token', csrf)
        .send({ status: 'active' });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.user.status).toBe('active');
    });

    it('can force logout a user', async () => {
      const res = await agent
        .post(`/api/users/${targetUserId}/force-logout`)
        .set('x-csrf-token', csrf);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.message).toContain('revoked');
    });
  });
});
