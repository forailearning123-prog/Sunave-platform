// Business Approval Repository

const { v4: uuidv4 } = require('uuid');

class BusinessApprovalRepository {
  constructor(db) {
    this.db = db;
  }

  async create(data, userId) {
    const id = uuidv4();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO business_approvals (
        id, organization_id, object_id, approval_type, status, title, description,
        requested_by, approver_id, approver_type, escalation_level, delegated_to,
        metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const params = [
      id,
      data.organizationId,
      data.objectId,
      data.approvalType,
      'pending',
      data.title,
      data.description || null,
      userId,
      data.approverId || null,
      data.approverType || null,
      0,
      null,
      JSON.stringify(data.metadata || {}),
      now,
      now
    ];

    const result = await this.db.query(query, params);
    return this.mapRow(result.rows[0]);
  }

  async findById(id, organizationId) {
    const query = `
      SELECT * FROM business_approvals
      WHERE id = $1 AND organization_id = $2 AND archived_at IS NULL
    `;

    const result = await this.db.query(query, [id, organizationId]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByObject(objectId, organizationId, limit = 50, offset = 0) {
    const query = `
      SELECT a.*, u.display_name as requester_name, u.email as requester_email,
             approver.display_name as approver_name
      FROM business_approvals a
      JOIN users u ON a.requested_by = u.id
      LEFT JOIN users approver ON a.approver_id = approver.id
      WHERE a.object_id = $1 AND a.organization_id = $2 AND a.archived_at IS NULL
      ORDER BY a.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await this.db.query(query, [objectId, organizationId, limit, offset]);
    return result.rows.map(row => this.mapRow(row));
  }

  async findByApprover(approverId, organizationId, status = null, limit = 50, offset = 0) {
    let query = `
      SELECT a.*, bo.name as object_name, bo.object_type,
             u.display_name as requester_name
      FROM business_approvals a
      JOIN business_objects bo ON a.object_id = bo.id
      JOIN users u ON a.requested_by = u.id
      WHERE a.approver_id = $1 AND a.organization_id = $2 AND a.archived_at IS NULL
    `;
    const params = [approverId, organizationId];
    let paramIndex = 3;

    if (status) {
      query += ` AND a.status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY a.created_at DESC`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await this.db.query(query, params);
    return result.rows.map(row => this.mapRow(row));
  }

  async findPending(organizationId, limit = 50, offset = 0) {
    const query = `
      SELECT a.*, bo.name as object_name, bo.object_type,
             u.display_name as requester_name
      FROM business_approvals a
      JOIN business_objects bo ON a.object_id = bo.id
      JOIN users u ON a.requested_by = u.id
      WHERE a.organization_id = $1 AND a.status = 'pending' AND a.archived_at IS NULL
      ORDER BY a.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.db.query(query, [organizationId, limit, offset]);
    return result.rows.map(row => this.mapRow(row));
  }

  async update(id, organizationId, data, userId) {
    const now = new Date().toISOString();

    const updates = [];
    const params = [id, organizationId];
    let paramIndex = 3;

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }

    if (data.decisionComment !== undefined) {
      updates.push(`decision_comment = $${paramIndex++}`);
      params.push(data.decisionComment);
    }

    if (data.decidedAt !== undefined) {
      updates.push(`decided_at = $${paramIndex++}`);
      params.push(data.decidedAt);
    } else if (data.status === 'approved' || data.status === 'rejected') {
      updates.push(`decided_at = $${paramIndex++}`);
      params.push(now);
    }

    if (data.decidedBy !== undefined) {
      updates.push(`decided_by = $${paramIndex++}`);
      params.push(data.decidedBy);
    }

    if (data.escalationLevel !== undefined) {
      updates.push(`escalation_level = $${paramIndex++}`);
      params.push(data.escalationLevel);
    }

    if (data.delegatedTo !== undefined) {
      updates.push(`delegated_to = $${paramIndex++}`);
      params.push(data.delegatedTo);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(now);

    if (updates.length === 0) {
      return this.findById(id, organizationId);
    }

    const query = `
      UPDATE business_approvals
      SET ${updates.join(', ')}
      WHERE id = $1 AND organization_id = $2 AND archived_at IS NULL
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async addStep(approvalId, stepData, userId) {
    const id = uuidv4();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO business_approval_steps (
        id, organization_id, approval_id, step_order, step_type, approver_id,
        approver_type, status, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const params = [
      id,
      stepData.organizationId,
      approvalId,
      stepData.stepOrder,
      stepData.stepType,
      stepData.approverId || null,
      stepData.approverType || null,
      'pending',
      JSON.stringify(stepData.metadata || {}),
      now,
      now
    ];

    const result = await this.db.query(query, params);
    return this.mapStepRow(result.rows[0]);
  }

  async findSteps(approvalId, organizationId) {
    const query = `
      SELECT s.*, u.display_name as approver_name
      FROM business_approval_steps s
      LEFT JOIN users u ON s.approver_id = u.id
      WHERE s.approval_id = $1 AND s.organization_id = $2
      ORDER BY s.step_order ASC
    `;

    const result = await this.db.query(query, [approvalId, organizationId]);
    return result.rows.map(row => this.mapStepRow(row));
  }

  async updateStep(stepId, organizationId, data) {
    const now = new Date().toISOString();

    const updates = [];
    const params = [stepId, organizationId];
    let paramIndex = 3;

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }

    if (data.decisionComment !== undefined) {
      updates.push(`decision_comment = $${paramIndex++}`);
      params.push(data.decisionComment);
    }

    if (data.decidedAt !== undefined) {
      updates.push(`decided_at = $${paramIndex++}`);
      params.push(data.decidedAt);
    } else if (data.status === 'approved' || data.status === 'rejected') {
      updates.push(`decided_at = $${paramIndex++}`);
      params.push(now);
    }

    if (data.decidedBy !== undefined) {
      updates.push(`decided_by = $${paramIndex++}`);
      params.push(data.decidedBy);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(now);

    if (updates.length === 0) {
      return null;
    }

    const query = `
      UPDATE business_approval_steps
      SET ${updates.join(', ')}
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    return result.rows[0] ? this.mapStepRow(result.rows[0]) : null;
  }

  async archive(id, organizationId, userId) {
    const now = new Date().toISOString();

    const query = `
      UPDATE business_approvals
      SET archived_at = $1, updated_at = $2
      WHERE id = $3 AND organization_id = $4 AND archived_at IS NULL
      RETURNING id
    `;

    const result = await this.db.query(query, [now, now, id, organizationId]);
    return result.rows.length > 0;
  }

  mapRow(row) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      objectId: row.object_id,
      approvalType: row.approval_type,
      status: row.status,
      title: row.title,
      description: row.description,
      requestedBy: row.requested_by,
      requesterName: row.requester_name,
      requesterEmail: row.requester_email,
      approverId: row.approver_id,
      approverType: row.approver_type,
      approverName: row.approver_name,
      decisionComment: row.decision_comment,
      decidedAt: row.decided_at,
      decidedBy: row.decided_by,
      escalationLevel: row.escalation_level,
      delegatedTo: row.delegated_to,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      archivedAt: row.archived_at,
      objectName: row.object_name,
      objectType: row.object_type
    };
  }

  mapStepRow(row) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      approvalId: row.approval_id,
      stepOrder: row.step_order,
      stepType: row.step_type,
      approverId: row.approver_id,
      approverType: row.approver_type,
      approverName: row.approver_name,
      status: row.status,
      decisionComment: row.decision_comment,
      decidedAt: row.decided_at,
      decidedBy: row.decided_by,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = BusinessApprovalRepository;