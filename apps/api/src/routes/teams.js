import {
  PERMISSION,
  addTeamMemberSchema,
  createTeamSchema,
  updateTeamSchema,
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

export function buildTeamsRouter(teamRepo, orgRepo, permService) {
  const router = Router();
  const { requirePermission } = permService;

  const readLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
  const writeLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

  // ─── List teams (tree structure) ───────────────────────────────────────────
  router.get('/', readLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.TEAMS_READ), async (req, res) => {
      const includeArchived = req.query.includeArchived === 'true';
      const flat = req.query.flat === 'true';

      if (flat) {
        const teams = await teamRepo.listTeams(req.org.id, { includeArchived });
        return res.status(200).json(ok({ teams }));
      }

      const tree = await teamRepo.listTeamsTree(req.org.id, { includeArchived });
      return res.status(200).json(ok({ teams: tree }));
    });

  // ─── Create team ───────────────────────────────────────────────────────────
  router.post('/', writeLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.TEAMS_CREATE), async (req, res) => {
      const parsed = parseSchema(createTeamSchema, req.body);
      if (parsed.error) return res.status(400).json(parsed.error);

      const team = await teamRepo.createTeam(req.org.id, req.auth.sub, parsed.data);
      return res.status(201).json(ok({ team }));
    });

  // ─── Get team by id ────────────────────────────────────────────────────────
  router.get('/:id', readLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.TEAMS_READ), async (req, res) => {
      const team = await teamRepo.findTeamById(req.params.id, req.org.id);
      if (!team) return res.status(404).json(fail('NOT_FOUND', 'Team not found.'));

      const members = await teamRepo.listTeamMembers(req.params.id);
      return res.status(200).json(ok({ team: { ...team, members } }));
    });

  // ─── Update team ───────────────────────────────────────────────────────────
  router.put('/:id', writeLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.TEAMS_UPDATE), async (req, res) => {
      const parsed = parseSchema(updateTeamSchema, req.body);
      if (parsed.error) return res.status(400).json(parsed.error);

      const team = await teamRepo.updateTeam(req.params.id, req.org.id, req.auth.sub, parsed.data);
      if (!team) return res.status(404).json(fail('NOT_FOUND', 'Team not found.'));
      return res.status(200).json(ok({ team }));
    });

  // ─── Delete team ───────────────────────────────────────────────────────────
  router.delete('/:id', writeLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.TEAMS_DELETE), async (req, res) => {
      const result = await teamRepo.deleteTeam(req.params.id, req.org.id, req.auth.sub);
      if (!result) return res.status(404).json(fail('NOT_FOUND', 'Team not found.'));
      return res.status(200).json(ok({ message: 'Team deleted.' }));
    });

  // ─── Archive team ──────────────────────────────────────────────────────────
  router.post('/:id/archive', writeLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.TEAMS_UPDATE), async (req, res) => {
      const team = await teamRepo.archiveTeam(req.params.id, req.org.id, req.auth.sub);
      if (!team) return res.status(409).json(fail('CONFLICT', 'Team not found or already archived.'));
      return res.status(200).json(ok({ team }));
    });

  // ─── Restore team ──────────────────────────────────────────────────────────
  router.post('/:id/restore', writeLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.TEAMS_UPDATE), async (req, res) => {
      const team = await teamRepo.restoreTeam(req.params.id, req.org.id, req.auth.sub);
      if (!team) return res.status(409).json(fail('CONFLICT', 'Team not found or not archived.'));
      return res.status(200).json(ok({ team }));
    });

  // ─── Add team member ───────────────────────────────────────────────────────
  router.post('/:id/members', writeLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.TEAMS_MANAGE), async (req, res) => {
      const parsed = parseSchema(addTeamMemberSchema, req.body);
      if (parsed.error) return res.status(400).json(parsed.error);

      const member = await teamRepo.addTeamMember(
        req.params.id, req.org.id, req.auth.sub,
        parsed.data.userId, parsed.data.role
      );
      if (!member) return res.status(404).json(fail('NOT_FOUND', 'Team not found or user is not an org member.'));
      return res.status(201).json(ok({ member }));
    });

  // ─── Remove team member ────────────────────────────────────────────────────
  router.delete('/:id/members/:userId', writeLimit, requireAuth, requireOrg(orgRepo),
    requirePermission(PERMISSION.TEAMS_MANAGE), async (req, res) => {
      const result = await teamRepo.removeTeamMember(
        req.params.id, req.org.id, req.auth.sub, req.params.userId
      );
      if (!result) return res.status(404).json(fail('NOT_FOUND', 'Team member not found.'));
      return res.status(200).json(ok({ message: 'Member removed from team.' }));
    });

  return router;
}
