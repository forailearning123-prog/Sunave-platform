// Worker Service - Business logic layer for worker platform

import { v4 as uuidv4 } from 'uuid';
import WorkerRepository from '../repositories/workerRepository';
const { WorkerStatus, WorkerExecutionStatus, ExecutionMode } = require('packages/types/agents/index.js');

class WorkerService {
  constructor(db) {
    this.workerRepo = new WorkerRepository(db);
  }

  // ─── Worker Management ───────────────────────────────────────────────────────

  async createWorker(organizationId, data, authorId) {
    // Validate required fields
    if (!data.name || !data.displayName) {
      throw new Error('Worker name and display name are required');
    }

    // Check for duplicate name within organization
    const existing = await this.workerRepo.getWorkerByName(organizationId, data.name);
    if (existing) {
      throw new Error(`Worker with name "${data.name}" already exists in this organization`);
    }

    // Validate category
    const validCategories = [
      'ai','knowledge','search','document','communication',
      'database','analytics','automation','integration',
      'development','finance','crm','hr','operations','custom'
    ];
    if (data.category && !validCategories.includes(data.category)) {
      throw new Error(`Invalid worker category: ${data.category}`);
    }

    // Validate execution modes
    const validModes = ['manual','workflow','api','scheduled','agent','webhook','event'];
    if (data.supportedExecutionModes) {
      const invalidModes = data.supportedExecutionModes.filter(m => !validModes.includes(m));
      if (invalidModes.length > 0) {
        throw new Error(`Invalid execution modes: ${invalidModes.join(', ')}`);
      }
    }

    const worker = await this.workerRepo.createWorker(organizationId, data, authorId);

    // Create initial version
    await this.workerRepo.createWorkerVersion(
      worker.id,
      worker.version,
      { definition: data },
      'Initial version',
      authorId
    );

    return worker;
  }

  async getWorker(id, organizationId) {
    const worker = await this.workerRepo.getWorkerById(id);
    if (!worker) {
      throw new Error('Worker not found');
    }

    // Organization isolation
    if (worker.organizationId !== organizationId && worker.visibility !== 'public') {
      throw new Error('Access denied');
    }

    return worker;
  }

  async updateWorker(id, organizationId, data, userId) {
    const worker = await this.workerRepo.getWorkerById(id);
    if (!worker) {
      throw new Error('Worker not found');
    }

    // Organization isolation
    if (worker.organizationId !== organizationId) {
      throw new Error('Access denied');
    }

    // Cannot update published workers directly - require new version
    if (worker.status === WorkerStatus.PUBLISHED && data.status !== WorkerStatus.DEPRECATED) {
      throw new Error('Published workers cannot be modified. Create a new version instead.');
    }

    const updated = await this.workerRepo.updateWorker(id, data);

    // If version changed, create new version record
    if (data.version && data.version !== worker.version) {
      await this.workerRepo.createWorkerVersion(
        updated.id,
        updated.version,
        { definition: data },
        data.changelog || `Updated to version ${data.version}`,
        userId
      );
    }

    return updated;
  }

  async deleteWorker(id, organizationId) {
    const worker = await this.workerRepo.getWorkerById(id);
    if (!worker) {
      throw new Error('Worker not found');
    }

    if (worker.organizationId !== organizationId) {
      throw new Error('Access denied');
    }

    if (worker.status === WorkerStatus.PUBLISHED) {
      throw new Error('Cannot delete published worker. Archive it instead.');
    }

    return await this.workerRepo.deleteWorker(id);
  }

  async searchWorkers(organizationId, filters = {}, limit = 50, offset = 0) {
    // Include public workers from other organizations
    const orgWorkers = await this.workerRepo.searchWorkers(organizationId, filters, limit, offset);
    
    // If searching for public workers, include them
    if (filters.visibility === 'public' || !filters.visibility) {
      const publicFilters = { ...filters, visibility: 'public' };
      const publicWorkers = await this.workerRepo.searchWorkers(null, publicFilters, limit, offset);
      
      // Merge and deduplicate
      const workerMap = new Map();
      [...orgWorkers, ...publicWorkers].forEach(w => {
        workerMap.set(w.id, w);
      });
      
      return Array.from(workerMap.values()).slice(offset, offset + limit);
    }

    return orgWorkers;
  }

  async countWorkers(organizationId, filters = {}) {
    return await this.workerRepo.countWorkers(organizationId, filters);
  }

