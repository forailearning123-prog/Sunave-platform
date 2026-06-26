import {
  PERMISSION,
  SETTINGS_CATEGORY,
  createOrganizationSchema,
  fail,
  inviteMemberSchema,
  ok,
  switchOrganizationSchema,
  updateMemberSchema,
  updateOrganizationSchema,
  updateSettingsSchema
} from '@sunave/core';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { v4 as uuid } from 'uuid';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg, requireOrgPermission } from '../middleware/tenant.js';
import { hashToken } from '../security/tokens.js';

function parseSchema(schema, payload) {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { error: fail('VALIDATION_ERROR', 'Validation failed.', parsed.error.flatten()) };
  }
  return { data: parsed.data };
}

function setCurrentOrgCookie(res, orgId) {
  res.cookie('current_org_id', orgId, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}

export function buildOrganizationsRouter(orgRepo) {
  const router = Router();

  const readLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
  const writeLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

  // ─── List user's organizations ─────────────────────────────────────────────
  router.get('/', readLimit, requireAuth, async (req, res) => {
    const orgs = await orgRepo.listOrganizationsForUser(req.auth.sub);
    return res.status(200).json(ok({ organizations: orgs }));
  });

  // ─── Create organization ───────────────────────────────────────────────────
  router.post('/', writeLimit, requireAuth, async (req, res) => {
    const parsed = parseSchema(createOrganizationSchema, req.body);
    if (parsed.error) return res.status(400).json(parsed.error);

    const org = await orgRepo.createOrganization(req.auth.sub, parsed.data);
    setCurrentOrgCookie(res, org.id);
    return res.status(201).json(ok({ organization: org }));
  });

  // ─── Get current active organization ──────────────────────────────────────
  router.get('/current', readLimit, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const org = await orgRepo.findOrganizationById(req.org.id);
    return res.status(200).json(ok({ organization: { ...org, role: req.org.role } }));
  });

  // ─── Switch active organization ────────────────────────────────────────────
  router.post('/switch', writeLimit, requireAuth, async (req, res) => {
    const parsed = parseSchema(switchOrganizationSchema, req.body);
    if (parsed.error) return res.status(400).json(parsed.error);

    const membership = await orgRepo.findMembershipByOrgAndUser(parsed.data.organizationId, req.auth.sub);
    if (!membership) {
      return res.status(403).json(fail('FORBIDDEN', 'You are not a member of that organization.'));
    }

    setCurrentOrgCookie(res, parsed.data.organizationId);
    const org = await orgRepo.findOrganizationById(parsed.data.organizationId);
    return res.status(200).json(ok({ organization: { ...org, role: membership.role } }));
  });

  // ─── Invite member ─────────────────────────────────────────────────────────
  router.post('/invite', writeLimit, requireAuth, requireOrg(orgRepo),
    requireOrgPermission(PERMISSION.MEMBER_INVITE), async (req, res) => {
      const parsed = parseSchema(inviteMemberSchema, req.body);
      if (parsed.error) return res.status(400).json(parsed.error);

      const rawToken = `${uuid()}${uuid()}`;
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const invitation = await orgRepo.createInvitation(req.org.id, req.auth.sub, parsed.data, tokenHash, expiresAt);

      return res.status(201).json(ok({
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expires_at
        },
        ...(config.env !== 'production' ? { inviteToken: rawToken } : {})
      }));
    });

  // ─── Accept invitation ─────────────────────────────────────────────────────
  router.post('/invitations/accept', writeLimit, requireAuth, async (req, res) => {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json(fail('VALIDATION_ERROR', 'Invitation token required.'));
    }

    const tokenHash = hashToken(token);
    const invitation = await orgRepo.findInvitationByToken(tokenHash);
    if (!invitation) {
      return res.status(400).json(fail('INVALID_INVITATION', 'Invitation token is invalid or expired.'));
    }

    const accepted = await orgRepo.acceptInvitation(invitation.id, req.auth.sub);
    if (!accepted) {
      return res.status(409).json(fail('ALREADY_ACCEPTED', 'Invitation has already been accepted.'));
    }

    setCurrentOrgCookie(res, invitation.organization_id);
    return res.status(200).json(ok({
      message: `Joined ${invitation.organization_name} as ${invitation.role}.`,
      organizationId: invitation.organization_id
    }));
  });

  // ─── List invitations ──────────────────────────────────────────────────────
  router.get('/invitations', readLimit, requireAuth, requireOrg(orgRepo),
    requireOrgPermission(PERMISSION.MEMBER_INVITE), async (req, res) => {
      const invitations = await orgRepo.listInvitations(req.org.id);
      return res.status(200).json(ok({ invitations }));
    });

  // ─── List members ──────────────────────────────────────────────────────────
  router.get('/members', readLimit, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const members = await orgRepo.listMembers(req.org.id);
    return res.status(200).json(ok({ members }));
  });

  // ─── Update member ─────────────────────────────────────────────────────────
  router.put('/members/:id', writeLimit, requireAuth, requireOrg(orgRepo),
    requireOrgPermission(PERMISSION.MEMBER_MANAGE), async (req, res) => {
      const parsed = parseSchema(updateMemberSchema, req.body);
      if (parsed.error) return res.status(400).json(parsed.error);

      const member = await orgRepo.updateMember(req.params.id, req.org.id, req.auth.sub, parsed.data);
      if (!member) {
        return res.status(404).json(fail('NOT_FOUND', 'Member not found.'));
      }

      return res.status(200).json(ok({ member }));
    });

  // ─── Remove member ─────────────────────────────────────────────────────────
  router.delete('/members/:id', writeLimit, requireAuth, requireOrg(orgRepo),
    requireOrgPermission(PERMISSION.MEMBER_MANAGE), async (req, res) => {
      const removed = await orgRepo.removeMember(req.params.id, req.org.id, req.auth.sub);
      if (!removed) {
        return res.status(404).json(fail('NOT_FOUND', 'Member not found or cannot remove Owner.'));
      }
      return res.status(200).json(ok({ message: 'Member removed.' }));
    });

  // ─── Get organization settings ─────────────────────────────────────────────
  router.get('/settings', readLimit, requireAuth, requireOrg(orgRepo),
    requireOrgPermission(PERMISSION.SETTINGS_READ), async (req, res) => {
      const settings = await orgRepo.getSettings(req.org.id);
      return res.status(200).json(ok({ settings }));
    });

  // ─── Update organization settings by category ──────────────────────────────
  router.put('/settings/:category', writeLimit, requireAuth, requireOrg(orgRepo),
    requireOrgPermission(PERMISSION.SETTINGS_WRITE), async (req, res) => {
      if (!SETTINGS_CATEGORY.includes(req.params.category)) {
        return res.status(400).json(fail('INVALID_CATEGORY', `Category must be one of: ${SETTINGS_CATEGORY.join(', ')}.`));
      }

      const parsed = parseSchema(updateSettingsSchema, req.body);
      if (parsed.error) return res.status(400).json(parsed.error);

      await orgRepo.upsertSettings(req.org.id, req.params.category, parsed.data.settings);
      return res.status(200).json(ok({ message: 'Settings updated.' }));
    });

  // ─── Audit log ─────────────────────────────────────────────────────────────
  router.get('/audit', readLimit, requireAuth, requireOrg(orgRepo),
    requireOrgPermission(PERMISSION.ORG_MANAGE), async (req, res) => {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const logs = await orgRepo.listAuditLogs(req.org.id, limit);
      return res.status(200).json(ok({ logs }));
    });

  // ─── Get single organization ───────────────────────────────────────────────
  router.get('/:id', readLimit, requireAuth, async (req, res) => {
    const membership = await orgRepo.findMembershipByOrgAndUser(req.params.id, req.auth.sub);
    if (!membership) {
      return res.status(403).json(fail('FORBIDDEN', 'Access denied.'));
    }

    const org = await orgRepo.findOrganizationById(req.params.id);
    if (!org) {
      return res.status(404).json(fail('NOT_FOUND', 'Organization not found.'));
    }

    return res.status(200).json(ok({ organization: { ...org, role: membership.role } }));
  });

  // ─── Update organization ───────────────────────────────────────────────────
  router.put('/:id', writeLimit, requireAuth, async (req, res) => {
    const membership = await orgRepo.findMembershipByOrgAndUser(req.params.id, req.auth.sub);
    if (!membership) {
      return res.status(403).json(fail('FORBIDDEN', 'Access denied.'));
    }
    if (!['Owner', 'Admin'].includes(membership.role)) {
      return res.status(403).json(fail('FORBIDDEN', 'Insufficient permissions.'));
    }

    const parsed = parseSchema(updateOrganizationSchema, req.body);
    if (parsed.error) return res.status(400).json(parsed.error);

    const org = await orgRepo.updateOrganization(req.params.id, req.auth.sub, parsed.data);
    if (!org) {
      return res.status(404).json(fail('NOT_FOUND', 'Organization not found.'));
    }

    return res.status(200).json(ok({ organization: org }));
  });

  // ─── Archive organization ──────────────────────────────────────────────────
  router.post('/:id/archive', writeLimit, requireAuth, async (req, res) => {
    const membership = await orgRepo.findMembershipByOrgAndUser(req.params.id, req.auth.sub);
    if (!membership || membership.role !== 'Owner') {
      return res.status(403).json(fail('FORBIDDEN', 'Only the Owner can archive an organization.'));
    }

    const org = await orgRepo.archiveOrganization(req.params.id, req.auth.sub);
    if (!org) {
      return res.status(409).json(fail('CONFLICT', 'Organization is not active or not found.'));
    }

    return res.status(200).json(ok({ organization: org }));
  });

  // ─── Restore organization ──────────────────────────────────────────────────
  router.post('/:id/restore', writeLimit, requireAuth, async (req, res) => {
    const membership = await orgRepo.findMembershipByOrgAndUser(req.params.id, req.auth.sub);
    if (!membership || membership.role !== 'Owner') {
      return res.status(403).json(fail('FORBIDDEN', 'Only the Owner can restore an organization.'));
    }

    const org = await orgRepo.restoreOrganization(req.params.id, req.auth.sub);
    if (!org) {
      return res.status(409).json(fail('CONFLICT', 'Organization is not archived or not found.'));
    }

    return res.status(200).json(ok({ organization: org }));
  });

  return router;
}
