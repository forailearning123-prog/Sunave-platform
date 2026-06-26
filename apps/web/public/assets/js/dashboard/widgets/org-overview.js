/**
 * Widget: Organisation Overview
 * Category: executive | Size: small (col-span-4)
 * Data from: organization provider
 */
(function () {
  'use strict';

  window.DashboardRegistry.registerWidget({
    id: 'org-overview',
    title: 'Organisation Overview',
    description: 'Members, teams, plan, and key organisation metadata.',
    icon: '🏢',
    category: window.WIDGET_CATEGORY.EXECUTIVE,
    permissions: [],
    size: window.WIDGET_SIZE.SMALL,
    priority: 10,
    enabled: true,
    refreshInterval: 3600,

    async load() {
      const provider = window.DashboardProviders.get('organization');
      return provider ? provider.load() : {};
    },

    render(container, data) {
      if (!data) { container.innerHTML = '<p style="padding:1rem;color:var(--dash-text-muted)">No data.</p>'; return; }
      const { name = 'Organisation', plan = 'Free', members = 0, teams = 0, industry = '', createdAt = '' } = data;
      const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const since = createdAt ? new Date(createdAt).getFullYear() : '—';

      container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:0.65rem">
          <div style="display:flex;align-items:center;gap:0.75rem">
            <div style="width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,var(--dash-accent),var(--dash-accent-2));display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:800;color:white;flex-shrink:0">${initials}</div>
            <div>
              <div style="font-weight:700;font-size:0.92rem;color:var(--dash-text)">${name}</div>
              <div style="font-size:0.75rem;color:var(--dash-text-muted)">${industry} • Since ${since}</div>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;gap:0.5rem">
            <div style="flex:1;text-align:center;padding:0.5rem;background:var(--dash-surface-2);border-radius:8px;border:1px solid var(--dash-border)">
              <div style="font-size:1.1rem;font-weight:800;color:var(--dash-text)">${members}</div>
              <div style="font-size:0.68rem;color:var(--dash-text-muted);font-weight:600">Members</div>
            </div>
            <div style="flex:1;text-align:center;padding:0.5rem;background:var(--dash-surface-2);border-radius:8px;border:1px solid var(--dash-border)">
              <div style="font-size:1.1rem;font-weight:800;color:var(--dash-text)">${teams}</div>
              <div style="font-size:0.68rem;color:var(--dash-text-muted);font-weight:600">Teams</div>
            </div>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:0.78rem;color:var(--dash-text-muted)">Plan</span>
            <span class="dash-tag dash-tag-accent">${plan}</span>
          </div>
        </div>`;
    },

    settings() { return null; }
  });
})();
