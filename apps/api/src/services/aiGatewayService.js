/**
 * AI Gateway Service
 * ==================
 * The ONLY entry point for AI capability requests across the entire platform.
 * Business modules NEVER call AI providers directly.
 *
 * Architecture:
 *   Application → Capability Request → AIGateway → ProviderRouter → Provider → Response
 *
 * All providers implement the ProviderInterface:
 *   { initialize, chat, stream, health, models, supports, estimateCost, shutdown }
 *
 * No real AI API calls are made. All providers return stub responses.
 * Real provider integration is out of scope for this module.
 */

// ─── Provider Interface & stub Implementations ────────────────────────────────

/**
 * Base stub provider — all stubs extend this.
 * @param {object} config
 * @returns {object} Provider implementing the ProviderInterface
 */
function createstubProvider(config) {
  return {
    id: config.id,
    name: config.name,
    type: config.type,

    async initialize() {
      // No-op: real providers would authenticate and warm up here
      return { initialized: true };
    },

    async chat(messages, options = {}) {
      return {
        provider: config.type,
        model: options.model || config.defaultModel,
        stub: true,
        message: {
          role: 'assistant',
          content: `[stub response from ${config.name}] This is a simulated AI response. Provider integration initialized successfully.`
        },
        usage: { promptTokens: 25, completionTokens: 40, totalTokens: 65 },
        finishReason: 'stop'
      };
    },

    async stream(messages, options = {}) {
      return {
        provider: config.type,
        model: options.model || config.defaultModel,
        stub: true,
        streaming: true,
        note: 'Streaming stub — real SSE stream not yet implemented.',
        chunks: [
          { delta: '[stub stream from ', done: false },
          { delta: config.name, done: false },
          { delta: '] Simulated streaming response.', done: false },
          { delta: '', done: true }
        ]
      };
    },

    async health() {
      return {
        provider: config.type,
        available: true,
        latencyMs: Math.floor(Math.random() * 80) + 20, // 20–100 ms stub
        models: config.stubModels || [],
        stub: true
      };
    },

    async models() {
      return (config.stubModels || []).map(m => ({
        id: m,
        name: m,
        provider: config.type,
        capabilities: config.capabilities || []
      }));
    },

    supports(capability) {
      return (config.capabilities || []).includes(capability);
    },

    async estimateCost(capability, estimatedTokens) {
      const rates = config.costPer1kTokens || { input: 0, output: 0 };
      return {
        provider: config.type,
        capability,
        estimatedTokens,
        estimatedCostUsd: ((estimatedTokens / 1000) * rates.output).toFixed(6),
        currency: 'USD',
        stub: true
      };
    },

    async shutdown() {
      return { shutdown: true };
    }
  };
}

// ─── Provider Registry ────────────────────────────────────────────────────────

