// Agent Platform Types
// Prompts 20-24: Complete Agent Operating System

export const AgentStatus = {
  DRAFT: 'draft',
  TESTING: 'testing',
  PUBLISHED: 'published',
  DISABLED: 'disabled',
  ARCHIVED: 'archived'
};

export const AgentType = {
  EXECUTIVE: 'executive',
  DEPARTMENT: 'department',
  ASSISTANT: 'assistant',
  RESEARCH: 'research',
  AUTOMATION: 'automation',
  COORDINATOR: 'coordinator',
  REVIEWER: 'reviewer',
  DEVELOPER: 'developer',
  CUSTOM: 'custom'
};

export const AgentVisibility = {
  PRIVATE: 'private',
  ORGANIZATION: 'organization',
  PUBLIC: 'public'
};

export const ReasoningMode = {
  FAST: 'fast',
  BALANCED: 'balanced',
  DEEP: 'deep',
  STRATEGIC: 'strategic',
  ANALYTICAL: 'analytical',
  CREATIVE: 'creative',
  RESEARCH: 'research',
  CODING: 'coding',
  PLANNING: 'planning',
  CUSTOM: 'custom'
};

export const GoalType = {
  OUTCOME: 'outcome',
  OUTPUT: 'output',
  INITIATIVE: 'initiative'
};

export const ExecutionStatus = {
  PENDING: 'pending',
  PLANNING: 'planning',
  DELEGATING: 'delegating',
  EXECUTING: 'executing',
  REVIEWING: 'reviewing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PAUSED: 'paused'
};

export const TaskStatus = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  EXECUTING: 'executing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  RETRYING: 'retrying'
};

export const DelegationType = {
  SINGLE_WORKER: 'single_worker',
  MULTIPLE_WORKERS: 'multiple_workers',
  SEQUENTIAL: 'sequential',
  PARALLEL: 'parallel',
  CONDITIONAL: 'conditional',
  RECURSIVE: 'recursive',
  APPROVAL_REQUIRED: 'approval_required'
};

export const CollaborationType = {
  DELEGATE: 'delegate',
  REQUEST_HELP: 'request_help',
  REVIEW: 'review',
  APPROVE: 'approve',
  ESCALATE: 'escalate',
  TRANSFER: 'transfer',
  SHARE_CONTEXT: 'share_context',
  SHARE_KNOWLEDGE: 'share_knowledge',
  SHARE_MEMORY: 'share_memory',
  SHARE_WORKFLOW: 'share_workflow',
  SHARE_RESULTS: 'share_results'
};

export const DecisionType = {
  PLAN: 'plan',
  DELEGATE: 'delegate',
  REVIEW: 'review',
  APPROVE: 'approve',
  ESCALATE: 'escalate',
  TRANSFER: 'transfer',
  RETRY: 'retry',
  ABORT: 'abort',
  RESUME: 'resume'
};

export const ApprovalType = {
  EXECUTION: 'execution',
  DELEGATION: 'delegation',
  DECISION: 'decision',
  RESOURCE: 'resource',
  ESCALATION: 'escalation'
};

export const ApprovalStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

export const PolicyType = {
  COST: 'cost',
  EXECUTION: 'execution',
  SECURITY: 'security',
  APPROVAL: 'approval',
  ESCALATION: 'escalation',
  RESOURCE: 'resource'
};

export const MemoryReferenceType = {
  READ: 'read',
  WRITE: 'write',
  SHARED: 'shared',
  CONTEXT: 'context'
};

export const WorkerAccessLevel = {
  READ: 'read',
  EXECUTE: 'execute',
  ADMIN: 'admin'
};