  // ─── Worker Versioning ───────────────────────────────────────────────────────

  async createVersion(workerId, organizationId, version, definition, changelog, userId) {
    const worker = await this.workerRepo.getWorkerById(workerId);
    if (!worker) {
      throw new Error('Worker not found');
    }

    if (worker.organizationId !== organizationId) {
      throw new Error('Access denied');
    }

    // Check if version already exists
    const existing = await this.workerRepo.getWorkerVersion(workerId, version);
    if (existing) {
      throw new Error(`Version ${version} already exists`);
    }

    const workerVersion = await this.workerRepo.createWorkerVersion(
      workerId,
      version,
      definition,
      changelog,
      userId
    );

    return workerVersion;
  }

  async getVersions(workerId, organizationId) {
    const worker = await this.workerRepo.getWorkerById(workerId);
    if (!worker) {
      throw new Error('Worker not found');
    }

    if (worker.organizationId !== organizationId && worker.visibility !== 'public') {
      throw new Error('Access denied');
    }

    return await this.workerRepo.getWorkerVersions(workerId);
  }

  async publishVersion(workerId, versionId, organizationId, userId) {
    const worker = await this.workerRepo.getWorkerById(workerId);
    if (!worker) {
      throw new Error('Worker not found');
    }

    if (worker.organizationId !== organizationId) {
      throw new Error('Access denied');
    }

    const success = await this.workerRepo.setCurrentVersion(workerId, versionId);
    if (!success) {
      throw new Error('Failed to publish version');
    }

    // Update worker status to published
    await this.workerRepo.updateWorker(workerId, {
      status: WorkerStatus.PUBLISHED,
      version: (await this.workerRepo.getWorkerVersion(workerId, versionId)).version
    });

    return await this.workerRepo.getWorkerById(workerId);
  }

  // ─── Worker Dependencies ─────────────────────────────────────────────────────

  async addDependency(workerId, dependsOnWorkerId, versionConstraint, isOptional, organizationId) {
    const worker = await this.workerRepo.getWorkerById(workerId);
    if (!worker) {
      throw new Error('Worker not found');
    }

    if (worker.organizationId !== organizationId) {
      throw new Error('Access denied');
    }

    const dependency = await this.workerRepo.addWorkerDependency(
      workerId,
      dependsOnWorkerId,
      versionConstraint,
      isOptional
    );

    return dependency;
  }

  async getDependencies(workerId, organizationId) {
    const worker = await this.workerRepo.getWorkerById(workerId);
    if (!worker) {
      throw new Error('Worker not found');
    }

    if (worker.organizationId !== organizationId && worker.visibility !== 'public') {
      throw new Error('Access denied');
    }

    return await this.workerRepo.getWorkerDependencies(workerId);
  }

  // ─── Worker Execution ────────────────────────────────────────────────────────

  async executeWorker(workerId, organizationId, executionMode, inputs, triggeredBy) {
    const worker = await this.workerRepo.getWorkerById(workerId);
    if (!worker) {
      throw new Error('Worker not found');
    }

    if (worker.organizationId !== organizationId && worker.visibility !== 'public') {
      throw new Error('Access denied');
    }

    if (worker.status !== WorkerStatus.PUBLISHED) {
      throw new Error('Worker is not published');
    }

    // Validate execution mode is supported
    if (!worker.supportedExecutionModes.includes(executionMode)) {
      throw new Error(`Execution mode "${executionMode}" not supported by this worker`);
    }

    // Create execution record
    const execution = await this.workerRepo.createExecution(
      workerId,
      organizationId,
      executionMode,
      inputs,
      triggeredBy
    );

    // Execution queued via platform message broker
    // For now, return the execution record
    return execution;
  }

  async getExecution(executionId, organizationId) {
    const execution = await this.workerRepo.getExecution(executionId);
    if (!execution) {
      throw new Error('Execution not found');
    }

    if (execution.organizationId !== organizationId) {
      throw new Error('Access denied');
    }

    return execution;
  }

  async getWorkerExecutions(workerId, organizationId, limit = 50, offset = 0) {
    const worker = await this.workerRepo.getWorkerById(workerId);
    if (!worker) {
      throw new Error('Worker not found');
    }

    if (worker.organizationId !== organizationId && worker.visibility !== 'public') {
      throw new Error('Access denied');
    }

    return await this.workerRepo.getWorkerExecutions(workerId, limit, offset);
  }

