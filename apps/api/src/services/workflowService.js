// Workflow Service - Business logic layer for workflow engine

import { v4 as uuidv4 } from 'uuid';
import WorkflowRepository from '../repositories/workflowRepository';
import WorkerService from './workerService';
const { WorkflowExecutionStatus, WorkflowTriggerType } = require('packages/types/agents/index.js');

class WorkflowService {
  constructor(db) {
    this.workflowRepo = new WorkflowRepository(db);
    this.workerService = new WorkerService(db);
  }

  // ─── Workflow Management ─────────────────────────────────────────────────────

  async createWorkflow(organizationId, data, authorId) {
    // Validate required fields
    if (!data.name) {
      throw new Error('Workflow name is required');
    }

    // Validate category
    const validCategories = [
      'ai','knowledge','search','document','communication',
      'database','analytics','automation','integration',
      'development','finance','crm','hr','operations','custom'
    ];
    if (data.category && !validCategories.includes(data.category)) {
      throw new Error(`Invalid workflow category: ${data.category}`);
    }

    // Validate steps if provided
    if (data.steps && Array.isArray(data.steps)) {
      this.validateWorkflowSteps(data.steps);
    }

    // Validate connections if provided
    if (data.connections && Array.isArray(data.connections)) {
      this.validateWorkflowConnections(data.connections, data.steps || []);
    }

    const workflow = await this.workflowRepo.createWorkflow(organizationId, data, authorId);

    // Create steps if provided
    if (data.steps && Array.isArray(data.steps)) {
      for (let i = 0; i < data.steps.length; i++) {
        const step = data.steps[i];
        await this.workflowRepo.addWorkflowStep(workflow.id, {
          ...step,
          orderIndex: i
        });
      }
    }

    // Create connections if provided
    if (data.connections && Array.isArray(data.connections)) {
      for (const connection of data.connections) {
        await this.workflowRepo.addWorkflowConnection(workflow.id, connection);
      }
    }

    return workflow;
  }

