/**
 * Dashboard Service — Widget Registry, Data Providers, and Layout Management.
 *
 * Principles:
 * - No DB queries. All data is stubed or loaded from providers.
 * - Widget registry is the single source of truth for available widgets.
 * - Future modules register widgets via registerWidget() without modifying this file.
 * - Layouts are in-memory with stub persistence (real persistence via DB in future sprint).
 */

// ─── Widget Size Constants ──────────────────────────────────────────────────

export const WIDGET_SIZE = {
  SMALL: 'small',       // 1×1 grid unit
  MEDIUM: 'medium',     // 2×1 grid unit
  LARGE: 'large',       // 2×2 grid unit
  FULL_WIDTH: 'full'    // full row
};

// ─── Widget Category Constants ──────────────────────────────────────────────

export const WIDGET_CATEGORY = {
  EXECUTIVE:    'executive',
  GOALS:        'goals',
  PROJECTS:     'projects',
  AI:           'ai',
  WORKERS:      'workers',
  DOCUMENTS:    'documents',
  KNOWLEDGE:    'knowledge',
  CRM:          'crm',
  FINANCE:      'finance',
  HR:           'hr',
  NOTIFICATIONS:'notifications',
  SYSTEM:       'system',
  CUSTOM:       'custom'
};

// ─── stub Data ──────────────────────────────────────────────────────────────

const stub_DATA = {
  executive: {
    revenue: { current: 284500, previous: 261200, currency: 'USD', trend: '+8.9%', sparkline: [210, 220, 215, 240, 255, 261, 284] },
    projects: { active: 24, completed: 118, overdue: 3, trend: '+2 this week' },
    goals: { onTrack: 18, atRisk: 4, behind: 2, completion: 74 },
    workers: { active: 12, idle: 3, failed: 1, queued: 47 },
    aiUsage: { requests: 18432, tokensUsed: 4210000, cost: 312.50, trend: '+12% vs last month' },
    storage: { usedBytes: 12884901888, totalBytes: 107374182400, percent: 12 }
  },
  recentActivity: [
    { id: 'a1', type: 'goal', action: 'created', subject: 'Q3 Revenue Growth', user: 'Sarah Chen', time: '2 min ago', icon: '🎯' },
    { id: 'a2', type: 'project', action: 'completed', subject: 'API Gateway v2', user: 'James Park', time: '14 min ago', icon: '✅' },
    { id: 'a3', type: 'worker', action: 'failed', subject: 'Invoice Processor', user: 'System', time: '31 min ago', icon: '⚠️' },
    { id: 'a4', type: 'user', action: 'joined', subject: 'Priya Nair', user: 'Admin', time: '1 hr ago', icon: '👋' },
    { id: 'a5', type: 'ai', action: 'completed', subject: 'Market Analysis Report', user: 'AutoAgent', time: '2 hr ago', icon: '🤖' },
    { id: 'a6', type: 'project', action: 'updated', subject: 'Dashboard Framework', user: 'Dev Team', time: '3 hr ago', icon: '📝' }
  ],
  notifications: [
    { id: 'n1', type: 'warning', title: 'Worker Failed', message: 'Invoice Processor worker has failed 3 times.', time: '31 min ago', read: false },
    { id: 'n2', type: 'info', title: 'Goal Milestone Reached', message: 'Q2 Sales Target hit 80% completion.', time: '2 hr ago', read: false },
    { id: 'n3', type: 'success', title: 'Deployment Successful', message: 'API v2.4.1 deployed to production.', time: '4 hr ago', read: true },
    { id: 'n4', type: 'info', title: 'New Team Member', message: 'Priya Nair joined the Engineering team.', time: '5 hr ago', read: true }
  ],
  systemHealth: {
    api: { status: 'healthy', latencyMs: 42, uptime: '99.98%' },
    database: { status: 'healthy', connections: 18, maxConnections: 100 },
    workers: { status: 'degraded', active: 12, failed: 1 },
    storage: { status: 'healthy', usedPercent: 12 },
    cache: { status: 'healthy', hitRate: '94%' },
    overall: 'healthy'
  },
  aiStatus: {
    providers: [
      { name: 'OpenAI', status: 'connected', latencyMs: 210, requestsToday: 9800 },
      { name: 'Anthropic', status: 'connected', latencyMs: 185, requestsToday: 5200 },
      { name: 'Ollama', status: 'connected', latencyMs: 38, requestsToday: 3432 }
    ],
    capabilities: ['text', 'vision', 'embedding', 'reasoning'],
    totalRequestsToday: 18432,
    avgLatencyMs: 144
  },
  organization: {
    name: 'Acme Corporation',
    plan: 'Pro',
    members: 47,
    teams: 8,
    createdAt: '2025-01-15',
    industry: 'Technology'
  }
};

