// Agent Service
// Prompts 20-24: Complete Agent Operating System

import { AgentStatus, AgentType, AgentVisibility } from '../../../../packages/types/agents/index.js';

export function createAgentService(
  agentRepo,
  agentExecutionRepo,
  agentGoalRepo,
  agentTaskRepo,
  agentAnalyticsRepo,
  workerRepo,
  memoryRepo,
  configService
) {
  return {
    // Agent CRUD
    async createAgent(organizationId, ownerId, data) {
      const agent = await agentRepo.create({
        organizationId,
        ownerId,
        ...data
      });

      // Initialize analytics record
      const today = new Date().toISOString().split('T')[0];
      await agentAnalyticsRepo.getOrCreate(agent.id, organizationId, today);

      return agent;
    },

    async getAgent(id) {
      return agentRepo.findByIdWithDetails(id);
    },

    async getAgentByOrganization(organizationId, options = {}) {
      return agentRepo.findByOrganization(organizationId, options);
    },

    async updateAgent(id, data) {
      return agentRepo.update(id, data);
    },

    async deleteAgent(id) {
      await agentRepo.delete(id);
    },

    async archiveAgent(id) {
      return agentRepo.archive(id);
    },

    async restoreAgent(id) {
      return agentRepo.restore(id);
    },

    // Worker Management
    async addWorkerToAgent(agentId, workerId, accessLevel, priority, configuration) {
      return agentRepo.addWorker(agentId, workerId, accessLevel, priority, configuration);
    },

    async removeWorkerFromAgent(agentId, workerId) {
      await agentRepo.removeWorker(agentId, workerId);
    },

    async getAgentWorkers(agentId) {
      return agentRepo.getWorkers(agentId);
    },

    // Policy Management
    async addPolicyToAgent(agentId, policyData) {
      return agentRepo.addPolicy(agentId, policyData);
    },

    async getAgentPolicies(agentId) {
      return agentRepo.getPolicies(agentId);
    },

    // Memory Management
    async addMemoryReference(agentId, memoryId, memoryType, referenceType, context) {
      return agentRepo.addMemoryReference(agentId, memoryId, memoryType, referenceType, context);
    },

    async getAgentMemoryReferences(agentId) {
      return agentRepo.getMemoryReferences(agentId);
    },

    // Execution Management
    async startExecution(agentId, organizationId, userId, goal) {
      const execution = await agentExecutionRepo.create({
        agentId,
        organizationId,
        userId,
        status: 'planning',
        goal
      });

      // Update analytics
      const today = new Date().toISOString().split('T')[0];
      await agentAnalyticsRepo.incrementMetric(agentId, organizationId, today, 'executions_started');

      return execution;
    },

    async getExecution(id) {
      return agentExecutionRepo.findById(id);
    },

    async getAgentExecutions(agentId, options = {}) {
      return agentExecutionRepo.findByAgent(agentId, options);
    },

    async getOrganizationExecutions(organizationId, options = {}) {
      return agentExecutionRepo.findByOrganization(organizationId, options);
    },

    async updateExecution(id, data) {
      return agentExecutionRepo.update(id, data);
    },

    async completeExecution(id, result, costActual) {
      const execution = await agentExecutionRepo.complete(id, result, costActual);
      
      // Update analytics
      if (execution) {
        const today = new Date().toISOString().split('T')[0];
        await agentAnalyticsRepo.incrementMetric(
          execution.agent_id,
          execution.organization_id,
          today,
          'executions_completed'
        );
      }

      return execution;
    },

    async failExecution(id, error) {
      const execution = await agentExecutionRepo.fail(id, error);
      
      // Update analytics
      if (execution) {
        const today = new Date().toISOString().split('T')[0];
        await agentAnalyticsRepo.incrementMetric(
          execution.agent_id,
          execution.organization_id,
          today,
          'executions_failed'
        );
      }

      return execution;
    },

    async cancelExecution(id) {
      const execution = await agentExecutionRepo.cancel(id);
      
      // Update analytics
      if (execution) {
        const today = new Date().toISOString().split('T')[0];
        await agentAnalyticsRepo.incrementMetric(
          execution.agent_id,
          execution.organization_id,
          today,
          'executions_cancelled'
        );
      }

      return execution;
    },

    // Goal Management
    async createGoal(agentId, organizationId, executionId, goalData) {
      const goal = await agentGoalRepo.create({
        agentId,
        organizationId,
        executionId,
        ...goalData
      });

      return goal;
    },

    async getGoal(id) {
      return agentGoalRepo.findById(id);
    },

    async getAgentGoals(agentId, options = {}) {
      return agentGoalRepo.findByAgent(agentId, options);
    },

    async getExecutionGoals(executionId) {
      return agentGoalRepo.findByExecution(executionId);
    },

    async updateGoal(id, data) {
      return agentGoalRepo.update(id, data);
    },

    async completeGoal(id) {
      const goal = await agentGoalRepo.complete(id);
      
      // Update analytics
      if (goal) {
        const today = new Date().toISOString().split('T')[0];
        await agentAnalyticsRepo.incrementMetric(
          goal.agent_id,
          goal.organization_id,
          today,
          'goals_completed'
        );
      }

      return goal;
    },

    async failGoal(id) {
      const goal = await agentGoalRepo.fail(id);
      
      // Update analytics
      if (goal) {
        const today = new Date().toISOString().split('T')[0];
        await agentAnalyticsRepo.incrementMetric(
          goal.agent_id,
          goal.organization_id,
          today,
          'goals_failed'
        );
      }

      return goal;
    },

    // Task Management
    async createTask(agentId, organizationId, taskData) {
      const task = await agentTaskRepo.create({
        agentId,
        organizationId,
        ...taskData
      });

      return task;
    },

    async getTask(id) {
      return agentTaskRepo.findById(id);
    },

    async getAgentTasks(agentId, options = {}) {
      return agentTaskRepo.findByAgent(agentId, options);
    },

    async getExecutionTasks(executionId) {
      return agentTaskRepo.findByExecution(executionId);
    },

    async getWorkerTasks(workerId, options = {}) {
      return agentTaskRepo.findByWorker(workerId, options);
    },

    async updateTask(id, data) {
      return agentTaskRepo.update(id, data);
    },

    async assignTaskWorker(id, workerId, workerType) {
      return agentTaskRepo.assignWorker(id, workerId, workerType);
    },

    async startTask(id) {
      return agentTaskRepo.start(id);
    },

    async completeTask(id, output, result, actualTimeMs, tokensUsed, costActual) {
      const task = await agentTaskRepo.complete(id, output, result, actualTimeMs, tokensUsed, costActual);
      
      // Update analytics
      if (task) {
        const today = new Date().toISOString().split('T')[0];
        await agentAnalyticsRepo.incrementMetric(
          task.agent_id,
          task.organization_id,
          today,
          'tasks_completed'
        );
        await agentAnalyticsRepo.incrementMetric(
          task.agent_id,
          task.organization_id,
          today,
          'tokens_used_total',
          tokensUsed || 0
        );
        await agentAnalyticsRepo.incrementMetric(
          task.agent_id,
          task.organization_id,
          today,
          'cost_actual_total',
          costActual || 0
        );
        if (task.worker_id) {
          await agentAnalyticsRepo.updateWorkersUsed(
            task.agent_id,
            task.organization_id,
            today,
            task.worker_id,
            1
          );
        }
      }

      return task;
    },

    async failTask(id, error) {
      const task = await agentTaskRepo.fail(id, error);
      
      // Update analytics
      if (task) {
        const today = new Date().toISOString().split('T')[0];
        await agentAnalyticsRepo.incrementMetric(
          task.agent_id,
          task.organization_id,
          today,
          'tasks_failed'
        );
      }

      return task;
    },

    async retryTask(id) {
      return agentTaskRepo.retry(id);
    },

    async cancelTask(id) {
      return agentTaskRepo.cancel(id);
    },

    async approveTask(id, approvedBy) {
      return agentTaskRepo.approve(id, approvedBy);
    },

    async rejectTask(id, approvedBy, reason) {
      return agentTaskRepo.reject(id, approvedBy, reason);
    },

    async getPendingTasks(agentId) {
      return agentTaskRepo.getPendingTasks(agentId);
    },

    // Analytics
    async getAgentStats(agentId, days = 30) {
      return agentExecutionRepo.getStats(agentId, days);
    },

    async getOrganizationStats(organizationId, startDate, endDate) {
      return agentAnalyticsRepo.getOrganizationStats(organizationId, startDate, endDate);
    },

    async getTopAgents(organizationId, startDate, endDate, limit = 10) {
      return agentAnalyticsRepo.getTopAgents(organizationId, startDate, endDate, limit);
    },

    // Templates
    async getTemplates(options = {}) {
      return agentRepo.findSystemTemplates(options);
    },

    async getTemplate(id) {
      return agentRepo.findTemplateById(id);
    },

    async createTemplate(data) {
      return agentRepo.createTemplate(data);
    },

    async updateTemplate(id, data) {
      return agentRepo.updateTemplate(id, data);
    },

    async deleteTemplate(id) {
      await agentRepo.deleteTemplate(id);
    },

    // Marketplace
    async getMarketplaceItems(options = {}) {
      return agentMarketplaceRepo.findPublic(options);
    },

    async getMarketplaceItem(id) {
      return agentMarketplaceRepo.findById(id);
    },

    async getFeaturedMarketplaceItems(limit = 10) {
      return agentMarketplaceRepo.findFeatured(limit);
    },

    async publishToMarketplace(agentId, organizationId, data) {
      const marketplaceItem = await agentMarketplaceRepo.create({
        agentId,
        organizationId,
        ...data
      });

      // Update agent visibility
      await agentRepo.update(agentId, { visibility: 'public' });

      return marketplaceItem;
    },

    async downloadMarketplaceItem(id) {
      return agentMarketplaceRepo.incrementDownload(id);
    },

    // Collaboration
    async createCollaboration(agentId, organizationId, collaborationData) {
      return agentCollaborationRepo.create({
        agentId,
        organizationId,
        ...collaborationData
      });
    },

    async getAgentCollaborations(agentId, options = {}) {
      return agentCollaborationRepo.findByAgent(agentId, options);
    },

    async updateCollaborationStatus(id, status, output = null) {
      return agentCollaborationRepo.updateStatus(id, status, output);
    },

    // Decisions
    async createDecision(agentId, organizationId, decisionData) {
      return agentDecisionRepo.create({
        agentId,
        organizationId,
        ...decisionData
      });
    },

    async getAgentDecisions(agentId, options = {}) {
      return agentDecisionRepo.findByAgent(agentId, options);
    },

    async approveDecision(id, approvedBy) {
      return agentDecisionRepo.approve(id, approvedBy);
    },

    async rejectDecision(id, approvedBy) {
      return agentDecisionRepo.reject(id, approvedBy);
    },

    // Delegations
    async createDelegation(agentId, organizationId, delegationData) {
      return agentDelegationRepo.create({
        agentId,
        organizationId,
        ...delegationData
      });
    },

    async getAgentDelegations(agentId, options = {}) {
      return agentDelegationRepo.findByAgent(agentId, options);
    },

    async updateDelegationStatus(id, status, output = null) {
      return agentDelegationRepo.updateStatus(id, status, output);
    },

    async approveDelegation(id, approvedBy) {
      return agentDelegationRepo.approve(id, approvedBy);
    },

    // Approvals
    async createApproval(agentId, organizationId, approvalData) {
      return agentApprovalRepo.create({
        agentId,
        organizationId,
        ...approvalData
      });
    },

    async getAgentApprovals(agentId, options = {}) {
      return agentApprovalRepo.findByAgent(agentId, options);
    },

    async getPendingApprovals(agentId) {
      return agentApprovalRepo.getPendingApprovals(agentId);
    },

    async approveApproval(id, approvedBy) {
      return agentApprovalRepo.approve(id, approvedBy);
    },

    async rejectApproval(id, approvedBy, rejectionReason) {
      return agentApprovalRepo.reject(id, approvedBy, rejectionReason);
    }
  };
}