/**
 * Widget: Projects Overview
 * Category: projects | Size: medium (col-span-4)
 * Data from: executive provider (projects key)
 */
(function () {
  'use strict';

  window.DashboardRegistry.registerWidget({
    id: 'projects-overview',
    title: 'Projects Overview',
    description: 'Active, completed, and overdue project counts with trend.',
    icon: '📁',
    category: window.WIDGET_CATEGORY.PROJECTS,
    permissions: ['projects.read'],
    size: window.WIDGET_SIZE.MEDIUM,
    priority: 3,
    enabled: true,
    refreshInterval: 600,

    async load() {
      const provider = window.DashboardProviders.get('executive');
      const data = provider ? await provider.load() : {};
      return data.projects ?? {};
    },

    render(container, data) {
      if (!data) { container.innerHTML = '<p style="padding:1rem;color:var(--dash-text-muted)">No data.</p>'; return; }
      const { active = 0, completed = 0, overdue = 0, trend = '' } = data;

      const rows = [
        { label: 'Active',    value: active,    color: 'var(--dash-accent)',  icon: '🔵' },
        { label: 'Completed', value: completed,  color: 'var(--dash-success)', icon: '✅' },
        { label: 'Overdue',   value: overdue,    color: 'var(--dash-danger)',  icon: '⚠️' }
      ];

      container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:0.5rem">
          ${rows.map(r => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:0.6rem 0.75rem;background:var(--dash-surface-2);border-radius:10px;border:1px solid var(--dash-border)">
              <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;color:var(--dash-text-muted)">${r.icon} ${r.label}</div>
              <div style="font-size:1.2rem;font-weight:800;color:${r.color}">${r.value}</div>
            </div>`).join('')}
          <div style="display:flex;align-items:center;gap:0.35rem;font-size:0.78rem;color:var(--dash-success);margin-top:0.25rem">
            <span>↑</span><span>${trend}</span>
          </div>
          <a href="/projects" class="dash-btn dash-btn-ghost" style="font-size:0.78rem;justify-content:center">
            View All Projects →
          </a>
        </div>`;
    },

    settings() { return null; }
  });
})();
