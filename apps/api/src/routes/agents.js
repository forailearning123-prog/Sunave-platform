import { Router } from 'express';
// Agent Platform Routes
// Prompts 20-24: Complete Agent Operating System

export function buildAgentsRouter(agentService, permService) {
  const router = Router();

  // Middleware to require organization context
  const requireOrg = (req, res, next) => {
    if (!req.org) {
      return res.status(400).json({ success: false, error: 'ORGANIZATION_REQUIRED', message: 'Organization context required.' });
    }
    next();
  };

  // ==================== AGENTS ====================

  // GET /api/agents - List agents
  router.get('/', requireOrg, async (req, res) => {
    try {
      const { status, type, department, visibility, search, limit = 50, offset = 0 } = req.query;
      
      const agents = await agentService.getAgentByOrganization(req.org.id, {
        status,
        type,
        department,
        visibility,
        search,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      });

      res.json({ success: true, data: agents });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // GET /api/agents/stats - Get agent statistics
  router.get('/stats', requireOrg, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const stats = await agentService.getOrganizationStats(req.org.id, startDate, endDate);

      res.json({ success: true, data: stats });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // GET /api/agents/top - Get top performing agents
  router.get('/top', requireOrg, async (req, res) => {
    try {
      const { startDate, endDate, limit = 10 } = req.query;
      
      const topAgents = await agentService.getTopAgents(
        req.org.id,
        startDate,
        endDate,
        parseInt(limit, 10)
      );

      res.json({ success: true, data: topAgents });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // GET /api/agents/:id - Get agent by ID
  router.get('/:id', async (req, res) => {
    try {
      const agent = await agentService.getAgent(req.params.id);
      
      if (!agent) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Agent not found.' });
      }

      res.json({ success: true, data: agent });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents - Create agent
  router.post('/', requireOrg, async (req, res) => {
    try {
      const {
        name,
        displayName,
        description,
        department,
        role,
        icon,
        avatarUrl,
        status,
        version,
        visibility,
        capabilities,
        permissions,
        goalTypes,
        workerAccess,
        knowledgeSources,
        promptProfile,
        reasoningPolicy,
        memoryPolicy,
        executionPolicy,
        securityPolicy,
        costPolicy,
        loggingPolicy,
        metadata
      } = req.body;

      const agent = await agentService.createAgent(req.org.id, req.auth.userId, {
        name,
        displayName,
        description,
        department,
        role,
        icon,
        avatarUrl,
        status,
        version,
        visibility,
        capabilities,
        permissions,
        goalTypes,
        workerAccess,
        knowledgeSources,
        promptProfile,
        reasoningPolicy,
        memoryPolicy,
        executionPolicy,
        securityPolicy,
        costPolicy,
        loggingPolicy,
        metadata
      });

      res.status(201).json({ success: true, data: agent });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // PUT /api/agents/:id - Update agent
  router.put('/:id', async (req, res) => {
    try {
      const agent = await agentService.updateAgent(req.params.id, req.body);
      
      if (!agent) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Agent not found.' });
      }

      res.json({ success: true, data: agent });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // DELETE /api/agents/:id - Delete agent
  router.delete('/:id', async (req, res) => {
    try {
      await agentService.deleteAgent(req.params.id);
      res.json({ success: true, message: 'Agent deleted successfully.' });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents/:id/archive - Archive agent
  router.post('/:id/archive', async (req, res) => {
    try {
      const agent = await agentService.archiveAgent(req.params.id);
      res.json({ success: true, data: agent });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents/:id/restore - Restore agent
  router.post('/:id/restore', async (req, res) => {
    try {
      const agent = await agentService.restoreAgent(req.params.id);
      res.json({ success: true, data: agent });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // ==================== AGENT WORKERS ====================

  // GET /api/agents/:id/workers - Get agent workers
  router.get('/:id/workers', async (req, res) => {
    try {
      const workers = await agentService.getAgentWorkers(req.params.id);
      res.json({ success: true, data: workers });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents/:id/workers - Add worker to agent
  router.post('/:id/workers', async (req, res) => {
    try {
      const { workerId, accessLevel, priority, configuration } = req.body;
      
      const worker = await agentService.addWorkerToAgent(
        req.params.id,
        workerId,
        accessLevel,
        priority,
        configuration
      );

      res.status(201).json({ success: true, data: worker });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // DELETE /api/agents/:id/workers/:workerId - Remove worker from agent
  router.delete('/:id/workers/:workerId', async (req, res) => {
    try {
      await agentService.removeWorkerFromAgent(req.params.id, req.params.workerId);
      res.json({ success: true, message: 'Worker removed successfully.' });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // ==================== AGENT POLICIES ====================

  // GET /api/agents/:id/policies - Get agent policies
  router.get('/:id/policies', async (req, res) => {
    try {
      const policies = await agentService.getAgentPolicies(req.params.id);
      res.json({ success: true, data: policies });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents/:id/policies - Add policy to agent
  router.post('/:id/policies', async (req, res) => {
    try {
      const policy = await agentService.addPolicyToAgent(req.params.id, req.body);
      res.status(201).json({ success: true, data: policy });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // ==================== AGENT MEMORY ====================

  // GET /api/agents/:id/memory - Get agent memory references
  router.get('/:id/memory', async (req, res) => {
    try {
      const memories = await agentService.getAgentMemoryReferences(req.params.id);
      res.json({ success: true, data: memories });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents/:id/memory - Add memory reference to agent
  router.post('/:id/memory', async (req, res) => {
    try {
      const { memoryId, memoryType, referenceType, context } = req.body;
      
      const memory = await agentService.addMemoryReference(
        req.params.id,
        memoryId,
        memoryType,
        referenceType,
        context
      );

      res.status(201).json({ success: true, data: memory });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // ==================== AGENT EXECUTIONS ====================

  // GET /api/agents/:id/executions - Get agent executions
  router.get('/:id/executions', async (req, res) => {
    try {
      const { status, limit = 50, offset = 0 } = req.query;
      
      const executions = await agentService.getAgentExecutions(req.params.id, {
        status,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      });

      res.json({ success: true, data: executions });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // GET /api/agents/:id/executions/:executionId - Get execution by ID
  router.get('/:id/executions/:executionId', async (req, res) => {
    try {
      const execution = await agentService.getExecution(req.params.executionId);
      
      if (!execution) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Execution not found.' });
      }

      res.json({ success: true, data: execution });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents/:id/executions - Start agent execution
  router.post('/:id/executions', async (req, res) => {
    try {
      const { goal } = req.body;
      
      const execution = await agentService.startExecution(
        req.params.id,
        req.org.id,
        req.auth.userId,
        goal
      );

      res.status(201).json({ success: true, data: execution });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents/:id/executions/:executionId/cancel - Cancel execution
  router.post('/:id/executions/:executionId/cancel', async (req, res) => {
    try {
      const execution = await agentService.cancelExecution(req.params.executionId);
      res.json({ success: true, data: execution });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // ==================== AGENT GOALS ====================

  // GET /api/agents/:id/goals - Get agent goals
  router.get('/:id/goals', async (req, res) => {
    try {
      const { status, executionId, limit = 50, offset = 0 } = req.query;
      
      const goals = await agentService.getAgentGoals(req.params.id, {
        status,
        executionId,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      });

      res.json({ success: true, data: goals });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents/:id/goals - Create agent goal
  router.post('/:id/goals', async (req, res) => {
    try {
      const { executionId, ...goalData } = req.body;
      
      const goal = await agentService.createGoal(
        req.params.id,
        req.org.id,
        executionId,
        goalData
      );

      res.status(201).json({ success: true, data: goal });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // PUT /api/agents/:id/goals/:goalId - Update goal
  router.put('/:id/goals/:goalId', async (req, res) => {
    try {
      const goal = await agentService.updateGoal(req.params.goalId, req.body);
      res.json({ success: true, data: goal });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // ==================== AGENT TASKS ====================

  // GET /api/agents/:id/tasks - Get agent tasks
  router.get('/:id/tasks', async (req, res) => {
    try {
      const { status, goalId, executionId, limit = 50, offset = 0 } = req.query;
      
      const tasks = await agentService.getAgentTasks(req.params.id, {
        status,
        goalId,
        executionId,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      });

      res.json({ success: true, data: tasks });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents/:id/tasks - Create agent task
  router.post('/:id/tasks', async (req, res) => {
    try {
      const task = await agentService.createTask(req.params.id, req.org.id, req.body);
      res.status(201).json({ success: true, data: task });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // PUT /api/agents/:id/tasks/:taskId - Update task
  router.put('/:id/tasks/:taskId', async (req, res) => {
    try {
      const task = await agentService.updateTask(req.params.taskId, req.body);
      res.json({ success: true, data: task });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents/:id/tasks/:taskId/approve - Approve task
  router.post('/:id/tasks/:taskId/approve', async (req, res) => {
    try {
      const task = await agentService.approveTask(req.params.taskId, req.auth.userId);
      res.json({ success: true, data: task });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents/:id/tasks/:taskId/reject - Reject task
  router.post('/:id/tasks/:taskId/reject', async (req, res) => {
    try {
      const { reason } = req.body;
      const task = await agentService.rejectTask(req.params.taskId, req.auth.userId, reason);
      res.json({ success: true, data: task });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  return router;
}