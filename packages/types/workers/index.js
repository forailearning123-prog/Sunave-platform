// Worker Platform Types and Interfaces

/**
 * Worker Definition - Core worker metadata and configuration
 */
class WorkerDefinition {
  constructor(data = {}) {
    this.id = data.id || null;
    this.organizationId = data.organizationId || null;
    this.name = data.name || '';
    this.displayName = data.displayName || '';
    this.description = data.description || '';
    this.category = data.category || 'custom';
    this.version = data.version || '1.0.0';
    this.status = data.status || 'draft';
    this.author = data.author || null;
    this.visibility = data.visibility || 'private';
    this.icon = data.icon || 'box';
    this.tags = data.tags || [];
    this.capabilities = data.capabilities || [];
    this.requiredPermissions = data.requiredPermissions || [];
    this.requiredInputs = data.requiredInputs || [];
    this.expectedOutputs = data.expectedOutputs || [];
    this.supportedExecutionModes = data.supportedExecutionModes || ['manual'];
    this.retryPolicy = data.retryPolicy || { maxRetries: 3, backoff: 'exponential' };
    this.timeout = data.timeout || 300;
    this.costPolicy = data.costPolicy || {};
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      displayName: this.displayName,
      description: this.description,
      category: this.category,
      version: this.version,
      status: this.status,
      author: this.author,
      visibility: this.visibility,
      icon: this.icon,
      tags: this.tags,
      capabilities: this.capabilities,
      requiredPermissions: this.requiredPermissions,
      requiredInputs: this.requiredInputs,
      expectedOutputs: this.expectedOutputs,
      supportedExecutionModes: this.supportedExecutionModes,
      retryPolicy: this.retryPolicy,
      timeout: this.timeout,
      costPolicy: this.costPolicy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

/**
 * Worker Input Definition
 */
class WorkerInput {
  constructor(data = {}) {
    this.name = data.name || '';
    this.type = data.type || 'text'; // text, number, boolean, json, array, file, image, audio, video, document, knowledge, context, prompt, configuration, credential_reference
    this.displayName = data.displayName || '';
    this.description = data.description || '';
    this.required = data.required !== undefined ? data.required : false;
    this.defaultValue = data.defaultValue !== undefined ? data.defaultValue : null;
    this.validation = data.validation || {};
    this.metadata = data.metadata || {};
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      displayName: this.displayName,
      description: this.description,
      required: this.required,
      defaultValue: this.defaultValue,
      validation: this.validation,
      metadata: this.metadata
    };
  }
}

/**
 * Worker Output Definition
 */
class WorkerOutput {
  constructor(data = {}) {
    this.name = data.name || '';
    this.type = data.type || 'text'; // text, json, file, document, image, audio, video, knowledge, memory, event, notification, custom
    this.displayName = data.displayName || '';
    this.description = data.description || '';
    this.metadata = data.metadata || {};
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      displayName: this.displayName,
      description: this.description,
      metadata: this.metadata
    };
  }
}

/**
 * Worker Execution Status
 */
const WorkerExecutionStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  RETRYING: 'retrying'
};

/**
 * Worker Status
 */
const WorkerStatus = {
  DRAFT: 'draft',
  TESTING: 'testing',
  PUBLISHED: 'published',
  DEPRECATED: 'deprecated',
  ARCHIVED: 'archived'
};

/**
 * Worker Category
 */
const WorkerCategory = {
  AI: 'ai',
  KNOWLEDGE: 'knowledge',
  SEARCH: 'search',
  DOCUMENT: 'document',
  COMMUNICATION: 'communication',
  DATABASE: 'database',
  ANALYTICS: 'analytics',
  AUTOMATION: 'automation',
  INTEGRATION: 'integration',
  DEVELOPMENT: 'development',
  FINANCE: 'finance',
  CRM: 'crm',
  HR: 'hr',
  OPERATIONS: 'operations',
  CUSTOM: 'custom'
};

/**
 * Execution Mode
 */
const ExecutionMode = {
  MANUAL: 'manual',
  WORKFLOW: 'workflow',
  API: 'api',
  SCHEDULED: 'scheduled',
  AGENT: 'agent',
  WEBHOOK: 'webhook',
  EVENT: 'event'
};

/**
 * Worker Runtime Interface
 */
class WorkerRuntime {
  constructor(workerDefinition) {
    this.definition = workerDefinition;
    this.state = 'idle'; // idle, running, paused, completed, failed, cancelled
  }