// Agent Definition
export class AgentDefinition {
  constructor(data = {}) {
    this.id = data.id;
    this.organizationId = data.organizationId;
    this.name = data.name;
    this.displayName = data.displayName;
    this.description = data.description;
    this.department = data.department;
    this.role = data.role;
    this.icon = data.icon;
    this.avatarUrl = data.avatarUrl;
    this.status = data.status || AgentStatus.DRAFT;
    this.version = data.version || '1.0.0';
    this.ownerId = data.ownerId;
    this.visibility = data.visibility || AgentVisibility.PRIVATE;
    this.capabilities = data.capabilities || [];
    this.permissions = data.permissions || {};
    this.goalTypes = data.goalTypes || [];
    this.workerAccess = data.workerAccess || [];
    this.knowledgeSources = data.knowledgeSources || [];
    this.promptProfile = data.promptProfile || {};
    this.reasoningPolicy = data.reasoningPolicy || {};
    this.memoryPolicy = data.memoryPolicy || {};
    this.executionPolicy = data.executionPolicy || {};
    this.securityPolicy = data.securityPolicy || {};
    this.costPolicy = data.costPolicy || {};
    this.loggingPolicy = data.loggingPolicy || {};
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.archivedAt = data.archivedAt;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      displayName: this.displayName,
      description: this.description,
      department: this.department,
      role: this.role,
      icon: this.icon,
      avatarUrl: this.avatarUrl,
      status: this.status,
      version: this.version,
      ownerId: this.ownerId,
      visibility: this.visibility,
      capabilities: this.capabilities,
      permissions: this.permissions,
      goalTypes: this.goalTypes,
      workerAccess: this.workerAccess,
      knowledgeSources: this.knowledgeSources,
      promptProfile: this.promptProfile,
      reasoningPolicy: this.reasoningPolicy,
      memoryPolicy: this.memoryPolicy,
      executionPolicy: this.executionPolicy,
      securityPolicy: this.securityPolicy,
      costPolicy: this.costPolicy,
      loggingPolicy: this.loggingPolicy,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      archivedAt: this.archivedAt
    };
  }

  static fromDB(row) {
    return new AgentDefinition({
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      department: row.department,
      role: row.role,
      icon: row.icon,
      avatarUrl: row.avatar_url,
      status: row.status,
      version: row.version,
      ownerId: row.owner_id,
      visibility: row.visibility,
      capabilities: row.capabilities,
      permissions: row.permissions,
      goalTypes: row.goal_types,
      workerAccess: row.worker_access,
      knowledgeSources: row.knowledge_sources,
      promptProfile: row.prompt_profile,
      reasoningPolicy: row.reasoning_policy,
      memoryPolicy: row.memory_policy,
      executionPolicy: row.execution_policy,
      securityPolicy: row.security_policy,
      costPolicy: row.cost_policy,
      loggingPolicy: row.logging_policy,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      archivedAt: row.archived_at
    });
  }
}

