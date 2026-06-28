// Workflows API Routes

import express from 'express';
const router = express.Router();
import WorkflowService from '../services/workflowService';
const { requirePermission } = require('../middleware/permissionMiddleware');

// ─── Workflow CRUD ────────────────────────────────────────────────────────────

router.post('/', requirePermission('workflows.create'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const workflow = await WorkflowService.createWorkflow(organizationId, req.body, req.user.id);
    res.status(201).json({
      success: true,
      data: workflow
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/', requirePermission('workflows.read'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { category, status, search, limit = 50, offset = 0 } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (status) filters.status = status;
    if (search) filters.search = search;

    const workflows = await WorkflowService.searchWorkflows(organizationId, filters, parseInt(limit), parseInt(offset));
    const total = await WorkflowService.countWorkflows(organizationId, filters);

    res.json({
      success: true,
      data: workflows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/:id', requirePermission('workflows.read'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const workflow = await WorkflowService.getWorkflow(req.params.id, organizationId);
    res.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

router.put('/:id', requirePermission('workflows.update'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const workflow = await WorkflowService.updateWorkflow(req.params.id, organizationId, req.body, req.user.id);
    res.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/:id', requirePermission('workflows.delete'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const result = await WorkflowService.deleteWorkflow(req.params.id, organizationId);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ─── Workflow Execution ───────────────────────────────────────────────────────

router.post('/:id/run', requirePermission('workflows.execute'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { triggerType = 'manual', inputs = {} } = req.body;

    const execution = await WorkflowService.executeWorkflow(
      req.params.id,
      organizationId,
      triggerType,
      inputs,
      req.user.id
    );

    res.status(201).json({
      success: true,
      data: execution
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/:id/executions', requirePermission('workflows.read'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { limit = 50, offset = 0 } = req.query;

    const executions = await WorkflowService.getWorkflowExecutions(
      req.params.id,
      organizationId,
      parseInt(limit),
      parseInt(offset)
    );

    res.json({
      success: true,
      data: executions
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/executions/:executionId', requirePermission('workflows.read'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const execution = await WorkflowService.getWorkflowExecution(req.params.executionId, organizationId);
    res.json({
      success: true,
      data: execution
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/executions/organization', requirePermission('workflows.read'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { limit = 50, offset = 0 } = req.query;

    const executions = await WorkflowService.getOrganizationWorkflowExecutions(
      organizationId,
      parseInt(limit),
      parseInt(offset)
    );

    res.json({
      success: true,
      data: executions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ─── Workflow Templates ───────────────────────────────────────────────────────

router.get('/templates', requirePermission('workflows.read'), async (req, res) => {
  try {
    const { category, isPublic, isSystem, search, tags, limit = 50, offset = 0 } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (isPublic !== undefined) filters.isPublic = isPublic === 'true';
    if (isSystem !== undefined) filters.isSystem = isSystem === 'true';
    if (search) filters.search = search;
    if (tags) filters.tags = tags.split(',');

    const templates = await WorkflowService.searchWorkflowTemplates(filters, parseInt(limit), parseInt(offset));

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/templates/:id', requirePermission('workflows.read'), async (req, res) => {
  try {
    const template = await WorkflowService.getWorkflowTemplate(req.params.id);
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/templates/:id/instantiate', requirePermission('workflows.create'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { name } = req.body;

    const workflow = await WorkflowService.instantiateTemplate(
      req.params.id,
      organizationId,
      name,
      req.user.id
    );

    res.status(201).json({
      success: true,
      data: workflow
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ─── Schedules ────────────────────────────────────────────────────────────────

router.post('/schedules', requirePermission('schedules.create'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const schedule = await WorkflowService.createSchedule(organizationId, req.body, req.user.id);
    res.status(201).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/schedules', requirePermission('schedules.read'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { scheduleType, isActive, search, limit = 50, offset = 0 } = req.query;

    const filters = {};
    if (scheduleType) filters.scheduleType = scheduleType;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (search) filters.search = search;

    const schedules = await WorkflowService.getOrganizationSchedules(organizationId, filters, parseInt(limit), parseInt(offset));

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/schedules/:id', requirePermission('schedules.read'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const schedule = await WorkflowService.getSchedule(req.params.id, organizationId);
    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

router.put('/schedules/:id', requirePermission('schedules.update'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const schedule = await WorkflowService.updateSchedule(req.params.id, organizationId, req.body);
    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/schedules/:id', requirePermission('schedules.delete'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const result = await WorkflowService.deleteSchedule(req.params.id, organizationId);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

export default router;