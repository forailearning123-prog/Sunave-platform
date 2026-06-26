import { v4 as uuid } from 'uuid';

function toTeamOutput(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description,
    color: row.color,
    icon: row.icon,
    parentTeamId: row.parent_team_id,
    archived: Boolean(row.archived_at),
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toTeamMemberOutput(row) {
  return {
    id: row.id,
    teamId: row.team_id,
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
    user: row.first_name
      ? {
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.user_email,
          avatar: row.avatar_url,
          displayName: row.display_name || `${row.first_name} ${row.last_name}`
        }
      : undefined
  };
}

/**
 * Build a tree structure from a flat list of teams.
 * Teams without a parent (or with an unknown parent) are at the root.
 */
function buildTeamTree(teams) {
  const map = {};
  const roots = [];

  for (const t of teams) {
    map[t.id] = { ...t, children: [] };
  }

  for (const t of teams) {
    if (t.parentTeamId && map[t.parentTeamId]) {
      map[t.parentTeamId].children.push(map[t.id]);
    } else {
      roots.push(map[t.id]);
    }
  }

  return roots;
}

export function createTeamRepository(pool) {
  return {
    async listTeams(orgId, { includeArchived = false } = {}) {
      const params = [orgId];
      let where = 'organization_id = $1';
      if (!includeArchived) {
        where += ' AND archived_at IS NULL';
      }

      const result = await pool.query(
        `SELECT * FROM teams WHERE ${where} ORDER BY name ASC`,
        params
      );
      return result.rows.map(toTeamOutput);
    },

    async listTeamsTree(orgId, { includeArchived = false } = {}) {
      const teams = await this.listTeams(orgId, { includeArchived });
      return buildTeamTree(teams);
    },

    async findTeamById(teamId, orgId) {
      const result = await pool.query(
        'SELECT * FROM teams WHERE id = $1 AND organization_id = $2',
        [teamId, orgId]
      );
      return result.rows[0] ? toTeamOutput(result.rows[0]) : null;
    },

    async createTeam(orgId, actorId, input) {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO teams
           (id, organization_id, name, description, color, icon, parent_team_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [
          id, orgId,
          input.name,
          input.description || '',
          input.color || '',
          input.icon || '',
          input.parentTeamId || null
        ]
      );

      await this.createAuditLog({
        organizationId: orgId,
        userId: actorId,
        action: 'team.created',
        resource: `team:${id}`,
        metadata: { name: input.name }
      });

      return toTeamOutput(result.rows[0]);
    },

    async updateTeam(teamId, orgId, actorId, input) {
      const fields = [];
      const params = [teamId, orgId];

      const map = {
        name: 'name',
        description: 'description',
        color: 'color',
        icon: 'icon'
      };

      for (const [key, col] of Object.entries(map)) {
        if (input[key] !== undefined) {
          params.push(input[key]);
          fields.push(`${col} = $${params.length}`);
        }
      }

      if ('parentTeamId' in input) {
        params.push(input.parentTeamId ?? null);
        fields.push(`parent_team_id = $${params.length}`);
      }

      if (!fields.length) return this.findTeamById(teamId, orgId);

      params.push(new Date());
      fields.push(`updated_at = $${params.length}`);

      const result = await pool.query(
        `UPDATE teams SET ${fields.join(', ')}
          WHERE id = $1 AND organization_id = $2
          RETURNING *`,
        params
      );

      if (!result.rows[0]) return null;

      await this.createAuditLog({
        organizationId: orgId,
        userId: actorId,
        action: 'team.updated',
        resource: `team:${teamId}`,
        metadata: { fields: Object.keys(input) }
      });

      return toTeamOutput(result.rows[0]);
    },

    async archiveTeam(teamId, orgId, actorId) {
      const result = await pool.query(
        `UPDATE teams SET archived_at = NOW(), updated_at = NOW()
          WHERE id = $1 AND organization_id = $2 AND archived_at IS NULL
          RETURNING *`,
        [teamId, orgId]
      );
      if (!result.rows[0]) return null;

      await this.createAuditLog({
        organizationId: orgId,
        userId: actorId,
        action: 'team.archived',
        resource: `team:${teamId}`,
        metadata: {}
      });
      return toTeamOutput(result.rows[0]);
    },

    async restoreTeam(teamId, orgId, actorId) {
      const result = await pool.query(
        `UPDATE teams SET archived_at = NULL, updated_at = NOW()
          WHERE id = $1 AND organization_id = $2 AND archived_at IS NOT NULL
          RETURNING *`,
        [teamId, orgId]
      );
      if (!result.rows[0]) return null;

      await this.createAuditLog({
        organizationId: orgId,
        userId: actorId,
        action: 'team.restored',
        resource: `team:${teamId}`,
        metadata: {}
      });
      return toTeamOutput(result.rows[0]);
    },

    async deleteTeam(teamId, orgId, actorId) {
      // Re-parent children to grandparent before deleting
      await pool.query(
        `UPDATE teams SET parent_team_id = (SELECT parent_team_id FROM teams WHERE id = $1)
          WHERE parent_team_id = $1`,
        [teamId]
      );

      const result = await pool.query(
        'DELETE FROM teams WHERE id = $1 AND organization_id = $2 RETURNING id',
        [teamId, orgId]
      );
      if (!result.rows[0]) return null;

      await this.createAuditLog({
        organizationId: orgId,
        userId: actorId,
        action: 'team.deleted',
        resource: `team:${teamId}`,
        metadata: {}
      });
      return result.rows[0];
    },

    async listTeamMembers(teamId) {
      const result = await pool.query(
        `SELECT tm.*,
                u.first_name, u.last_name, u.email AS user_email,
                u.avatar_url, u.display_name
           FROM team_members tm
           JOIN users u ON u.id = tm.user_id
          WHERE tm.team_id = $1
          ORDER BY tm.joined_at ASC`,
        [teamId]
      );
      return result.rows.map(toTeamMemberOutput);
    },

    async addTeamMember(teamId, orgId, actorId, userId, role) {
      // Verify user is an org member
      const memberCheck = await pool.query(
        'SELECT id FROM organization_members WHERE organization_id = $1 AND user_id = $2 AND status = \'active\'',
        [orgId, userId]
      );
      if (!memberCheck.rows[0]) return null;

      const id = uuid();
      const result = await pool.query(
        `INSERT INTO team_members (id, team_id, user_id, role, joined_at)
         VALUES ($1,$2,$3,$4,NOW())
         ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role
         RETURNING *`,
        [id, teamId, userId, role || 'member']
      );

      await this.createAuditLog({
        organizationId: orgId,
        userId: actorId,
        action: 'team.member_added',
        resource: `team:${teamId}`,
        metadata: { userId, role: role || 'member' }
      });

      return result.rows[0] ? { id: result.rows[0].id, teamId, userId, role: result.rows[0].role, joinedAt: result.rows[0].joined_at } : null;
    },

    async removeTeamMember(teamId, orgId, actorId, userId) {
      const result = await pool.query(
        'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2 RETURNING id',
        [teamId, userId]
      );
      if (!result.rows[0]) return null;

      await this.createAuditLog({
        organizationId: orgId,
        userId: actorId,
        action: 'team.member_removed',
        resource: `team:${teamId}`,
        metadata: { userId }
      });
      return result.rows[0];
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
