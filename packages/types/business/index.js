// Business Operating Platform Types

// ============================================
// ENUMS
// ============================================
export const ObjectType = {
  CUSTOMER: 'customer',
  LEAD: 'lead',
  OPPORTUNITY: 'opportunity',
  EMPLOYEE: 'employee',
  PROJECT: 'project',
  GOAL: 'goal',
  TASK: 'task',
  INVOICE: 'invoice',
  PURCHASE: 'purchase',
  ASSET: 'asset',
  DOCUMENT: 'document',
  KNOWLEDGE: 'knowledge',
  MEETING: 'meeting',
  SUPPORT_TICKET: 'support_ticket',
  CUSTOM: 'custom'
};

export const RelationshipType = {
  PARENT: 'parent',
  CHILD: 'child',
  REFERENCE: 'reference',
  DEPENDENCY: 'dependency',
  RELATED: 'related',
  DUPLICATE: 'duplicate',
  BLOCKED_BY: 'blocked_by',
  ASSIGNED_TO: 'assigned_to',
  BELONGS_TO: 'belongs_to',
  CUSTOM: 'custom'
};

export const ActivityType = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  COMMENTED: 'commented',
  ASSIGNED: 'assigned',
  MENTIONED: 'mentioned',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  STATUS_CHANGED: 'status_changed',
  DOCUMENT_UPLOADED: 'document_uploaded',
  WORKER_EXECUTED: 'worker_executed',
  AGENT_DECISION: 'agent_decision',
  INTEGRATION_EVENT: 'integration_event'
};

export const TaskStatus = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  PENDING: 'pending',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  ARCHIVED: 'archived'
};

export const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

export const ApprovalStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  ESCALATED: 'escalated',
  DELEGATED: 'delegated'
};

export const NotificationChannel = {
  IN_APP: 'in_app',
  EMAIL: 'email',
  PUSH: 'push',
  TEAMS: 'teams',
  SLACK: 'slack',
  WEBHOOK: 'webhook'
};

export const NotificationPriority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

export const CustomFieldType = {
  TEXT: 'text',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  DROPDOWN: 'dropdown',
  MULTI_SELECT: 'multi_select',
  DATE: 'date',
  CURRENCY: 'currency',
  USER: 'user',
  OBJECT_REFERENCE: 'object_reference',
  JSON: 'json'
};

export const Visibility = {
  PUBLIC: 'public',
  ORGANIZATION: 'organization',
  PRIVATE: 'private',
  SHARED: 'shared'
};

// ============================================
// BUSINESS OBJECT
// ============================================
export class BusinessObject {
  constructor(data = {}) {
    this.id = data.id;
    this.organizationId = data.organizationId;
    this.objectType = data.objectType;
    this.name = data.name;
    this.description = data.description;
    this.status = data.status || 'draft';
    this.ownerId = data.ownerId;
    this.createdBy = data.createdBy;
    this.updatedBy = data.updatedBy;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.version = data.version || 1;
    this.visibility = data.visibility || 'organization';
    this.tags = data.tags || [];
    this.customFields = data.customFields || {};
    this.metadata = data.metadata || {};
    this.archivedAt = data.archivedAt;
    this.deletedAt = data.deletedAt;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      objectType: this.objectType,
      name: this.name,
      description: this.description,
      status: this.status,
      ownerId: this.ownerId,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
      visibility: this.visibility,
      tags: this.tags,
      customFields: this.customFields,
      metadata: this.metadata,
      archivedAt: this.archivedAt,
      deletedAt: this.deletedAt
    };
  }
}