// ─── Dashboard Data Provider ─────────────────────────────────────────────────

function createstubDataProvider(key) {
  const _cache = new Map();

  return {
    async load() {
      return stub_DATA[key] ?? {};
    },
    async refresh() {
      _cache.delete(key);
      return this.load();
    },
    cache(cacheKey, value) {
      _cache.set(cacheKey, value);
    },
    invalidate(cacheKey) {
      if (cacheKey) _cache.delete(cacheKey);
      else _cache.clear();
    }
  };
}

// ─── Default Widget Definitions ──────────────────────────────────────────────

const DEFAULT_WIDGETS = [
  {
    id: 'executive-summary',
    title: 'Executive Summary',
    description: 'High-level KPIs: revenue, projects, goals, and team performance.',
    icon: '📊',
    category: WIDGET_CATEGORY.EXECUTIVE,
    permissions: [],
    size: WIDGET_SIZE.FULL_WIDTH,
    priority: 1,
    enabled: true,
    refreshInterval: 300,
    providerKey: 'executive'
  },
  {
    id: 'goals-overview',
    title: 'Goals Overview',
    description: 'Summary of organisational goals — on-track, at-risk, and behind.',
    icon: '🎯',
    category: WIDGET_CATEGORY.GOALS,
    permissions: ['goals.read'],
    size: WIDGET_SIZE.MEDIUM,
    priority: 2,
    enabled: true,
    refreshInterval: 600,
    providerKey: 'executive'
  },
  {
    id: 'projects-overview',
    title: 'Projects Overview',
    description: 'Active, completed, and overdue project counts with trend.',
    icon: '📁',
    category: WIDGET_CATEGORY.PROJECTS,
    permissions: ['projects.read'],
    size: WIDGET_SIZE.MEDIUM,
    priority: 3,
    enabled: true,
    refreshInterval: 600,
    providerKey: 'executive'
  },
  {
    id: 'recent-activity',
    title: 'Recent Activity',
    description: 'Live feed of platform-wide events and actions.',
    icon: '⚡',
    category: WIDGET_CATEGORY.EXECUTIVE,
    permissions: [],
    size: WIDGET_SIZE.LARGE,
    priority: 4,
    enabled: true,
    refreshInterval: 60,
    providerKey: 'recentActivity'
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Unread alerts, warnings, and informational messages.',
    icon: '🔔',
    category: WIDGET_CATEGORY.NOTIFICATIONS,
    permissions: [],
    size: WIDGET_SIZE.MEDIUM,
    priority: 5,
    enabled: true,
    refreshInterval: 30,
    providerKey: 'notifications'
  },
  {
    id: 'system-health',
    title: 'System Health',
    description: 'API, database, worker, storage, and cache health indicators.',
    icon: '❤️',
    category: WIDGET_CATEGORY.SYSTEM,
    permissions: ['platform.admin'],
    size: WIDGET_SIZE.MEDIUM,
    priority: 6,
    enabled: true,
    refreshInterval: 60,
    providerKey: 'systemHealth'
  },
  {
    id: 'ai-status',
    title: 'AI Status',
    description: 'AI provider connectivity, latency, and daily request counts.',
    icon: '🤖',
    category: WIDGET_CATEGORY.AI,
    permissions: ['platform.admin'],
    size: WIDGET_SIZE.MEDIUM,
    priority: 7,
    enabled: true,
    refreshInterval: 120,
    providerKey: 'aiStatus'
  },
  {
    id: 'worker-status',
    title: 'Worker Status',
    description: 'Background worker health — active, idle, failed, and queued jobs.',
    icon: '⚙️',
    category: WIDGET_CATEGORY.WORKERS,
    permissions: ['platform.admin'],
    size: WIDGET_SIZE.MEDIUM,
    priority: 8,
    enabled: true,
    refreshInterval: 30,
    providerKey: 'executive'
  },
  {
    id: 'storage-usage',
    title: 'Storage Usage',
    description: 'Organisation storage consumption and quota status.',
    icon: '💾',
    category: WIDGET_CATEGORY.SYSTEM,
    permissions: [],
    size: WIDGET_SIZE.SMALL,
    priority: 9,
    enabled: true,
    refreshInterval: 600,
    providerKey: 'executive'
  },
  {
    id: 'org-overview',
    title: 'Organisation Overview',
    description: 'Members, teams, plan, and key organisation metadata.',
    icon: '🏢',
    category: WIDGET_CATEGORY.EXECUTIVE,
    permissions: [],
    size: WIDGET_SIZE.SMALL,
    priority: 10,
    enabled: true,
    refreshInterval: 3600,
    providerKey: 'organization'
  }
];

