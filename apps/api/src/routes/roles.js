import {
  PERMISSION,
  assignPermissionsSchema,
  createRoleSchema,
  updateRoleSchema,
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

export function buildRolesRouter(roleRepo, orgRepo, permService) {
  const router = Router();
  const { requirePermission } = permService;

  const readLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
  const writeLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

  // ─── List permissions ──────────────────────────────────────────────────────
  router.get('/permissions', readLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.PERMISSIONS_READ), async (_req, res) => {
      const permissions = await roleRepo.listPermissions();
      return res.status(200).json(ok({ permissions }));
    });

  // ─── List roles ────────────────────────────────────────────────────────────
  router.get('/', readLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.ROLES_READ), async (req, res) => {
      const roles = await roleRepo.listRoles(req.org.id);
      return res.status(200).json(ok({ roles }));
    });

  // ─── Create role ───────────────────────────────────────────────────────────
  router.post('/', writeLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.ROLES_MANAGE), async (req, res) => {
      const parsed = parseSchema(createRoleSchema, req.body);
      if (parsed.error) return res.status(400).json(parsed.error);

      const result = await roleRepo.createRole(req.org.id, req.auth.sub, parsed.data);
      if (result.error === 'DUPLICATE_ROLE') {
        return res.status(409).json(fail('CONFLICT', 'A role with that name already exists.'));
      }
      return res.status(201).json(ok({ role: result.role }));
    });

  // ─── Get role by id ────────────────────────────────────────────────────────
  router.get('/:id', readLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.ROLES_READ), async (req, res) => {
      const role = await roleRepo.findRoleById(req.params.id);
      if (!role) return res.status(404).json(fail('NOT_FOUND', 'Role not found.'));

      const permissions = await roleRepo.listPermissionsForRole(req.params.id);
      return res.status(200).json(ok({ role: { ...role, permissions } }));
    });

  // ─── Update role ───────────────────────────────────────────────────────────
  router.put('/:id', writeLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.ROLES_MANAGE), async (req, res) => {
      const parsed = parseSchema(updateRoleSchema, req.body);
      if (parsed.error) return res.status(400).json(parsed.error);

      const result = await roleRepo.updateRole(req.params.id, req.org.id, req.auth.sub, parsed.data);
      if (!result) return res.status(404).json(fail('NOT_FOUND', 'Role not found.'));
      if (result.error === 'SYSTEM_ROLE') {
        return res.status(403).json(fail('FORBIDDEN', 'System roles cannot be modified.'));
      }
      return res.status(200).json(ok({ role: result.role }));
    });

  // ─── Delete role ───────────────────────────────────────────────────────────
  router.delete('/:id', writeLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.ROLES_MANAGE), async (req, res) => {
      const result = await roleRepo.deleteRole(req.params.id, req.org.id, req.auth.sub);
      if (!result) return res.status(404).json(fail('NOT_FOUND', 'Role not found.'));
      if (result.error === 'SYSTEM_ROLE') {
        return res.status(403).json(fail('FORBIDDEN', 'System roles cannot be deleted.'));
      }
      return res.status(200).json(ok({ message: 'Role deleted.' }));
    });

  // ─── Assign permissions to role ────────────────────────────────────────────
  router.put('/:id/permissions', writeLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.ROLES_MANAGE), async (req, res) => {
      const parsed = parseSchema(assignPermissionsSchema, req.body);
      if (parsed.error) return res.status(400).json(parsed.error);

      const permissions = await roleRepo.assignPermissionsToRole(
        req.params.id, req.org.id, req.auth.sub, parsed.data.permissionIds
      );
      if (!permissions) return res.status(404).json(fail('NOT_FOUND', 'Role not found.'));
      return res.status(200).json(ok({ permissions }));
    });

  return router;
}
