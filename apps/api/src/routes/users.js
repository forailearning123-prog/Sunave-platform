import {
  PERMISSION,
  createUserSchema,
  updateUserSchema,
  assignUserRoleSchema,
  assignUserTeamsSchema,
  fail,
  ok
} from '@sunave/core';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/tenant.js';

function parseSchema(schema, payload) {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { error: fail('VALIDATION_ERROR', 'Validation failed.', parsed.error.flatten()) };
  }
  return { data: parsed.data };
}

export function buildUsersRouter(userRepo, orgRepo, permService) {
  const router = Router();
  const { requirePermission } = permService;

  const readLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
  const writeLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

  // ─── List users in org ─────────────────────────────────────────────────────
  router.get('/', readLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.USERS_READ), async (req, res) => {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const status = req.query.status || undefined;

      const users = await userRepo.listUsersInOrg(req.org.id, { limit, offset, status });
      return res.status(200).json(ok({ users }));
    });

  // ─── Create user ───────────────────────────────────────────────────────────
  router.post('/', writeLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.USERS_CREATE), async (req, res) => {
      const parsed = parseSchema(createUserSchema, req.body);
      if (parsed.error) return res.status(400).json(parsed.error);

      const user = await userRepo.createUser(req.org.id, req.auth.sub, parsed.data);
      if (!user) {
        return res.status(409).json(fail('CONFLICT', 'A user with that email already exists.'));
      }
      return res.status(201).json(ok({ user }));
    });

  // ─── Get user by id ────────────────────────────────────────────────────────
  router.get('/:id', readLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.USERS_READ), async (req, res) => {
      const user = await userRepo.findUserByIdInOrg(req.params.id, req.org.id);
      if (!user) return res.status(404).json(fail('NOT_FOUND', 'User not found.'));
      return res.status(200).json(ok({ user }));
    });

  // ─── Update user ───────────────────────────────────────────────────────────
  router.put('/:id', writeLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.USERS_UPDATE), async (req, res) => {
      const parsed = parseSchema(updateUserSchema, req.body);
      if (parsed.error) return res.status(400).json(parsed.error);

      const user = await userRepo.updateUser(req.params.id, req.org.id, req.auth.sub, parsed.data);
      if (!user) return res.status(404).json(fail('NOT_FOUND', 'User not found.'));
      return res.status(200).json(ok({ user }));
    });

  // ─── Deactivate / archive user (soft delete) ───────────────────────────────
  router.delete('/:id', writeLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.USERS_DELETE), async (req, res) => {
      const user = await userRepo.setUserStatus(req.params.id, req.org.id, req.auth.sub, 'archived');
      if (!user) return res.status(404).json(fail('NOT_FOUND', 'User not found.'));
      return res.status(200).json(ok({ user }));
    });

  // ─── Assign user role ──────────────────────────────────────────────────────
  router.post('/:id/roles', writeLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.ROLES_MANAGE), async (req, res) => {
      const parsed = parseSchema(assignUserRoleSchema, req.body);
      if (parsed.error) return res.status(400).json(parsed.error);

      const ok_ = await userRepo.assignUserRole(req.params.id, req.org.id, req.auth.sub, parsed.data.role);
      if (!ok_) return res.status(400).json(fail('FORBIDDEN', 'Cannot change role of the Owner.'));
      return res.status(200).json(ok({ message: `Role updated to ${parsed.data.role}.` }));
    });

  // ─── Assign user to team ───────────────────────────────────────────────────
  router.post('/:id/teams', writeLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.TEAMS_MANAGE), async (req, res) => {
      const parsed = parseSchema(assignUserTeamsSchema, req.body);
      if (parsed.error) return res.status(400).json(parsed.error);

      const result = await userRepo.assignUserToTeam(
        req.params.id, req.org.id, req.auth.sub,
        parsed.data.teamId, parsed.data.role
      );
      if (!result) return res.status(404).json(fail('NOT_FOUND', 'Team not found or user is not an org member.'));
      return res.status(200).json(ok({ message: 'User assigned to team.' }));
    });

  // ─── Force logout ──────────────────────────────────────────────────────────
  router.post('/:id/force-logout', writeLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.USERS_UPDATE), async (req, res) => {
      await userRepo.forceLogout(req.params.id, req.org.id, req.auth.sub);
      return res.status(200).json(ok({ message: 'User sessions revoked.' }));
    });

  return router;
}