// ============================================
// RELATIONSHIP
// ============================================
export class BusinessRelationship {
  constructor(data = {}) {
    this.id = data.id;
    this.organizationId = data.organizationId;
    this.relationshipType = data.relationshipType;
    this.sourceObjectId = data.sourceObjectId;
    this.targetObjectId = data.targetObjectId;
    this.metadata = data.metadata || {};
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      relationshipType: this.relationshipType,
      sourceObjectId: this.sourceObjectId,
      targetObjectId: this.targetObjectId,
      metadata: this.metadata,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// ============================================
// ACTIVITY
// ============================================
export class BusinessActivity {
  constructor(data = {}) {
    this.id = data.id;
    this.organizationId = data.organizationId;
    this.objectId = data.objectId;
    this.activityType = data.activityType;
    this.description = data.description;
    this.actorId = data.actorId;
    this.actorType = data.actorType || 'user';
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      objectId: this.objectId,
      activityType: this.activityType,
      description: this.description,
      actorId: this.actorId,
      actorType: this.actorType,
      metadata: this.metadata,
      createdAt: this.createdAt
    };
  }
}

// ============================================
// COMMENT
// ============================================
export class BusinessComment {
  constructor(data = {}) {
    this.id = data.id;
    this.organizationId = data.organizationId;
    this.objectId = data.objectId;
    this.parentCommentId = data.parentCommentId;
    this.content = data.content;
    this.contentType = data.contentType || 'markdown';
    this.authorId = data.authorId;
    this.isResolved = data.isResolved || false;
    this.isPinned = data.isPinned || false;
    this.isEdited = data.isEdited || false;
    this.editedAt = data.editedAt;
    this.reactions = data.reactions || {};
    this.attachments = data.attachments || [];
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.deletedAt = data.deletedAt;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      objectId: this.objectId,
      parentCommentId: this.parentCommentId,
      content: this.content,
      contentType: this.contentType,
      authorId: this.authorId,
      isResolved: this.isResolved,
      isPinned: this.isPinned,
      isEdited: this.isEdited,
      editedAt: this.editedAt,
      reactions: this.reactions,
      attachments: this.attachments,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt
    };
  }
}

// ============================================
// MENTION
// ============================================
export class BusinessMention {
  constructor(data = {}) {
    this.id = data.id;
    this.organizationId = data.organizationId;
    this.commentId = data.commentId;
    this.mentionedType = data.mentionedType;
    this.mentionedId = data.mentionedId;
    this.mentionedName = data.mentionedName;
    this.createdAt = data.createdAt;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      commentId: this.commentId,
      mentionedType: this.mentionedType,
      mentionedId: this.mentionedId,
      mentionedName: this.mentionedName,
      createdAt: this.createdAt
    };
  }
}

// ============================================
// TASK
// ============================================
export class BusinessTask {
  constructor(data = {}) {
    this.id = data.id;
    this.organizationId = data.organizationId;
    this.objectId = data.objectId;
    this.title = data.title;
    this.description = data.description;
    this.status = data.status || 'open';
    this.priority = data.priority || 'medium';
    this.assigneeId = data.assigneeId;
    this.assigneeType = data.assigneeType;
    this.dueDate = data.dueDate;
    this.reminderAt = data.reminderAt;
    this.parentTaskId = data.parentTaskId;
    this.checklist = data.checklist || [];
    this.dependencies = data.dependencies || [];
    this.isRecurring = data.isRecurring || false;
    this.recurrencePattern = data.recurrencePattern;
    this.metadata = data.metadata || {};
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.completedAt = data.completedAt;
    this.archivedAt = data.archivedAt;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      objectId: this.objectId,
      title: this.title,
      description: this.description,
      status: this.status,
      priority: this.priority,
      assigneeId: this.assigneeId,
      assigneeType: this.assigneeType,
      dueDate: this.dueDate,
      reminderAt: this.reminderAt,
      parentTaskId: this.parentTaskId,
      checklist: this.checklist,
      dependencies: this.dependencies,
      isRecurring: this.isRecurring,
      recurrencePattern: this.recurrencePattern,
      metadata: this.metadata,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt,
      archivedAt: this.archivedAt
    };
  }
}

// ============================================
// APPROVAL
// ============================================
export class BusinessApproval {
  constructor(data = {}) {
    this.id = data.id;
    this.organizationId = data.organizationId;
    this.objectId = data.objectId;
    this.approvalType = data.approvalType;
    this.status = data.status || 'pending';
    this.title = data.title;
    this.description = data.description;
    this.requestedBy = data.requestedBy;
    this.approverId = data.approverId;
    this.approverType = data.approverType;
    this.decisionComment = data.decisionComment;
    this.decidedAt = data.decidedAt;
    this.decidedBy = data.decidedBy;
    this.escalationLevel = data.escalationLevel || 0;
    this.delegatedTo = data.delegatedTo;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.archivedAt = data.archivedAt;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      objectId: this.objectId,
      approvalType: this.approvalType,
      status: this.status,
      title: this.title,
      description: this.description,
      requestedBy: this.requestedBy,
      approverId: this.approverId,
      approverType: this.approverType,
      decisionComment: this.decisionComment,
      decidedAt: this.decidedAt,
      decidedBy: this.decidedBy,
      escalationLevel: this.escalationLevel,
      delegatedTo: this.delegatedTo,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      archivedAt: this.archivedAt
    };
  }
}

