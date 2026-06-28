// Workers API Routes

import express from 'express';
const router = express.Router();
import WorkerService from '../services/workerService';
const { requirePermission } = require('../middleware/permissionMiddleware');

// ─── Worker CRUD ──────────────────────────────────────────────────────────────

router.post('/', requirePermission('workers.create'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const worker = await WorkerService.createWorker(organizationId, req.body, req.user.id);
    res.status(201).json({
      success: true,
      data: worker
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/', requirePermission('workers.read'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { category, status, visibility, search, tags, limit = 50, offset = 0 } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (status) filters.status = status;
    if (visibility) filters.visibility = visibility;
    if (search) filters.search = search;
    if (tags) filters.tags = tags.split(',');

    const workers = await WorkerService.searchWorkers(organizationId, filters, parseInt(limit), parseInt(offset));
    const total = await WorkerService.countWorkers(organizationId, filters);

    res.json({
      success: true,
      data: workers,
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

router.get('/:id', requirePermission('workers.read'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const worker = await WorkerService.getWorker(req.params.id, organizationId);
    res.json({
      success: true,
      data: worker
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

router.put('/:id', requirePermission('workers.update'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const worker = await WorkerService.updateWorker(req.params.id, organizationId, req.body, req.user.id);
    res.json({
      success: true,
      data: worker
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/:id', requirePermission('workers.delete'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const result = await WorkerService.deleteWorker(req.params.id, organizationId);
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

// ─── Worker Search ─────────────────────────────────────────────────────────────

router.get('/search/query', requirePermission('workers.read'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { q, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const workers = await WorkerService.searchWorkers(organizationId, { search: q }, parseInt(limit));
    res.json({
      success: true,
      data: workers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ─── Worker Versions ───────────────────────────────────────────────────────────

router.post('/:id/versions', requirePermission('workers.update'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { version, definition, changelog } = req.body;

    if (!version) {
      return res.status(400).json({
        success: false,
        error: 'Version is required'
      });
    }

    const workerVersion = await WorkerService.createVersion(
      req.params.id,
      organizationId,
      version,
      definition,
      changelog,
      req.user.id
    );

    res.status(201).json({
      success: true,
      data: workerVersion
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/:id/versions', requirePermission('workers.read'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const versions = await WorkerService.getVersions(req.params.id, organizationId);
    res.json({
      success: true,
      data: versions
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:id/versions/:versionId/publish', requirePermission('workers.update'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const worker = await WorkerService.publishVersion(
      req.params.id,
      req.params.versionId,
      organizationId,
      req.user.id
    );
    res.json({
      success: true,
      data: worker
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ─── Worker Dependencies ───────────────────────────────────────────────────────

router.post('/:id/dependencies', requirePermission('workers.update'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { dependsOnWorkerId, versionConstraint, isOptional } = req.body;

    if (!dependsOnWorkerId) {
      return res.status(400).json({
        success: false,
        error: 'dependsOnWorkerId is required'
      });
    }

    const dependency = await WorkerService.addDependency(
      req.params.id,
      dependsOnWorkerId,
      versionConstraint,
      isOptional,
      organizationId
    );

    res.status(201).json({
      success: true,
      data: dependency
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/:id/dependencies', requirePermission('workers.read'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const dependencies = await WorkerService.getDependencies(req.params.id, organizationId);
    res.json({
      success: true,
      data: dependencies
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// ─── Worker Execution ──────────────────────────────────────────────────────────

router.post('/:id/execute', requirePermission('workers.execute'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { executionMode, inputs } = req.body;

    if (!executionMode) {
      return res.status(400).json({
        success: false,
        error: 'executionMode is required'
      });
    }

    const execution = await WorkerService.executeWorker(
      req.params.id,
      organizationId,
      executionMode,
      inputs || {},
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

router.get('/:id/executions', requirePermission('workers.read'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { limit = 50, offset = 0 } = req.query;

    const executions = await WorkerService.getWorkerExecutions(
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

router.get('/executions/:executionId', requirePermission('workers.read'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const execution = await WorkerService.getExecution(req.params.executionId, organizationId);
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

// ─── Organization Executions ───────────────────────────────────────────────────

router.get('/executions/organization', requirePermission('workers.read'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { limit = 50, offset = 0 } = req.query;

    const executions = await WorkerService.getOrganizationExecutions(
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

// ─── Marketplace ───────────────────────────────────────────────────────────────

router.post('/:id/marketplace', requirePermission('workers.publish'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const marketplaceItem = await WorkerService.publishToMarketplace(
      req.params.id,
      organizationId,
      req.body
    );
    res.status(201).json({
      success: true,
      data: marketplaceItem
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/marketplace/search', requirePermission('workers.read'), async (req, res) => {
  try {
    const { category, search, isFeatured, tags, limit = 50, offset = 0 } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (search) filters.search = search;
    if (isFeatured !== undefined) filters.isFeatured = isFeatured === 'true';
    if (tags) filters.tags = tags.split(',');

    const items = await WorkerService.searchMarketplace(filters, parseInt(limit), parseInt(offset));
    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/marketplace/:itemId', requirePermission('workers.read'), async (req, res) => {
  try {
    const item = await WorkerService.getMarketplaceItem(req.params.itemId);
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/marketplace/:itemId/install', requirePermission('workers.install'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const worker = await WorkerService.installFromMarketplace(
      req.params.itemId,
      organizationId,
      req.user.id
    );
    res.status(201).json({
      success: true,
      data: worker
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/marketplace/:itemId/rate', requirePermission('workers.rate'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }

    const ratingRecord = await WorkerService.rateWorker(
      req.params.itemId,
      req.user.id,
      organizationId,
      rating,
      review
    );

    res.status(201).json({
      success: true,
      data: ratingRecord
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/marketplace/:itemId/ratings', requirePermission('workers.read'), async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const ratings = await WorkerService.getWorkerRatings(
      req.params.itemId,
      parseInt(limit),
      parseInt(offset)
    );
    res.json({
      success: true,
      data: ratings
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// ─── Execution Logs ────────────────────────────────────────────────────────────

router.get('/executions/:executionId/logs', requirePermission('workers.read'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { limit = 100, offset = 0 } = req.query;

    const logs = await WorkerService.getExecutionLogs(
      req.params.executionId,
      organizationId,
      parseInt(limit),
      parseInt(offset)
    );

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

export default router;