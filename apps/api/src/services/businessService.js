// Business Operating Platform Service
// Orchestrates all business operations

import { v4 as uuidv4 } from 'uuid';

class BusinessService {
  constructor(
    objectRepo,
    relationshipRepo,
    activityRepo,
    commentRepo,
    taskRepo,
    approvalRepo,
    notificationRepo,
    tagRepo,
    customFieldRepo,
    auditRepo,
    favoriteRepo,
    bookmarkRepo
  ) {
    this.objectRepo = objectRepo;
    this.relationshipRepo = relationshipRepo;
    this.activityRepo = activityRepo;
    this.commentRepo = commentRepo;
    this.taskRepo = taskRepo;
    this.approvalRepo = approvalRepo;
    this.notificationRepo = notificationRepo;
    this.tagRepo = tagRepo;
    this.customFieldRepo = customFieldRepo;
    this.auditRepo = auditRepo;
    this.favoriteRepo = favoriteRepo;
    this.bookmarkRepo = bookmarkRepo;
  }

  // ============================================
  // BUSINESS OBJECT OPERATIONS
  // ============================================

  async createBusinessObject(data, userId, organizationId, ipAddress = null, userAgent = null) {
    const obj = await this.objectRepo.create(
      { ...data, organizationId },
      userId
    );

    // Log activity
    await this.activityRepo.create(
      {
        organizationId,
        objectId: obj.id,
        activityType: 'created',
        description: `Created ${obj.objectType}: ${obj.name}`,
        actorType: 'user'
      },
      userId
    );

    // Create audit log
    await this.auditRepo.create(
      {
        organizationId,
        actorId: userId,
        actorType: 'user',
        action: 'create',
        resourceType: obj.objectType,
        resourceId: obj.id,
        newValues: obj,
        ipAddress,
        userAgent,
        apiEndpoint: '/api/business-objects'
      },
      userId
    );

    return obj;
  }

  async getBusinessObject(id, organizationId, userId = null) {
    const obj = await this.objectRepo.findById(id, organizationId);
    if (!obj) {
      return null;
    }

    // Track access if userId provided
    if (userId) {
      await this.trackRecentItem(userId, organizationId, obj.objectType, obj.id);
    }

    return obj;
  }

  async updateBusinessObject(id, organizationId, data, userId, ipAddress = null, userAgent = null) {
    const oldObj = await this.objectRepo.findById(id, organizationId);
    if (!oldObj) {
      return null;
    }

    const updatedObj = await this.objectRepo.update(id, organizationId, data, userId);

    // Log activity
    await this.activityRepo.create(
      {
        organizationId,
        objectId: id,
        activityType: 'updated',
        description: `Updated ${updatedObj.objectType}: ${updatedObj.name}`,
        actorType: 'user',
        metadata: { changes: data }
      },
      userId
    );

    // Create audit log
    await this.auditRepo.create(
      {
        organizationId,
        actorId: userId,
        actorType: 'user',
        action: 'update',
        resourceType: updatedObj.objectType,
        resourceId: updatedObj.id,
        oldValues: oldObj,
        newValues: updatedObj,
        ipAddress,
        userAgent,
        apiEndpoint: '/api/business-objects'
      },
      userId
    );

    return updatedObj;
  }

  async deleteBusinessObject(id, organizationId, userId, ipAddress = null, userAgent = null) {
    const obj = await this.objectRepo.findById(id, organizationId);
    if (!obj) {
      return false;
    }

    const deleted = await this.objectRepo.delete(id, organizationId, userId);

    if (deleted) {
      // Log activity
      await this.activityRepo.create(
        {
          organizationId,
          objectId: id,
          activityType: 'deleted',
          description: `Deleted ${obj.objectType}: ${obj.name}`,
          actorType: 'user'
        },
        userId
      );

      // Create audit log
      await this.auditRepo.create(
        {
          organizationId,
          actorId: userId,
          actorType: 'user',
          action: 'delete',
          resourceType: obj.objectType,
          resourceId: obj.id,
          oldValues: obj,
          ipAddress,
          userAgent,
          apiEndpoint: '/api/business-objects'
        },
        userId
      );
    }

    return deleted;
  }

