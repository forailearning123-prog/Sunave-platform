// Business Operating Platform Routes
// Epic 6 - Shared foundation for all business modules

const express = require('express');
const router = express.Router();

// Import repositories and services (will be injected via app.js)
let businessService;
let permService;

// Middleware to inject dependencies
router.use((req, res, next) => {
  businessService = req.businessService;
  permService = req.permissionService;
  next();
});

// ============================================
// BUSINESS OBJECTS
// ============================================

// GET /api/business/objects - List all business objects
router.get('/objects', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const {
      objectType,
      status,
      ownerId,
      visibility,
      search,
      sortBy,
      sortOrder,
      limit = 50,
      offset = 0
    } = req.query;

    const filters = { objectType, status, ownerId, visibility, search, sortBy, sortOrder };
    const result = await businessService.objectRepo.findAll(organizationId, filters);

    res.json({
      success: true,
      data: result.data,
      total: result.total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/business/objects/:id - Get single business object
router.get('/objects/:id', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const { id } = req.params;

    const obj = await businessService.getBusinessObject(id, organizationId, req.auth.userId);
    if (!obj) {
      return res.status(404).json({ success: false, error: 'Object not found' });
    }

    res.json({ success: true, data: obj });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/business/objects - Create business object
router.post('/objects', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { objectType, name, description, status, ownerId, visibility, tags, customFields, metadata } = req.body;

    const obj = await businessService.createBusinessObject(
      { objectType, name, description, status, ownerId, visibility, tags, customFields, metadata },
      userId,
      organizationId,
      req.ip,
      req.get('user-agent')
    );

    res.status(201).json({ success: true, data: obj });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/business/objects/:id - Update business object
router.put('/objects/:id', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { id } = req.params;
    const { name, description, status, ownerId, visibility, tags, customFields, metadata } = req.body;

    const obj = await businessService.updateBusinessObject(
      id,
      organizationId,
      { name, description, status, ownerId, visibility, tags, customFields, metadata },
      userId,
      req.ip,
      req.get('user-agent')
    );

    if (!obj) {
      return res.status(404).json({ success: false, error: 'Object not found' });
    }

    res.json({ success: true, data: obj });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/business/objects/:id - Delete business object
router.delete('/objects/:id', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { id } = req.params;

    const deleted = await businessService.deleteBusinessObject(
      id,
      organizationId,
      userId,
      req.ip,
      req.get('user-agent')
    );

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Object not found' });
    }

    res.json({ success: true, message: 'Object deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/business/objects/:id/archive - Archive business object
router.post('/objects/:id/archive', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { id } = req.params;

    const archived = await businessService.objectRepo.archive(id, organizationId, userId);
    if (!archived) {
      return res.status(404).json({ success: false, error: 'Object not found' });
    }

    res.json({ success: true, message: 'Object archived successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/business/objects/:id/restore - Restore archived object
router.post('/objects/:id/restore', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { id } = req.params;

    const restored = await businessService.objectRepo.restore(id, organizationId, userId);
    if (!restored) {
      return res.status(404).json({ success: false, error: 'Object not found' });
    }

    res.json({ success: true, message: 'Object restored successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// SEARCH
// ============================================

// POST /api/business/search - Global search
router.post('/search', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { query, filters = {} } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Search query is required' });
    }

    const results = await businessService.searchBusinessObjects(organizationId, query, filters, userId);

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// RELATIONSHIPS
// ============================================

// POST /api/business/relationships - Create relationship
router.post('/relationships', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { sourceObjectId, targetObjectId, relationshipType, metadata } = req.body;

    const relationship = await businessService.createRelationship(
      { sourceObjectId, targetObjectId, relationshipType, metadata },
      userId,
      organizationId
    );

    res.status(201).json({ success: true, data: relationship });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/business/objects/:id/relationships - Get relationships
router.get('/objects/:id/relationships', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const { id } = req.params;
    const { relationshipType } = req.query;

    const relationships = await businessService.getRelationships(id, organizationId, relationshipType);

    res.json({ success: true, data: relationships });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/business/relationships/:id - Delete relationship
router.delete('/relationships/:id', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { id } = req.params;

    const deleted = await businessService.deleteRelationship(id, organizationId, userId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Relationship not found' });
    }

    res.json({ success: true, message: 'Relationship deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ACTIVITY TIMELINE
// ============================================

// GET /api/business/objects/:id/activity - Get activity timeline
router.get('/objects/:id/activity', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const activities = await businessService.activityRepo.findByObject(id, organizationId, limit, offset);

    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/business/activity - Get organization activity
router.get('/activity', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const { activityType, actorId, startDate, endDate, limit = 50, offset = 0 } = req.query;

    const filters = { activityType, actorId, startDate, endDate };
    const activities = await businessService.activityRepo.findByOrganization(organizationId, filters, limit, offset);

    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// COMMENTS
// ============================================

// GET /api/business/objects/:id/comments - Get comments
router.get('/objects/:id/comments', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const comments = await businessService.getComments(id, organizationId, limit, offset);

    res.json({ success: true, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/business/objects/:id/comments - Create comment
router.post('/objects/:id/comments', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { id } = req.params;
    const { content, contentType, parentCommentId, mentions, reactions, attachments } = req.body;

    const comment = await businessService.createComment(
      {
        objectId: id,
        content,
        contentType,
        parentCommentId,
        mentions,
        reactions,
        attachments
      },
      userId,
      organizationId
    );

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/business/comments/:id - Update comment
router.put('/comments/:id', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { id } = req.params;
    const { content, isResolved, isPinned, reactions, mentions } = req.body;

    const comment = await businessService.updateComment(id, organizationId, { content, isResolved, isPinned, reactions, mentions }, userId);

    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    res.json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/business/comments/:id - Delete comment
router.delete('/comments/:id', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { id } = req.params;

    const deleted = await businessService.deleteComment(id, organizationId, userId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// TASKS
// ============================================

// GET /api/business/objects/:id/tasks - Get tasks
router.get('/objects/:id/tasks', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const tasks = await businessService.getTasks(id, organizationId, limit, offset);

    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/business/objects/:id/tasks - Create task
router.post('/objects/:id/tasks', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { id } = req.params;
    const { title, description, status, priority, assigneeId, dueDate, checklist, dependencies } = req.body;

    const task = await businessService.createTask(
      {
        objectId: id,
        title,
        description,
        status,
        priority,
        assigneeId,
        dueDate,
        checklist,
        dependencies
      },
      userId,
      organizationId
    );

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/business/tasks/:id - Update task
router.put('/tasks/:id', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { id } = req.params;
    const { title, description, status, priority, assigneeId, dueDate, checklist, dependencies } = req.body;

    const task = await businessService.updateTask(id, organizationId, {
      title, description, status, priority, assigneeId, dueDate, checklist, dependencies
    }, userId);

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// APPROVALS
// ============================================

// GET /api/business/objects/:id/approvals - Get approvals
router.get('/objects/:id/approvals', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const approvals = await businessService.getApprovals(id, organizationId, limit, offset);

    res.json({ success: true, data: approvals });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/business/objects/:id/approvals - Create approval
router.post('/objects/:id/approvals', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { id } = req.params;
    const { approvalType, title, description, approverId, approverType } = req.body;

    const approval = await businessService.createApproval(
      {
        objectId: id,
        approvalType,
        title,
        description,
        approverId,
        approverType
      },
      userId,
      organizationId
    );

    res.status(201).json({ success: true, data: approval });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/business/approvals/:id - Update approval
router.put('/approvals/:id', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { id } = req.params;
    const { status, decisionComment } = req.body;

    const approval = await businessService.updateApproval(id, organizationId, { status, decisionComment }, userId);

    if (!approval) {
      return res.status(404).json({ success: false, error: 'Approval not found' });
    }

    res.json({ success: true, data: approval });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// TAGS
// ============================================

// GET /api/business/tags - Get all tags
router.get('/tags', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const { category, search, limit = 100, offset = 0 } = req.query;

    const filters = { category, search };
    const tags = await businessService.tagRepo.findAll(organizationId, filters, limit, offset);

    res.json({ success: true, data: tags });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/business/tags - Create tag
router.post('/tags', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { name, slug, color, description, parentTagId, category, aliases } = req.body;

    const tag = await businessService.tagRepo.create(
      { name, slug, color, description, parentTagId, category, aliases, organizationId },
      userId
    );

    res.status(201).json({ success: true, data: tag });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/business/objects/:id/tags/:tagId - Add tag to object
router.post('/objects/:id/tags/:tagId', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { id, tagId } = req.params;

    const obj = await businessService.addTagToObject(id, tagId, userId, organizationId);
    if (!obj) {
      return res.status(404).json({ success: false, error: 'Object not found' });
    }

    res.json({ success: true, data: obj });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/business/objects/:id/tags/:tagId - Remove tag from object
router.delete('/objects/:id/tags/:tagId', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { id, tagId } = req.params;

    const obj = await businessService.removeTagFromObject(id, tagId, userId, organizationId);
    if (!obj) {
      return res.status(404).json({ success: false, error: 'Object not found' });
    }

    res.json({ success: true, data: obj });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// CUSTOM FIELDS
// ============================================

// GET /api/business/custom-fields - Get custom fields
router.get('/custom-fields', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const { objectType } = req.query;

    if (!objectType) {
      return res.status(400).json({ success: false, error: 'objectType is required' });
    }

    const fields = await businessService.customFieldRepo.findByObjectType(objectType, organizationId);

    res.json({ success: true, data: fields });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/business/custom-fields - Create custom field
router.post('/custom-fields', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { objectType, fieldName, fieldLabel, fieldType, fieldOptions, isRequired, validationRules } = req.body;

    const field = await businessService.customFieldRepo.create(
      { objectType, fieldName, fieldLabel, fieldType, fieldOptions, isRequired, validationRules, organizationId },
      userId
    );

    res.status(201).json({ success: true, data: field });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/business/objects/:id/custom-fields/:fieldId - Set custom field value
router.post('/objects/:id/custom-fields/:fieldId', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { id, fieldId } = req.params;
    const { value } = req.body;

    const fieldValue = await businessService.setCustomFieldValue(id, fieldId, value, userId, organizationId);

    res.status(201).json({ success: true, data: fieldValue });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/business/objects/:id/custom-fields - Get custom field values
router.get('/objects/:id/custom-fields', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const { id } = req.params;

    const values = await businessService.getCustomFieldValues(id, organizationId);

    res.json({ success: true, data: values });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// FAVORITES
// ============================================

// POST /api/business/objects/:id/favorite - Add to favorites
router.post('/objects/:id/favorite', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { id } = req.params;

    const favorite = await businessService.addToFavorites(id, userId, organizationId);

    if (!favorite) {
      return res.status(400).json({ success: false, error: 'Already favorited' });
    }

    res.status(201).json({ success: true, data: favorite });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/business/objects/:id/favorite - Remove from favorites
router.delete('/objects/:id/favorite', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { id } = req.params;

    const deleted = await businessService.removeFromFavorites(id, userId, organizationId);

    res.json({ success: true, message: 'Removed from favorites' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/business/favorites - Get user favorites
router.get('/favorites', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { limit = 50, offset = 0 } = req.query;

    const favorites = await businessService.getFavorites(userId, organizationId, limit, offset);

    res.json({ success: true, data: favorites });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// BOOKMARKS
// ============================================

// GET /api/business/bookmarks - Get user bookmarks
router.get('/bookmarks', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { limit = 50, offset = 0 } = req.query;

    const bookmarks = await businessService.getBookmarks(userId, organizationId, limit, offset);

    res.json({ success: true, data: bookmarks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/business/bookmarks - Create bookmark
router.post('/bookmarks', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { name, description, objectType, objectId, filterCriteria, isShared } = req.body;

    const bookmark = await businessService.createBookmark(
      { name, description, objectType, objectId, filterCriteria, isShared },
      userId,
      organizationId
    );

    res.status(201).json({ success: true, data: bookmark });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// NOTIFICATIONS
// ============================================

// GET /api/business/notifications - Get user notifications
router.get('/notifications', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { isRead, notificationType, priority, limit = 50, offset = 0 } = req.query;

    const filters = { isRead, notificationType, priority };
    const notifications = await businessService.notificationRepo.findByUser(userId, organizationId, filters, limit, offset);

    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/business/notifications/unread-count - Get unread count
router.get('/notifications/unread-count', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;

    const count = await businessService.notificationRepo.getUnreadCount(userId, organizationId);

    res.json({ success: true, data: { count } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/business/notifications/:id/read - Mark notification as read
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { id } = req.params;

    const notification = await businessService.notificationRepo.markAsRead(id, organizationId, userId);
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/business/notifications/read-all - Mark all as read
router.put('/notifications/read-all', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;

    const count = await businessService.notificationRepo.markAllAsRead(userId, organizationId);

    res.json({ success: true, message: `Marked ${count} notifications as read` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// AUDIT LOG
// ============================================

// GET /api/business/audit - Get audit logs
router.get('/audit', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const { action, resourceType, actorId, actorType, startDate, endDate, limit = 50, offset = 0 } = req.query;

    const filters = { action, resourceType, actorId, actorType, startDate, endDate };
    const logs = await businessService.auditRepo.findByOrganization(organizationId, filters, limit, offset);

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/business/audit/stats - Get audit statistics
router.get('/audit/stats', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const { startDate, endDate } = req.query;

    const stats = await businessService.auditRepo.getStats(organizationId, startDate, endDate);

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// DASHBOARD
// ============================================

// GET /api/business/dashboard - Get dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;

    const stats = await businessService.getDashboardStats(organizationId, userId);

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// RECENT ITEMS
// ============================================

// GET /api/business/recent - Get recent items
router.get('/recent', async (req, res) => {
  try {
    const { organizationId } = req.org;
    const userId = req.auth.userId;
    const { limit = 20 } = req.query;

    const recentItems = await businessService.getRecentItems(userId, organizationId, limit);

    res.json({ success: true, data: recentItems });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;