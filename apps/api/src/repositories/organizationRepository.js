import { ROLE } from '@sunave/core';
import { v4 as uuid } from 'uuid';

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100) || 'org';
}

function toOrgOutput(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    legalName: row.legal_name,
    industry: row.industry,
    companySize: row.company_size,
    country: row.country,
    timezone: row.timezone,
    currency: row.currency,
    logo: row.logo,
    website: row.website,
    email: row.email,
    phone: row.phone,
    address: row.address,
    status: row.status,
    subscriptionPlan: row.subscription_plan,
    subscriptionStatus: row.subscription_status,
    aiCredits: row.ai_credits,
    storageQuota: row.storage_quota,
    storageUsed: row.storage_used,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toMemberOutput(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    role: row.role,
    title: row.title,
    status: row.status,
    joinedAt: row.joined_at,
    user: row.first_name
      ? {
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.user_email,
          avatarUrl: row.avatar_url
        }
      : undefined
  };
}

export function createOrganizationRepository(pool) {
  return {
    async generateUniqueSlug(name, excludeId) {
      const base = slugify(name);
      let slug = base;
      for (let i = 0; i < 5; i++) {
        const result = await pool.query(
          'SELECT id FROM organizations WHERE slug = $1' + (excludeId ? ' AND id <> $2' : ''),
          excludeId ? [slug, excludeId] : [slug]
        );
        if (!result.rows[0]) return slug;
        slug = `${base}-${Math.random().toString(36).substring(2, 7)}`;
      }
      throw new Error('Could not generate a unique slug.');
    },

    async createOrganization(userId, input) {
      const orgId = uuid();
      const memberId = uuid();
      const slug = input.slug || (await this.generateUniqueSlug(input.name));

      await pool.query('BEGIN');
      try {
        const orgResult = await pool.query(
          `INSERT INTO organizations
             (id, name, slug, legal_name, industry, company_size, country, timezone, currency,
              logo, website, email, phone, address, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
           RETURNING *`,
          [
            orgId, input.name, slug, input.legalName || '', input.industry,
            input.companySize || '', input.country, input.timezone || 'UTC',
            input.currency || 'USD', '', input.website || '', input.email || '',
            input.phone || '', input.address || '', userId
          ]
        );
        const org = orgResult.rows[0];

        await pool.query(
          `INSERT INTO organization_members (id, organization_id, user_id, role, joined_at)
           VALUES ($1,$2,$3,$4,NOW())`,
          [memberId, orgId, userId, ROLE.OWNER]
        );

        await pool.query('COMMIT');

        await this.createAuditLog({
          organizationId: orgId,
          userId,
          action: 'organization.created',
          metadata: { name: org.name, slug: org.slug }
        });

        return toOrgOutput(org);
      } catch (err) {
        await pool.query('ROLLBACK');
        throw err;
      }
    },

    async findOrganizationById(orgId) {
      const result = await pool.query('SELECT * FROM organizations WHERE id = $1', [orgId]);
      return result.rows[0] ? toOrgOutput(result.rows[0]) : null;
    },

    async findOrganizationBySlug(slug) {
      const result = await pool.query('SELECT * FROM organizations WHERE slug = $1', [slug]);
      return result.rows[0] ? toOrgOutput(result.rows[0]) : null;
    },

    async listOrganizationsForUser(userId) {
      const result = await pool.query(
        `SELECT o.*, om.role AS member_role
         FROM organizations o
         JOIN organization_members om ON om.organization_id = o.id
         WHERE om.user_id = $1 AND om.status = 'active'
         ORDER BY om.joined_at ASC`,
        [userId]
      );
      return result.rows.map((row) => ({
        ...toOrgOutput(row),
        memberRole: row.member_role
      }));
    },

    async updateOrganization(orgId, userId, input) {
      const slugUpdate = input.slug !== undefined
        ? input.slug
        : (input.name ? await this.generateUniqueSlug(input.name, orgId) : undefined);

      const result = await pool.query(
        `UPDATE organizations SET
           name = COALESCE($2, name),
           slug = COALESCE($3, slug),
           legal_name = COALESCE($4, legal_name),
           industry = COALESCE($5, industry),
           company_size = COALESCE($6, company_size),
           country = COALESCE($7, country),
           timezone = COALESCE($8, timezone),
           currency = COALESCE($9, currency),
           logo = COALESCE($10, logo),
           website = COALESCE($11, website),
           email = COALESCE($12, email),
           phone = COALESCE($13, phone),
           address = COALESCE($14, address),
           updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          orgId,
          input.name ?? null, slugUpdate ?? null, input.legalName ?? null,
          input.industry ?? null, input.companySize ?? null, input.country ?? null,
          input.timezone ?? null, input.currency ?? null, input.logo ?? null,
          input.website ?? null, input.email ?? null, input.phone ?? null,
          input.address ?? null
        ]
      );

      if (!result.rows[0]) return null;

      await this.createAuditLog({
        organizationId: orgId,
        userId,
        action: 'organization.updated',
        metadata: { fields: Object.keys(input) }
      });

      return toOrgOutput(result.rows[0]);
    },

    async archiveOrganization(orgId, userId) {
      const result = await pool.query(
        `UPDATE organizations SET status = 'archived', updated_at = NOW()
         WHERE id = $1 AND status = 'active' RETURNING *`,
        [orgId]
      );
      if (!result.rows[0]) return null;
      await this.createAuditLog({ organizationId: orgId, userId, action: 'organization.archived', metadata: {} });
      return toOrgOutput(result.rows[0]);
    },

    async restoreOrganization(orgId, userId) {
      const result = await pool.query(
        `UPDATE organizations SET status = 'active', updated_at = NOW()
         WHERE id = $1 AND status = 'archived' RETURNING *`,
        [orgId]
      );
      if (!result.rows[0]) return null;
      await this.createAuditLog({ organizationId: orgId, userId, action: 'organization.restored', metadata: {} });
      return toOrgOutput(result.rows[0]);
    },

    async findMembershipByOrgAndUser(orgId, userId) {
      const result = await pool.query(
        `SELECT om.*, o.name AS organization_name, o.slug
         FROM organization_members om
         JOIN organizations o ON o.id = om.organization_id
         WHERE om.organization_id = $1 AND om.user_id = $2 AND om.status = 'active'`,
        [orgId, userId]
      );
      return result.rows[0] || null;
    },

    async findFirstActiveMembership(userId) {
      const result = await pool.query(
        `SELECT om.*, o.name AS organization_name, o.slug
         FROM organization_members om
         JOIN organizations o ON o.id = om.organization_id
         WHERE om.user_id = $1 AND om.status = 'active' AND o.status = 'active'
         ORDER BY om.joined_at ASC
         LIMIT 1`,
        [userId]
      );
      return result.rows[0] || null;
    },

    async listMembers(orgId) {
      const result = await pool.query(
        `SELECT om.*, u.first_name, u.last_name, u.email AS user_email, u.avatar_url
         FROM organization_members om
         JOIN users u ON u.id = om.user_id
         WHERE om.organization_id = $1
         ORDER BY om.joined_at ASC`,
        [orgId]
      );
      return result.rows.map(toMemberOutput);
    },

    async findMemberById(memberId) {
      const result = await pool.query(
        `SELECT om.*, u.first_name, u.last_name, u.email AS user_email, u.avatar_url
         FROM organization_members om
         JOIN users u ON u.id = om.user_id
         WHERE om.id = $1`,
        [memberId]
      );
      return result.rows[0] ? toMemberOutput(result.rows[0]) : null;
    },

    async updateMember(memberId, orgId, actorId, input) {
      const result = await pool.query(
        `UPDATE organization_members SET
           role = COALESCE($3, role),
           title = COALESCE($4, title),
           status = COALESCE($5, status)
         WHERE id = $1 AND organization_id = $2
         RETURNING *`,
        [memberId, orgId, input.role ?? null, input.title ?? null, input.status ?? null]
      );
      if (!result.rows[0]) return null;
      await this.createAuditLog({
        organizationId: orgId,
        userId: actorId,
        action: 'member.updated',
        metadata: { memberId, fields: Object.keys(input) }
      });
      return toMemberOutput(result.rows[0]);
    },

    async removeMember(memberId, orgId, actorId) {
      const result = await pool.query(
        `DELETE FROM organization_members WHERE id = $1 AND organization_id = $2 AND role <> 'Owner' RETURNING id, user_id`,
        [memberId, orgId]
      );
      if (!result.rows[0]) return null;
      await this.createAuditLog({
        organizationId: orgId,
        userId: actorId,
        action: 'member.removed',
        metadata: { memberId, removedUserId: result.rows[0].user_id }
      });
      return result.rows[0];
    },

    async createInvitation(orgId, actorId, input, tokenHash, expiresAt) {
      const id = uuid();
      // Remove existing pending invitation for the same email+org before creating a new one
      await pool.query(
        `DELETE FROM invitations WHERE organization_id = $1 AND email = $2 AND accepted_at IS NULL`,
        [orgId, input.email]
      );
      const result = await pool.query(
        `INSERT INTO invitations (id, organization_id, email, role, token_hash, invited_by, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [id, orgId, input.email, input.role, tokenHash, actorId, expiresAt]
      );
      await this.createAuditLog({
        organizationId: orgId,
        userId: actorId,
        action: 'invitation.sent',
        metadata: { email: input.email, role: input.role }
      });
      return result.rows[0];
    },

    async findInvitationByToken(tokenHash) {
      const result = await pool.query(
        `SELECT i.*, o.name AS organization_name
         FROM invitations i
         JOIN organizations o ON o.id = i.organization_id
         WHERE i.token_hash = $1 AND i.accepted_at IS NULL AND i.expires_at > NOW()`,
        [tokenHash]
      );
      return result.rows[0] || null;
    },

    async acceptInvitation(invitationId, userId) {
      await pool.query('BEGIN');
      try {
        const invResult = await pool.query(
          `UPDATE invitations SET accepted_at = NOW() WHERE id = $1 AND accepted_at IS NULL RETURNING *`,
          [invitationId]
        );
        const inv = invResult.rows[0];
        if (!inv) {
          await pool.query('ROLLBACK');
          return null;
        }

        // Upsert membership (in case they were previously removed)
        const existing = await pool.query(
          `SELECT id FROM organization_members WHERE organization_id = $1 AND user_id = $2`,
          [inv.organization_id, userId]
        );
        if (existing.rows[0]) {
          await pool.query(
            `UPDATE organization_members SET role = $3, status = 'active', joined_at = NOW()
             WHERE organization_id = $1 AND user_id = $2`,
            [inv.organization_id, userId, inv.role]
          );
        } else {
          await pool.query(
            `INSERT INTO organization_members (id, organization_id, user_id, role, joined_at)
             VALUES ($1,$2,$3,$4,NOW())`,
            [uuid(), inv.organization_id, userId, inv.role]
          );
        }

        await pool.query('COMMIT');

        await this.createAuditLog({
          organizationId: inv.organization_id,
          userId,
          action: 'invitation.accepted',
          metadata: { invitationId, role: inv.role }
        });

        return inv;
      } catch (err) {
        await pool.query('ROLLBACK');
        throw err;
      }
    },

    async listInvitations(orgId) {
      const result = await pool.query(
        `SELECT i.id, i.email, i.role, i.expires_at, i.accepted_at, i.created_at,
                u.first_name AS inviter_first_name, u.last_name AS inviter_last_name
         FROM invitations i
         JOIN users u ON u.id = i.invited_by
         WHERE i.organization_id = $1
         ORDER BY i.created_at DESC`,
        [orgId]
      );
      return result.rows.map((row) => ({
        id: row.id,
        email: row.email,
        role: row.role,
        expiresAt: row.expires_at,
        acceptedAt: row.accepted_at,
        createdAt: row.created_at,
        status: row.accepted_at ? 'accepted' : (new Date(row.expires_at) < new Date() ? 'expired' : 'pending'),
        invitedBy: { firstName: row.inviter_first_name, lastName: row.inviter_last_name }
      }));
    },

    async getSettings(orgId) {
      const result = await pool.query(
        `SELECT category, settings FROM organization_settings WHERE organization_id = $1`,
        [orgId]
      );
      const out = {};
      for (const row of result.rows) {
        out[row.category] = row.settings;
      }
      return out;
    },

    async upsertSettings(orgId, category, settings) {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO organization_settings (id, organization_id, category, settings)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (organization_id, category)
         DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW()
         RETURNING *`,
        [id, orgId, category, JSON.stringify(settings)]
      );
      return result.rows[0];
    },

    async createAuditLog({ organizationId, userId, action, metadata }) {
      try {
        await pool.query(
          `INSERT INTO audit_logs (id, organization_id, user_id, action, metadata)
           VALUES ($1,$2,$3,$4,$5)`,
          [uuid(), organizationId, userId || null, action, JSON.stringify(metadata)]
        );
      } catch {
        // Audit log failure must never break the main flow
      }
    },

    async listAuditLogs(orgId, limit = 50) {
      const result = await pool.query(
        `SELECT al.id, al.action, al.metadata, al.created_at,
                u.first_name, u.last_name
         FROM audit_logs al
         LEFT JOIN users u ON u.id = al.user_id
         WHERE al.organization_id = $1
         ORDER BY al.created_at DESC
         LIMIT $2`,
        [orgId, limit]
      );
      return result.rows.map((row) => ({
        id: row.id,
        action: row.action,
        metadata: row.metadata,
        createdAt: row.created_at,
        actor: row.first_name ? { firstName: row.first_name, lastName: row.last_name } : null
      }));
    }
  };
}