  async searchBusinessObjects(organizationId, searchTerm, filters = {}, userId = null) {
    const results = await this.objectRepo.search(organizationId, searchTerm, filters);

    // Track recent items
    if (userId && results.length > 0) {
      for (const obj of results.slice(0, 10)) {
        await this.trackRecentItem(userId, organizationId, obj.objectType, obj.id);
      }
    }

    return results;
  }

  // ============================================
  // RELATIONSHIP OPERATIONS
  // ============================================

  async createRelationship(data, userId, organizationId) {
    const relationship = await this.relationshipRepo.create(
      { ...data, organizationId },
      userId
    );

    // Log activity for both objects
    await this.activityRepo.create(
      {
        organizationId,
        objectId: data.sourceObjectId,
        activityType: 'related',
        description: `Created ${data.relationshipType} relationship`,
        actorType: 'user',
        metadata: { targetObjectId: data.targetObjectId, relationshipType: data.relationshipType }
      },
      userId
    );

    return relationship;
  }

  async getRelationships(objectId, organizationId, relationshipType = null) {
    if (relationshipType) {
      return await this.relationshipRepo.findByType(objectId, relationshipType, organizationId);
    }
    return await this.relationshipRepo.findByObject(objectId, organizationId);
  }

  async deleteRelationship(id, organizationId, userId) {
    const relationship = await this.relationshipRepo.findById(id, organizationId);
    if (!relationship) {
      return false;
    }

    const deleted = await this.relationshipRepo.delete(id, organizationId);

    if (deleted) {
      await this.activityRepo.create(
        {
          organizationId,
          objectId: relationship.sourceObjectId,
          activityType: 'updated',
          description: `Removed ${relationship.relationshipType} relationship`,
          actorType: 'user'
        },
        userId
      );
    }

    return deleted;
  }

  // ============================================
  // COMMENT OPERATIONS
  // ============================================

  async createComment(data, userId, organizationId) {
    const comment = await this.commentRepo.create(
      { ...data, organizationId },
      userId
    );

    // Log activity
    await this.activityRepo.create(
      {
        organizationId,
        objectId: data.objectId,
        activityType: 'commented',
        description: 'Added a comment',
        actorType: 'user'
      },
      userId
    );

    // Process mentions and create notifications
    if (data.mentions && data.mentions.length > 0) {
      await this.processMentions(comment.id, data.mentions, organizationId, userId, data.objectId);
    }

    return comment;
  }

  async getComments(objectId, organizationId, limit = 50, offset = 0) {
    return await this.commentRepo.findByObject(objectId, organizationId, limit, offset);
  }

  async updateComment(id, organizationId, data, userId) {
    const updatedComment = await this.commentRepo.update(id, organizationId, data, userId);

    if (updatedComment && data.mentions) {
      // Remove old mentions and add new ones
      await this.commentRepo.deleteMentions(id, organizationId);
      await this.processMentions(id, data.mentions, organizationId, userId, updatedComment.objectId);
    }

    return updatedComment;
  }

  async deleteComment(id, organizationId, userId) {
    const comment = await this.commentRepo.findById(id, organizationId);
    if (!comment) {
      return false;
    }

    const deleted = await this.commentRepo.delete(id, organizationId, userId);

    if (deleted) {
      await this.activityRepo.create(
        {
          organizationId,
          objectId: comment.objectId,
          activityType: 'commented',
          description: 'Deleted a comment',
          actorType: 'user'
        },
        userId
      );
    }

    return deleted;
  }

  async processMentions(commentId, mentions, organizationId, userId, objectId) {
    for (const mention of mentions) {
      await this.commentRepo.addMention(commentId, {
        organizationId,
        mentionedType: mention.type,
        mentionedId: mention.id,
        mentionedName: mention.name
      }, userId);

      // Create notification for mentioned user
      if (mention.type === 'user') {
        await this.notificationRepo.create(
          {
            organizationId,
            userId: mention.id,
            notificationType: 'mention',
            title: 'You were mentioned',
            message: `You were mentioned in a comment`,
            priority: 'normal',
            channel: 'in_app',
            objectType: 'comment',
            objectId: commentId,
            actionUrl: `/business/objects/${objectId}`
          },
          userId
        );
      }
    }
  }

