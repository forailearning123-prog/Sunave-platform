import { v4 as uuid } from 'uuid';
import argon2 from 'argon2';

function toUserOutput(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name || `${row.first_name} ${row.last_name}`,
    email: row.email,
    avatar: row.avatar_url,
    phone: row.phone,
    timezone: row.timezone,
    language: row.language,
    jobTitle: row.job_title,
    department: row.department,
    employeeId: row.employee_id,
    status: row.status,
    lastLogin: row.last_login,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toUserWithOrgOutput(row) {
  return {
    ...toUserOutput(row),
    orgRole: row.org_role,
    orgMemberId: row.org_member_id,
    orgMemberStatus: row.org_member_status
  };
}

export function createUserRepository(pool) {
  return {
    async listUsersInOrg(orgId, { limit = 50, offset = 0, status } = {}) {
      const params = [orgId, limit, offset];
      let where = 'om.organization_id = $1 AND om.status = \'active\'';
      if (status) {
        params.push(status);
        where += ` AND u.status = $${params.length}`;
      }

      const result = await pool.query(
        `SELECT u.*,
                om.role AS org_role,
                om.id   AS org_member_id,
                om.status AS org_member_status
           FROM users u
           JOIN organization_members om ON om.user_id = u.id
          WHERE ${where}
          ORDER BY u.created_at ASC
          LIMIT $2 OFFSET $3`,
        params
      );
      return result.rows.map(toUserWithOrgOutput);
    },

    async findUserById(userId) {
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      return result.rows[0] ? toUserOutput(result.rows[0]) : null;
    },

    async findUserByIdInOrg(userId, orgId) {
      const result = await pool.query(
        `SELECT u.*,
                om.role AS org_role,
                om.id   AS org_member_id,
                om.status AS org_member_status
           FROM users u
           JOIN organization_members om ON om.user_id = u.id
          WHERE u.id = $1 AND om.organization_id = $2`,
        [userId, orgId]
      );
      return result.rows[0] ? toUserWithOrgOutput(result.rows[0]) : null;
    },

    async createUser(orgId, actorId, input) {
      const userId = uuid();
      const memberId = uuid();
      const tempPassword = `Sunave!${uuid().substring(0, 12)}`;
      const passwordHash = await argon2.hash(tempPassword);

      await pool.query('BEGIN');
      try {
        await pool.query(
          `INSERT INTO users
             (id, first_name, last_name, display_name, email, password_hash,
              phone, job_title, department, employee_id, timezone, language, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'invited')`,
          [
            userId,
            input.firstName,
            input.lastName,
            `${input.firstName} ${input.lastName}`,
            input.email,
            passwordHash,
            input.phone || '',
            input.jobTitle || '',
            input.department || '',
            input.employeeId || '',
            input.timezone || 'UTC',
            input.language || 'en'
          ]
        );

        await pool.query(
          `INSERT INTO organization_members (id, organization_id, user_id, role, joined_at)
           VALUES ($1,$2,$3,$4,NOW())`,
          [memberId, orgId, userId, input.role || 'User']
        );

        await pool.query('COMMIT');

        await this.createAuditLog({
          organizationId: orgId,
          userId: actorId,
          action: 'user.created',
          resource: `user:${userId}`,
          metadata: { email: input.email, role: input.role || 'User' }
        });

        const row = await this.findUserByIdInOrg(userId, orgId);
        return row;
      } catch (err) {
        await pool.query('ROLLBACK');
        throw err;
      }
    },

    async updateUser(userId, orgId, actorId, input) {
      const fields = [];
      const params = [userId];

      const map = {
        firstName: 'first_name',
        lastName: 'last_name',
        displayName: 'display_name',
        phone: 'phone',
        jobTitle: 'job_title',
        department: 'department',
        employeeId: 'employee_id',
        timezone: 'timezone',
        language: 'language',
        avatarUrl: 'avatar_url',
        status: 'status'
      };

      for (const [key, col] of Object.entries(map)) {
        if (input[key] !== undefined) {
          params.push(input[key]);
          fields.push(`${col} = $${params.length}`);
        }
      }

      if (!fields.length) return this.findUserByIdInOrg(userId, orgId);

      params.push(new Date());
      fields.push(`updated_at = $${params.length}`);

      const result = await pool.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
        params
      );

      if (!result.rows[0]) return null;

      await this.createAuditLog({
        organizationId: orgId,
        userId: actorId,
        action: 'user.updated',
        resource: `user:${userId}`,
        metadata: { fields: Object.keys(input) }
      });

      return this.findUserByIdInOrg(userId, orgId);
    },

    async setUserStatus(userId, orgId, actorId, status) {
      const result = await pool.query(
        `UPDATE users SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING id`,
        [userId, status]
      );
      if (!result.rows[0]) return null;

      const actionMap = {
        active: 'user.activated',
        inactive: 'user.deactivated',
        suspended: 'user.suspended',
        archived: 'user.archived'
      };
      await this.createAuditLog({
        organizationId: orgId,
        userId: actorId,
        action: actionMap[status] || 'user.status_changed',
        resource: `user:${userId}`,
        metadata: { status }
      });

      return this.findUserByIdInOrg(userId, orgId);
    },

    async assignUserRole(userId, orgId, actorId, role) {
      const result = await pool.query(
        `UPDATE organization_members SET role = $1
          WHERE user_id = $2 AND organization_id = $3 AND role <> 'Owner'
          RETURNING id`,
        [role, userId, orgId]
      );
      if (!result.rows[0]) return false;

      await this.createAuditLog({
        organizationId: orgId,
        userId: actorId,
        action: 'role.assigned',
        resource: `user:${userId}`,
        metadata: { role }
      });
      return true;
    },

    async assignUserToTeam(userId, orgId, actorId, teamId, teamRole) {
      // Verify team belongs to org
      const teamCheck = await pool.query(
        'SELECT id FROM teams WHERE id = $1 AND organization_id = $2 AND archived_at IS NULL',
        [teamId, orgId]
      );
      if (!teamCheck.rows[0]) return null;

      const memberId = uuid();
      await pool.query(
        `INSERT INTO team_members (id, team_id, user_id, role, joined_at)
         VALUES ($1,$2,$3,$4,NOW())
         ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [memberId, teamId, userId, teamRole || 'member']
      );

      await this.createAuditLog({
        organizationId: orgId,
        userId: actorId,
        action: 'team.member_added',
        resource: `team:${teamId}`,
        metadata: { userId, teamId, role: teamRole || 'member' }
      });
      return true;
    },

    async forceLogout(userId, orgId, actorId) {
      await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
      await this.createAuditLog({
        organizationId: orgId,
        userId: actorId,
        action: 'user.force_logout',
        resource: `user:${userId}`,
        metadata: {}
      });
      return true;
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
