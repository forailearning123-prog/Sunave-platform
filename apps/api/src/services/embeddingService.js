export function createEmbeddingService(
  embeddingRepo,
  embeddingProviderRepo,
  chunkRepo
) {
  const generate = async (organizationId, chunkId, text, options = {}) => {
    const provider = await embeddingProviderRepo.getDefault(organizationId);
    if (!provider) {
      throw new Error('No embedding provider configured');
    }

    const stubVector = Array.from({ length: provider.dimensions }, () =>
      Math.random() * 2 - 1
    );

    const normalizedVector = stubVector.map(v => v / Math.sqrt(stubVector.reduce((a, b) => a + b * b, 0)));

    const embedding = await embeddingRepo.create(organizationId, {
      chunkId,
      providerId: provider.id,
      vector: normalizedVector,
      model: provider.name,
      dimensions: provider.dimensions,
      tokenCount: Math.ceil(text.length / 4),
      costUsd: (Math.ceil(text.length / 4) / 1000) * provider.cost_per_1k_tokens,
      metadata: {
        provider: provider.provider_type,
        generated_at: new Date().toISOString()
      }
    });

    return embedding;
  };

  const batchGenerate = async (organizationId, chunks) => {
    const provider = await embeddingProviderRepo.getDefault(organizationId);
    if (!provider) {
      throw new Error('No embedding provider configured');
    }

    const embeddings = [];
    for (const chunk of chunks) {
      const stubVector = Array.from({ length: provider.dimensions }, () =>
        Math.random() * 2 - 1
      );
      const normalizedVector = stubVector.map(v => v / Math.sqrt(stubVector.reduce((a, b) => a + b * b, 0)));

      embeddings.push({
        chunkId: chunk.id,
        providerId: provider.id,
        vector: normalizedVector,
        model: provider.name,
        dimensions: provider.dimensions,
        tokenCount: Math.ceil(chunk.content.length / 4),
        costUsd: (Math.ceil(chunk.content.length / 4) / 1000) * provider.cost_per_1k_tokens,
        metadata: {
          provider: provider.provider_type,
          generated_at: new Date().toISOString()
        }
      });
    }

    return embeddingRepo.batchCreate(organizationId, embeddings);
  };

  const getByChunk = async (organizationId, chunkId) => {
    return embeddingRepo.getByChunk(organizationId, chunkId);
  };

  const searchSimilar = async (organizationId, vector, limit = 10, threshold = 0.7) => {
    return embeddingRepo.searchSimilar(organizationId, vector, limit, threshold);
  };

  const deleteByChunk = async (organizationId, chunkId) => {
    return embeddingRepo.removeByChunk(organizationId, chunkId);
  };

  const deleteBySource = async (organizationId, sourceId) => {
    return embeddingRepo.removeBySource(organizationId, sourceId);
  };

  const getStats = async (organizationId) => {
    return embeddingRepo.getStats(organizationId);
  };

  const getProviderStats = async (organizationId) => {
    return embeddingProviderRepo.getStats(organizationId);
  };

  return {
    generate, batchGenerate, getByChunk, searchSimilar,
    deleteByChunk, deleteBySource, getStats, getProviderStats
  };
}