  async getWorkflow(id, organizationId) {
    const workflow = await this.workflowRepo.getWorkflowById(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Organization isolation
    if (workflow.organizationId !== organizationId) {
      throw new Error('Access denied');
    }

    // Load steps and connections
    workflow.steps = await this.workflowRepo.getWorkflowSteps(id);
    workflow.connections = await this.workflowRepo.getWorkflowConnections(id);

    return workflow;
  }

  async updateWorkflow(id, organizationId, data, userId) {
    const workflow = await this.workflowRepo.getWorkflowById(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (workflow.organizationId !== organizationId) {
      throw new Error('Access denied');
    }

    // Validate steps if provided
    if (data.steps && Array.isArray(data.steps)) {
      this.validateWorkflowSteps(data.steps);
    }

    // Validate connections if provided
    if (data.connections && Array.isArray(data.connections)) {
      this.validateWorkflowConnections(data.connections, data.steps || []);
    }

    const updated = await this.workflowRepo.updateWorkflow(id, data);

    // Update steps if provided
    if (data.steps && Array.isArray(data.steps)) {
      // Get existing steps
      const existingSteps = await this.workflowRepo.getWorkflowSteps(id);
      const existingStepIds = new Set(existingSteps.map(s => s.stepId));

      // Add or update steps
      for (let i = 0; i < data.steps.length; i++) {
        const step = data.steps[i];
        if (existingStepIds.has(step.stepId)) {
          await this.workflowRepo.updateWorkflowStep(id, step.stepId, {
            ...step,
            orderIndex: i
          });
        } else {
          await this.workflowRepo.addWorkflowStep(id, {
            ...step,
            orderIndex: i
          });
        }
      }

      // Delete removed steps
      const newStepIds = new Set(data.steps.map(s => s.stepId));
      for (const existingStep of existingSteps) {
        if (!newStepIds.has(existingStep.stepId)) {
          await this.workflowRepo.deleteWorkflowStep(id, existingStep.stepId);
        }
      }
    }

    // Update connections if provided
    if (data.connections && Array.isArray(data.connections)) {
      // Get existing connections
      const existingConnections = await this.workflowRepo.getWorkflowConnections(id);
      const existingConnectionIds = new Set(existingConnections.map(c => c.connectionId));

      // Add new connections
      for (const connection of data.connections) {
        if (!existingConnectionIds.has(connection.connectionId)) {
          await this.workflowRepo.addWorkflowConnection(id, connection);
        }
      }

      // Delete removed connections
      const newConnectionIds = new Set(data.connections.map(c => c.connectionId));
      for (const existingConnection of existingConnections) {
        if (!newConnectionIds.has(existingConnection.connectionId)) {
          await this.workflowRepo.deleteWorkflowConnection(id, existingConnection.connectionId);
        }
      }
    }

    return updated;
  }

  async deleteWorkflow(id, organizationId) {
    const workflow = await this.workflowRepo.getWorkflowById(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (workflow.organizationId !== organizationId) {
      throw new Error('Access denied');
    }

    return await this.workflowRepo.deleteWorkflow(id);
  }

  async searchWorkflows(organizationId, filters = {}, limit = 50, offset = 0) {
    return await this.workflowRepo.searchWorkflows(organizationId, filters, limit, offset);
  }

  async countWorkflows(organizationId, filters = {}) {
    return await this.workflowRepo.countWorkflows(organizationId, filters);
  }

  // ─── Workflow Execution ──────────────────────────────────────────────────────

  async executeWorkflow(workflowId, organizationId, triggerType, inputs = {}, triggeredBy = null) {
    const workflow = await this.workflowRepo.getWorkflowById(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (workflow.organizationId !== organizationId) {
      throw new Error('Access denied');
    }

    if (workflow.status !== 'published') {
      throw new Error('Workflow must be published before execution');
    }

    // Create execution record
    const execution = await this.workflowRepo.createWorkflowExecution(
      workflowId,
      organizationId,
      triggerType,
      inputs,
      triggeredBy
    );

    // Execution queued via platform message broker
    // For now, return the execution record
    return execution;
  }

  async getWorkflowExecution(executionId, organizationId) {
    const execution = await this.workflowRepo.getWorkflowExecution(executionId);
    if (!execution) {
      throw new Error('Workflow execution not found');
    }

    if (execution.organizationId !== organizationId) {
      throw new Error('Access denied');
    }

    return execution;
  }

  async getWorkflowExecutions(workflowId, organizationId, limit = 50, offset = 0) {
    const workflow = await this.workflowRepo.getWorkflowById(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (workflow.organizationId !== organizationId) {
      throw new Error('Access denied');
    }

    return await this.workflowRepo.getWorkflowExecutions(workflowId, limit, offset);
  }

  async getOrganizationWorkflowExecutions(organizationId, limit = 50, offset = 0) {
    return await this.workflowRepo.getOrganizationWorkflowExecutions(organizationId, limit, offset);
  }

  // ─── Workflow Templates ──────────────────────────────────────────────────────

  async createWorkflowTemplate(data, createdBy = null) {
    // Validate required fields
    if (!data.name || !data.category || !data.template) {
      throw new Error('Workflow template name, category, and template are required');
    }

    return await this.workflowRepo.createWorkflowTemplate(data, createdBy);
  }

  async getWorkflowTemplate(id) {
    const template = await this.workflowRepo.getWorkflowTemplate(id);
    if (!template) {
      throw new Error('Workflow template not found');
    }

    // Increment usage count
    await this.workflowRepo.incrementTemplateUsage(id);

    return template;
  }

  async searchWorkflowTemplates(filters = {}, limit = 50, offset = 0) {
    return await this.workflowRepo.searchWorkflowTemplates(filters, limit, offset);
  }

  async instantiateTemplate(templateId, organizationId, name, authorId) {
    const template = await this.workflowRepo.getWorkflowTemplate(templateId);
    if (!template) {
      throw new Error('Workflow template not found');
    }

    // Create workflow from template
    const workflowData = {
      name: name || template.name,
      description: template.description,
      category: template.category,
      version: '1.0.0',
      status: 'draft',
      steps: template.template.steps || [],
      connections: template.template.connections || [],
      variables: template.template.variables || {},
      inputs: template.template.inputs || [],
      outputs: template.template.outputs || [],
      triggers: []
    };

    const workflow = await this.createWorkflow(organizationId, workflowData, authorId);

    return workflow;
  }

  // ─── Validation Helpers ──────────────────────────────────────────────────────

  validateWorkflowSteps(steps) {
    if (!Array.isArray(steps)) {
      throw new Error('Steps must be an array');
    }

    const stepIds = new Set();
    for (const step of steps) {
      if (!step.stepId) {
        throw new Error('Each step must have a stepId');
      }
      if (!step.stepType) {
        throw new Error(`Step ${step.stepId} must have a stepType`);
      }

      const validStepTypes = [
        'worker','condition','parallel','loop','retry',
        'delay','approval','webhook','manual','merge'
      ];
      if (!validStepTypes.includes(step.stepType)) {
        throw new Error(`Invalid step type: ${step.stepType}`);
      }

      if (stepIds.has(step.stepId)) {
        throw new Error(`Duplicate stepId: ${step.stepId}`);
      }
      stepIds.add(step.stepId);
    }
  }

  validateWorkflowConnections(connections, steps) {
    if (!Array.isArray(connections)) {
      throw new Error('Connections must be an array');
    }

    const stepIds = new Set(steps.map(s => s.stepId));

    for (const connection of connections) {
      if (!connection.connectionId) {
        throw new Error('Each connection must have a connectionId');
      }
      if (!connection.sourceStepId) {
        throw new Error(`Connection ${connection.connectionId} must have a sourceStepId`);
      }
      if (!connection.targetStepId) {
        throw new Error(`Connection ${connection.connectionId} must have a targetStepId`);
      }

      if (!stepIds.has(connection.sourceStepId)) {
        throw new Error(`Connection source step not found: ${connection.sourceStepId}`);
      }
      if (!stepIds.has(connection.targetStepId)) {
        throw new Error(`Connection target step not found: ${connection.targetStepId}`);
      }
    }
  }

  // ─── Scheduling ──────────────────────────────────────────────────────────────

  async createSchedule(organizationId, data, createdBy) {
    import ScheduleRepository from '../repositories/scheduleRepository';
    const scheduleRepo = new ScheduleRepository(this.workflowRepo.db);

    // Validate required fields
    if (!data.name || !data.scheduleType) {
      throw new Error('Schedule name and type are required');
    }

    // Validate schedule type
    const validTypes = ['once','hourly','daily','weekly','monthly','cron'];
    if (!validTypes.includes(data.scheduleType)) {
      throw new Error(`Invalid schedule type: ${data.scheduleType}`);
    }

    // Validate cron expression if type is cron
    if (data.scheduleType === 'cron' && !data.cronExpression) {
      throw new Error('Cron expression is required for cron schedule type');
    }

    // Validate execution target
    if (!data.executionTarget || !data.executionTarget.type) {
      throw new Error('Execution target with type is required');
    }

    const validTargetTypes = ['workflow', 'worker'];
    if (!validTargetTypes.includes(data.executionTarget.type)) {
      throw new Error(`Invalid execution target type: ${data.executionTarget.type}`);
    }

    return await scheduleRepo.createSchedule(organizationId, data, createdBy);
  }

  async getSchedule(id, organizationId) {
    import ScheduleRepository from '../repositories/scheduleRepository';
    const scheduleRepo = new ScheduleRepository(this.workflowRepo.db);

    const schedule = await scheduleRepo.getScheduleById(id);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    if (schedule.organizationId !== organizationId) {
      throw new Error('Access denied');
    }

    return schedule;
  }

  async updateSchedule(id, organizationId, data) {
    import ScheduleRepository from '../repositories/scheduleRepository';
    const scheduleRepo = new ScheduleRepository(this.workflowRepo.db);

    const schedule = await scheduleRepo.getScheduleById(id);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    if (schedule.organizationId !== organizationId) {
      throw new Error('Access denied');
    }

    return await scheduleRepo.updateSchedule(id, data);
  }

  async deleteSchedule(id, organizationId) {
    import ScheduleRepository from '../repositories/scheduleRepository';
    const scheduleRepo = new ScheduleRepository(this.workflowRepo.db);

    const schedule = await scheduleRepo.getScheduleById(id);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    if (schedule.organizationId !== organizationId) {
      throw new Error('Access denied');
    }

    return await scheduleRepo.deleteSchedule(id);
  }

  async getOrganizationSchedules(organizationId, filters = {}, limit = 50, offset = 0) {
    import ScheduleRepository from '../repositories/scheduleRepository';
    const scheduleRepo = new ScheduleRepository(this.workflowRepo.db);

    return await scheduleRepo.searchSchedules(organizationId, filters, limit, offset);
  }
}

export default WorkflowService;