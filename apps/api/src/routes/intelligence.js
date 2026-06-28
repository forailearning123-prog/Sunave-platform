import { Router } from 'express';
import { fail } from '@sunave/core';

export function buildIntelligenceRouter(
  memoryService,
  knowledgeService,
  embeddingService,
  contextBuilderService,
  memoryRepo,
  knowledgeSourceRepo,
  chunkRepo,
  embeddingProviderRepo,
  embeddingRepo,
  vectorIndexRepo,
  contextRepo,
  orgRepo,
  permService
) {
  const router = Router();

  const requireOrg = (req, res, next) => {
    if (!req.org) {
      return res.status(403).json(fail('ORG_REQUIRED', 'Organization context required.'));
    }
    next();
  };

  router.memory = async (req, res) => {
    try {
      const org = req.org;
      const { ownerType, ownerId, memoryType, importance, limit = 50, offset = 0 } = req.query;

      const memories = await memoryService.recall(org.id, {
        ownerType, ownerId, memoryType, importance,
        limit: parseInt(limit), offset: parseInt(offset)
      });

      res.json({ success: true, data: memories });
    } catch (err) {
      res.status(500).json(fail('INTERNAL_ERROR', err.message));
    }
  };

  router.createMemory = async (req, res) => {
    try {
      const org = req.org;
      const userId = req.auth?.userId;
      const data = req.body;

      const memory = await memoryService.store(org.id, {
        ...data,
        createdBy: userId
      });

      res.status(201).json({ success: true, data: memory });
    } catch (err) {
      res.status(500).json(fail('INTERNAL_ERROR', err.message));
    }
  };

  router.getMemory = async (req, res) => {
    try {
      const org = req.org;
      const { id } = req.params;

      const memory = await memoryService.retrieve(org.id, id);
      if (!memory) {
        return res.status(404).json(fail('NOT_FOUND', 'Memory not found.'));
      }

      res.json({ success: true, data: memory });
    } catch (err) {
      res.status(500).json(fail('INTERNAL_ERROR', err.message));
    }
  };

  router.updateMemory = async (req, res) => {
    try {
      const org = req.org;
      const { id } = req.params;
      const data = req.body;

      const memory = await memoryService.recall(org.id, {});
      const updated = memory.find(m => m.id === id);
      
      if (!updated) {
        return res.status(404).json(fail('NOT_FOUND', 'Memory not found.'));
      }

      const result = await memoryRepo.update(org.id, id, data);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json(fail('INTERNAL_ERROR', err.message));
    }
  };

  router.deleteMemory = async (req, res) => {
    try {
      const org = req.org;
      const { id } = req.params;

      const deleted = await memoryService.forget(org.id, id);
      if (!deleted) {
        return res.status(404).json(fail('NOT_FOUND', 'Memory not found.'));
      }

      res.json({ success: true, data: { deleted: true } });
    } catch (err) {
      res.status(500).json(fail('INTERNAL_ERROR', err.message));
    }
  };

  router.searchKnowledge = async (req, res) => {
    try {
      const org = req.org;
      const { q, sourceType, categoryId, limit = 20, threshold = 0.7 } = req.query;

      const results = await knowledgeService.search(org.id, {
        query: q,
        sourceType,
        categoryId,
        limit: parseInt(limit),
        threshold: parseFloat(threshold)
      });

      res.json({ success: true, data: results });
    } catch (err) {
      res.status(500).json(fail('INTERNAL_ERROR', err.message));
    }
  };

  router.indexKnowledge = async (req, res) => {
    try {
      const org = req.org;
      const { sourceId } = req.body;

      const result = await knowledgeService.index(org.id, sourceId);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json(fail('INTERNAL_ERROR', err.message));
    }
  };

  router.retrieveKnowledge = async (req, res) => {
    try {
      const org = req.org;
      const { sourceId } = req.params;

      const result = await knowledgeService.retrieve(org.id, sourceId);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json(fail('INTERNAL_ERROR', err.message));
    }
  };

  router.generateEmbedding = async (req, res) => {
    try {
      const org = req.org;
      const userId = req.auth?.userId;
      const { chunkId, text } = req.body;

      const embedding = await embeddingService.generate(org.id, chunkId, text);
      res.status(201).json({ success: true, data: embedding });
    } catch (err) {
      res.status(500).json(fail('INTERNAL_ERROR', err.message));
    }
  };

  router.vectorHealth = async (req, res) => {
    try {
      const org = req.org;
      const health = await knowledgeService.health(org.id);
      res.json({ success: true, data: health });
    } catch (err) {
      res.status(500).json(fail('INTERNAL_ERROR', err.message));
    }
  };

  router.buildContext = async (req, res) => {
    try {
      const org = req.org;
      const userId = req.auth?.userId;
      const options = req.body;

      const result = await contextBuilderService.build(org.id, {
        ...options,
        userId
      });

      res.status(201).json({ success: true, data: result });
    } catch (err) {
      res.status(500).json(fail('INTERNAL_ERROR', err.message));
    }
  };

  router.search = async (req, res) => {
    try {
      const org = req.org;
      const { q, type = 'semantic', limit = 20, filters = {} } = req.body;

      let results;
      if (type === 'semantic') {
        results = await knowledgeService.search(org.id, {
          query: q,
          limit: parseInt(limit),
          ...filters
        });
      } else {
        results = await memoryService.recall(org.id, {
          query: q,
          limit: parseInt(limit)
        });
      }

      res.json({ success: true, data: results });
    } catch (err) {
      res.status(500).json(fail('INTERNAL_ERROR', err.message));
    }
  };

  router.memoryStats = async (req, res) => {
    try {
      const org = req.org;
      const stats = await memoryService.getStats(org.id);
      res.json({ success: true, data: stats });
    } catch (err) {
      res.status(500).json(fail('INTERNAL_ERROR', err.message));
    }
  };

  router.knowledgeStats = async (req, res) => {
    try {
      const org = req.org;
      const stats = await knowledgeService.getStats(org.id);
      res.json({ success: true, data: stats });
    } catch (err) {
      res.status(500).json(fail('INTERNAL_ERROR', err.message));
    }
  };

  router.embeddingStats = async (req, res) => {
    try {
      const org = req.org;
      const stats = await embeddingService.getStats(org.id);
      res.json({ success: true, data: stats });
    } catch (err) {
      res.status(500).json(fail('INTERNAL_ERROR', err.message));
    }
  };

  router.contextStats = async (req, res) => {
    try {
      const org = req.org;
      const stats = await contextBuilderService.getStats(org.id);
      res.json({ success: true, data: stats });
    } catch (err) {
      res.status(500).json(fail('INTERNAL_ERROR', err.message));
    }
  };

  return router;
}