// Agent Template
export class AgentTemplate {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.displayName = data.displayName;
    this.description = data.description;
    this.category = data.category;
    this.type = data.type;
    this.icon = data.icon;
    this.avatarUrl = data.avatarUrl;
    this.isSystem = data.isSystem || false;
    this.isPublic = data.isPublic || false;
    this.configuration = data.configuration || {};
    this.capabilities = data.capabilities || [];
    this.permissions = data.permissions || {};
    this.goalTypes = data.goalTypes || [];
    this.workerAccess = data.workerAccess || [];
    this.knowledgeSources = data.knowledgeSources || [];
    this.promptProfile = data.promptProfile || {};
    this.reasoningPolicy = data.reasoningPolicy || {};
    this.memoryPolicy = data.memoryPolicy || {};
    this.executionPolicy = data.executionPolicy || {};
    this.securityPolicy = data.securityPolicy || {};
    this.costPolicy = data.costPolicy || {};
    this.loggingPolicy = data.loggingPolicy || {};
    this.usageCount = data.usageCount || 0;
    this.rating = data.rating || 0;
    this.ratingCount = data.ratingCount || 0;
    this.version = data.version || '1.0.0';
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      description: this.description,
      category: this.category,
      type: this.type,
      icon: this.icon,
      avatarUrl: this.avatarUrl,
      isSystem: this.isSystem,
      isPublic: this.isPublic,
      configuration: this.configuration,
      capabilities: this.capabilities,
      permissions: this.permissions,
      goalTypes: this.goalTypes,
      workerAccess: this.workerAccess,
      knowledgeSources: this.knowledgeSources,
      promptProfile: this.promptProfile,
      reasoningPolicy: this.reasoningPolicy,
      memoryPolicy: this.memoryPolicy,
      executionPolicy: this.executionPolicy,
      securityPolicy: this.securityPolicy,
      costPolicy: this.costPolicy,
      loggingPolicy: this.loggingPolicy,
      usageCount: this.usageCount,
      rating: this.rating,
      ratingCount: this.ratingCount,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromDB(row) {
    return new AgentTemplate({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      category: row.category,
      type: row.type,
      icon: row.icon,
      avatarUrl: row.avatar_url,
      isSystem: row.is_system,
      isPublic: row.is_public,
      configuration: row.configuration,
      capabilities: row.capabilities,
      permissions: row.permissions,
      goalTypes: row.goal_types,
      workerAccess: row.worker_access,
      knowledgeSources: row.knowledge_sources,
      promptProfile: row.prompt_profile,
      reasoningPolicy: row.reasoning_policy,
      memoryPolicy: row.memory_policy,
      executionPolicy: row.execution_policy,
      securityPolicy: row.security_policy,
      costPolicy: row.cost_policy,
      loggingPolicy: row.logging_policy,
      usageCount: row.usage_count,
      rating: row.rating,
      ratingCount: row.rating_count,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

// Agent Execution
export class AgentExecution {
  constructor(data = {}) {
    this.id = data.id;
    this.agentId = data.agentId;
    this.organizationId = data.organizationId;
    this.userId = data.userId;
    this.status = data.status || ExecutionStatus.PENDING;
    this.goal = data.goal;
    this.plan = data.plan;
    this.context = data.context || {};
    this.result = data.result;
    this.error = data.error;
    this.startedAt = data.startedAt;
    this.completedAt = data.completedAt;
    this.planningTimeMs = data.planningTimeMs;
    this.executionTimeMs = data.executionTimeMs;
    this.totalTimeMs = data.totalTimeMs;
    this.tokensUsed = data.tokensUsed;
    this.costEstimate = data.costEstimate;
    this.costActual = data.costActual;
    this.workersUsed = data.workersUsed || [];
    this.tasksCompleted = data.tasksCompleted || 0;
    this.tasksFailed = data.tasksFailed || 0;
    this.tasksTotal = data.tasksTotal || 0;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      agentId: this.agentId,
      organizationId: this.organizationId,
      userId: this.userId,
      status: this.status,
      goal: this.goal,
      plan: this.plan,
      context: this.context,
      result: this.result,
      error: this.error,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      planningTimeMs: this.planningTimeMs,
      executionTimeMs: this.executionTimeMs,
      totalTimeMs: this.totalTimeMs,
      tokensUsed: this.tokensUsed,
      costEstimate: this.costEstimate,
      costActual: this.costActual,
      workersUsed: this.workersUsed,
      tasksCompleted: this.tasksCompleted,
      tasksFailed: this.tasksFailed,
      tasksTotal: this.tasksTotal,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromDB(row) {
    return new AgentExecution({
      id: row.id,
      agentId: row.agent_id,
      organizationId: row.organization_id,
      userId: row.user_id,
      status: row.status,
      goal: row.goal,
      plan: row.plan,
      context: row.context,
      result: row.result,
      error: row.error,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      planningTimeMs: row.planning_time_ms,
      executionTimeMs: row.execution_time_ms,
      totalTimeMs: row.total_time_ms,
      tokensUsed: row.tokens_used,
      costEstimate: row.cost_estimate,
      costActual: row.cost_actual,
      workersUsed: row.workers_used,
      tasksCompleted: row.tasks_completed,
      tasksFailed: row.tasks_failed,
      tasksTotal: row.tasks_total,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

// Agent Goal
export class AgentGoal {
  constructor(data = {}) {
    this.id = data.id;
    this.agentId = data.agentId;
    this.organizationId = data.organizationId;
    this.executionId = data.executionId;
    this.title = data.title;
    this.description = data.description;
    this.type = data.type;
    this.priority = data.priority || 5;
    this.status = data.status || 'active';
    this.progress = data.progress || 0;
    this.context = data.context || {};
    this.constraints = data.constraints || {};
    this.successCriteria = data.successCriteria || {};
    this.metadata = data.metadata || {};
    this.startedAt = data.startedAt;
    this.completedAt = data.completedAt;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      agentId: this.agentId,
      organizationId: this.organizationId,
      executionId: this.executionId,
      title: this.title,
      description: this.description,
      type: this.type,
      priority: this.priority,
      status: this.status,
      progress: this.progress,
      context: this.context,
      constraints: this.constraints,
      successCriteria: this.successCriteria,
      metadata: this.metadata,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromDB(row) {
    return new AgentGoal({
      id: row.id,
      agentId: row.agent_id,
      organizationId: row.organization_id,
      executionId: row.execution_id,
      title: row.title,
      description: row.description,
      type: row.type,
      priority: row.priority,
      status: row.status,
      progress: row.progress,
      context: row.context,
      constraints: row.constraints,
      successCriteria: row.success_criteria,
      metadata: row.metadata,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

// Agent Task
export class AgentTask {
  constructor(data = {}) {
    this.id = data.id;
    this.agentId = data.agentId;
    this.organizationId = data.organizationId;
    this.goalId = data.goalId;
    this.executionId = data.executionId;
    this.parentTaskId = data.parentTaskId;
    this.title = data.title;
    this.description = data.description;
    this.type = data.type;
    this.status = data.status || TaskStatus.PENDING;
    this.priority = data.priority || 5;
    this.workerId = data.workerId;
    this.workerType = data.workerType;
    this.input = data.input || {};
    this.output = data.output;
    this.result = data.result;
    this.error = data.error;
    this.dependencies = data.dependencies || [];
    this.estimatedTimeMs = data.estimatedTimeMs;
    this.actualTimeMs = data.actualTimeMs;
    this.tokensUsed = data.tokensUsed;
    this.costEstimate = data.costEstimate;
    this.costActual = data.costActual;
    this.retryCount = data.retryCount || 0;
    this.maxRetries = data.maxRetries || 3;
    this.approvalRequired = data.approvalRequired || false;
    this.approvalStatus = data.approvalStatus;
    this.approvedBy = data.approvedBy;
    this.approvedAt = data.approvedAt;
    this.metadata = data.metadata || {};
    this.startedAt = data.startedAt;
    this.completedAt = data.completedAt;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      agentId: this.agentId,
      organizationId: this.organizationId,
      goalId: this.goalId,
      executionId: this.executionId,
      parentTaskId: this.parentTaskId,
      title: this.title,
      description: this.description,
      type: this.type,
      status: this.status,
      priority: this.priority,
      workerId: this.workerId,
      workerType: this.workerType,
      input: this.input,
      output: this.output,
      result: this.result,
      error: this.error,
      dependencies: this.dependencies,
      estimatedTimeMs: this.estimatedTimeMs,
      actualTimeMs: this.actualTimeMs,
      tokensUsed: this.tokensUsed,
      costEstimate: this.costEstimate,
      costActual: this.costActual,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      approvalRequired: this.approvalRequired,
      approvalStatus: this.approvalStatus,
      approvedBy: this.approvedBy,
      approvedAt: this.approvedAt,
      metadata: this.metadata,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromDB(row) {
    return new AgentTask({
      id: row.id,
      agentId: row.agent_id,
      organizationId: row.organization_id,
      goalId: row.goal_id,
      executionId: row.execution_id,
      parentTaskId: row.parent_task_id,
      title: row.title,
      description: row.description,
      type: row.type,
      status: row.status,
      priority: row.priority,
      workerId: row.worker_id,
      workerType: row.worker_type,
      input: row.input,
      output: row.output,
      result: row.result,
      error: row.error,
      dependencies: row.dependencies,
      estimatedTimeMs: row.estimated_time_ms,
      actualTimeMs: row.actual_time_ms,
      tokensUsed: row.tokens_used,
      costEstimate: row.cost_estimate,
      costActual: row.cost_actual,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      approvalRequired: row.approval_required,
      approvalStatus: row.approval_status,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      metadata: row.metadata,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

// Agent Decision
export class AgentDecision {
  constructor(data = {}) {
    this.id = data.id;
    this.agentId = data.agentId;
    this.organizationId = data.organizationId;
    this.executionId = data.executionId;
    this.goalId = data.goalId;
    this.taskId = data.taskId;
    this.type = data.type;
    this.reasoning = data.reasoning;
    this.context = data.context || {};
    this.input = data.input || {};
    this.output = data.output || {};
    this.confidence = data.confidence;
    this.approved = data.approved;
    this.approvedBy = data.approvedBy;
    this.approvedAt = data.approvedAt;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt;
  }

  toJSON() {
    return {
      id: this.id,
      agentId: this.agentId,
      organizationId: this.organizationId,
      executionId: this.executionId,
      goalId: this.goalId,
      taskId: this.taskId,
      type: this.type,
      reasoning: this.reasoning,
      context: this.context,
      input: this.input,
      output: this.output,
      confidence: this.confidence,
      approved: this.approved,
      approvedBy: this.approvedBy,
      approvedAt: this.approvedAt,
      metadata: this.metadata,
      createdAt: this.createdAt
    };
  }

  static fromDB(row) {
    return new AgentDecision({
      id: row.id,
      agentId: row.agent_id,
      organizationId: row.organization_id,
      executionId: row.execution_id,
      goalId: row.goal_id,
      taskId: row.task_id,
      type: row.type,
      reasoning: row.reasoning,
      context: row.context,
      input: row.input,
      output: row.output,
      confidence: row.confidence,
      approved: row.approved,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      metadata: row.metadata,
      createdAt: row.created_at
    });
  }
}

// Agent Delegation
export class AgentDelegation {
  constructor(data = {}) {
    this.id = data.id;
    this.agentId = data.agentId;
    this.organizationId = data.organizationId;
    this.executionId = data.executionId;
    this.goalId = data.goalId;
    this.taskId = data.taskId;
    this.fromAgentId = data.fromAgentId;
    this.toAgentId = data.toAgentId;
    this.toWorkerId = data.toWorkerId;
    this.delegationType = data.delegationType;
    this.context = data.context || {};
    this.input = data.input || {};
    this.output = data.output;
    this.status = data.status || 'pending';
    this.priority = data.priority || 5;
    this.requiresApproval = data.requiresApproval || false;
    this.approvedBy = data.approvedBy;
    this.approvedAt = data.approvedAt;
    this.startedAt = data.startedAt;
    this.completedAt = data.completedAt;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      agentId: this.agentId,
      organizationId: this.organizationId,
      executionId: this.executionId,
      goalId: this.goalId,
      taskId: this.taskId,
      fromAgentId: this.fromAgentId,
      toAgentId: this.toAgentId,
      toWorkerId: this.toWorkerId,
      delegationType: this.delegationType,
      context: this.context,
      input: this.input,
      output: this.output,
      status: this.status,
      priority: this.priority,
      requiresApproval: this.requiresApproval,
      approvedBy: this.approvedBy,
      approvedAt: this.approvedAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromDB(row) {
    return new AgentDelegation({
      id: row.id,
      agentId: row.agent_id,
      organizationId: row.organization_id,
      executionId: row.execution_id,
      goalId: row.goal_id,
      taskId: row.task_id,
      fromAgentId: row.from_agent_id,
      toAgentId: row.to_agent_id,
      toWorkerId: row.to_worker_id,
      delegationType: row.delegation_type,
      context: row.context,
      input: row.input,
      output: row.output,
      status: row.status,
      priority: row.priority,
      requiresApproval: row.requires_approval,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

// Agent Approval
export class AgentApproval {
  constructor(data = {}) {
    this.id = data.id;
    this.agentId = data.agentId;
    this.organizationId = data.organizationId;
    this.executionId = data.executionId;
    this.goalId = data.goalId;
    this.taskId = data.taskId;
    this.delegationId = data.delegationId;
    this.approvalType = data.approvalType;
    this.title = data.title;
    this.description = data.description;
    this.context = data.context || {};
    this.input = data.input || {};
    this.status = data.status || ApprovalStatus.PENDING;
    this.priority = data.priority || 5;
    this.requestedBy = data.requestedBy;
    this.approvedBy = data.approvedBy;
    this.approvedAt = data.approvedAt;
    this.rejectionReason = data.rejectionReason;
    this.expiresAt = data.expiresAt;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      agentId: this.agentId,
      organizationId: this.organizationId,
      executionId: this.executionId,
      goalId: this.goalId,
      taskId: this.taskId,
      delegationId: this.delegationId,
      approvalType: this.approvalType,
      title: this.title,
      description: this.description,
      context: this.context,
      input: this.input,
      status: this.status,
      priority: this.priority,
      requestedBy: this.requestedBy,
      approvedBy: this.approvedBy,
      approvedAt: this.approvedAt,
      rejectionReason: this.rejectionReason,
      expiresAt: this.expiresAt,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromDB(row) {
    return new AgentApproval({
      id: row.id,
      agentId: row.agent_id,
      organizationId: row.organization_id,
      executionId: row.execution_id,
      goalId: row.goal_id,
      taskId: row.task_id,
      delegationId: row.delegation_id,
      approvalType: row.approval_type,
      title: row.title,
      description: row.description,
      context: row.context,
      input: row.input,
      status: row.status,
      priority: row.priority,
      requestedBy: row.requested_by,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      rejectionReason: row.rejection_reason,
      expiresAt: row.expires_at,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

// Agent Analytics
export class AgentAnalytics {
  constructor(data = {}) {
    this.id = data.id;
    this.agentId = data.agentId;
    this.organizationId = data.organizationId;
    this.date = data.date;
    this.executionsStarted = data.executionsStarted || 0;
    this.executionsCompleted = data.executionsCompleted || 0;
    this.executionsFailed = data.executionsFailed || 0;
    this.executionsCancelled = data.executionsCancelled || 0;
    this.goalsCompleted = data.goalsCompleted || 0;
    this.goalsFailed = data.goalsFailed || 0;
    this.tasksCompleted = data.tasksCompleted || 0;
    this.tasksFailed = data.tasksFailed || 0;
    this.workersUsed = data.workersUsed || {};
    this.planningTimeAvgMs = data.planningTimeAvgMs;
    this.executionTimeAvgMs = data.executionTimeAvgMs;
    this.totalTimeAvgMs = data.totalTimeAvgMs;
    this.tokensUsedTotal = data.tokensUsedTotal || 0;
    this.costEstimateTotal = data.costEstimateTotal || 0;
    this.costActualTotal = data.costActualTotal || 0;
    this.approvalsRequested = data.approvalsRequested || 0;
    this.approvalsGranted = data.approvalsGranted || 0;
    this.delegationsMade = data.delegationsMade || 0;
    this.delegationsReceived = data.delegationsReceived || 0;
    this.escalations = data.escalations || 0;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      agentId: this.agentId,
      organizationId: this.organizationId,
      date: this.date,
      executionsStarted: this.executionsStarted,
      executionsCompleted: this.executionsCompleted,
      executionsFailed: this.executionsFailed,
      executionsCancelled: this.executionsCancelled,
      goalsCompleted: this.goalsCompleted,
      goalsFailed: this.goalsFailed,
      tasksCompleted: this.tasksCompleted,
      tasksFailed: this.tasksFailed,
      workersUsed: this.workersUsed,
      planningTimeAvgMs: this.planningTimeAvgMs,
      executionTimeAvgMs: this.executionTimeAvgMs,
      totalTimeAvgMs: this.totalTimeAvgMs,
      tokensUsedTotal: this.tokensUsedTotal,
      costEstimateTotal: this.costEstimateTotal,
      costActualTotal: this.costActualTotal,
      approvalsRequested: this.approvalsRequested,
      approvalsGranted: this.approvalsGranted,
      delegationsMade: this.delegationsMade,
      delegationsReceived: this.delegationsReceived,
      escalations: this.escalations,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromDB(row) {
    return new AgentAnalytics({
      id: row.id,
      agentId: row.agent_id,
      organizationId: row.organization_id,
      date: row.date,
      executionsStarted: row.executions_started,
      executionsCompleted: row.executions_completed,
      executionsFailed: row.executions_failed,
      executionsCancelled: row.executions_cancelled,
      goalsCompleted: row.goals_completed,
      goalsFailed: row.goals_failed,
      tasksCompleted: row.tasks_completed,
      tasksFailed: row.tasks_failed,
      workersUsed: row.workers_used,
      planningTimeAvgMs: row.planning_time_avg_ms,
      executionTimeAvgMs: row.execution_time_avg_ms,
      totalTimeAvgMs: row.total_time_avg_ms,
      tokensUsedTotal: row.tokens_used_total,
      costEstimateTotal: row.cost_estimate_total,
      costActualTotal: row.cost_actual_total,
      approvalsRequested: row.approvals_requested,
      approvalsGranted: row.approvals_granted,
      delegationsMade: row.delegations_made,
      delegationsReceived: row.delegations_received,
      escalations: row.escalations,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

// Agent Policy
export class AgentPolicy {
  constructor(data = {}) {
    this.id = data.id;
    this.agentId = data.agentId;
    this.organizationId = data.organizationId;
    this.name = data.name;
    this.description = data.description;
    this.policyType = data.policyType;
    this.rules = data.rules || [];
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.priority = data.priority || 5;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      agentId: this.agentId,
      organizationId: this.organizationId,
      name: this.name,
      description: this.description,
      policyType: this.policyType,
      rules: this.rules,
      isActive: this.isActive,
      priority: this.priority,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromDB(row) {
    return new AgentPolicy({
      id: row.id,
      agentId: row.agent_id,
      organizationId: row.organization_id,
      name: row.name,
      description: row.description,
      policyType: row.policy_type,
      rules: row.rules,
      isActive: row.is_active,
      priority: row.priority,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

// Agent Marketplace Item
export class AgentMarketplaceItem {
  constructor(data = {}) {
    this.id = data.id;
    this.agentId = data.agentId;
    this.organizationId = data.organizationId;
    this.templateId = data.templateId;
    this.name = data.name;
    this.displayName = data.displayName;
    this.description = data.description;
    this.category = data.category;
    this.type = data.type;
    this.icon = data.icon;
    this.avatarUrl = data.avatarUrl;
    this.version = data.version || '1.0.0';
    this.configuration = data.configuration || {};
    this.capabilities = data.capabilities || [];
    this.permissions = data.permissions || {};
    this.goalTypes = data.goalTypes || [];
    this.workerAccess = data.workerAccess || [];
    this.knowledgeSources = data.knowledgeSources || [];
    this.promptProfile = data.promptProfile || {};
    this.reasoningPolicy = data.reasoningPolicy || {};
    this.memoryPolicy = data.memoryPolicy || {};
    this.executionPolicy = data.executionPolicy || {};
    this.securityPolicy = data.securityPolicy || {};
    this.costPolicy = data.costPolicy || {};
    this.loggingPolicy = data.loggingPolicy || {};
    this.isPublic = data.isPublic || false;
    this.isFeatured = data.isFeatured || false;
    this.isVerified = data.isVerified || false;
    this.downloadCount = data.downloadCount || 0;
    this.rating = data.rating || 0;
    this.ratingCount = data.ratingCount || 0;
    this.tags = data.tags || [];
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      agentId: this.agentId,
      organizationId: this.organizationId,
      templateId: this.templateId,
      name: this.name,
      displayName: this.displayName,
      description: this.description,
      category: this.category,
      type: this.type,
      icon: this.icon,
      avatarUrl: this.avatarUrl,
      version: this.version,
      configuration: this.configuration,
      capabilities: this.capabilities,
      permissions: this.permissions,
      goalTypes: this.goalTypes,
      workerAccess: this.workerAccess,
      knowledgeSources: this.knowledgeSources,
      promptProfile: this.promptProfile,
      reasoningPolicy: this.reasoningPolicy,
      memoryPolicy: this.memoryPolicy,
      executionPolicy: this.executionPolicy,
      securityPolicy: this.securityPolicy,
      costPolicy: this.costPolicy,
      loggingPolicy: this.loggingPolicy,
      isPublic: this.isPublic,
      isFeatured: this.isFeatured,
      isVerified: this.isVerified,
      downloadCount: this.downloadCount,
      rating: this.rating,
      ratingCount: this.ratingCount,
      tags: this.tags,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromDB(row) {
    return new AgentMarketplaceItem({
      id: row.id,
      agentId: row.agent_id,
      organizationId: row.organization_id,
      templateId: row.template_id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      category: row.category,
      type: row.type,
      icon: row.icon,
      avatarUrl: row.avatar_url,
      version: row.version,
      configuration: row.configuration,
      capabilities: row.capabilities,
      permissions: row.permissions,
      goalTypes: row.goal_types,
      workerAccess: row.worker_access,
      knowledgeSources: row.knowledge_sources,
      promptProfile: row.prompt_profile,
      reasoningPolicy: row.reasoning_policy,
      memoryPolicy: row.memory_policy,
      executionPolicy: row.execution_policy,
      securityPolicy: row.security_policy,
      costPolicy: row.cost_policy,
      loggingPolicy: row.logging_policy,
      isPublic: row.is_public,
      isFeatured: row.is_featured,
      isVerified: row.is_verified,
      downloadCount: row.download_count,
      rating: row.rating,
      ratingCount: row.rating_count,
      tags: row.tags,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

// Agent Collaboration
export class AgentCollaboration {
  constructor(data = {}) {
    this.id = data.id;
    this.agentId = data.agentId;
    this.organizationId = data.organizationId;
    this.collaborationType = data.collaborationType;
    this.targetAgentId = data.targetAgentId;
    this.context = data.context || {};
    this.input = data.input || {};
    this.output = data.output;
    this.status = data.status || 'pending';
    this.priority = data.priority || 5;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      agentId: this.agentId,
      organizationId: this.organizationId,
      collaborationType: this.collaborationType,
      targetAgentId: this.targetAgentId,
      context: this.context,
      input: this.input,
      output: this.output,
      status: this.status,
      priority: this.priority,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromDB(row) {
    return new AgentCollaboration({
      id: row.id,
      agentId: row.agent_id,
      organizationId: row.organization_id,
      collaborationType: row.collaboration_type,
      targetAgentId: row.target_agent_id,
      context: row.context,
      input: row.input,
      output: row.output,
      status: row.status,
      priority: row.priority,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

// Agent Worker Assignment
export class AgentWorker {
  constructor(data = {}) {
    this.id = data.id;
    this.agentId = data.agentId;
    this.organizationId = data.organizationId;
    this.workerId = data.workerId;
    this.accessLevel = data.accessLevel || WorkerAccessLevel.READ;
    this.priority = data.priority || 5;
    this.isEnabled = data.isEnabled !== undefined ? data.isEnabled : true;
    this.configuration = data.configuration || {};
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      agentId: this.agentId,
      organizationId: this.organizationId,
      workerId: this.workerId,
      accessLevel: this.accessLevel,
      priority: this.priority,
      isEnabled: this.isEnabled,
      configuration: this.configuration,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromDB(row) {
    return new AgentWorker({
      id: row.id,
      agentId: row.agent_id,
      organizationId: row.organization_id,
      workerId: row.worker_id,
      accessLevel: row.access_level,
      priority: row.priority,
      isEnabled: row.is_enabled,
      configuration: row.configuration,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}

// Agent Memory Reference
export class AgentMemoryReference {
  constructor(data = {}) {
    this.id = data.id;
    this.agentId = data.agentId;
    this.organizationId = data.organizationId;
    this.memoryId = data.memoryId;
    this.memoryType = data.memoryType;
    this.referenceType = data.referenceType;
    this.context = data.context || {};
    this.createdAt = data.createdAt;
  }

  toJSON() {
    return {
      id: this.id,
      agentId: this.agentId,
      organizationId: this.organizationId,
      memoryId: this.memoryId,
      memoryType: this.memoryType,
      referenceType: this.referenceType,
      context: this.context,
      createdAt: this.createdAt
    };
  }

  static fromDB(row) {
    return new AgentMemoryReference({
      id: row.id,
      agentId: row.agent_id,
      organizationId: row.organization_id,
      memoryId: row.memory_id,
      memoryType: row.memory_type,
      referenceType: row.reference_type,
      context: row.context,
      createdAt: row.created_at
    });
  }
}