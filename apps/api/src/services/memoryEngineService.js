export function createMemoryEngineService(memoryRepo, policyRepo) {
  const store = async (organizationId, data) => {
    const {
      ownerType, ownerId, memoryType, title, summary, content,
      embeddingReference, tags, importance, confidence, expiresAt, createdBy, metadata
    } = data;

    const policy = await policyRepo.list({ organizationId, memoryType });
    const systemPolicy = policy.find(p => p.isSystem) || policy[0];

    let resolvedImportance = importance || 'medium';
    let resolvedExpiresAt = expiresAt;

    if (systemPolicy && !importance) {
      resolvedImportance = systemPolicy.importance_filter[0] || 'medium';
    }

    if (systemPolicy && !expiresAt && systemPolicy.retention_period !== 'never_expire') {
      if (systemPolicy.retention_period === 'session') {
        resolvedExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      } else if (systemPolicy.retention_period === 'temporary') {
        resolvedExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (systemPolicy.archive_after_days) {
        resolvedExpiresAt = new Date(Date.now() + systemPolicy.archive_after_days * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    return memoryRepo.create(organizationId, {
      ownerType, ownerId, memoryType, title, summary, content,
      embeddingReference, tags, importance: resolvedImportance,
      confidence, expiresAt: resolvedExpiresAt, createdBy, metadata
    });
  };

  const retrieve = async (organizationId, id) => {
    const memory = await memoryRepo.get(organizationId, id);
    if (memory) {
      await memoryRepo.incrementAccess(organizationId, id);
    }
    return memory;
  };

  const recall = async (organizationId, options = {}) => {
    const {
      ownerType, ownerId, memoryType, query, limit = 20,
      minImportance, excludeArchived = true
    } = options;

    if (query) {
      return memoryRepo.search(organizationId, query, {
        limit, memoryType, minImportance
      });
    }

    return memoryRepo.list({
      organizationId, ownerType, ownerId, memoryType,
      importance: minImportance, limit, offset: 0
    });
  };

  const forget = async (organizationId, id) => {
    return memoryRepo.remove(organizationId, id);
  };

  const consolidate = async (organizationId, ownerType, ownerId) => {
    const memories = await memoryRepo.getByOwner(organizationId, ownerType, ownerId);
    
    const grouped = {};
    for (const mem of memories) {
      const key = mem.memory_type;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(mem);
    }

    const consolidated = [];
    for (const [type, mems] of Object.entries(grouped)) {
      const sorted = mems.sort((a, b) => {
        const importanceOrder = ['pinned', 'critical', 'high', 'medium', 'low', 'archived'];
        const aImp = importanceOrder.indexOf(a.importance);
        const bImp = importanceOrder.indexOf(b.importance);
        if (aImp !== bImp) return aImp - bImp;
        return new Date(b.accessed_at || b.created_at) - new Date(a.accessed_at || a.created_at);
      });

      const topMemories = sorted.slice(0, 10);
      consolidated.push(...topMemories);
    }

    return consolidated;
  };

  const archiveExpired = async (organizationId) => {
    return memoryRepo.archiveExpired(organizationId);
  };

  const getStats = async (organizationId) => {
    return memoryRepo.getStats(organizationId);
  };

  return {
    store, retrieve, recall, forget, consolidate, archiveExpired, getStats
  };
}