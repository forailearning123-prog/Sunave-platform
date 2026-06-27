// Business Custom Field Repository

const { v4: uuidv4 } = require('uuid');

class BusinessCustomFieldRepository {
  constructor(db) {
    this.db = db;
  }

  async create(data, userId) {
    const id = uuidv4();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO business_custom_fields (
        id, organization_id, object_type, field_name, field_label, field_type,
        field_options, is_required, is_unique, default_value, validation_rules,
        display_order, is_system, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const params = [
      id,
      data.organizationId,
      data.objectType,
      data.fieldName,
      data.fieldLabel,
      data.fieldType,
      JSON.stringify(data.fieldOptions || {}),
      data.isRequired || false,
      data.isUnique || false,
      data.defaultValue !== undefined ? JSON.stringify(data.defaultValue) : null,
      JSON.stringify(data.validationRules || {}),
      data.displayOrder || 0,
      data.isSystem || false,
      JSON.stringify(data.metadata || {}),
      now,
      now
    ];

    const result = await this.db.query(query, params);
    return this.mapRow(result.rows[0]);
  }

  async findById(id, organizationId) {
    const query = `
      SELECT * FROM business_custom_fields
      WHERE id = $1 AND organization_id = $2
    `;

    const result = await this.db.query(query, [id, organizationId]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByObjectType(objectType, organizationId) {
    const query = `
      SELECT * FROM business_custom_fields
      WHERE object_type = $1 AND organization_id = $2
      ORDER BY display_order ASC, field_name ASC
    `;

    const result = await this.db.query(query, [objectType, organizationId]);
    return result.rows.map(row => this.mapRow(row));
  }

  async findSystemFields(objectType) {
    const query = `
      SELECT * FROM business_custom_fields
      WHERE object_type = $1 AND organization_id IS NULL AND is_system = true
      ORDER BY display_order ASC, field_name ASC
    `;

    const result = await this.db.query(query, [objectType]);
    return result.rows.map(row => this.mapRow(row));
  }

  async update(id, organizationId, data, userId) {
    const now = new Date().toISOString();

    const updates = [];
    const params = [id, organizationId];
    let paramIndex = 3;

    if (data.fieldLabel !== undefined) {
      updates.push(`field_label = $${paramIndex++}`);
      params.push(data.fieldLabel);
    }

    if (data.fieldType !== undefined) {
      updates.push(`field_type = $${paramIndex++}`);
      params.push(data.fieldType);
    }

    if (data.fieldOptions !== undefined) {
      updates.push(`field_options = $${paramIndex++}`);
      params.push(JSON.stringify(data.fieldOptions));
    }

    if (data.isRequired !== undefined) {
      updates.push(`is_required = $${paramIndex++}`);
      params.push(data.isRequired);
    }

    if (data.isUnique !== undefined) {
      updates.push(`is_unique = $${paramIndex++}`);
      params.push(data.isUnique);
    }

    if (data.defaultValue !== undefined) {
      updates.push(`default_value = $${paramIndex++}`);
      params.push(JSON.stringify(data.defaultValue));
    }

    if (data.validationRules !== undefined) {
      updates.push(`validation_rules = $${paramIndex++}`);
      params.push(JSON.stringify(data.validationRules));
    }

    if (data.displayOrder !== undefined) {
      updates.push(`display_order = $${paramIndex++}`);
      params.push(data.displayOrder);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(now);

    if (updates.length === 0) {
      return this.findById(id, organizationId);
    }

    const query = `
      UPDATE business_custom_fields
      SET ${updates.join(', ')}
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async delete(id, organizationId) {
    const query = `
      DELETE FROM business_custom_fields
      WHERE id = $1 AND organization_id = $2
      RETURNING id
    `;

    const result = await this.db.query(query, [id, organizationId]);
    return result.rows.length > 0;
  }

  // ============================================
  // CUSTOM FIELD VALUES
  // ============================================

  async setValue(objectId, customFieldId, organizationId, value, userId) {
    const now = new Date().toISOString();

    const query = `
      INSERT INTO business_custom_field_values (
        organization_id, object_id, custom_field_id, value, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (organization_id, object_id, custom_field_id)
      DO UPDATE SET value = $4, updated_at = $6
      RETURNING *
    `;

    const params = [
      organizationId,
      objectId,
      customFieldId,
      JSON.stringify(value),
      now,
      now
    ];

    const result = await this.db.query(query, params);
    return this.mapValueRow(result.rows[0]);
  }

  async getValues(objectId, organizationId) {
    const query = `
      SELECT v.*, f.field_name, f.field_type, f.field_label
      FROM business_custom_field_values v
      JOIN business_custom_fields f ON v.custom_field_id = f.id
      WHERE v.object_id = $1 AND v.organization_id = $2
      ORDER BY f.display_order ASC
    `;

    const result = await this.db.query(query, [objectId, organizationId]);
    return result.rows.map(row => this.mapValueRow(row));
  }

  async getValue(objectId, customFieldId, organizationId) {
    const query = `
      SELECT * FROM business_custom_field_values
      WHERE object_id = $1 AND custom_field_id = $2 AND organization_id = $3
    `;

    const result = await this.db.query(query, [objectId, customFieldId, organizationId]);
    return result.rows[0] ? this.mapValueRow(result.rows[0]) : null;
  }

  async deleteValue(objectId, customFieldId, organizationId) {
    const query = `
      DELETE FROM business_custom_field_values
      WHERE object_id = $1 AND custom_field_id = $2 AND organization_id = $3
      RETURNING id
    `;

    const result = await this.db.query(query, [objectId, customFieldId, organizationId]);
    return result.rows.length > 0;
  }

  async deleteValuesByObject(objectId, organizationId) {
    const query = `
      DELETE FROM business_custom_field_values
      WHERE object_id = $1 AND organization_id = $2
      RETURNING id
    `;

    const result = await this.db.query(query, [objectId, organizationId]);
    return result.rows.length;
  }

  mapRow(row) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      objectType: row.object_type,
      fieldName: row.field_name,
      fieldLabel: row.field_label,
      fieldType: row.field_type,
      fieldOptions: row.field_options || {},
      isRequired: row.is_required,
      isUnique: row.is_unique,
      defaultValue: row.default_value,
      validationRules: row.validation_rules || {},
      displayOrder: row.display_order,
      isSystem: row.is_system,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  mapValueRow(row) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      objectId: row.object_id,
      customFieldId: row.custom_field_id,
      fieldName: row.field_name,
      fieldType: row.field_type,
      fieldLabel: row.field_label,
      value: row.value,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = BusinessCustomFieldRepository;