/**
 * Widget: AI Status
 * Category: ai | Size: medium (col-span-4)
 * Data from: aiStatus provider
 */
(function () {
  'use strict';

  function fmt(n) { return new Intl.NumberFormat('en-US').format(n); }

  window.DashboardRegistry.registerWidget({
    id: 'ai-status',
    title: 'AI Status',
    description: 'AI provider connectivity, latency, and daily request counts.',
    icon: '🤖',
    category: window.WIDGET_CATEGORY.AI,
    permissions: ['platform.admin'],
    size: window.WIDGET_SIZE.MEDIUM,
    priority: 7,
    enabled: true,
    refreshInterval: 120,

    async load() {
      const provider = window.DashboardProviders.get('aiStatus');
      return provider ? provider.load() : {};
    },

    render(container, data) {
      if (!data) { container.innerHTML = '<p style="padding:1rem;color:var(--dash-text-muted)">No data.</p>'; return; }
      const { providers = [], totalRequestsToday = 0, avgLatencyMs = 0, capabilities = [] } = data;

      container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:0.6rem">
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.25rem">
            ${capabilities.map(c => `<span class="dash-tag dash-tag-accent">${c}</span>`).join('')}
          </div>

          ${providers.map(p => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:0.55rem 0.75rem;background:var(--dash-surface-2);border-radius:10px;border:1px solid var(--dash-border)">
              <div style="display:flex;align-items:center;gap:0.5rem">
                <span class="status-dot ${p.status === 'connected' ? 'healthy' : 'down'}"></span>
                <span style="font-size:0.85rem;font-weight:600;color:var(--dash-text)">${p.name}</span>
              </div>
              <div style="text-align:right">
                <div style="font-size:0.78rem;color:var(--dash-text-muted)">${p.latencyMs}ms</div>
                <div style="font-size:0.72rem;color:var(--dash-text-faint)">${fmt(p.requestsToday)} req</div>
              </div>
            </div>`).join('')}

          <div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-top:1px solid var(--dash-border);margin-top:0.25rem">
            <span style="font-size:0.78rem;color:var(--dash-text-muted)">Today's Requests</span>
            <span style="font-size:0.85rem;font-weight:700;color:var(--dash-accent)">${fmt(totalRequestsToday)}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="font-size:0.78rem;color:var(--dash-text-muted)">Avg Latency</span>
            <span style="font-size:0.85rem;font-weight:700;color:var(--dash-text)">${avgLatencyMs}ms</span>
          </div>
        </div>`;
    },

    settings() { return null; }
  });
})();