// ─── Default Layout ──────────────────────────────────────────────────────────

const DEFAULT_LAYOUT = [
  { widgetId: 'executive-summary',  col: 1, row: 1, colSpan: 12, rowSpan: 1 },
  { widgetId: 'goals-overview',     col: 1, row: 2, colSpan: 4,  rowSpan: 1 },
  { widgetId: 'projects-overview',  col: 5, row: 2, colSpan: 4,  rowSpan: 1 },
  { widgetId: 'notifications',      col: 9, row: 2, colSpan: 4,  rowSpan: 1 },
  { widgetId: 'recent-activity',    col: 1, row: 3, colSpan: 8,  rowSpan: 2 },
  { widgetId: 'system-health',      col: 9, row: 3, colSpan: 4,  rowSpan: 1 },
  { widgetId: 'ai-status',          col: 9, row: 4, colSpan: 4,  rowSpan: 1 },
  { widgetId: 'worker-status',      col: 1, row: 5, colSpan: 4,  rowSpan: 1 },
  { widgetId: 'storage-usage',      col: 5, row: 5, colSpan: 4,  rowSpan: 1 },
  { widgetId: 'org-overview',       col: 9, row: 5, colSpan: 4,  rowSpan: 1 }
];

// ─── Dashboard Registry ──────────────────────────────────────────────────────

export function createDashboardRegistry() {
  const _widgets = new Map();

  // Register default widgets
  for (const w of DEFAULT_WIDGETS) {
    _widgets.set(w.id, { ...w });
  }

  return {
    /**
     * Register a widget. Future plugins call this to add dashboard widgets
     * without modifying this service.
     */
    registerWidget(definition) {
      if (!definition?.id) throw new Error('Widget must have an id.');
      _widgets.set(definition.id, { ...definition });
    },

    removeWidget(id) {
      _widgets.delete(id);
    },

    /**
     * Returns all widgets, optionally filtered by category.
     * Future permission filtering will be applied here based on user context.
     */
    getWidgets({ category, enabledOnly = false } = {}) {
      let list = [..._widgets.values()];
      if (category) list = list.filter(w => w.category === category);
      if (enabledOnly) list = list.filter(w => w.enabled);
      return list.sort((a, b) => a.priority - b.priority);
    },

    getWidget(id) {
      return _widgets.get(id) ?? null;
    }
  };
}

// ─── Layout Manager ──────────────────────────────────────────────────────────

export function createLayoutManager() {
  // In-memory stub — future: persist to user_preferences table
  const _layouts = new Map();

  function _getDefaultLayout() {
    return DEFAULT_LAYOUT.map(item => ({ ...item }));
  }

  return {
    getLayout(userId) {
      return _layouts.get(userId) ?? _getDefaultLayout();
    },

    saveLayout(userId, layout) {
      _layouts.set(userId, layout);
      return layout;
    },

    resetLayout(userId) {
      _layouts.delete(userId);
      return _getDefaultLayout();
    },

    getDefaultLayout: _getDefaultLayout
  };
}

// ─── Dashboard Service Factory ───────────────────────────────────────────────

export function createDashboardService() {
  const registry = createDashboardRegistry();
  const layoutManager = createLayoutManager();

  const providers = {
    executive:      createstubDataProvider('executive'),
    recentActivity: createstubDataProvider('recentActivity'),
    notifications:  createstubDataProvider('notifications'),
    systemHealth:   createstubDataProvider('systemHealth'),
    aiStatus:       createstubDataProvider('aiStatus'),
    organization:   createstubDataProvider('organization')
  };

  return {
    registry,
    layoutManager,
    providers,

    /**
     * Load stub data for a given provider key.
     */
    async loadProviderData(providerKey) {
      const provider = providers[providerKey];
      if (!provider) return null;
      return provider.load();
    },

    /**
     * Get the full dashboard config for a user.
     */
    async getDashboardConfig(userId = 'stub-user') {
      const widgets = registry.getWidgets({ enabledOnly: true });
      const layout = layoutManager.getLayout(userId);
      return {
        widgets,
        layout,
        preferences: {
          density: 'comfortable',
          refreshInterval: 60,
          sidebarMode: 'expanded',
          compactMode: false,
          animationsEnabled: true,
          theme: 'system'
        }
      };
    }
  };
}

export { stub_DATA, DEFAULT_WIDGETS, DEFAULT_LAYOUT };
