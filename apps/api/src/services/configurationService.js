/**
 * Configuration Engine — centralized settings resolution service.
 *
 * Resolution hierarchy (highest → lowest priority):
 *   1. User preference (user_preferences table)
 *   2. Organization setting (organization_settings table)
 *   3. System default (system_settings table)
 *   4. Application default (hardcoded constants in this file)
 *
 * No module should query the DB directly for settings — always use this service.
 */

const APP_DEFAULTS = {
  general: {
    platformName: 'Sunave',
    supportEmail: '',
    maintenanceMode: false
  },
  appearance: {
    defaultTheme: 'system',
    allowUserTheme: true,
    accentColor: '#6366f1',
    compactLayout: false
  },
  localization: {
    defaultLanguage: 'en',
    defaultTimezone: 'UTC',
    defaultDateFormat: 'YYYY-MM-DD',
    defaultTimeFormat: 'HH:mm',
    defaultCurrency: 'USD'
  },
  security: {
    passwordMinLength: 10,
    sessionTimeoutMinutes: 15,
    maxActiveSessions: 5,
    accountLockoutEnabled: true,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 30,
    allowedDomains: [],
    auditLoggingEnabled: true,
    apiAccessEnabled: true
  },
  notifications: {
    emailEnabled: true,
    inAppEnabled: true,
    smsEnabled: false,
    pushEnabled: false
  },
  storage: {
    defaultQuotaBytes: 5368709120,
    maxFileSizeBytes: 104857600,
    allowedMimeTypes: []
  },
  ai: {
    gatewayUrl: '',
    defaultProvider: '',
    reasoningPolicy: 'auto',
    visionPolicy: 'auto',
    speechPolicy: 'auto',
    embeddingPolicy: 'auto',
    fallbackPolicy: 'error',
    costPolicy: 'default'
  },
  voice: {
    sttProvider: '',
    ttsProvider: '',
    defaultLanguage: 'en'
  },
  email: {
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: true,
    fromAddress: '',
    fromName: 'Sunave'
  },
  api: {
    rateLimitEnabled: true,
    defaultRateLimit: 1000,
    webhooksEnabled: false
  },
  billing: {
    currency: 'USD',
    taxEnabled: false,
    trialDays: 14
  },
  audit: {
    retentionDays: 90,
    logLevel: 'standard'
  },
  branding: {
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6'
  },
  integrations: {
    slackEnabled: false,
    teamsEnabled: false,
    webhooksEnabled: false
  },
  plugins: {
    marketplaceEnabled: false,
    allowPrivatePlugins: false
  },
  marketplace: {
    enabled: false,
    featuredPlugins: []
  },
  system: {
    version: '0.1.0',
    buildId: '',
    debugMode: false,
    maintenanceMode: false
  }
};

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function createConfigurationService(settingsRepo, orgRepo) {
  const _cache = new Map(); // key -> { value, expiresAt }

  // ─── Internal cache helpers ──────────────────────────────────────────────

  function _cacheGet(key) {
    const entry = _cache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      _cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  function _cacheSet(key, value, ttlMs = DEFAULT_CACHE_TTL_MS) {
    _cache.set(key, {
      value,
      expiresAt: ttlMs > 0 ? Date.now() + ttlMs : null
    });
  }

  function _buildCacheKey(parts) {
    return parts.join(':');
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Resolve a single key from the hierarchy.
   * context: { userId, orgId }
   * Returns the resolved value or undefined.
   */
  async function resolve(category, key, context = {}) {
    const { userId, orgId } = context;

    // 1. User preference
    if (userId && orgId) {
      const cacheKey = _buildCacheKey(['user', userId, orgId, category]);
      let userPrefs = _cacheGet(cacheKey);
      if (userPrefs === undefined) {
        userPrefs = await settingsRepo.getUserPreferences(userId, orgId, category);
        _cacheSet(cacheKey, userPrefs);
      }
      if (userPrefs && key in userPrefs) return userPrefs[key];
    }

    // 2. Organization setting
    if (orgId && orgRepo) {
      const cacheKey = _buildCacheKey(['org', orgId, category]);
      let orgSettings = _cacheGet(cacheKey);
      if (orgSettings === undefined) {
        const all = await orgRepo.getSettings(orgId);
        orgSettings = all[category] ?? null;
        _cacheSet(cacheKey, orgSettings);
      }
      if (orgSettings && key in orgSettings) return orgSettings[key];
    }

    // 3. System default
    const sysCacheKey = _buildCacheKey(['system', category]);
    let sysSettings = _cacheGet(sysCacheKey);
    if (sysSettings === undefined) {
      sysSettings = await settingsRepo.getSystemSettings(category);
      _cacheSet(sysCacheKey, sysSettings);
    }
    if (sysSettings && key in sysSettings) return sysSettings[key];

    // 4. Application default
    return APP_DEFAULTS[category]?.[key];
  }

  /**
   * Get the full resolved settings object for a category.
   * Merges: app defaults ← system ← org ← user (each layer overrides the previous).
   */
  async function get(category, context = {}) {
    const { userId, orgId } = context;
    const merged = { ...(APP_DEFAULTS[category] ?? {}) };

    // System settings layer
    const sysSettings = await settingsRepo.getSystemSettings(category);
    if (sysSettings) Object.assign(merged, sysSettings);

    // Org settings layer
    if (orgId && orgRepo) {
      const all = await orgRepo.getSettings(orgId);
      const orgCat = all[category];
      if (orgCat) Object.assign(merged, orgCat);
    }

    // User preferences layer
    if (userId && orgId) {
      const userPrefs = await settingsRepo.getUserPreferences(userId, orgId, category);
      if (userPrefs) Object.assign(merged, userPrefs);
    }

    return merged;
  }

  /**
   * Set a value — scope determines which layer is written.
   * scope: 'user' | 'org' | 'system'
   */
  async function set(category, updates, scope = 'system', context = {}) {
    const { userId, orgId } = context;
    if (scope === 'user' && userId && orgId) {
      await settingsRepo.upsertUserPreferences(userId, orgId, category, updates);
      invalidate(`user:${userId}:${orgId}:${category}`);
    } else if (scope === 'org' && orgId && orgRepo) {
      await orgRepo.upsertSettings(orgId, category, updates);
      invalidate(`org:${orgId}:${category}`);
    } else {
      await settingsRepo.upsertSystemSettings(category, updates);
      invalidate(`system:${category}`);
    }
  }

  async function has(category, key, context = {}) {
    const value = await resolve(category, key, context);
    return value !== undefined;
  }

  async function remove(category, key, scope = 'user', context = {}) {
    const { userId, orgId } = context;
    let prefs;
    if (scope === 'user' && userId && orgId) {
      prefs = await settingsRepo.getUserPreferences(userId, orgId, category) ?? {};
      delete prefs[key];
      await settingsRepo.upsertUserPreferences(userId, orgId, category, prefs);
      invalidate(`user:${userId}:${orgId}:${category}`);
    } else if (scope === 'org' && orgId && orgRepo) {
      const all = await orgRepo.getSettings(orgId);
      prefs = { ...(all[category] ?? {}) };
      delete prefs[key];
      await orgRepo.upsertSettings(orgId, category, prefs);
      invalidate(`org:${orgId}:${category}`);
    } else {
      const sysSettings = await settingsRepo.getSystemSettings(category) ?? {};
      delete sysSettings[key];
      await settingsRepo.upsertSystemSettings(category, sysSettings);
      invalidate(`system:${category}`);
    }
  }

  // ─── Typed accessors ──────────────────────────────────────────────────────

  async function getBoolean(category, key, context = {}) {
    const val = await resolve(category, key, context);
    if (val === undefined || val === null) return false;
    if (typeof val === 'boolean') return val;
    return String(val).toLowerCase() === 'true';
  }

  async function getNumber(category, key, context = {}) {
    const val = await resolve(category, key, context);
    if (val === undefined || val === null) return 0;
    const n = Number(val);
    return Number.isNaN(n) ? 0 : n;
  }

  async function getString(category, key, context = {}) {
    const val = await resolve(category, key, context);
    if (val === undefined || val === null) return '';
    return String(val);
  }

  async function getObject(category, key, context = {}) {
    const val = await resolve(category, key, context);
    if (!val || typeof val !== 'object' || Array.isArray(val)) return {};
    return val;
  }

  async function getArray(category, key, context = {}) {
    const val = await resolve(category, key, context);
    if (!Array.isArray(val)) return [];
    return val;
  }

  // ─── Cache management ──────────────────────────────────────────────────────

  /**
   * Execute factory function and cache its result under cacheKey.
   */
  async function cache(cacheKey, factory, ttlMs = DEFAULT_CACHE_TTL_MS) {
    const cached = _cacheGet(cacheKey);
    if (cached !== undefined) return cached;
    const value = await factory();
    _cacheSet(cacheKey, value, ttlMs);
    return value;
  }

  /**
   * Invalidate cached entries.
   * If pattern is provided, removes all keys that start with that pattern.
   * If omitted, clears the entire in-memory cache.
   */
  function invalidate(pattern) {
    if (!pattern) {
      _cache.clear();
      return;
    }
    for (const key of _cache.keys()) {
      if (key.startsWith(pattern)) {
        _cache.delete(key);
      }
    }
  }

  return {
    resolve,
    get,
    set,
    has,
    remove,
    getBoolean,
    getNumber,
    getString,
    getObject,
    getArray,
    cache,
    invalidate
  };
}

export { APP_DEFAULTS };
