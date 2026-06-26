/**
 * Widget: Worker Status
 * Category: workers | Size: medium (col-span-4)
 * Data from: executive provider (workers key)
 */
(function () {
  'use strict';

  window.DashboardRegistry.registerWidget({
    id: 'worker-status',
    title: 'Worker Status',
    description: 'Background worker health — active, idle, failed, and queued jobs.',
    icon: '⚙️',
    category: window.WIDGET_CATEGORY.WORKERS,
    permissions: ['platform.admin'],
    size: window.WIDGET_SIZE.MEDIUM,
    priority: 8,
    enabled: true,
    refreshInterval: 30,

    async load() {
      const provider = window.DashboardProviders.get('executive');
      const data = provider ? await provider.load() : {};
      return data.workers ?? {};
    },

    render(container, data) {
      if (!data) { container.innerHTML = '<p style="padding:1rem;color:var(--dash-text-muted)">No data.</p>'; return; }
      const { active = 0, idle = 0, failed = 0, queued = 0 } = data;
      const total = active + idle + failed;

      const stats = [
        { label: 'Active',  value: active,  color: 'var(--dash-success)', dot: 'healthy' },
        { label: 'Idle',    value: idle,    color: 'var(--dash-text-muted)', dot: 'idle' },
        { label: 'Failed',  value: failed,  color: 'var(--dash-danger)',  dot: 'down' },
        { label: 'Queued',  value: queued,  color: 'var(--dash-info)',    dot: 'healthy' }
      ];

      container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:0.5rem">
          <div style="display:flex;align-items:baseline;gap:0.5rem;margin-bottom:0.25rem">
            <span style="font-size:2rem;font-weight:800;color:var(--dash-text)">${total}</span>
            <span style="font-size:0.82rem;color:var(--dash-text-muted)">workers registered</span>
          </div>

          ${stats.map(s => `
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;color:var(--dash-text-muted)">
                <span class="status-dot ${s.dot}"></span> ${s.label}
              </div>
              <span style="font-size:1rem;font-weight:700;color:${s.color}">${s.value}</span>
            </div>`).join('')}

          ${failed > 0 ? `
            <div class="dash-tag dash-tag-danger" style="margin-top:0.25rem;width:fit-content">
              ⚠ ${failed} worker${failed > 1 ? 's' : ''} require attention
            </div>` : `
            <div class="dash-tag dash-tag-success" style="margin-top:0.25rem;width:fit-content">
              ✓ All workers healthy
            </div>`}
        </div>`;
    },

    settings() { return null; }
  });
})();
