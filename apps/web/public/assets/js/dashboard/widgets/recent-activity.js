/**
 * Widget: Recent Activity
 * Category: executive | Size: large (col-span-8)
 * Data from: recentActivity provider
 */
(function () {
  'use strict';

  window.DashboardRegistry.registerWidget({
    id: 'recent-activity',
    title: 'Recent Activity',
    description: 'Live feed of platform-wide events and actions.',
    icon: '⚡',
    category: window.WIDGET_CATEGORY.EXECUTIVE,
    permissions: [],
    size: window.WIDGET_SIZE.LARGE,
    priority: 4,
    enabled: true,
    refreshInterval: 60,

    async load() {
      const provider = window.DashboardProviders.get('recentActivity');
      return provider ? provider.load() : [];
    },

    render(container, data) {
      if (!data || !data.length) {
        container.innerHTML = '<div class="dash-empty"><div class="dash-empty-icon">⚡</div><div class="dash-empty-title">No recent activity</div></div>';
        return;
      }

      const items = data.map(item => `
        <div class="activity-item">
          <div class="activity-icon-wrap">${item.icon}</div>
          <div class="activity-body">
            <div class="activity-subject">${item.subject}</div>
            <div class="activity-meta">${item.action} by <strong>${item.user}</strong></div>
          </div>
          <div class="activity-time">${item.time}</div>
        </div>`).join('');

      container.innerHTML = `
        <div class="activity-list widget-body no-pad" style="padding:0 0.25rem">
          ${items}
        </div>
        <div style="padding:0.65rem 1rem;border-top:1px solid var(--dash-border)">
          <a href="#" class="dash-btn dash-btn-ghost" style="font-size:0.78rem;width:100%;justify-content:center">View Full Activity Log →</a>
        </div>`;
    },

    settings() { return null; }
  });
})();