  async getOrganizationExecutions(organizationId, limit = 50, offset = 0) {
    return await this.workerRepo.getOrganizationExecutions(organizationId, limit, offset);
  }

  // ─── Marketplace ─────────────────────────────────────────────────────────────

  async publishToMarketplace(workerId, organizationId, data) {
    const worker = await this.workerRepo.getWorkerById(workerId);
    if (!worker) {
      throw new Error('Worker not found');
    }

    if (worker.organizationId !== organizationId) {
      throw new Error('Access denied');
    }

    if (worker.status !== WorkerStatus.PUBLISHED) {
      throw new Error('Worker must be published before adding to marketplace');
    }

    const marketplaceItem = await this.workerRepo.createMarketplaceItem(workerId, {
      name: data.name || worker.displayName,
      description: data.description || worker.description,
      shortDescription: data.shortDescription || worker.description.substring(0, 500),
      category: worker.category,
      icon: worker.icon,
      thumbnail: data.thumbnail,
      documentationUrl: data.documentationUrl,
      version: worker.version,
      changelog: data.changelog,
      tags: worker.tags,
      dependencies: data.dependencies || [],
      compatibility: data.compatibility || {},
      isFeatured: data.isFeatured || false,
      isVerified: data.isVerified || false
    });

    return marketplaceItem;
  }

  async searchMarketplace(filters = {}, limit = 50, offset = 0) {
    return await this.workerRepo.searchMarketplace(filters, limit, offset);
  }

  async getMarketplaceItem(id) {
    const item = await this.workerRepo.getMarketplaceItem(id);
    if (!item) {
      throw new Error('Marketplace item not found');
    }
    return item;
  }

  async installFromMarketplace(marketplaceItemId, organizationId, userId) {
    const item = await this.workerRepo.getMarketplaceItem(marketplaceItemId);
    if (!item) {
      throw new Error('Marketplace item not found');
    }

    if (item.status !== 'available') {
      throw new Error('This worker is not available for installation');
    }

    // Get the worker definition
    const sourceWorker = await this.workerRepo.getWorkerById(item.workerId);
    if (!sourceWorker) {
      throw new Error('Source worker not found');
    }

    // Create a copy in the organization
    const newWorker = await this.workerRepo.createWorker(organizationId, {
      name: `${sourceWorker.name}-copy-${Date.now()}`,
      displayName: sourceWorker.displayName,
      description: sourceWorker.description,
      category: sourceWorker.category,
      version: sourceWorker.version,
      visibility: 'private',
      icon: sourceWorker.icon,
      tags: sourceWorker.tags,
      capabilities: sourceWorker.capabilities,
      requiredPermissions: sourceWorker.requiredPermissions,
      requiredInputs: sourceWorker.requiredInputs,
      expectedOutputs: sourceWorker.expectedOutputs,
      supportedExecutionModes: sourceWorker.supportedExecutionModes,
      retryPolicy: sourceWorker.retryPolicy,
      timeout: sourceWorker.timeout,
      costPolicy: sourceWorker.costPolicy
    }, userId);

    // Increment install count
    await this.workerRepo.incrementInstallCount(marketplaceItemId);

    return newWorker;
  }

  async rateWorker(marketplaceItemId, userId, organizationId, rating, review = null) {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const item = await this.workerRepo.getMarketplaceItem(marketplaceItemId);
    if (!item) {
      throw new Error('Marketplace item not found');
    }

    return await this.workerRepo.createOrUpdateRating(
      marketplaceItemId,
      userId,
      organizationId,
      rating,
      review
    );
  }

  async getWorkerRatings(marketplaceItemId, limit = 50, offset = 0) {
    return await this.workerRepo.getWorkerRatings(marketplaceItemId, limit, offset);
  }

  // ─── Execution Logs ──────────────────────────────────────────────────────────

  async logExecution(executionId, executionType, organizationId, level, message, data = {}) {
    return await this.workerRepo.createExecutionLog(
      executionId,
      executionType,
      organizationId,
      level,
      message,
      data
    );
  }

  async getExecutionLogs(executionId, organizationId, limit = 100, offset = 0) {
    const execution = executionId.includes('-') 
      ? await this.workerRepo.getExecution(executionId)
      : null;
    
    if (execution && execution.organizationId !== organizationId) {
      throw new Error('Access denied');
    }

    return await this.workerRepo.getExecutionLogs(executionId, limit, offset);
  }
}

export default WorkerService;