  // ============================================
  // TASK OPERATIONS
  // ============================================

  async createTask(data, userId, organizationId) {
    const task = await this.taskRepo.create(
      { ...data, organizationId },
      userId
    );

    // Log activity
    await this.activityRepo.create(
      {
        organizationId,
        objectId: data.objectId,
        activityType: 'task_created',
        description: `Created task: ${task.title}`,
        actorType: 'user'
      },
      userId
    );

    // Create notification if assignee is set
    if (task.assigneeId) {
      await this.notificationRepo.create(
        {
          organizationId,
          userId: task.assigneeId,
          notificationType: 'task_assigned',
          title: 'New Task Assigned',
          message: `You have been assigned a new task: ${task.title}`,
          priority: task.priority === 'critical' ? 'urgent' : 'normal',
          channel: 'in_app',
          objectType: 'task',
          objectId: task.id,
          actionUrl: `/business/tasks/${task.id}`
        },
        userId
      );
    }

    return task;
  }

  async getTasks(objectId, organizationId, limit = 50, offset = 0) {
    return await this.taskRepo.findByObject(objectId, organizationId, limit, offset);
  }

  async updateTask(id, organizationId, data, userId) {
    const oldTask = await this.taskRepo.findById(id, organizationId);
    const updatedTask = await this.taskRepo.update(id, organizationId, data, userId);

    if (updatedTask) {
      // Log activity
      await this.activityRepo.create(
        {
          organizationId,
          objectId: updatedTask.objectId,
          activityType: 'task_updated',
          description: `Updated task: ${updatedTask.title}`,
          actorType: 'user',
          metadata: { changes: data }
        },
        userId
      );

      // Notify assignee if changed
      if (data.assigneeId && data.assigneeId !== oldTask?.assigneeId) {
        await this.notificationRepo.create(
          {
            organizationId,
            userId: data.assigneeId,
            notificationType: 'task_assigned',
            title: 'Task Assigned',
            message: `You have been assigned a task: ${updatedTask.title}`,
            priority: 'normal',
            channel: 'in_app',
            objectType: 'task',
            objectId: updatedTask.id
          },
          userId
        );
      }
    }

    return updatedTask;
  }

  // ============================================
  // APPROVAL OPERATIONS
  // ============================================

  async createApproval(data, userId, organizationId) {
    const approval = await this.approvalRepo.create(
      { ...data, organizationId },
      userId
    );

    // Log activity
    await this.activityRepo.create(
      {
        organizationId,
        objectId: data.objectId,
        activityType: 'approval_requested',
        description: `Requested approval: ${approval.title}`,
        actorType: 'user'
      },
      userId
    );

    // Create notification for approver
    if (approval.approverId) {
      await this.notificationRepo.create(
        {
          organizationId,
          userId: approval.approverId,
          notificationType: 'approval_requested',
          title: 'Approval Required',
          message: `Approval requested for: ${approval.title}`,
          priority: 'high',
          channel: 'in_app',
          objectType: 'approval',
          objectId: approval.id,
          actionUrl: `/business/approvals/${approval.id}`
        },
        userId
      );
    }

    return approval;
  }

  async getApprovals(objectId, organizationId, limit = 50, offset = 0) {
    return await this.approvalRepo.findByObject(objectId, organizationId, limit, offset);
  }

  async updateApproval(id, organizationId, data, userId) {
    const updatedApproval = await this.approvalRepo.update(id, organizationId, data, userId);

    if (updatedApproval && (data.status === 'approved' || data.status === 'rejected')) {
      // Log activity
      await this.activityRepo.create(
        {
          organizationId,
          objectId: updatedApproval.objectId,
          activityType: data.status === 'approved' ? 'approved' : 'rejected',
          description: `${data.status === 'approved' ? 'Approved' : 'Rejected'}: ${updatedApproval.title}`,
          actorType: 'user'
        },
        userId
      );

      // Notify requester
      await this.notificationRepo.create(
        {
          organizationId,
          userId: updatedApproval.requestedBy,
          notificationType: 'approval_decided',
          title: `Approval ${data.status}`,
          message: `Your approval request has been ${data.status}: ${updatedApproval.title}`,
          priority: 'high',
          channel: 'in_app',
          objectType: 'approval',
          objectId: updatedApproval.id
        },
        userId
      );
    }

    return updatedApproval;
  }

