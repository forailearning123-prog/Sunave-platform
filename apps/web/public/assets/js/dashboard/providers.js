/**
 * Dashboard Data Providers — Client Side
 *
 * Base provider class + stub implementations for all default widgets.
 * Providers abstract data fetching so widgets never query APIs directly.
 *
 * Provider interface:
 *   load()       — returns data (fetches from API or returns cached)
 *   refresh()    — clears cache and re-fetches
 *   cache(k, v)  — store a value in local cache
 *   invalidate() — clear local cache
 */

(function (global) {
  'use strict';

  // ─── Base Provider ─────────────────────────────────────────────────────────

  class DashboardDataProvider {
    constructor(name) {
      this.name = name;
      this._cache = new Map();
      this._lastLoaded = null;
    }

    async load() {
      throw new Error(`Provider '${this.name}' must implement load().`);
    }

    async refresh() {
      this.invalidate();
      return this.load();
    }

    cache(key, value) {
      this._cache.set(key, value);
    }

    getCached(key) {
      return this._cache.get(key);
    }

    invalidate(key) {
      if (key) this._cache.delete(key);
      else this._cache.clear();
    }

    async _fetch(url) {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
      const json = await res.json();
      return json.data ?? json;
    }
  }

  // ─── stub Provider ─────────────────────────────────────────────────────────

  class stubProvider extends DashboardDataProvider {
    constructor(name, stubData) {
      super(name);
      this._stubData = stubData;
    }

    async load() {
      // Simulate a small network delay for realism
      await new Promise(r => setTimeout(r, 80 + Math.random() * 120));
      return JSON.parse(JSON.stringify(this._stubData));
    }
  }

  // ─── stub Data ─────────────────────────────────────────────────────────────

  const stub = {
    executive: {
      revenue: { current: 284500, previous: 261200, currency: 'USD', trend: '+8.9%', trendUp: true, sparkline: [210, 220, 215, 240, 255, 261, 284] },
      projects: { active: 24, completed: 118, overdue: 3, trend: '+2 this week', trendUp: true },
      goals:    { onTrack: 18, atRisk: 4, behind: 2, completion: 74 },
      workers:  { active: 12, idle: 3, failed: 1, queued: 47 },
      aiUsage:  { requests: 18432, tokensUsed: 4210000, cost: 312.50, trend: '+12% vs last month', trendUp: true },
      storage:  { usedBytes: 12884901888, totalBytes: 107374182400, percent: 12 }
    },
    recentActivity: [
      { id: 'a1', type: 'goal',    action: 'created',   subject: 'Q3 Revenue Growth',    user: 'Sarah Chen',  time: '2 min ago',  icon: '🎯' },
      { id: 'a2', type: 'project', action: 'completed', subject: 'API Gateway v2',        user: 'James Park',  time: '14 min ago', icon: '✅' },
      { id: 'a3', type: 'worker',  action: 'failed',    subject: 'Invoice Processor',     user: 'System',      time: '31 min ago', icon: '⚠️' },
      { id: 'a4', type: 'user',    action: 'joined',    subject: 'Priya Nair',            user: 'Admin',       time: '1 hr ago',   icon: '👋' },
      { id: 'a5', type: 'ai',      action: 'completed', subject: 'Market Analysis Report', user: 'AutoAgent',  time: '2 hr ago',   icon: '🤖' },
      { id: 'a6', type: 'project', action: 'updated',   subject: 'Dashboard Framework',   user: 'Dev Team',    time: '3 hr ago',   icon: '📝' }
    ],
    notifications: [
      { id: 'n1', type: 'warning', title: 'Worker Failed',          message: 'Invoice Processor has failed 3 times.',   time: '31 min ago', read: false },
      { id: 'n2', type: 'info',    title: 'Goal Milestone Reached', message: 'Q2 Sales Target hit 80% completion.',     time: '2 hr ago',   read: false },
      { id: 'n3', type: 'success', title: 'Deployment Successful',  message: 'API v2.4.1 deployed to production.',       time: '4 hr ago',   read: true  },
      { id: 'n4', type: 'info',    title: 'New Team Member',        message: 'Priya Nair joined the Engineering team.', time: '5 hr ago',   read: true  }
    ],
    systemHealth: {
      api:      { status: 'healthy',  latencyMs: 42,  uptime: '99.98%' },
      database: { status: 'healthy',  connections: 18, maxConnections: 100 },
      workers:  { status: 'degraded', active: 12, failed: 1 },
      storage:  { status: 'healthy',  usedPercent: 12 },
      cache:    { status: 'healthy',  hitRate: '94%' },
      overall:  'healthy'
    },
    aiStatus: {
      providers: [
        { name: 'OpenAI',    status: 'connected', latencyMs: 210, requestsToday: 9800 },
        { name: 'Anthropic', status: 'connected', latencyMs: 185, requestsToday: 5200 },
        { name: 'Ollama',    status: 'connected', latencyMs: 38,  requestsToday: 3432 }
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
      industry: 'Technology',
      storagePercent: 12
    }
  };

  // ─── Provider Instances ────────────────────────────────────────────────────

  const DashboardProviders = {
    executive:      new stubProvider('executive',      stub.executive),
    recentActivity: new stubProvider('recentActivity', stub.recentActivity),
    notifications:  new stubProvider('notifications',  stub.notifications),
    systemHealth:   new stubProvider('systemHealth',   stub.systemHealth),
    aiStatus:       new stubProvider('aiStatus',       stub.aiStatus),
    organization:   new stubProvider('organization',   stub.organization),

    /**
     * Get a provider by key.
     * @param {string} key
     * @returns {DashboardDataProvider|null}
     */
    get(key) {
      return this[key] ?? null;
    },

    /**
     * Register a custom provider.
     */
    register(key, provider) {
      this[key] = provider;
    }
  };

  global.DashboardDataProvider = DashboardDataProvider;
  global.DashboardProviders = DashboardProviders;
  global.DASHBOARD_stub_DATA = stub;

})(window);
