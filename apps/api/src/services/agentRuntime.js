// Agent Runtime Service
// Prompts 20-24: Complete Agent Operating System

import { ExecutionStatus, TaskStatus } from '@sunave/types/agents';

export function createAgentRuntime(
  agentService,
  planningEngine,
  workerService,
  workflowService,
  aiGatewayService,
  memoryService,
  contextBuilderService,
  configService
) {
  return {
    /**
     * Initialize an agent for execution
     */
    async initialize(agentId, executionId) {
      const agent = await agentService.getAgent(agentId);
      
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Load agent context
      const context = {
        agent,
        executionId,
        startedAt: new Date().toISOString()
      };

      // Load agent memory if configured
      if (agent.memory_policy?.enabled && agent.memoryReferences?.length > 0) {
        const memories = [];
        for (const ref of agent.memoryReferences) {
          const memory = await memoryService.getMemory(ref.memory_id);
          if (memory) {
            memories.push(memory);
          }
        }
        context.memories = memories;
      }

      return context;
    },

    /**
     * Load context for agent execution
     */
    async loadContext(agentId, goal, userContext = {}) {
      const agent = await agentService.getAgent(agentId);
      
      // Build context from multiple sources
      const context = {
        agent,
        goal,
        user: userContext,
        timestamp: new Date().toISOString()
      };

      // Add knowledge sources if configured
      if (agent.knowledgeSources?.length > 0) {
        const knowledge = [];
        for (const source of agent.knowledgeSources) {
          try {
            const result = await contextBuilderService.retrieveKnowledge(source.id, goal);
            knowledge.push(result);
          } catch (error) {
            console.error(`Failed to load knowledge source ${source.id}:`, error);
          }
        }
        context.knowledge = knowledge;
      }

      return context;
    },

    /**
     * Execute an agent with a goal
     */
    async execute(agentId, organizationId, userId, goalData) {
      try {
        // Step 1: Start execution
        const execution = await agentService.startExecution(agentId, organizationId, userId, goalData);
        
        // Step 2: Initialize agent
        const context = await this.initialize(agentId, execution.id);
        
        // Step 3: Load context
        const fullContext = await this.loadContext(agentId, goalData, { userId });
        
        // Step 4: Create goal record
        const goal = await agentService.createGoal(agentId, organizationId, execution.id, {
          title: goalData.title,
          description: goalData.description,
          type: goalData.type || 'output',
          priority: goalData.priority || 5,
          context: fullContext
        });

        // Step 5: Plan
        const plan = await planningEngine.createPlan(agentId, organizationId, userId, goalData);
        
        // Update execution with plan
        await agentService.updateExecution(execution.id, {
          status: 'delegating',
          plan: plan
        });

        // Step 6: Create tasks
        const taskIds = [];
        for (const taskData of plan.tasks) {
          const task = await agentService.createTask(agentId, organizationId, {
            goalId: goal.id,
            executionId: execution.id,
            ...taskData
          });
          taskIds.push(task.id);
        }

        // Step 7: Delegate tasks to workers
        for (let i = 0; i < plan.tasks.length; i++) {
          const task = plan.tasks[i];
          const assignment = plan.workerAssignments[i];
          
          if (assignment.workerId) {
            await agentService.assignTaskWorker(taskIds[i], assignment.workerId, assignment.workerType);
          }
        }

        // Step 8: Start execution
        await agentService.updateExecution(execution.id, {
          status: 'executing',
          startedAt: new Date().toISOString()
        });

        // Step 9: Execute tasks (simplified - in production this would be async)
        const results = await this.executeTasks(agentId, execution.id, goal.id, plan.tasks);

        // Step 10: Complete execution
        const success = results.every(r => r.status === TaskStatus.COMPLETED);
        const totalCost = results.reduce((sum, r) => sum + (r.costActual || 0), 0);
        
        if (success) {
          await agentService.completeExecution(execution.id, { results }, totalCost);
          await agentService.completeGoal(goal.id);
        } else {
          const errors = results.filter(r => r.status === TaskStatus.FAILED).map(r => r.error);
          await agentService.failExecution(execution.id, { errors });
          await agentService.failGoal(goal.id);
        }

        return {
          execution,
          goal,
          tasks: results
        };

      } catch (error) {
        console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message: .message, stack: .stack }));
        throw error;
      }
    },

    /**
     * Execute tasks sequentially
     */
    async executeTasks(agentId, executionId, goalId, tasks) {
      const results = [];
      
      for (const task of tasks) {
        try {
          // Check if dependencies are met
          const pendingDeps = task.dependencies?.filter(depId => {
            const depResult = results.find(r => r.taskId === depId);
            return !depResult || depResult.status !== TaskStatus.COMPLETED;
          });

          if (pendingDeps?.length > 0) {
            // Skip task if dependencies not met
            continue;
          }

          // Start task
          await agentService.startTask(task.id);
          
          // Execute task (simplified - would delegate to worker in production)
          const startTime = Date.now();
          const result = await this.executeTask(agentId, task);
          const actualTime = Date.now() - startTime;

          // Complete task
          await agentService.completeTask(
            task.id,
            result.output,
            result.result,
            actualTime,
            result.tokensUsed || 0,
            result.costActual || 0
          );

          results.push({
            taskId: task.id,
            status: TaskStatus.COMPLETED,
            output: result.output,
            result: result.result,
            actualTimeMs: actualTime,
            tokensUsed: result.tokensUsed,
            costActual: result.costActual
          });

        } catch (error) {
          // Fail task
          await agentService.failTask(task.id, error.message);
          
          results.push({
            taskId: task.id,
            status: TaskStatus.FAILED,
            error: error.message
          });

          // Check if we should retry
          const taskData = await agentService.getTask(task.id);
          if (taskData.retry_count < taskData.max_retries) {
            await agentService.retryTask(task.id);
          }
        }
      }

      return results;
    },

    /**
     * Execute a single task
     */
    async executeTask(agentId, task) {
      // In production, this would delegate to the worker service
      // Synchronous execution via message bus / event-driven worker in production
      return {
        output: { message: `Task ${task.title} completed` },
        result: { success: true },
        tokensUsed: 100,
        costActual: 0.01
      };
    },

    /**
     * Monitor agent execution
     */
    async monitor(executionId) {
      const execution = await agentService.getExecution(executionId);
      
      if (!execution) {
        throw new Error('Execution not found');
      }

      const tasks = await agentService.getExecutionTasks(executionId);
      
      const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
      const failedTasks = tasks.filter(t => t.status === TaskStatus.FAILED).length;
      const pendingTasks = tasks.filter(t => 
        t.status === TaskStatus.PENDING || 
        t.status === TaskStatus.ASSIGNED ||
        t.status === TaskStatus.EXECUTING
      ).length;

      return {
        execution,
        tasks,
        progress: tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0,
        stats: {
          total: tasks.length,
          completed: completedTasks,
          failed: failedTasks,
          pending: pendingTasks
        }
      };
    },

    /**
     * Review execution results
     */
    async review(executionId) {
      const execution = await agentService.getExecution(executionId);
      
      if (!execution) {
        throw new Error('Execution not found');
      }

      const tasks = await agentService.getExecutionTasks(executionId);
      
      // Analyze results
      const successfulTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);
      const failedTasks = tasks.filter(t => t.status === TaskStatus.FAILED);
      
      const review = {
        execution,
        summary: {
          total: tasks.length,
          successful: successfulTasks.length,
          failed: failedTasks.length,
          successRate: tasks.length > 0 ? (successfulTasks.length / tasks.length) * 100 : 0
        },
        successfulTasks: successfulTasks.map(t => ({
          id: t.id,
          title: t.title,
          result: t.result
        })),
        failedTasks: failedTasks.map(t => ({
          id: t.id,
          title: t.title,
          error: t.error
        })),
        recommendations: []
      };

      // Generate recommendations
      if (failedTasks.length > 0) {
        review.recommendations.push('Consider retrying failed tasks or replanning');
      }

      if (review.summary.successRate < 50) {
        review.recommendations.push('Success rate is low - review agent configuration and worker assignments');
      }

      return review;
    },

    /**
     * Retry failed execution
     */
    async retry(executionId) {
      const execution = await agentService.getExecution(executionId);
      
      if (!execution) {
        throw new Error('Execution not found');
      }

      if (execution.status !== ExecutionStatus.FAILED) {
        throw new Error('Only failed executions can be retried');
      }

      // Get failed tasks
      const tasks = await agentService.getExecutionTasks(executionId);
      const failedTasks = tasks.filter(t => t.status === TaskStatus.FAILED);

      if (failedTasks.length === 0) {
        throw new Error('No failed tasks to retry');
      }

      // Reset failed tasks
      for (const task of failedTasks) {
        await agentService.retryTask(task.id);
      }

      // Update execution status
      await agentService.updateExecution(executionId, {
        status: ExecutionStatus.EXECUTING
      });

      // Continue execution
      return this.executeTasks(execution.agent_id, executionId, null, tasks);
    },

    /**
     * Complete agent execution
     */
    async complete(executionId) {
      const execution = await agentService.getExecution(executionId);
      
      if (!execution) {
        throw new Error('Execution not found');
      }

      // Mark all pending tasks as cancelled
      const tasks = await agentService.getExecutionTasks(executionId);
      const pendingTasks = tasks.filter(t => 
        t.status === TaskStatus.PENDING || 
        t.status === TaskStatus.ASSIGNED
      );

      for (const task of pendingTasks) {
        await agentService.cancelTask(task.id);
      }

      return {
        execution,
        cancelledTasks: pendingTasks.length
      };
    },

    /**
     * Shutdown agent execution
     */
    async shutdown(executionId) {
      const execution = await agentService.getExecution(executionId);
      
      if (!execution) {
        throw new Error('Execution not found');
      }

      // Cancel execution
      await agentService.cancelExecution(executionId);

      // Mark all pending tasks as cancelled
      const tasks = await agentService.getExecutionTasks(executionId);
      const pendingTasks = tasks.filter(t => 
        t.status === TaskStatus.PENDING || 
        t.status === TaskStatus.ASSIGNED ||
        t.status === TaskStatus.EXECUTING
      );

      for (const task of pendingTasks) {
        await agentService.cancelTask(task.id);
      }

      return {
        execution,
        cancelledTasks: pendingTasks.length
      };
    }
  };
}