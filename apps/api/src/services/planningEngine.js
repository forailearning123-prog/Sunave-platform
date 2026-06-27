// Planning Engine Service
// Prompts 20-24: Complete Agent Operating System

import { ReasoningMode, GoalType } from '@sunave/types/agents';

export function createPlanningEngine(
  agentRepo,
  workerRepo,
  aiGatewayService,
  memoryService,
  configService
) {
  return {
    /**
     * Analyze a goal and determine its type, complexity, and requirements
     */
    async analyzeGoal(agentId, goal) {
      const agent = await agentRepo.findByIdWithDetails(agentId);
      
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Use AI to analyze the goal
      const analysisPrompt = `Analyze this goal for an AI agent:
      
Goal: ${goal.title}
Description: ${goal.description}
Context: ${JSON.stringify(goal.context || {})}

Determine:
1. Goal type (outcome, output, initiative)
2. Complexity level (1-10)
3. Required capabilities
4. Estimated tasks needed
5. Recommended reasoning mode
6. Estimated time in minutes
7. Estimated cost range

Respond in JSON format.`;

      try {
        const analysis = await aiGatewayService.requestCapability('reasoning', {
          messages: [
            { role: 'system', content: 'You are a goal analysis expert. Respond only with valid JSON.' },
            { role: 'user', content: analysisPrompt }
          ],
          temperature: 0.3,
          max_tokens: 500
        });

        const parsed = JSON.parse(analysis.content);
        
        return {
          type: parsed.type || GoalType.OUTPUT,
          complexity: parsed.complexity || 5,
          requiredCapabilities: parsed.requiredCapabilities || [],
          estimatedTasks: parsed.estimatedTasks || 3,
          recommendedReasoningMode: parsed.recommendedReasoningMode || ReasoningMode.BALANCED,
          estimatedTimeMinutes: parsed.estimatedTimeMinutes || 30,
          estimatedCostRange: parsed.estimatedCostRange || { min: 0.01, max: 0.10 }
        };
      } catch (error) {
        // Fallback to basic analysis
        return {
          type: GoalType.OUTPUT,
          complexity: 5,
          requiredCapabilities: agent.capabilities || [],
          estimatedTasks: 3,
          recommendedReasoningMode: ReasoningMode.BALANCED,
          estimatedTimeMinutes: 30,
          estimatedCostRange: { min: 0.01, max: 0.10 }
        };
      }
    },

    /**
     * Break down a goal into executable tasks
     */
    async breakGoal(agentId, goal, analysis) {
      const agent = await agentRepo.findByIdWithDetails(agentId);
      
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Get available workers for this agent
      const agentWorkers = await agentRepo.getWorkers(agentId);
      
      const breakdownPrompt = `Break down this goal into specific, executable tasks:

Goal: ${goal.title}
Description: ${goal.description}
Type: ${analysis.type}
Complexity: ${analysis.complexity}/10
Required Capabilities: ${analysis.requiredCapabilities.join(', ')}

Available Workers:
${agentWorkers.map(w => `- ${w.name} (${w.type}): ${w.description}`).join('\n')}

Create 3-7 tasks that:
1. Are specific and actionable
2. Can be assigned to available workers
3. Have clear inputs and outputs
4. Include dependencies between tasks
5. Have estimated execution times

Respond in JSON format with a tasks array.`;

      try {
        const breakdown = await aiGatewayService.requestCapability('reasoning', {
          messages: [
            { role: 'system', content: 'You are a task breakdown expert. Respond only with valid JSON.' },
            { role: 'user', content: breakdownPrompt }
          ],
          temperature: 0.4,
          max_tokens: 1000
        });

        const parsed = JSON.parse(breakdown.content);
        
        return parsed.tasks.map((task, index) => ({
          title: task.title,
          description: task.description,
          type: task.type || 'general',
          priority: 10 - index, // Higher priority for earlier tasks
          workerType: task.workerType,
          input: task.input || {},
          dependencies: task.dependencies || [],
          estimatedTimeMs: (task.estimatedTimeMinutes || 5) * 60 * 1000,
          costEstimate: task.costEstimate || 0.01
        }));
      } catch (error) {
        // Fallback to basic task creation
        return [
          {
            title: `Execute: ${goal.title}`,
            description: goal.description,
            type: 'general',
            priority: 10,
            workerType: agentWorkers[0]?.type || 'general',
            input: goal.context || {},
            dependencies: [],
            estimatedTimeMs: 5 * 60 * 1000,
            costEstimate: 0.01
          }
        ];
      }
    },

    /**
     * Create a complete execution plan from a goal
     */
    async createPlan(agentId, organizationId, userId, goalData) {
      const goal = goalData;
      
      // Step 1: Analyze the goal
      const analysis = await this.analyzeGoal(agentId, goal);
      
      // Step 2: Break down into tasks
      const tasks = await this.breakGoal(agentId, goal, analysis);
      
      // Step 3: Select workers for each task
      const workerAssignments = await this.selectWorkers(agentId, tasks);
      
      // Step 4: Estimate total cost and time
      const totalCost = tasks.reduce((sum, task) => sum + (task.costEstimate || 0), 0);
      const totalTime = tasks.reduce((sum, task) => sum + (task.estimatedTimeMs || 0), 0);
      
      return {
        analysis,
        tasks,
        workerAssignments,
        totalCost,
        totalTimeMs: totalTime,
        estimatedCompletionTime: new Date(Date.now() + totalTime).toISOString()
      };
    },

    /**
     * Select appropriate workers for tasks
     */
    async selectWorkers(agentId, tasks) {
      const agentWorkers = await agentRepo.getWorkers(agentId);
      
      if (agentWorkers.length === 0) {
        return tasks.map(task => ({ workerId: null, workerType: task.workerType }));
      }

      const assignments = tasks.map(task => {
        // Find best matching worker based on task type
        const matchingWorker = agentWorkers.find(w => 
          w.type === task.workerType || 
          w.category === task.type ||
          !task.workerType
        );

        return {
          workerId: matchingWorker?.worker_id || agentWorkers[0]?.worker_id,
          workerType: matchingWorker?.type || task.workerType || 'general',
          priority: matchingWorker?.priority || 5
        };
      });

      return assignments;
    },

    /**
     * Validate a plan for feasibility
     */
    async validatePlan(agentId, plan) {
      const issues = [];
      
      // Check if workers are available
      for (const task of plan.tasks) {
        const assignment = plan.workerAssignments.find(a => a.taskId === task.id);
        if (!assignment?.workerId) {
          issues.push(`No worker available for task: ${task.title}`);
        }
      }

      // Check for circular dependencies
      const dependencyMap = new Map();
      plan.tasks.forEach(task => {
        dependencyMap.set(task.id, task.dependencies || []);
      });

      const visited = new Set();
      const recursionStack = new Set();

      const hasCycle = (taskId) => {
        visited.add(taskId);
        recursionStack.add(taskId);

        const dependencies = dependencyMap.get(taskId) || [];
        for (const depId of dependencies) {
          if (!visited.has(depId)) {
            if (hasCycle(depId)) return true;
          } else if (recursionStack.has(depId)) {
            return true;
          }
        }

        recursionStack.delete(taskId);
        return false;
      };

      for (const task of plan.tasks) {
        if (!visited.has(task.id)) {
          if (hasCycle(task.id)) {
            issues.push('Circular dependency detected in tasks');
            break;
          }
        }
      }

      // Check cost limits
      const agent = await agentRepo.findById(agentId);
      if (agent?.cost_policy?.maxCost && plan.totalCost > agent.cost_policy.maxCost) {
        issues.push(`Plan exceeds cost limit: ${plan.totalCost} > ${agent.cost_policy.maxCost}`);
      }

      return {
        isValid: issues.length === 0,
        issues
      };
    },

    /**
     * Prioritize tasks based on dependencies and priority
     */
    prioritize(tasks) {
      const taskMap = new Map(tasks.map(t => [t.id, { ...t, remainingDependencies: t.dependencies?.length || 0 }]));
      const sorted = [];
      const queue = tasks.filter(t => (t.dependencies?.length || 0) === 0);

      while (queue.length > 0) {
        // Sort queue by priority (higher first)
        queue.sort((a, b) => b.priority - a.priority);
        
        const current = queue.shift();
        sorted.push(current);

        // Update dependent tasks
        tasks.forEach(task => {
          if (task.dependencies?.includes(current.id)) {
            const taskData = taskMap.get(task.id);
            taskData.remainingDependencies--;
            if (taskData.remainingDependencies === 0) {
              queue.push(task);
            }
          }
        });
      }

      return sorted;
    },

    /**
     * Replan based on execution results
     */
    async replan(agentId, executionId, failedTasks) {
      const execution = await agentExecutionRepo.findById(executionId);
      
      if (!execution) {
        throw new Error('Execution not found');
      }

      const plan = execution.plan;
      if (!plan) {
        throw new Error('No plan found for execution');
      }

      // Remove failed tasks and their dependents
      const failedTaskIds = new Set(failedTasks.map(t => t.id));
      const validTasks = plan.tasks.filter(task => {
        // Check if this task or any of its dependencies failed
        const hasFailedDependency = task.dependencies?.some(depId => failedTaskIds.has(depId));
        return !failedTaskIds.has(task.id) && !hasFailedDependency;
      });

      // Reassign workers if needed
      const workerAssignments = await this.selectWorkers(agentId, validTasks);

      // Recalculate totals
      const totalCost = validTasks.reduce((sum, task) => sum + (task.costEstimate || 0), 0);
      const totalTime = validTasks.reduce((sum, task) => sum + (task.estimatedTimeMs || 0), 0);

      return {
        ...plan,
        tasks: validTasks,
        workerAssignments,
        totalCost,
        totalTimeMs: totalTime,
        replannedAt: new Date().toISOString()
      };
    },

    /**
     * Estimate cost for a plan
     */
    async estimateCost(agentId, plan) {
      let totalCost = 0;
      const breakdown = [];

      for (const task of plan.tasks) {
        const taskCost = task.costEstimate || 0.01;
        totalCost += taskCost;
        breakdown.push({
          taskId: task.id,
          title: task.title,
          estimatedCost: taskCost
        });
      }

      return {
        totalCost,
        breakdown,
        currency: 'USD'
      };
    },

    /**
     * Estimate execution time for a plan
     */
    estimateTime(plan) {
      // Calculate critical path (longest path through dependencies)
      const taskMap = new Map(plan.tasks.map(t => [t.id, t]));
      const memo = new Map();

      const getLongestPath = (taskId) => {
        if (memo.has(taskId)) {
          return memo.get(taskId);
        }

        const task = taskMap.get(taskId);
        if (!task) return 0;

        const dependencies = task.dependencies || [];
        if (dependencies.length === 0) {
          memo.set(taskId, task.estimatedTimeMs || 0);
          return task.estimatedTimeMs || 0;
        }

        const maxDepTime = Math.max(...dependencies.map(depId => getLongestPath(depId)));
        const totalTime = maxDepTime + (task.estimatedTimeMs || 0);
        
        memo.set(taskId, totalTime);
        return totalTime;
      };

      const criticalPathTime = Math.max(...plan.tasks.map(t => getLongestPath(t.id)));
      
      return {
        totalTimeMs: criticalPathTime,
        criticalPath: this.findCriticalPath(plan.tasks)
      };
    },

    /**
     * Find the critical path through tasks
     */
    findCriticalPath(tasks) {
      const taskMap = new Map(tasks.map(t => [t.id, t]));
      const memo = new Map();
      const pathMemo = new Map();

      const getLongestPath = (taskId) => {
        if (memo.has(taskId)) {
          return memo.get(taskId);
        }

        const task = taskMap.get(taskId);
        if (!task) return 0;

        const dependencies = task.dependencies || [];
        if (dependencies.length === 0) {
          memo.set(taskId, task.estimatedTimeMs || 0);
          pathMemo.set(taskId, [taskId]);
          return task.estimatedTimeMs || 0;
        }

        let maxDepTime = 0;
        let maxDepPath = [];
        
        for (const depId of dependencies) {
          const depTime = getLongestPath(depId);
          if (depTime > maxDepTime) {
            maxDepTime = depTime;
            maxDepPath = pathMemo.get(depId) || [];
          }
        }

        const totalTime = maxDepTime + (task.estimatedTimeMs || 0);
        const path = [...maxDepPath, taskId];
        
        memo.set(taskId, totalTime);
        pathMemo.set(taskId, path);
        
        return totalTime;
      };

      // Find the task with the longest path
      let maxTime = 0;
      let criticalPath = [];
      
      for (const task of tasks) {
        const time = getLongestPath(task.id);
        if (time > maxTime) {
          maxTime = time;
          criticalPath = pathMemo.get(task.id) || [];
        }
      }

      return criticalPath;
    }
  };
}