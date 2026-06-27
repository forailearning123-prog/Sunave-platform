import { v4 as uuid } from 'uuid';

export function createPromptRepository(pool) {
  return {
    async listCategories() {
      const result = await pool.query(
        `SELECT pc.*, (SELECT COUNT(*)::int FROM prompt_templates WHERE category_id = pc.id) AS template_count
         FROM prompt_categories pc ORDER BY pc.sort_order ASC, pc.name ASC`
      );
      return result.rows;
    },

    async findCategory(id) {
      const result = await pool.query(`SELECT * FROM prompt_categories WHERE id = $1`, [id]);
      return result.rows[0] || null;
    },

    async listTemplates({ organizationId, categoryId, status, search, tags, limit = 50, offset = 0 } = {}) {
      const conditions = [];
      const params = [];
      let idx = 1;

      if (organizationId) { conditions.push(`(pt.organization_id = $${idx} OR pt.organization_id IS NULL)`); params.push(organizationId); idx++; }
      else { conditions.push(`pt.organization_id IS NULL`); }
      if (categoryId) { conditions.push(`pt.category_id = $${idx++}`); params.push(categoryId); }
      if (status) { conditions.push(`pt.status = $${idx++}`); params.push(status); }
      if (search) { conditions.push(`(pt.name ILIKE $${idx} OR pt.description ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
      if (tags && tags.length > 0) { conditions.push(`pt.tags && $${idx++}`); params.push(tags); }

      const where = conditions.join(' AND ');
      const result = await pool.query(
        `SELECT pt.*, pc.display_name AS category_name, pc.icon AS category_icon,
                u.display_name AS created_by_name
         FROM prompt_templates pt
         LEFT JOIN prompt_categories pc ON pc.id = pt.category_id
         LEFT JOIN users u ON u.id = pt.created_by
         WHERE ${where}
         ORDER BY pt.is_system DESC, pt.updated_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      );
      return result.rows.map(toPromptOutput);
    },

    async findTemplate(id) {
      const result = await pool.query(
        `SELECT pt.*, pc.display_name AS category_name, pc.icon AS category_icon,
                u.display_name AS created_by_name
         FROM prompt_templates pt
         LEFT JOIN prompt_categories pc ON pc.id = pt.category_id
         LEFT JOIN users u ON u.id = pt.created_by
         WHERE pt.id = $1`,
        [id]
      );
      return result.rows[0] ? toPromptOutput(result.rows[0]) : null;
    },

    async createTemplate(input) {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO prompt_templates (id, organization_id, category_id, name, description, version, status,
           template, variables, capabilities, system_prompt, output_format, runtime_policies, tags, is_system, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
        [id, input.organizationId || null, input.categoryId || null, input.name, input.description || '',
         input.version || '1.0', input.status || 'draft', input.template,
         JSON.stringify(input.variables || []), input.capabilities || [],
         input.systemPrompt || null, input.outputFormat || 'text',
         JSON.stringify(input.runtimePolicies || {}), input.tags || [],
         input.isSystem ?? false, input.createdBy || null]
      );
      return toPromptOutput(result.rows[0]);
    },

    async updateTemplate(id, input) {
      const result = await pool.query(
        `UPDATE prompt_templates SET
           name = COALESCE($2, name), description = COALESCE($3, description),
           category_id = COALESCE($4, category_id), status = COALESCE($5, status),
           template = COALESCE($6, template),
           variables = CASE WHEN $7 IS NOT NULL THEN $7::jsonb ELSE variables END,
           capabilities = COALESCE($8, capabilities),
           system_prompt = COALESCE($9, system_prompt),
           output_format = COALESCE($10, output_format),
           runtime_policies = CASE WHEN $11 IS NOT NULL THEN $11::jsonb ELSE runtime_policies END,
           tags = COALESCE($12, tags), updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, input.name, input.description, input.categoryId, input.status, input.template,
         input.variables ? JSON.stringify(input.variables) : null, input.capabilities,
         input.systemPrompt, input.outputFormat,
         input.runtimePolicies ? JSON.stringify(input.runtimePolicies) : null, input.tags]
      );
      return result.rows[0] ? toPromptOutput(result.rows[0]) : null;
    },

    async deleteTemplate(id) {
      const result = await pool.query(`DELETE FROM prompt_templates WHERE id = $1 AND is_system = false RETURNING id`, [id]);
      return result.rows[0] || null;
    },

    async publishTemplate(id) {
      const result = await pool.query(
        `UPDATE prompt_templates SET status = 'published', version = (version::numeric + 0.1)::varchar, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [id]
      );
      return result.rows[0] ? toPromptOutput(result.rows[0]) : null;
    },

    async archiveTemplate(id) {
      await pool.query(`UPDATE prompt_templates SET status = 'archived', updated_at = NOW() WHERE id = $1`, [id]);
    },

    async cloneTemplate(id, newName, createdBy) {
      const orig = await this.findTemplate(id);
      if (!orig) return null;
      return this.createTemplate({
        organizationId: orig.organizationId, categoryId: orig.categoryId,
        name: newName || `${orig.name} (Copy)`, description: orig.description,
        template: orig.template, variables: orig.variables, capabilities: orig.capabilities,
        systemPrompt: orig.systemPrompt, outputFormat: orig.outputFormat,
        runtimePolicies: orig.runtimePolicies, tags: orig.tags, createdBy
      });
    },

    // ─── Versions ────────────────────────────────────────────────────────

    async listVersions(promptId) {
      const result = await pool.query(
        `SELECT pv.*, u.display_name AS created_by_name
         FROM prompt_versions pv LEFT JOIN users u ON u.id = pv.created_by
         WHERE pv.prompt_id = $1 ORDER BY pv.created_at DESC`,
        [promptId]
      );
      return result.rows.map(toVersionOutput);
    },

    async createVersion(input) {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO prompt_versions (id, prompt_id, version, template, variables, system_prompt, runtime_policies, changelog, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [id, input.promptId, input.version, input.template, JSON.stringify(input.variables || []),
         input.systemPrompt || null, JSON.stringify(input.runtimePolicies || {}),
         input.changelog || '', input.createdBy || null]
      );
      return toVersionOutput(result.rows[0]);
    },

    async rollbackToVersion(promptId, versionId) {
      const version = (await pool.query(`SELECT * FROM prompt_versions WHERE id = $1 AND prompt_id = $2`, [versionId, promptId])).rows[0];
      if (!version) return null;
      return this.updateTemplate(promptId, {
        template: version.template, variables: version.variables,
        systemPrompt: version.system_prompt, runtimePolicies: version.runtime_policies
      });
    },

    // ─── Variable Resolution ─────────────────────────────────────────────

    resolveVariables(template, variables, context) {
      let resolved = template;
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        resolved = resolved.replace(regex, value || '');
      }
      // Default variables from context
      const defaultVars = {
        organization: context.organizationName || '',
        user: context.userName || '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString(),
        language: context.language || 'English'
      };
      for (const [key, value] of Object.entries(defaultVars)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        resolved = resolved.replace(regex, value);
      }
      // Remove any remaining unresolved variables
      resolved = resolved.replace(/\{\{[^}]+\}\}/g, '');
      return resolved;
    }
  };
}

function toPromptOutput(row) {
  return {
    id: row.id, organizationId: row.organization_id, categoryId: row.category_id,
    categoryName: row.category_name, categoryIcon: row.category_icon,
    name: row.name, description: row.description, version: row.version,
    status: row.status, template: row.template, variables: row.variables,
    capabilities: row.capabilities, systemPrompt: row.system_prompt,
    outputFormat: row.output_format, runtimePolicies: row.runtime_policies,
    tags: row.tags, isSystem: row.is_system, createdBy: row.created_by,
    createdByName: row.created_by_name, createdAt: row.created_at, updatedAt: row.updated_at
  };
}

function toVersionOutput(row) {
  return {
    id: row.id, promptId: row.prompt_id, version: row.version,
    template: row.template, variables: row.variables,
    systemPrompt: row.system_prompt, runtimePolicies: row.runtime_policies,
    changelog: row.changelog, createdBy: row.created_by,
    createdByName: row.created_by_name, createdAt: row.created_at
  };
}