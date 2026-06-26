/**
 * Widget: Notifications
 * Category: notifications | Size: medium (col-span-4)
 * Data from: notifications provider
 */
(function () {
  'use strict';

  window.DashboardRegistry.registerWidget({
    id: 'notifications',
    title: 'Notifications',
    description: 'Unread alerts, warnings, and informational messages.',
    icon: '🔔',
    category: window.WIDGET_CATEGORY.NOTIFICATIONS,
    permissions: [],
    size: window.WIDGET_SIZE.MEDIUM,
    priority: 5,
    enabled: true,
    refreshInterval: 30,

    async load() {
      const provider = window.DashboardProviders.get('notifications');
      return provider ? provider.load() : [];
    },

    render(container, data) {
      if (!data || !data.length) {
        container.innerHTML = '<div class="dash-empty" style="padding:1.5rem"><div class="dash-empty-icon">🎉</div><div class="dash-empty-title">All caught up!</div></div>';
        return;
      }

      const unreadCount = data.filter(n => !n.read).length;

      const items = data.map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}">
          <div class="notif-dot ${n.read ? 'read' : n.type}"></div>
          <div class="notif-body">
            <div class="notif-title">${n.title}</div>
            <div class="notif-msg">${n.message}</div>
            <div class="notif-time">${n.time}</div>
          </div>
        </div>`).join('');

      container.innerHTML = `
        <div class="notif-list widget-body no-pad">
          ${items}
        </div>
        ${unreadCount > 0 ? `
          <div style="padding:0.65rem 1rem;border-top:1px solid var(--dash-border);text-align:center">
            <a href="#" class="dash-btn dash-btn-ghost" style="font-size:0.78rem;justify-content:center">${unreadCount} unread — Mark all read</a>
          </div>` : ''}`;
    },

    settings() { return null; }
  });
})();