const PROVIDER_STUBS = {
  sunave_local: createstubProvider({
    type: 'sunave_local',
    name: 'Sunave Local',
    defaultModel: 'sunave-local-v1',
    stubModels: ['sunave-local-v1', 'sunave-local-mini'],
    capabilities: ['chat', 'embeddings', 'summarization', 'classification', 'extraction'],
    costPer1kTokens: { input: 0, output: 0 }
  }),

  openai: createstubProvider({
    type: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-4o',
    stubModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'text-embedding-3-large'],
    capabilities: ['chat', 'vision', 'embeddings', 'function_calling', 'streaming', 'reasoning', 'coding', 'summarization', 'classification', 'extraction', 'generation', 'moderation'],
    costPer1kTokens: { input: 0.005, output: 0.015 }
  }),

  anthropic: createstubProvider({
    type: 'anthropic',
    name: 'Anthropic',
    defaultModel: 'claude-3-5-sonnet-20241022',
    stubModels: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    capabilities: ['chat', 'vision', 'streaming', 'reasoning', 'coding', 'summarization', 'classification', 'extraction', 'generation'],
    costPer1kTokens: { input: 0.003, output: 0.015 }
  }),

  gemini: createstubProvider({
    type: 'gemini',
    name: 'Google Gemini',
    defaultModel: 'gemini-1.5-pro',
    stubModels: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'],
    capabilities: ['chat', 'vision', 'embeddings', 'streaming', 'reasoning', 'coding', 'summarization', 'generation'],
    costPer1kTokens: { input: 0.00125, output: 0.005 }
  }),

  vertex_ai: createstubProvider({
    type: 'vertex_ai',
    name: 'Google Vertex AI',
    defaultModel: 'gemini-1.5-pro-002',
    stubModels: ['gemini-1.5-pro-002', 'gemini-1.5-flash-002', 'text-bison@002'],
    capabilities: ['chat', 'vision', 'embeddings', 'streaming', 'reasoning', 'coding', 'summarization', 'classification', 'generation'],
    costPer1kTokens: { input: 0.00125, output: 0.005 }
  }),

  azure_openai: createstubProvider({
    type: 'azure_openai',
    name: 'Azure OpenAI',
    defaultModel: 'gpt-4o',
    stubModels: ['gpt-4o', 'gpt-4-turbo', 'gpt-35-turbo', 'text-embedding-3-large'],
    capabilities: ['chat', 'vision', 'embeddings', 'function_calling', 'streaming', 'reasoning', 'coding', 'summarization', 'classification', 'extraction', 'generation', 'moderation'],
    costPer1kTokens: { input: 0.005, output: 0.015 }
  }),

  openrouter: createstubProvider({
    type: 'openrouter',
    name: 'OpenRouter',
    defaultModel: 'openai/gpt-4o',
    stubModels: ['openai/gpt-4o', 'anthropic/claude-3-5-sonnet', 'google/gemini-pro-1.5', 'meta-llama/llama-3.1-70b-instruct'],
    capabilities: ['chat', 'vision', 'streaming', 'reasoning', 'coding', 'summarization', 'classification', 'generation'],
    costPer1kTokens: { input: 0.005, output: 0.015 }
  }),

  litellm: createstubProvider({
    type: 'litellm',
    name: 'LiteLLM',
    defaultModel: 'gpt-4o',
    stubModels: ['gpt-4o', 'claude-3-5-sonnet-20241022', 'gemini/gemini-1.5-pro'],
    capabilities: ['chat', 'vision', 'embeddings', 'streaming', 'function_calling', 'reasoning', 'coding', 'summarization', 'classification', 'extraction', 'generation'],
    costPer1kTokens: { input: 0.005, output: 0.015 }
  }),

  ollama: createstubProvider({
    type: 'ollama',
    name: 'Ollama',
    defaultModel: 'llama3.2',
    stubModels: ['llama3.2', 'llama3.1', 'mistral', 'codellama', 'nomic-embed-text'],
    capabilities: ['chat', 'embeddings', 'streaming', 'coding', 'summarization', 'classification', 'extraction', 'generation'],
    costPer1kTokens: { input: 0, output: 0 }
  })
};

// ─── Capability → Provider Type Mapping ──────────────────────────────────────

const CAPABILITY_MAP = {
  reasoning:     ['openai', 'anthropic', 'gemini', 'vertex_ai', 'azure_openai', 'openrouter', 'litellm'],
  coding:        ['openai', 'anthropic', 'gemini', 'vertex_ai', 'azure_openai', 'openrouter', 'ollama', 'litellm'],
  vision:        ['openai', 'anthropic', 'gemini', 'vertex_ai', 'azure_openai', 'openrouter', 'litellm'],
  speech:        ['openai', 'azure_openai'],
  translation:   ['openai', 'anthropic', 'gemini', 'azure_openai', 'litellm'],
  ocr:           ['openai', 'gemini', 'vertex_ai', 'azure_openai'],
  embeddings:    ['openai', 'gemini', 'vertex_ai', 'azure_openai', 'litellm', 'ollama', 'sunave_local'],
  summarization: ['openai', 'anthropic', 'gemini', 'vertex_ai', 'azure_openai', 'openrouter', 'litellm', 'ollama', 'sunave_local'],
  planning:      ['openai', 'anthropic', 'gemini', 'vertex_ai', 'openrouter', 'litellm'],
  classification:['openai', 'anthropic', 'gemini', 'azure_openai', 'litellm', 'ollama', 'sunave_local'],
  extraction:    ['openai', 'anthropic', 'gemini', 'azure_openai', 'litellm', 'ollama', 'sunave_local'],
  generation:    ['openai', 'anthropic', 'gemini', 'vertex_ai', 'azure_openai', 'openrouter', 'litellm', 'ollama'],
  chat:          ['openai', 'anthropic', 'gemini', 'vertex_ai', 'azure_openai', 'openrouter', 'litellm', 'ollama', 'sunave_local']
};

// ─── Routing Policy Definitions ───────────────────────────────────────────────

const ROUTING_POLICIES = {
  lowest_cost:     (providers) => providers.sort((a, b) => (a._costScore || 0) - (b._costScore || 0)),
  highest_quality: (providers) => providers, // priority order = quality order
  fastest:         (providers) => providers.sort((a, b) => (a._latencyScore || 0) - (b._latencyScore || 0)),
  local_first:     (providers) => providers.sort((a, b) => {
    const localTypes = ['sunave_local', 'ollama'];
    const aIsLocal = localTypes.includes(a.type) ? -1 : 1;
    const bIsLocal = localTypes.includes(b.type) ? -1 : 1;
    return aIsLocal - bIsLocal;
  }),
  cloud_first: (providers) => providers.sort((a, b) => {
    const localTypes = ['sunave_local', 'ollama'];
    const aIsLocal = localTypes.includes(a.type) ? 1 : -1;
    const bIsLocal = localTypes.includes(b.type) ? 1 : -1;
    return aIsLocal - bIsLocal;
  }),
  org_override: (providers) => providers // org_override uses first in priority list
};

