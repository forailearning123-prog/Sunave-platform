export function createKnowledgeRetrievalService(
  knowledgeSourceRepo,
  chunkRepo,
  embeddingRepo,
  embeddingProviderRepo,
  vectorIndexRepo
) {
  const index = async (organizationId, sourceId) => {
    const source = await knowledgeSourceRepo.get(organizationId, sourceId);
    if (!source) {
      throw new Error('Knowledge source not found');
    }

    await knowledgeSourceRepo.update(organizationId, sourceId, {
      status: 'indexing',
      indexingProgress: 0
    });

    return {
      sourceId,
      status: 'indexing',
      message: 'Indexing started'
    };
  };

  const search = async (organizationId, options = {}) => {
    const {
      query,
      queryEmbedding,
      sourceType,
      categoryId,
      limit = 20,
      threshold = 0.7,
      filters = {}
    } = options;

    const sources = await knowledgeSourceRepo.list({
      organizationId,
      sourceType,
      status: 'indexed'
    });

    if (categoryId) {
      const filtered = sources.filter(s => s.category_id === categoryId);
      return filtered.slice(0, limit);
    }

    if (queryEmbedding) {
      const provider = await embeddingProviderRepo.getDefault(organizationId);
      if (!provider) {
        throw new Error('No embedding provider configured');
      }

      const similar = await embeddingRepo.searchSimilar(
        organizationId,
        queryEmbedding,
        limit,
        threshold
      );

      const chunkIds = similar.map(s => s.chunk_id);
      const chunks = await Promise.all(
        chunkIds.map(id => chunkRepo.get(organizationId, id))
      );

      const sourceIds = [...new Set(chunks.filter(Boolean).map(c => c.source_id))];
      const results = await Promise.all(
        sourceIds.map(id => knowledgeSourceRepo.get(organizationId, id))
      );

      return results.filter(Boolean).slice(0, limit);
    }

    if (query) {
      const chunks = await chunkRepo.list({
        organizationId,
        limit: 100
      });

      const matched = chunks.filter(c =>
        c.content.toLowerCase().includes(query.toLowerCase())
      );

      const sourceIds = [...new Set(matched.map(c => c.source_id))];
      const results = await Promise.all(
        sourceIds.map(id => knowledgeSourceRepo.get(organizationId, id))
      );

      return results.filter(Boolean).slice(0, limit);
    }

    return sources.slice(0, limit);
  };

  const retrieve = async (organizationId, sourceId) => {
    const source = await knowledgeSourceRepo.get(organizationId, sourceId);
    if (!source) {
      throw new Error('Knowledge source not found');
    }

    const chunks = await chunkRepo.getBySource(organizationId, sourceId);
    return {
      source,
      chunks
    };
  };

  const deleteSource = async (organizationId, sourceId) => {
    const source = await knowledgeSourceRepo.get(organizationId, sourceId);
    if (!source) {
      throw new Error('Knowledge source not found');
    }

    await embeddingRepo.removeBySource(organizationId, sourceId);
    await chunkRepo.removeBySource(organizationId, sourceId);
    await knowledgeSourceRepo.remove(organizationId, sourceId);

    return { success: true };
  };

  const refresh = async (organizationId, sourceId) => {
    const source = await knowledgeSourceRepo.get(organizationId, sourceId);
    if (!source) {
      throw new Error('Knowledge source not found');
    }

    await knowledgeSourceRepo.update(organizationId, sourceId, {
      status: 'pending',
      indexingProgress: 0,
      last_indexed_at: null
    });

    return {
      sourceId,
      status: 'pending',
      message: 'Refresh queued'
    };
  };

  const health = async (organizationId) => {
    const stats = await knowledgeSourceRepo.getStats(organizationId);
    const total = stats.reduce((sum, s) => sum + parseInt(s.count), 0);
    const indexed = stats
      .filter(s => s.status === 'indexed')
      .reduce((sum, s) => sum + parseInt(s.count), 0);
    const failed = stats
      .filter(s => s.status === 'failed')
      .reduce((sum, s) => sum + parseInt(s.count), 0);

    return {
      total,
      indexed,
      failed,
      health: failed > 0 ? 'degraded' : 'healthy',
      breakdown: stats
    };
  };

  const supports = async (organizationId, sourceType) => {
    const supportedTypes = [
      'knowledge_base', 'document', 'project', 'goal', 'task',
      'conversation', 'uploaded_file', 'crm', 'hr', 'finance', 'plugin'
    ];
    return supportedTypes.includes(sourceType);
  };

  const getStats = async (organizationId) => {
    return knowledgeSourceRepo.getStats(organizationId);
  };

  return {
    index, search, retrieve, deleteSource, refresh, health, supports, getStats
  };
}