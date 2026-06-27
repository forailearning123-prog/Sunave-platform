/**
 * Shared AI types and constants for Sunave AI OS
 * Provider & Model Registry Platform
 */

// ─── Valid Provider Types ─────────────────────────────────────────────────
export const VALID_PROVIDER_TYPES = [
  'sunave_local', 'openai', 'anthropic', 'gemini', 'vertex_ai',
  'azure_openai', 'openrouter', 'litellm', 'ollama', 'custom'
];

// ─── Valid Model Statuses ─────────────────────────────────────────────────
export const VALID_MODEL_STATUSES = [
  'active', 'deprecated', 'beta', 'experimental', 'retired'
];

// ─── Valid Capability Categories ──────────────────────────────────────────
export const VALID_CAPABILITY_CATEGORIES = [
  'generation', 'reasoning', 'coding', 'vision', 'speech',
  'audio', 'video', 'understanding', 'analysis', 'embeddings',
  'planning', 'general'
];

// ─── Valid Route Policies ─────────────────────────────────────────────────
export const VALID_ROUTING_POLICIES = [
  'lowest_cost', 'highest_quality', 'fastest', 'balanced',
  'local_only', 'cloud_only', 'local_first', 'cloud_first',
  'capability_preferred', 'org_override', 'user_override',
  'emergency_fallback'
];

// ─── Valid Period Types ───────────────────────────────────────────────────
export const VALID_PERIOD_TYPES = ['daily', 'weekly', 'monthly', 'yearly'];

// ─── Valid Budget Scopes ──────────────────────────────────────────────────
export const VALID_BUDGET_SCOPES = ['organization', 'provider', 'model', 'capability', 'user'];

// ─── Valid Provider Health Statuses ───────────────────────────────────────
export const VALID_HEALTH_STATUSES = ['healthy', 'degraded', 'offline', 'unknown'];

// ─── System Capabilities (seeded in database) ─────────────────────────────
export const SYSTEM_CAPABILITIES = [
  { name: 'chat', displayName: 'Chat', category: 'general' },
  { name: 'reasoning', displayName: 'Reasoning', category: 'reasoning' },
  { name: 'coding', displayName: 'Coding', category: 'coding' },
  { name: 'planning', displayName: 'Planning', category: 'planning' },
  { name: 'vision', displayName: 'Vision', category: 'vision' },
  { name: 'ocr', displayName: 'OCR', category: 'vision' },
  { name: 'speech', displayName: 'Speech', category: 'speech' },
  { name: 'translation', displayName: 'Translation', category: 'understanding' },
  { name: 'summarization', displayName: 'Summarization', category: 'understanding' },
  { name: 'embeddings', displayName: 'Embeddings', category: 'embeddings' },
  { name: 'research', displayName: 'Research', category: 'analysis' },
  { name: 'document-analysis', displayName: 'Document Analysis', category: 'analysis' },
  { name: 'sql', displayName: 'SQL', category: 'coding' },
  { name: 'data-analysis', displayName: 'Data Analysis', category: 'analysis' },
  { name: 'image-generation', displayName: 'Image Generation', category: 'generation' },
  { name: 'video-generation', displayName: 'Video Generation', category: 'video' },
  { name: 'audio-generation', displayName: 'Audio Generation', category: 'audio' }
];

// ─── Model Capability Flags ──────────────────────────────────────────────
export const MODEL_CAPABILITY_FLAGS = [
  'reasoning', 'coding', 'vision', 'speech', 'embeddings',
  'streaming', 'functionCalling', 'json', 'imageGeneration',
  'audioGeneration', 'videoGeneration'
];

// ─── Default Model Configuration ──────────────────────────────────────────
export const getDefaultModelConfig = () => ({
  contextWindow: 4096,
  maxOutputTokens: 2048,
  estimatedCostInput: 0,
  estimatedCostOutput: 0,
  status: 'active',
  enabled: true,
  supports: {
    reasoning: false,
    coding: false,
    vision: false,
    speech: false,
    embeddings: false,
    streaming: true,
    functionCalling: false,
    json: false,
    imageGeneration: false,
    audioGeneration: false,
    videoGeneration: false
  }
});

// ─── Capability-to-Model Reference (for admin UI hints) ───────────────────
export const CAPABILITY_MODEL_EXAMPLES = {
  reasoning: ['Claude 3.5 Sonnet', 'GPT-4o', 'Gemini 1.5 Pro', 'Qwen 2.5'],
  coding: ['Qwen 2.5', 'Claude 3.5 Sonnet', 'GPT-4o', 'DeepSeek V3'],
  vision: ['Gemini 2.0 Flash', 'GPT-4o', 'Claude 3.5 Sonnet'],
  ocr: ['Gemini 1.5 Pro', 'GPT-4o'],
  speech: ['Kokoro', 'OpenAI TTS', 'Azure Speech'],
  chat: ['GPT-4o', 'Claude 3.5', 'Gemini 1.5'],
  embeddings: ['text-embedding-3-large', 'Sunave Local v1'],
  imageGeneration: ['DALL-E 3', 'Stable Diffusion', 'Midjourney'],
  videoGeneration: ['Sora', 'Runway Gen-3'],
  audioGeneration: ['MusicLM', 'Jukebox'],
  research: ['GPT-4o', 'Claude 3.5 Opus', 'Gemini 1.5 Pro'],
  'document-analysis': ['GPT-4o', 'Claude 3.5', 'Gemini 1.5'],
  sql: ['GPT-4o', 'Claude 3.5', 'Qwen 2.5'],
  'data-analysis': ['GPT-4o', 'Claude 3.5 Sonnet', 'Gemini 1.5 Pro']
};