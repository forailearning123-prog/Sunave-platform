import { fail } from '@sunave/core';

/**
 * DB-backed permission engine.
 * Checks role → permission relationships stored in the role_permissions table.
 * Use this service for all IAM-protected routes instead of inline permission checks.
 */
export function createPermissionService(pool) {
  async function hasPermission(roleName, permissionName) {
    if (!roleName || !permissionName) return false;
    const result = await pool.query(
      `SELECT 1
         FROM role_permissions rp
         JOIN roles r ON r.id = rp.role_id
         JOIN permissions p ON p.id = rp.permission_id
        WHERE r.name = $1 AND p.name = $2
        LIMIT 1`,
      [roleName, permissionName]
    );
    return result.rows.length > 0;
  }

  async function hasAnyPermission(roleName, permissionNames) {
    if (!roleName || !permissionNames?.length) return false;
    const result = await pool.query(
      `SELECT 1
         FROM role_permissions rp
         JOIN roles r ON r.id = rp.role_id
         JOIN permissions p ON p.id = rp.permission_id
        WHERE r.name = $1 AND p.name = ANY($2::text[])
        LIMIT 1`,
      [roleName, permissionNames]
    );
    return result.rows.length > 0;
  }

  async function hasAllPermissions(roleName, permissionNames) {
    if (!roleName || !permissionNames?.length) return false;
    const result = await pool.query(
      `SELECT COUNT(DISTINCT p.name) AS cnt
         FROM role_permissions rp
         JOIN roles r ON r.id = rp.role_id
         JOIN permissions p ON p.id = rp.permission_id
        WHERE r.name = $1 AND p.name = ANY($2::text[])`,
      [roleName, permissionNames]
    );
    return Number(result.rows[0]?.cnt) === permissionNames.length;
  }

  /**
   * Express middleware factory.
   * Must be used AFTER requireAuth and requireOrg so that req.org.role is available.
   */
  function requirePermission(permissionName) {
    return async (req, res, next) => {
      const role = req.org?.role;
      if (!role) {
        return res.status(403).json(fail('FORBIDDEN', 'Insufficient permissions.'));
      }
      try {
        const allowed = await hasPermission(role, permissionName);
        if (!allowed) {
          return res.status(403).json(fail('FORBIDDEN', 'Insufficient permissions.'));
        }
        return next();
      } catch {
        return res.status(500).json(fail('INTERNAL_ERROR', 'Permission check failed.'));
      }
    };
  }

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    requirePermission
  };
}
