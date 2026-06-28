// Business Relationship Repository

import { v4 as uuidv4 } from 'uuid';

class BusinessRelationshipRepository {
  constructor(db) {
    this.db = db;
  }

  async create(data, userId) {
    const id = uuidv4();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO business_relationships (
        id, organization_id, relationship_type, source_object_id, target_object_id,
        metadata, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const params = [
      id,
      data.organizationId,
      data.relationshipType,
      data.sourceObjectId,
      data.targetObjectId,
      JSON.stringify(data.metadata || {}),
      userId,
      now,
      now
    ];

    const result = await this.db.query(query, params);
    return this.mapRow(result.rows[0]);
  }

  async findById(id, organizationId) {
    const query = `
      SELECT * FROM business_relationships
      WHERE id = $1 AND organization_id = $2
    `;

    const result = await this.db.query(query, [id, organizationId]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByObject(objectId, organizationId) {
    const query = `
      SELECT * FROM business_relationships
      WHERE (source_object_id = $1 OR target_object_id = $1)
        AND organization_id = $2
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query, [objectId, organizationId]);
    return result.rows.map(row => this.mapRow(row));
  }

  async findByType(objectId, relationshipType, organizationId) {
    const query = `
      SELECT * FROM business_relationships
      WHERE (source_object_id = $1 OR target_object_id = $1)
        AND relationship_type = $2
        AND organization_id = $3
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query, [objectId, relationshipType, organizationId]);
    return result.rows.map(row => this.mapRow(row));
  }

  async findRelated(objectId, relationshipType, organizationId, direction = 'both') {
    let query = '';
    const params = [organizationId, objectId];

    if (direction === 'source') {
      query = `
        SELECT r.*, bo.name as target_name, bo.object_type as target_type
        FROM business_relationships r
        JOIN business_objects bo ON r.target_object_id = bo.id
        WHERE r.source_object_id = $2
          AND r.relationship_type = $3
          AND r.organization_id = $1
        ORDER BY r.created_at DESC
      `;
      params.push(relationshipType);
    } else if (direction === 'target') {
      query = `
        SELECT r.*, bo.name as target_name, bo.object_type as target_type
        FROM business_relationships r
        JOIN business_objects bo ON r.source_object_id = bo.id
        WHERE r.target_object_id = $2
          AND r.relationship_type = $3
          AND r.organization_id = $1
        ORDER BY r.created_at DESC
      `;
      params.push(relationshipType);
    } else {
      query = `
        SELECT r.*,
          CASE WHEN r.source_object_id = $2 THEN bo_target.name ELSE bo_source.name END as target_name,
          CASE WHEN r.source_object_id = $2 THEN bo_target.object_type ELSE bo_source.object_type END as target_type
        FROM business_relationships r
        LEFT JOIN business_objects bo_source ON r.source_object_id = bo_source.id
        LEFT JOIN business_objects bo_target ON r.target_object_id = bo_target.id
        WHERE (r.source_object_id = $2 OR r.target_object_id = $2)
          AND r.relationship_type = $3
          AND r.organization_id = $1
        ORDER BY r.created_at DESC
      `;
      params.push(relationshipType);
    }

    const result = await this.db.query(query, params);
    return result.rows.map(row => this.mapRow(row));
  }

  async delete(id, organizationId) {
    const query = `
      DELETE FROM business_relationships
      WHERE id = $1 AND organization_id = $2
      RETURNING id
    `;

    const result = await this.db.query(query, [id, organizationId]);
    return result.rows.length > 0;
  }

  async deleteBetweenObjects(sourceObjectId, targetObjectId, relationshipType, organizationId) {
    const query = `
      DELETE FROM business_relationships
      WHERE source_object_id = $1
        AND target_object_id = $2
        AND relationship_type = $3
        AND organization_id = $4
      RETURNING id
    `;

    const result = await this.db.query(query, [sourceObjectId, targetObjectId, relationshipType, organizationId]);
    return result.rows.length > 0;
  }

  mapRow(row) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      relationshipType: row.relationship_type,
      sourceObjectId: row.source_object_id,
      targetObjectId: row.target_object_id,
      metadata: row.metadata || {},
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      targetName: row.target_name,
      targetType: row.target_type
    };
  }
}

export default BusinessRelationshipRepository;