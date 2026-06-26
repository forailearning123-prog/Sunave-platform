import { fail, hasPermission } from '@sunave/core';

/**
 * Resolves the active organization for the authenticated user.
 * Reads the current_org_id cookie; falls back to the user's first active membership.
 * Sets req.org = { id, name, slug, role } on success.
 * Must be used after requireAuth.
 */
export function requireOrg(orgRepo) {
  return async (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json(fail('UNAUTHORIZED', 'Authentication required.'));
    }

    const orgId = req.cookies.current_org_id;
    let membership = null;

    if (orgId) {
      membership = await orgRepo.findMembershipByOrgAndUser(orgId, req.auth.sub);
    }

    if (!membership) {
      membership = await orgRepo.findFirstActiveMembership(req.auth.sub);
    }

    if (!membership) {
      return res.status(403).json(fail('NO_ORGANIZATION', 'No active organization membership found.'));
    }

    req.org = {
      id: membership.organization_id,
      name: membership.organization_name,
      slug: membership.slug,
      role: membership.role
    };

    return next();
  };
}

/**
 * Permission guard that checks req.org.role.
 * Must be used after requireOrg.
 */
export function requireOrgPermission(permission) {
  return (req, res, next) => {
    if (!req.org?.role || !hasPermission(req.org.role, permission)) {
      return res.status(403).json(fail('FORBIDDEN', 'Insufficient permissions.'));
    }
    return next();
  };
}