// ─── AI Gateway Service Factory ───────────────────────────────────────────────

/**
 * Creates the AI Gateway service.
 * @param {object} aiProviderRepo - AI Provider repository
 * @returns {object} Gateway with chat, stream, vision, embedding, etc.
 */
export function createAiGatewayService(aiProviderRepo) {

  /**
   * Internal: load active DB providers and merge with stubs.
   */
  async function _loadActiveProviders() {
    const dbProviders = await aiProviderRepo.listProviders({ enabledOnly: true });
    return dbProviders.map(p => ({
      ...p,
      _stub: PROVIDER_STUBS[p.type] || PROVIDER_STUBS.sunave_local
    }));
  }

  /**
   * Internal: select best provider for a capability using routing policy.
   * @param {string} capability
   * @param {string} policyName
   * @returns {{ provider: object, stub: object } | null}
   */
  async function _selectProvider(capability, policyName = 'local_first') {
    const allActive = await _loadActiveProviders();

    // Filter by capability support
    const supportedTypes = CAPABILITY_MAP[capability] || CAPABILITY_MAP.chat;
    let eligible = allActive.filter(p => supportedTypes.includes(p.type) && p.enabled);

    if (eligible.length === 0) {
      // Fallback to any enabled provider
      eligible = allActive.filter(p => p.enabled);
    }

    if (eligible.length === 0) return null;

    // Apply routing policy
    const policyFn = ROUTING_POLICIES[policyName] || ROUTING_POLICIES.local_first;
    const sorted = policyFn([...eligible]);
    const selected = sorted[0];

    return {
      provider: selected,
      stub: selected._stub
    };
  }

  /**
   * Internal: run health check and update DB.
   */
  async function _checkProviderHealth(provider) {
    const stub = PROVIDER_STUBS[provider.type] || PROVIDER_STUBS.sunave_local;
    let healthData;

    try {
      healthData = await stub.health();
      const successRate = healthData.available ? 1.0 : 0.0;

      await aiProviderRepo.upsertHealth(provider.id, {
        availability: healthData.available,
        latencyMs: healthData.latencyMs,
        errorMessage: null,
        failures: healthData.available ? 0 : 1,
        successRate,
        modelsCount: (healthData.models || []).length
      });

      // Auto-disable providers with success rate below 50%
      const newStatus = healthData.available ? 'healthy' : 'offline';
      await aiProviderRepo.updateProviderHealth(provider.id, newStatus);

      return { ...healthData, status: newStatus, providerId: provider.id, providerName: provider.name };
    } catch (err) {
      await aiProviderRepo.upsertHealth(provider.id, {
        availability: false,
        latencyMs: null,
        errorMessage: err.message,
        failures: 1,
        successRate: 0.0,
        modelsCount: 0
      });
      await aiProviderRepo.updateProviderHealth(provider.id, 'offline');
      return { available: false, status: 'offline', providerId: provider.id, providerName: provider.name, error: err.message };
    }
  }

  // ─── Public Gateway API ─────────────────────────────────────────────────

  return {

    /**
     * Send a chat capability request.
     * Business modules call this — never a provider directly.
     */
    async chat(capability = 'chat', messages = [], context = {}) {
      const selected = await _selectProvider(capability, context.routingPolicy);
      if (!selected) {
        return { error: 'NO_PROVIDER', message: 'No provider available for the requested capability.' };
      }
      const result = await selected.stub.chat(messages, { ...context });
      return { ...result, selectedProvider: selected.provider.name, capability };
    },

    /**
     * Request a streaming capability response.
     */
    async stream(capability = 'chat', messages = [], context = {}) {
      const selected = await _selectProvider(capability, context.routingPolicy);
      if (!selected) {
        return { error: 'NO_PROVIDER', message: 'No provider available for streaming.' };
      }
      const result = await selected.stub.stream(messages, { ...context });
      return { ...result, selectedProvider: selected.provider.name, capability };
    },

    /**
     * Vision capability request.
     */
    async vision(input = {}, context = {}) {
      const selected = await _selectProvider('vision', context.routingPolicy);
      if (!selected) {
        return { error: 'NO_PROVIDER', message: 'No provider available for vision.' };
      }
      const result = await selected.stub.chat(
        [{ role: 'user', content: input.prompt || 'Describe this image.' }],
        { ...context }
      );
      return { ...result, selectedProvider: selected.provider.name, capability: 'vision' };
    },

    /**
     * Embedding capability request.
     */
    async embedding(input = '', context = {}) {
      const selected = await _selectProvider('embeddings', context.routingPolicy);
      if (!selected) {
        return { error: 'NO_PROVIDER', message: 'No provider available for embeddings.' };
      }
      return {
        provider: selected.provider.type,
        selectedProvider: selected.provider.name,
        capability: 'embeddings',
        stub: true,
        embedding: Array.from({ length: 1536 }, () => Math.random() * 2 - 1),
        dimensions: 1536,
        note: 'stub embedding vector — real provider integration pending.'
      };
    },

    /**
     * Speech synthesis capability request.
     */
    async speech(text = '', context = {}) {
      const selected = await _selectProvider('speech', context.routingPolicy);
      if (!selected) {
        return { error: 'NO_PROVIDER', message: 'No provider available for speech synthesis.' };
      }
      return {
        provider: selected.provider.type,
        selectedProvider: selected.provider.name,
        capability: 'speech',
        stub: true,
        audioUrl: null,
        note: 'stub speech response — real provider integration pending.'
      };
    },

    /**
     * Audio transcription capability request.
     */
    async transcription(audioInput = {}, context = {}) {
      const selected = await _selectProvider('speech', context.routingPolicy);
      if (!selected) {
        return { error: 'NO_PROVIDER', message: 'No provider available for transcription.' };
      }
      return {
        provider: selected.provider.type,
        selectedProvider: selected.provider.name,
        capability: 'transcription',
        stub: true,
        text: '[stub transcription] Real transcription integration pending.',
        language: audioInput.language || 'en',
        duration: 0
      };
    },

    /**
     * Reasoning capability request.
     */
    async reason(capability = 'reasoning', input = {}, context = {}) {
      const selected = await _selectProvider('reasoning', context.routingPolicy);
      if (!selected) {
        return { error: 'NO_PROVIDER', message: 'No provider available for reasoning.' };
      }
      const result = await selected.stub.chat(
        [{ role: 'user', content: input.prompt || 'Please reason through this problem.' }],
        { ...context }
      );
      return { ...result, selectedProvider: selected.provider.name, capability: 'reasoning' };
    },

    /**
     * Check health of all enabled providers.
     * Updates health records in DB and auto-disables unhealthy providers.
     */
    async health() {
      const providers = await aiProviderRepo.listProviders({ enabledOnly: false });
      const results = await Promise.all(
        providers.map(p => _checkProviderHealth(p))
      );

      const healthy = results.filter(r => r.available).length;
      const degraded = results.filter(r => !r.available).length;

      return {
        status: healthy > 0 ? (degraded > 0 ? 'degraded' : 'healthy') : 'offline',
        providers: results,
        summary: { total: results.length, healthy, degraded, offline: degraded },
        checkedAt: new Date().toISOString()
      };
    },

    /**
     * List all models from all known provider types.
     * Aggregates stub model lists for each provider type.
     */
    async listModels() {
      const providers = await aiProviderRepo.listProviders({ enabledOnly: true });
      const modelLists = await Promise.all(
        providers.map(async p => {
          const stub = PROVIDER_STUBS[p.type] || PROVIDER_STUBS.sunave_local;
          const models = await stub.models();
          return models;
        })
      );
      return {
        models: modelLists.flat(),
        total: modelLists.flat().length,
        stub: true
      };
    },

    /**
     * Estimate cost for a capability request.
     * @param {string} capability
     * @param {number} estimatedTokens
     * @param {string} [preferredProviderType]
     */
    async estimateCost(capability, estimatedTokens, preferredProviderType) {
      const selected = await _selectProvider(capability, 'lowest_cost');
      if (!selected) {
        return { error: 'NO_PROVIDER', estimatedCostUsd: null };
      }
      const stub = preferredProviderType
        ? (PROVIDER_STUBS[preferredProviderType] || selected.stub)
        : selected.stub;

      const estimate = await stub.estimateCost(capability, estimatedTokens);
      return { ...estimate, selectedProvider: selected.provider.name };
    },

    /**
     * Expose provider stubs for testing/introspection.
     * @returns {object} provider type → stub map
     */
    getProviderStubs() {
      return { ...PROVIDER_STUBS };
    },

    /**
     * Expose capability map for documentation/admin UI.
     */
    getCapabilityMap() {
      return { ...CAPABILITY_MAP };
    },

    /**
     * Expose routing policy names.
     */
    getRoutingPolicies() {
      return Object.keys(ROUTING_POLICIES);
    }
  };
}
