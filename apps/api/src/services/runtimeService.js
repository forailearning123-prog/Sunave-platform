/**
 * AI Runtime Service
 * ==================
 * The central execution engine for all AI requests across the platform.
 * Every module (Chat, Workers, Agents, CRM, etc.) goes through this service.
 *
 * Flow:
 *   Application → Capability Request → RuntimeService → PromptEngine → AIGateway → Provider → Response
 */

export function createRuntimeService(aiGatewayService, conversationRepo, promptRepo, runtimeRepo, aiUsageRepo) {

  /**
   * Resolve runtime context for a request.
   */
  function buildRuntimeContext(req) {
    return {
      organizationId: req.org?.id,
      organizationName: req.org?.name || '',
      userId: req.auth?.sub,
      userName: req.auth?.name || req.auth?.email || '',
      projectId: req.project?.id,
      goalId: req.goal?.id,
      taskId: req.task?.id,
      locale: req.headers?.['accept-language']?.split(',')[0] || 'en-US',
      timezone: req.headers?.['x-timezone'] || 'UTC',
      featureFlags: req.featureFlags || {}
    };
  }

  /**
   * Execute a capability request through the AI Runtime.
   * This is the main entry point for all AI operations.
   */
  async function execute(capability, params, context = {}) {
    const { organizationId, userId, conversationId, promptId, messages, variables } = params;
    const { runtimePolicies = {} } = context;

    // 1. Create execution record
    const execution = await runtimeRepo.createExecution({
      organizationId, userId, conversationId, promptId,
      capability: capability || 'chat',
      status: 'running',
      requestBody: params,
      retryCount: runtimePolicies.retryCount || 0
    });

    const startTime = Date.now();

    try {
      // 2. Resolve prompt if promptId is provided
      let resolvedPrompt = params.prompt || '';
      let resolvedSystemPrompt = params.systemPrompt || '';
      let resolvedVariables = variables || {};

      if (promptId) {
        const prompt = await promptRepo.findTemplate(promptId);
        if (prompt) {
          resolvedSystemPrompt = prompt.systemPrompt || resolvedSystemPrompt;
          resolvedPrompt = promptRepo.resolveVariables(
            prompt.template,
            { ...resolvedVariables, ...context.additionalVariables },
            context
          );
          runtimePolicies.promptTemplate = prompt.name;
          // Merge runtime policies from prompt
          if (prompt.runtimePolicies) {
            Object.assign(runtimePolicies, prompt.runtimePolicies);
          }
        }
      }

      // 3. Build messages array
      const execMessages = messages || [
        ...(resolvedSystemPrompt ? [{ role: 'system', content: resolvedSystemPrompt }] : []),
        ...(resolvedPrompt ? [{ role: 'user', content: resolvedPrompt }] : []),
        ...(context.conversationHistory || [])
      ];

      // 4. Apply runtime policies
      const gatewayOptions = {
        routingPolicy: runtimePolicies.routingPolicy || 'local_first',
        temperature: runtimePolicies.temperature,
        topP: runtimePolicies.topP,
        frequencyPenalty: runtimePolicies.frequencyPenalty,
        presencePenalty: runtimePolicies.presencePenalty,
        maxTokens: runtimePolicies.maxTokens || 2048,
        stream: runtimePolicies.streaming ?? false,
        jsonMode: runtimePolicies.jsonMode || false
      };

      // Update execution with resolved prompt
      await runtimeRepo.updateExecution(execution.id, {
        resolvedPrompt,
        resolvedSystemPrompt
      });

      // 5. Execute via AI Gateway
      const result = await aiGatewayService.chat(capability, execMessages, gatewayOptions);

      const executionTime = Date.now() - startTime;
      const tokens = result.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

      // 6. Update execution with results
      await runtimeRepo.updateExecution(execution.id, {
        status: 'completed',
        responseBody: typeof result === 'string' ? result : JSON.stringify(result.message || result),
        responseStatus: 200,
        executionTimeMs: executionTime,
        latencyMs: result.latencyMs || executionTime,
        provider: result.provider || result.selectedProvider,
        model: result.model,
        promptTokens: tokens.promptTokens || 0,
        completionTokens: tokens.completionTokens || 0,
        totalTokens: tokens.totalTokens || 0,
        estimatedCostUsd: (tokens.totalTokens || 0) * 0.000002,
        actualCostUsd: null,
        completedAt: new Date().toISOString()
      });

      // 7. Save message to conversation if conversationId is provided
      if (conversationId) {
        // Save user message
        if (resolvedPrompt) {
          await conversationRepo.createMessage(conversationId, {
            role: 'user',
            content: resolvedPrompt,
            metadata: { capability, promptId }
          });
        }
        // Save assistant response
        await conversationRepo.createMessage(conversationId, {
          role: 'assistant',
          content: result.message?.content ||
                   (typeof result === 'object' ? JSON.stringify(result) : String(result)),
          executionTimeMs: executionTime,
          tokenUsage: tokens,
          provider: result.provider || result.selectedProvider,
          model: result.model,
          totalCostUsd: (tokens.totalTokens || 0) * 0.000002
        });
      }

      // 8. Track usage
      await runtimeRepo.createLog({
        executionId: execution.id,
        organizationId,
        level: 'info',
        message: `Runtime execution completed: ${capability}`,
        metadata: { executionTime, tokens, provider: result.provider }
      });

      return {
        executionId: execution.id,
        provider: result.provider || result.selectedProvider,
        model: result.model,
        response: result.message || result,
        usage: tokens,
        executionTimeMs: executionTime,
        mock: result.mock
      };

    } catch (err) {
      const executionTime = Date.now() - startTime;

      await runtimeRepo.updateExecution(execution.id, {
        status: 'failed',
        executionTimeMs: executionTime,
        errorMessage: err.message,
        errorCode: err.code || 'EXECUTION_ERROR'
      });

      await runtimeRepo.createLog({
        executionId: execution.id,
        organizationId,
        level: 'error',
        message: `Runtime execution failed: ${err.message}`,
        metadata: { error: err.stack, capability }
      });

      throw err;
    }
  }

  /**
   * Stream a capability request (placeholder for SSE streaming).
   */
  async function* stream(capability, params, context = {}) {
    const { organizationId, userId, conversationId, promptId, messages } = params;
    const { runtimePolicies = {} } = context;

    const execution = await runtimeRepo.createExecution({
      organizationId, userId, conversationId, promptId,
      capability: capability || 'chat',
      status: 'streaming',
      requestBody: params
    });

    const startTime = Date.now();

    try {
      const execMessages = messages || [{ role: 'user', content: params.prompt || '' }];
      const result = await aiGatewayService.stream(capability, execMessages, {
        routingPolicy: runtimePolicies.routingPolicy || 'local_first',
        maxTokens: runtimePolicies.maxTokens || 2048
      });

      const executionTime = Date.now() - startTime;

      await runtimeRepo.updateExecution(execution.id, {
        status: 'completed',
        responseBody: JSON.stringify(result),
        executionTimeMs: executionTime,
        provider: result.provider,
        model: result.model
      });

      yield result;
    } catch (err) {
      await runtimeRepo.updateExecution(execution.id, {
        status: 'failed',
        errorMessage: err.message
      });
      throw err;
    }
  }

  /**
   * Get runtime statistics for an organization.
   */
  async function getStats(organizationId) {
    const stats = await runtimeRepo.getRuntimeStats(organizationId);
    const mostUsed = await runtimeRepo.getMostUsedPrompts(organizationId);
    const recent = await runtimeRepo.getRecentExecutions(organizationId);
    return { stats, mostUsedPrompts: mostUsed, recentExecutions: recent };
  }

  return { execute, stream, getStats, buildRuntimeContext };
}