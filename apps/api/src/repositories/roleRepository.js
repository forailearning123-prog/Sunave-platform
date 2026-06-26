import { v4 as uuid } from 'uuid';

function toRoleOutput(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description,
    systemRole: row.system_role,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toPermissionOutput(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description
  };
}

export function createRoleRepository(pool) {
  return {
    // ─── Roles ───────────────────────────────────────────────────────────────

    async listRoles(orgId) {
      // Returns system roles + org-specific roles
      const result = await pool.query(
        `SELECT * FROM roles
          WHERE organization_id = $1 OR organization_id IS NULL
          ORDER BY system_role DESC, name ASC`,
        [orgId]
      );
      return result.rows.map(toRoleOutput);
    },

    async findRoleById(roleId) {
      const result = await pool.query('SELECT * FROM roles WHERE id = $1', [roleId]);
      return result.rows[0] ? toRoleOutput(result.rows[0]) : null;
    },

    async createRole(orgId, actorId, input) {
      // Prevent duplicate names within the org
      const existing = await pool.query(
        'SELECT id FROM roles WHERE organization_id = $1 AND name = $2',
        [orgId, input.name]
      );
      if (existing.rows[0]) return { error: 'DUPLICATE_ROLE' };

      const id = uuid();
      const result = await pool.query(
        `INSERT INTO roles (id, organization_id, name, description, system_role)
         VALUES ($1,$2,$3,$4,false) RETURNING *`,
        [id, orgId, input.name, input.description || '']
      );

      await this.createAuditLog({
        organizationId: orgId,
        userId: actorId,
        action: 'role.created',
        resource: `role:${id}`,
        metadata: { name: input.name }
      });

      return { role: toRoleOutput(result.rows[0]) };
    },

    async updateRole(roleId, orgId, actorId, input) {
      // Cannot update system roles
      const existing = await pool.query(
        'SELECT * FROM roles WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL)',
        [roleId, orgId]
      );
      const role = existing.rows[0];
      if (!role) return null;
      if (role.system_role) return { error: 'SYSTEM_ROLE' };

      const fields = [];
      const params = [roleId];

      if (input.name !== undefined) {
        params.push(input.name);
        fields.push(`name = $${params.length}`);
      }
      if (input.description !== undefined) {
        params.push(input.description);
        fields.push(`description = $${params.length}`);
      }

      if (!fields.length) return { role: toRoleOutput(role) };

      params.push(new Date());
      fields.push(`updated_at = $${params.length}`);

      const result = await pool.query(
        `UPDATE roles SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
        params
      );

      await this.createAuditLog({
        organizationId: orgId,
        userId: actorId,
        action: 'role.updated',
        resource: `role:${roleId}`,
        metadata: { fields: Object.keys(input) }
      });

      return { role: toRoleOutput(result.rows[0]) };
    },

    async deleteRole(roleId, orgId, actorId) {
      const existing = await pool.query(
        'SELECT * FROM roles WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL)',
        [roleId, orgId]
      );
      const role = existing.rows[0];
      if (!role) return null;
      if (role.system_role) return { error: 'SYSTEM_ROLE' };

      await pool.query('DELETE FROM roles WHERE id = $1', [roleId]);

      await this.createAuditLog({
        organizationId: orgId,
        userId: actorId,
        action: 'role.deleted',
        resource: `role:${roleId}`,
        metadata: { name: role.name }
      });

      return { deleted: true };
    },

    // ─── Permissions ─────────────────────────────────────────────────────────

    async listPermissions() {
      const result = await pool.query(
        'SELECT * FROM permissions ORDER BY category ASC, name ASC'
      );
      return result.rows.map(toPermissionOutput);
    },

    async listPermissionsForRole(roleId) {
      const result = await pool.query(
        `SELECT p.*
           FROM permissions p
           JOIN role_permissions rp ON rp.permission_id = p.id
          WHERE rp.role_id = $1
          ORDER BY p.category ASC, p.name ASC`,
        [roleId]
      );
      return result.rows.map(toPermissionOutput);
    },

    async assignPermissionsToRole(roleId, orgId, actorId, permissionIds) {
      const roleCheck = await pool.query(
        'SELECT * FROM roles WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL)',
        [roleId, orgId]
      );
      if (!roleCheck.rows[0]) return null;

      // Remove all existing and re-assign (clean slate approach)
      await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

      for (const permId of permissionIds) {
        const rpId = uuid();
        await pool.query(
          `INSERT INTO role_permissions (id, role_id, permission_id)
           VALUES ($1,$2,$3)
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [rpId, roleId, permId]
        );
      }

      await this.createAuditLog({
        organizationId: orgId,
        userId: actorId,
        action: 'permissions.changed',
        resource: `role:${roleId}`,
        metadata: { permissionIds }
      });

      return this.listPermissionsForRole(roleId);
    },

    async createAuditLog({ organizationId, userId, action, resource, metadata }) {
      try {
        await pool.query(
          `INSERT INTO audit_logs (id, organization_id, user_id, action, resource, metadata)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [uuid(), organizationId, userId || null, action, resource || '', JSON.stringify(metadata)]
        );
      } catch {
        // Audit log failure must never break the main flow
      }
    }
  };
}
