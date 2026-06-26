/**
 * Widget: System Health
 * Category: system | Size: medium (col-span-4)
 * Data from: systemHealth provider
 */
(function () {
  'use strict';

  const STATUS_LABELS = { healthy: 'Healthy', degraded: 'Degraded', down: 'Down', idle: 'Idle' };

  window.DashboardRegistry.registerWidget({
    id: 'system-health',
    title: 'System Health',
    description: 'API, database, worker, storage, and cache health indicators.',
    icon: '❤️',
    category: window.WIDGET_CATEGORY.SYSTEM,
    permissions: ['platform.admin'],
    size: window.WIDGET_SIZE.MEDIUM,
    priority: 6,
    enabled: true,
    refreshInterval: 60,

    async load() {
      const provider = window.DashboardProviders.get('systemHealth');
      return provider ? provider.load() : {};
    },

    render(container, data) {
      if (!data) { container.innerHTML = '<p style="padding:1rem;color:var(--dash-text-muted)">No data.</p>'; return; }

      const services = [
        { name: 'API',      status: data.api?.status,      meta: data.api ? `${data.api.latencyMs}ms • ${data.api.uptime}` : '' },
        { name: 'Database', status: data.database?.status,  meta: data.database ? `${data.database.connections}/${data.database.maxConnections} conns` : '' },
        { name: 'Workers',  status: data.workers?.status,   meta: data.workers ? `${data.workers.active} active, ${data.workers.failed} failed` : '' },
        { name: 'Storage',  status: data.storage?.status,   meta: data.storage ? `${data.storage.usedPercent}% used` : '' },
        { name: 'Cache',    status: data.cache?.status,     meta: data.cache ? `Hit rate ${data.cache.hitRate}` : '' }
      ];

      const overallStatus = data.overall ?? 'unknown';
      const overallTag = overallStatus === 'healthy'
        ? '<span class="dash-tag dash-tag-success">● All Systems Operational</span>'
        : '<span class="dash-tag dash-tag-warning">⚠ Degraded</span>';

      container.innerHTML = `
        <div style="margin-bottom:0.75rem">${overallTag}</div>
        <div>
          ${services.map(s => `
            <div class="health-row">
              <div class="health-row-left">
                <span class="status-dot ${s.status ?? 'idle'}"></span>
                <span>${s.name}</span>
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.1rem">
                <span style="font-size:0.78rem;font-weight:600;color:var(--dash-text-muted)">${STATUS_LABELS[s.status] ?? s.status}</span>
                <span class="health-row-right">${s.meta}</span>
              </div>
            </div>`).join('')}
        </div>`;
    },

    settings() { return null; }
  });
})();