  // ============================================
  // TAG OPERATIONS
  // ============================================

  async addTagToObject(objectId, tagId, userId, organizationId) {
    // Check if already tagged
    const existing = await this.objectRepo.findById(objectId, organizationId);
    if (!existing) {
      return null;
    }

    // Add tag to object
    const tags = existing.tags || [];
    if (!tags.includes(tagId)) {
      tags.push(tagId);
      await this.objectRepo.update(objectId, organizationId, { tags }, userId);

      // Increment tag usage
      await this.tagRepo.incrementUsage(tagId, organizationId);
    }

    return existing;
  }

  async removeTagFromObject(objectId, tagId, userId, organizationId) {
    const existing = await this.objectRepo.findById(objectId, organizationId);
    if (!existing) {
      return null;
    }

    // Remove tag from object
    const tags = (existing.tags || []).filter(t => t !== tagId);
    await this.objectRepo.update(objectId, organizationId, { tags }, userId);

    // Decrement tag usage
    await this.tagRepo.decrementUsage(tagId, organizationId);

    return existing;
  }

  // ============================================
  // CUSTOM FIELD OPERATIONS
  // ============================================

  async setCustomFieldValue(objectId, customFieldId, value, userId, organizationId) {
    return await this.customFieldRepo.setValue(objectId, customFieldId, organizationId, value, userId);
  }

  async getCustomFieldValues(objectId, organizationId) {
    return await this.customFieldRepo.getValues(objectId, organizationId);
  }

  // ============================================
  // FAVORITES & BOOKMARKS
  // ============================================

  async addToFavorites(objectId, userId, organizationId) {
    return await this.favoriteRepo.create({ objectId, organizationId }, userId);
  }

  async removeFromFavorites(objectId, userId, organizationId) {
    return await this.favoriteRepo.deleteByObject(objectId, organizationId, userId);
  }

  async getFavorites(userId, organizationId, limit = 50, offset = 0) {
    return await this.favoriteRepo.findByUser(userId, organizationId, limit, offset);
  }

  async createBookmark(data, userId, organizationId) {
    return await this.bookmarkRepo.create({ ...data, organizationId }, userId);
  }

  async getBookmarks(userId, organizationId, limit = 50, offset = 0) {
    return await this.bookmarkRepo.findByUser(userId, organizationId, limit, offset);
  }

  // ============================================
  // RECENT ITEMS
  // ============================================

  async trackRecentItem(userId, organizationId, objectType, objectId) {
    const query = `
      INSERT INTO business_recent_items (
        organization_id, user_id, object_type, object_id, accessed_at
      ) VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (organization_id, user_id, object_type, object_id)
      DO UPDATE SET accessed_at = NOW()
    `;

    await this.objectRepo.db.query(query, [organizationId, userId, objectType, objectId]);
  }

  async getRecentItems(userId, organizationId, limit = 20) {
    const query = `
      SELECT * FROM business_recent_items
      WHERE user_id = $1 AND organization_id = $2
      ORDER BY accessed_at DESC
      LIMIT $3
    `;

    const result = await this.objectRepo.db.query(query, [userId, organizationId, limit]);
    return result.rows;
  }

  // ============================================
  // DASHBOARD STATS
  // ============================================

  async getDashboardStats(organizationId, userId) {
    // Get recent activity
    const recentActivity = await this.activityRepo.findByOrganization(organizationId, {}, 10, 0);

    // Get pending approvals
    const pendingApprovals = await this.approvalRepo.findPending(organizationId, 10, 0);

    // Get unread notifications
    const unreadNotifications = await this.notificationRepo.getUnreadCount(userId, organizationId);

    // Get task stats
    const taskStats = await this.taskRepo.getTaskStats(organizationId);

    // Get recent objects
    const recentObjects = await this.objectRepo.findAll(organizationId, { limit: 10 });

    // Get favorites
    const favorites = await this.favoriteRepo.findByUser(userId, organizationId, 10, 0);

    return {
      recentActivity,
      pendingApprovals,
      unreadNotifications,
      taskStats,
      recentObjects,
      favorites
    };
  }
}

export default BusinessService;