  async validate(inputs) {
    throw new Error('validate() must be implemented by worker');
  }

  async prepare(inputs) {
    throw new Error('prepare() must be implemented by worker');
  }

  async execute(inputs, context) {
    throw new Error('execute() must be implemented by worker');
  }

  async retry(executionId, attemptNumber) {
    throw new Error('retry() must be implemented by worker');
  }

  async cancel(executionId) {
    throw new Error('cancel() must be implemented by worker');
  }

  async resume(executionId) {
    throw new Error('resume() must be implemented by worker');
  }

  async pause(executionId) {
    throw new Error('pause() must be implemented by worker');
  }

  async complete(executionId, result) {
    throw new Error('complete() must be implemented by worker');
  }

  async fail(executionId, error) {
    throw new Error('fail() must be implemented by worker');
  }

  async cleanup(executionId) {
    throw new Error('cleanup() must be implemented by worker');
  }
}

/**
 * Workflow Definition
 */
class WorkflowDefinition {
  constructor(data = {}) {
    this.id = data.id || null;
    this.organizationId = data.organizationId || null;
    this.name = data.name || '';
    this.description = data.description || '';
    this.category = data.category || 'custom';
    this.version = data.version || '1.0.0';
    this.status = data.status || 'draft';
    this.steps = data.steps || [];
    this.connections = data.connections || [];
    this.variables = data.variables || {};
    this.inputs = data.inputs || [];
    this.outputs = data.outputs || [];
    this.triggers = data.triggers || [];
    this.author = data.author || null;
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      description: this.description,
      category: this.category,
      version: this.version,
      status: this.status,
      steps: this.steps,
      connections: this.connections,
      variables: this.variables,
      inputs: this.inputs,
      outputs: this.outputs,
      triggers: this.triggers,
      author: this.author,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

/**
 * Workflow Step Definition
 */
class WorkflowStep {
  constructor(data = {}) {
    this.stepId = data.stepId || '';
    this.stepType = data.stepType || 'worker'; // worker, condition, parallel, loop, retry, delay, approval, webhook, manual, merge
    this.name = data.name || '';
    this.description = data.description || '';
    this.config = data.config || {};
    this.position = data.position || { x: 0, y: 0 };
    this.orderIndex = data.orderIndex || 0;
  }

  toJSON() {
    return {
      stepId: this.stepId,
      stepType: this.stepType,
      name: this.name,
      description: this.description,
      config: this.config,
      position: this.position,
      orderIndex: this.orderIndex
    };
  }
}

/**
 * Workflow Connection Definition
 */
class WorkflowConnection {
  constructor(data = {}) {
    this.connectionId = data.connectionId || '';
    this.sourceStepId = data.sourceStepId || '';
    this.targetStepId = data.targetStepId || '';
    this.sourcePort = data.sourcePort || 'output';
    this.targetPort = data.targetPort || 'input';
    this.condition = data.condition || {};
  }

  toJSON() {
    return {
      connectionId: this.connectionId,
      sourceStepId: this.sourceStepId,
      targetStepId: this.targetStepId,
      sourcePort: this.sourcePort,
      targetPort: this.targetPort,
      condition: this.condition
    };
  }
}

/**
 * Workflow Trigger Types
 */
const WorkflowTriggerType = {
  MANUAL: 'manual',
  SCHEDULE: 'schedule',
  WEBHOOK: 'webhook',
  API: 'api',
  AGENT: 'agent',
  SYSTEM_EVENT: 'system_event',
  ORGANIZATION_EVENT: 'organization_event'
};

/**
 * Workflow Execution Status
 */
const WorkflowExecutionStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * Schedule Type
 */
const ScheduleType = {
  ONCE: 'once',
  HOURLY: 'hourly',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  CRON: 'cron'
};

/**
 * Marketplace Item Status
 */
const MarketplaceItemStatus = {
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
  DEPRECATED: 'deprecated',
  REMOVED: 'removed'
};

module.exports = {
  WorkerDefinition,
  WorkerInput,
  WorkerOutput,
  WorkerRuntime,
  WorkerExecutionStatus,
  WorkerStatus,
  WorkerCategory,
  ExecutionMode,
  WorkflowDefinition,
  WorkflowStep,
  WorkflowConnection,
  WorkflowTriggerType,
  WorkflowExecutionStatus,
  ScheduleType,
  MarketplaceItemStatus
};