// ============================================
// APPROVAL STEP
// ============================================
export class BusinessApprovalStep {
  constructor(data = {}) {
    this.id = data.id;
    this.organizationId = data.organizationId;
    this.approvalId = data.approvalId;
    this.stepOrder = data.stepOrder;
    this.stepType = data.stepType;
    this.approverId = data.approverId;
    this.approverType = data.approverType;
    this.status = data.status || 'pending';
    this.decisionComment = data.decisionComment;
    this.decidedAt = data.decidedAt;
    this.decidedBy = data.decidedBy;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      approvalId: this.approvalId,
      stepOrder: this.stepOrder,
      stepType: this.stepType,
      approverId: this.approverId,
      approverType: this.approverType,
      status: this.status,
      decisionComment: this.decisionComment,
      decidedAt: this.decidedAt,
      decidedBy: this.decidedBy,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// ============================================
// NOTIFICATION
// ============================================
export class BusinessNotification {
  constructor(data = {}) {
    this.id = data.id;
    this.organizationId = data.organizationId;
    this.userId = data.userId;
    this.notificationType = data.notificationType;
    this.title = data.title;
    this.message = data.message;
    this.priority = data.priority || 'normal';
    this.channel = data.channel || 'in_app';
    this.objectType = data.objectType;
    this.objectId = data.objectId;
    this.actionUrl = data.actionUrl;
    this.isRead = data.isRead || false;
    this.readAt = data.readAt;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt;
    this.archivedAt = data.archivedAt;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      userId: this.userId,
      notificationType: this.notificationType,
      title: this.title,
      message: this.message,
      priority: this.priority,
      channel: this.channel,
      objectType: this.objectType,
      objectId: this.objectId,
      actionUrl: this.actionUrl,
      isRead: this.isRead,
      readAt: this.readAt,
      metadata: this.metadata,
      createdAt: this.createdAt,
      archivedAt: this.archivedAt
    };
  }
}

// ============================================
// TAG
// ============================================
export class BusinessTag {
  constructor(data = {}) {
    this.id = data.id;
    this.organizationId = data.organizationId;
    this.name = data.name;
    this.slug = data.slug;
    this.color = data.color || '#6366f1';
    this.description = data.description;
    this.parentTagId = data.parentTagId;
    this.category = data.category;
    this.aliases = data.aliases || [];
    this.usageCount = data.usageCount || 0;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      slug: this.slug,
      color: this.color,
      description: this.description,
      parentTagId: this.parentTagId,
      category: this.category,
      aliases: this.aliases,
      usageCount: this.usageCount,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// ============================================
// CUSTOM FIELD
// ============================================
export class BusinessCustomField {
  constructor(data = {}) {
    this.id = data.id;
    this.organizationId = data.organizationId;
    this.objectType = data.objectType;
    this.fieldName = data.fieldName;
    this.fieldLabel = data.fieldLabel;
    this.fieldType = data.fieldType;
    this.fieldOptions = data.fieldOptions || {};
    this.isRequired = data.isRequired || false;
    this.isUnique = data.isUnique || false;
    this.defaultValue = data.defaultValue;
    this.validationRules = data.validationRules || {};
    this.displayOrder = data.displayOrder || 0;
    this.isSystem = data.isSystem || false;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      objectType: this.objectType,
      fieldName: this.fieldName,
      fieldLabel: this.fieldLabel,
      fieldType: this.fieldType,
      fieldOptions: this.fieldOptions,
      isRequired: this.isRequired,
      isUnique: this.isUnique,
      defaultValue: this.defaultValue,
      validationRules: this.validationRules,
      displayOrder: this.displayOrder,
      isSystem: this.isSystem,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// ============================================
// AUDIT LOG
// ============================================
export class BusinessAuditLog {
  constructor(data = {}) {
    this.id = data.id;
    this.organizationId = data.organizationId;
    this.actorId = data.actorId;
    this.actorType = data.actorType || 'user';
    this.action = data.action;
    this.resourceType = data.resourceType;
    this.resourceId = data.resourceId;
    this.oldValues = data.oldValues;
    this.newValues = data.newValues;
    this.ipAddress = data.ipAddress;
    this.userAgent = data.userAgent;
    this.deviceInfo = data.deviceInfo;
    this.workerId = data.workerId;
    this.agentId = data.agentId;
    this.apiEndpoint = data.apiEndpoint;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      actorId: this.actorId,
      actorType: this.actorType,
      action: this.action,
      resourceType: this.resourceType,
      resourceId: this.resourceId,
      oldValues: this.oldValues,
      newValues: this.newValues,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      deviceInfo: this.deviceInfo,
      workerId: this.workerId,
      agentId: this.agentId,
      apiEndpoint: this.apiEndpoint,
      metadata: this.metadata,
      createdAt: this.createdAt
    };
  }
}

// ============================================
// TIMELINE EVENT
// ============================================
export class BusinessTimelineEvent {
  constructor(data = {}) {
    this.id = data.id;
    this.organizationId = data.organizationId;
    this.objectId = data.objectId;
    this.eventType = data.eventType;
    this.title = data.title;
    this.description = data.description;
    this.actorId = data.actorId;
    this.actorType = data.actorType || 'user';
    this.relatedObjectType = data.relatedObjectType;
    this.relatedObjectId = data.relatedObjectId;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      objectId: this.objectId,
      eventType: this.eventType,
      title: this.title,
      description: this.description,
      actorId: this.actorId,
      actorType: this.actorType,
      relatedObjectType: this.relatedObjectType,
      relatedObjectId: this.relatedObjectId,
      metadata: this.metadata,
      createdAt: this.createdAt
    };
  }
}

// ============================================
// FAVORITE
// ============================================
export class BusinessFavorite {
  constructor(data = {}) {
    this.id = data.id;
    this.organizationId = data.organizationId;
    this.userId = data.userId;
    this.objectId = data.objectId;
    this.createdAt = data.createdAt;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      userId: this.userId,
      objectId: this.objectId,
      createdAt: this.createdAt
    };
  }
}

// ============================================
// BOOKMARK
// ============================================
export class BusinessBookmark {
  constructor(data = {}) {
    this.id = data.id;
    this.organizationId = data.organizationId;
    this.userId = data.userId;
    this.name = data.name;
    this.description = data.description;
    this.objectType = data.objectType;
    this.objectId = data.objectId;
    this.filterCriteria = data.filterCriteria || {};
    this.isShared = data.isShared || false;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      userId: this.userId,
      name: this.name,
      description: this.description,
      objectType: this.objectType,
      objectId: this.objectId,
      filterCriteria: this.filterCriteria,
      isShared: this.isShared,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// ============================================
// RECENT ITEM
// ============================================
export class BusinessRecentItem {
  constructor(data = {}) {
    this.id = data.id;
    this.organizationId = data.organizationId;
    this.userId = data.userId;
    this.objectType = data.objectType;
    this.objectId = data.objectId;
    this.accessedAt = data.accessedAt;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      userId: this.userId,
      objectType: this.objectType,
      objectId: this.objectId,
      accessedAt: this.accessedAt
    };
  }
}

// ============================================
// EXPORT ALL
// ============================================
export default {
  ObjectType,
  RelationshipType,
  ActivityType,
  TaskStatus,
  TaskPriority,
  ApprovalStatus,
  NotificationChannel,
  NotificationPriority,
  CustomFieldType,
  Visibility,
  BusinessObject,
  BusinessRelationship,
  BusinessActivity,
  BusinessComment,
  BusinessMention,
  BusinessTask,
  BusinessApproval,
  BusinessApprovalStep,
  BusinessNotification,
  BusinessTag,
  BusinessCustomField,
  BusinessAuditLog,
  BusinessTimelineEvent,
  BusinessFavorite,
  BusinessBookmark,
  BusinessRecentItem
};