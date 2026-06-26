/**
 * Dashboard Widget Registry — Client Side
 *
 * Central registry for all dashboard widgets. Widgets are registered here
 * by their owning modules. The dashboard itself does not hardcode any widget list.
 *
 * Future modules (Goals, Projects, Finance, etc.) call:
 *   DashboardRegistry.registerWidget({ id, title, render, ... })
 *
 * The registry is a singleton on window.DashboardRegistry.
 */

(function (global) {
  'use strict';

  // ─── Widget Size & Category Constants ──────────────────────────────────────

  const WIDGET_SIZE = {
    SMALL:      'small',
    MEDIUM:     'medium',
    LARGE:      'large',
    FULL_WIDTH: 'full'
  };

  const WIDGET_CATEGORY = {
    EXECUTIVE:     'executive',
    GOALS:         'goals',
    PROJECTS:      'projects',
    AI:            'ai',
    WORKERS:       'workers',
    DOCUMENTS:     'documents',
    KNOWLEDGE:     'knowledge',
    CRM:           'crm',
    FINANCE:       'finance',
    HR:            'hr',
    NOTIFICATIONS: 'notifications',
    SYSTEM:        'system',
    CUSTOM:        'custom'
  };

  // ─── Registry Implementation ───────────────────────────────────────────────

  const _widgets = new Map();
  const _listeners = [];

  function _notify(event, widget) {
    for (const fn of _listeners) {
      try { fn(event, widget); } catch (e) { console.warn('[Registry] Listener error:', e); }
    }
  }

  const DashboardRegistry = {
    WIDGET_SIZE,
    WIDGET_CATEGORY,

    /**
     * Register a widget definition.
     * @param {object} definition - Widget definition object.
     * @param {string} definition.id - Unique widget identifier.
     * @param {string} definition.title - Display name.
     * @param {string} definition.description - Short description.
     * @param {string} definition.icon - Emoji or icon string.
     * @param {string} definition.category - One of WIDGET_CATEGORY values.
     * @param {string[]} definition.permissions - Required permission strings.
     * @param {string} definition.size - One of WIDGET_SIZE values.
     * @param {number} definition.priority - Sort order (lower = higher priority).
     * @param {boolean} definition.enabled - Whether the widget is active.
     * @param {number} definition.refreshInterval - Auto-refresh in seconds (0 = manual).
     * @param {function} definition.render - (container: HTMLElement, data: any) => void
     * @param {function} definition.load - async () => data
     * @param {function} definition.settings - () => HTMLElement | null
     */
    registerWidget(definition) {
      if (!definition || !definition.id) {
        console.error('[Registry] registerWidget: definition.id is required.');
        return;
      }
      if (_widgets.has(definition.id)) {
        console.warn(`[Registry] Widget '${definition.id}' already registered — overwriting.`);
      }

      const widget = {
        id:              definition.id,
        title:           definition.title ?? 'Untitled Widget',
        description:     definition.description ?? '',
        icon:            definition.icon ?? '📦',
        category:        definition.category ?? WIDGET_CATEGORY.CUSTOM,
        permissions:     definition.permissions ?? [],
        size:            definition.size ?? WIDGET_SIZE.MEDIUM,
        priority:        definition.priority ?? 999,
        enabled:         definition.enabled !== false,
        refreshInterval: definition.refreshInterval ?? 0,
        render:          definition.render ?? function (el) { el.innerHTML = '<p style="padding:1rem;color:var(--dash-text-muted)">No render function.</p>'; },
        load:            definition.load   ?? async function () { return {}; },
        settings:        definition.settings ?? function () { return null; }
      };

      _widgets.set(widget.id, widget);
      _notify('registered', widget);
    },

    /**
     * Remove a widget from the registry.
     */
    removeWidget(id) {
      const widget = _widgets.get(id);
      if (widget) {
        _widgets.delete(id);
        _notify('removed', widget);
      }
    },

    /**
     * Get all widgets, optionally filtered.
     * @param {object} opts
     * @param {string}  [opts.category] - Filter by category.
     * @param {boolean} [opts.enabledOnly] - Only return enabled widgets.
     * @returns {object[]}
     */
    getWidgets({ category, enabledOnly = false } = {}) {
      let list = [..._widgets.values()];
      if (category) list = list.filter(w => w.category === category);
      if (enabledOnly) list = list.filter(w => w.enabled);
      return list.slice().sort((a, b) => a.priority - b.priority);
    },

    /**
     * Get a single widget by id.
     * @param {string} id
     * @returns {object|null}
     */
    getWidget(id) {
      return _widgets.get(id) ?? null;
    },

    /**
     * Enable or disable a widget.
     */
    setEnabled(id, enabled) {
      const w = _widgets.get(id);
      if (w) {
        w.enabled = !!enabled;
        _notify('updated', w);
      }
    },

    /**
     * Subscribe to registry events: 'registered' | 'removed' | 'updated'
     * @param {function} fn - (event: string, widget: object) => void
     */
    on(fn) {
      _listeners.push(fn);
    },

    /** Total number of registered widgets. */
    get size() { return _widgets.size; }
  };

  global.DashboardRegistry = DashboardRegistry;
  global.WIDGET_SIZE = WIDGET_SIZE;
  global.WIDGET_CATEGORY = WIDGET_CATEGORY;

})(window);
