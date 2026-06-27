export function createContextBuilderService(
  memoryRepo,
  knowledgeSourceRepo,
  chunkRepo,
  conversationRepo,
  contextRepo,
  configService
) {
  const build = async (organizationId, options = {}) => {
    const {
      conversationId,
      userId,
      contextType = 'request',
      query,
      contextWindowBudget = 4096,
      includeMemory = true,
      includeKnowledge = true,
      includeConversation = true,
      includeUserMemory = true,
      includeOrgMemory = true,
      maxMemoryItems = 10,
      maxKnowledgeItems = 5,
      maxConversationTurns = 5
    } = options;

    const contextData = {
      query,
      timestamp: new Date().toISOString(),
      sources: [],
      totalTokens: 0
    };

    const sources = [];
    let usedTokens = 0;

    if (includeConversation && conversationId) {
      const recentMessages = await conversationRepo.listMessages(conversationId, {
        limit: maxConversationTurns * 2
      });

      const conversationContext = {
        type: 'conversation',
        data: recentMessages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.created_at
        })),
        tokenEstimate: recentMessages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0)
      };

      sources.push(conversationContext);
      contextData.conversation = conversationContext.data;
      usedTokens += conversationContext.tokenEstimate;
    }

    if (includeMemory && userId) {
      const memories = await memoryRepo.list({
        organizationId,
        ownerType: 'user',
        ownerId: userId,
        limit: maxMemoryItems
      });

      const memoryContext = {
        type: 'user_memory',
        data: memories.map(m => ({
          title: m.title,
          content: m.content,
          importance: m.importance,
          memoryType: m.memory_type
        })),
        tokenEstimate: memories.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0)
      };

      sources.push(memoryContext);
      contextData.userMemory = memoryContext.data;
      usedTokens += memoryContext.tokenEstimate;
    }

    if (includeOrgMemory) {
      const orgMemories = await memoryRepo.list({
        organizationId,
        ownerType: 'organization',
        limit: maxMemoryItems
      });

      const orgMemoryContext = {
        type: 'organization_memory',
        data: orgMemories.map(m => ({
          title: m.title,
          content: m.content,
          importance: m.importance
        })),
        tokenEstimate: orgMemories.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0)
      };

      sources.push(orgMemoryContext);
      contextData.organizationMemory = orgMemoryContext.data;
      usedTokens += orgMemoryContext.tokenEstimate;
    }

    if (includeKnowledge && query) {
      const knowledgeSources = await knowledgeSourceRepo.list({
        organizationId,
        status: 'indexed',
        limit: maxKnowledgeItems
      });

      const knowledgeContext = {
        type: 'knowledge',
        data: knowledgeSources.map(s => ({
          name: s.name,
          description: s.description,
          sourceType: s.source_type
        })),
        tokenEstimate: knowledgeSources.reduce((sum, s) => sum + Math.ceil(s.description.length / 4), 0)
      };

      sources.push(knowledgeContext);
      contextData.knowledge = knowledgeContext.data;
      usedTokens += knowledgeContext.tokenEstimate;
    }

    const remainingBudget = contextWindowBudget - usedTokens;
    const rankingMetadata = {
      totalSources: sources.length,
      usedTokens,
      remainingBudget,
      budgetUtilization: (usedTokens / contextWindowBudget) * 100
    };

    const context = await contextRepo.create(organizationId, {
      conversationId,
      userId,
      contextType,
      contextData,
      contextSizeTokens: usedTokens,
      contextWindowBudget,
      usedTokens,
      sources: sources.map(s => ({ type: s.type, tokenEstimate: s.tokenEstimate })),
      rankingMetadata
    });

    return {
      context,
      assembledContext: contextData,
      sources,
      rankingMetadata
    };
  };

  const rank = async (organizationId, contextId) => {
    const context = await contextRepo.get(organizationId, contextId);
    if (!context) {
      throw new Error('Context not found');
    }

    const rankedSources = context.sources.map((source, index) => ({
      ...source,
      rank: index + 1,
      relevanceScore: 1 - (index / context.sources.length)
    }));

    return {
      contextId,
      rankedSources,
      rankingStrategy: 'default',
      rankedAt: new Date().toISOString()
    };
  };

  const estimateTokens = (text) => {
    return Math.ceil(text.length / 4);
  };

  const prune = async (organizationId, contextId, targetTokens) => {
    const context = await contextRepo.get(organizationId, contextId);
    if (!context) {
      throw new Error('Context not found');
    }

    const prunedSources = [];
    let currentTokens = 0;

    for (const source of context.sources) {
      if (currentTokens + source.tokenEstimate <= targetTokens) {
        prunedSources.push(source);
        currentTokens += source.tokenEstimate;
      } else {
        break;
      }
    }

    await contextRepo.update(organizationId, contextId, {
      usedTokens: currentTokens,
      sources: prunedSources
    });

    return {
      contextId,
      prunedSources,
      usedTokens: currentTokens,
      originalTokens: context.used_tokens,
      tokensSaved: context.used_tokens - currentTokens
    };
  };

  const getStats = async (organizationId) => {
    return contextRepo.getStats(organizationId);
  };

  return {
    build, rank, estimateTokens, prune, getStats
  };
}