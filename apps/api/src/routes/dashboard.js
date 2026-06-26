/**
 * Dashboard API Router
 *
 * Endpoints:
 *   GET  /api/dashboard              — dashboard config + layout + preferences
 *   GET  /api/dashboard/widgets      — widget registry list
 *   POST /api/dashboard/layout       — create / save a named layout
 *   PUT  /api/dashboard/layout       — update the active layout
 *   GET  /api/dashboard/preferences  — user dashboard preferences
 *   PUT  /api/dashboard/preferences  — update user dashboard preferences
 *
 * All responses use the standard { success, data, error } envelope from @sunave/core.
 * All data is mocked — no DB queries. Future sprints will wire real persistence.
 */

import { Router } from 'express';
import { ok, fail } from '@sunave/core';

export function buildDashboardRouter(dashboardService) {
  const router = Router();
  const { registry, layoutManager, loadProviderData, getDashboardConfig } = dashboardService;

  // ─── GET /api/dashboard ────────────────────────────────────────────────────
  // Returns the full dashboard config: enabled widgets, active layout, preferences.
  router.get('/', async (req, res) => {
    try {
      // Mock user id — future: extract from req.auth
      const userId = req.auth?.userId ?? 'mock-user';
      const config = await getDashboardConfig(userId);
      res.json(ok(config));
    } catch (err) {
      console.error(err);
      res.status(500).json(fail('DASHBOARD_ERROR', 'Failed to load dashboard configuration.'));
    }
  });

  // ─── GET /api/dashboard/widgets ───────────────────────────────────────────
  // Returns all registered widgets. Accepts ?category=goals&enabled=true filters.
  router.get('/widgets', (req, res) => {
    try {
      const { category, enabled } = req.query;
      const widgets = registry.getWidgets({
        category: category || undefined,
        enabledOnly: enabled === 'true'
      });
      res.json(ok({ widgets, total: widgets.length }));
    } catch (err) {
      console.error(err);
      res.status(500).json(fail('WIDGETS_ERROR', 'Failed to load widget registry.'));
    }
  });

  // ─── GET /api/dashboard/widgets/:id ──────────────────────────────────────
  router.get('/widgets/:id', (req, res) => {
    const widget = registry.getWidget(req.params.id);
    if (!widget) {
      return res.status(404).json(fail('WIDGET_NOT_FOUND', `Widget '${req.params.id}' not found.`));
    }
    return res.json(ok(widget));
  });

  // ─── POST /api/dashboard/layout ──────────────────────────────────────────
  // Save a new named layout snapshot.
  router.post('/layout', (req, res) => {
    try {
      const userId = req.auth?.userId ?? 'mock-user';
      const { layout } = req.body;
      if (!Array.isArray(layout)) {
        return res.status(400).json(fail('INVALID_LAYOUT', 'layout must be an array of widget position objects.'));
      }
      const saved = layoutManager.saveLayout(userId, layout);
      return res.status(201).json(ok({ layout: saved, message: 'Layout saved.' }));
    } catch (err) {
      console.error(err);
      return res.status(500).json(fail('LAYOUT_SAVE_ERROR', 'Failed to save layout.'));
    }
  });

  // ─── PUT /api/dashboard/layout ───────────────────────────────────────────
  // Update the active layout (widget positions/sizes).
  router.put('/layout', (req, res) => {
    try {
      const userId = req.auth?.userId ?? 'mock-user';
      const { layout } = req.body;
      if (!Array.isArray(layout)) {
        return res.status(400).json(fail('INVALID_LAYOUT', 'layout must be an array of widget position objects.'));
      }
      const saved = layoutManager.saveLayout(userId, layout);
      return res.json(ok({ layout: saved, message: 'Layout updated.' }));
    } catch (err) {
      console.error(err);
      return res.status(500).json(fail('LAYOUT_UPDATE_ERROR', 'Failed to update layout.'));
    }
  });

  // ─── PUT /api/dashboard/layout/reset ─────────────────────────────────────
  // Reset layout to platform defaults.
  router.put('/layout/reset', (req, res) => {
    const userId = req.auth?.userId ?? 'mock-user';
    const layout = layoutManager.resetLayout(userId);
    res.json(ok({ layout, message: 'Layout reset to default.' }));
  });

  // ─── GET /api/dashboard/preferences ──────────────────────────────────────
  router.get('/preferences', (req, res) => {
    // Mock preferences — future: load from user_preferences via configurationService
    res.json(ok({
      preferences: {
        density: 'comfortable',
        refreshInterval: 60,
        sidebarMode: 'expanded',
        compactMode: false,
        animationsEnabled: true,
        theme: 'system',
        landingDashboard: 'default',
        defaultDashboard: 'default',
        pinnedWidgets: []
      }
    }));
  });

  // ─── PUT /api/dashboard/preferences ──────────────────────────────────────
  router.put('/preferences', (req, res) => {
    const { preferences } = req.body;
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json(fail('INVALID_PREFERENCES', 'preferences must be an object.'));
    }
    // Mock save — future: persist via configurationService.set('dashboard', preferences, 'user', context)
    return res.json(ok({ preferences, message: 'Preferences updated.' }));
  });

  // ─── GET /api/dashboard/data/:providerKey ─────────────────────────────────
  // Fetch mock data from a specific provider (for widget refresh calls).
  router.get('/data/:providerKey', async (req, res) => {
    try {
      const data = await loadProviderData(req.params.providerKey);
      if (data === null) {
        return res.status(404).json(fail('PROVIDER_NOT_FOUND', `No provider for key '${req.params.providerKey}'.`));
      }
      return res.json(ok(data));
    } catch (err) {
      console.error(err);
      return res.status(500).json(fail('PROVIDER_ERROR', 'Failed to load provider data.'));
    }
  });

  return router;
}
