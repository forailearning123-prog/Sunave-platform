(function() {
  'use strict';
  if (!window.DashboardRegistry) return;

  window.DashboardRegistry.registerWidget({
    id: 'overdue-tasks',
    title: 'Overdue Tasks',
    description: 'Tasks that have missed their due date.',
    icon: '⚠️',
    category: window.WIDGET_CATEGORY ? window.WIDGET_CATEGORY.EXECUTIVE : 'Executive',
    size: window.WIDGET_SIZE ? window.WIDGET_SIZE.MEDIUM : 'col-span-4',
    priority: 16,
    enabled: true,
    refreshInterval: 300,
    async load() {
      return {
        count: 2,
        tasks: [
          { name: 'Implement JWT validation middleware', project: 'API Gateway v2', overdueDays: 4, assignee: 'JP' },
          { name: 'Finalize Q3 Budget', project: 'Cost Reduction Initiative', overdueDays: 1, assignee: 'MT' }
        ]
      };
    },
    render(container, data) {
      if(data.count === 0) {
        container.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:2rem 1rem; text-align:center;">
            <div style="font-size:2rem; margin-bottom:0.5rem; opacity:0.8;">🎉</div>
            <div style="font-size:0.85rem; font-weight:700; color:var(--dash-success);">All caught up!</div>
            <div style="font-size:0.75rem; color:var(--dash-text-muted);">No overdue tasks.</div>
          </div>
        `;
        return;
      }
      
      let html = `
        <div style="margin-bottom:1rem;">
          <span class="dash-tag dash-tag-danger">\${data.count} Tasks Overdue</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:0.5rem;">
      `;
      
      data.tasks.forEach(t => {
        let daysText = t.overdueDays === 1 ? '1 day' : t.overdueDays + ' days';
        
        html += `
          <div style="display:flex; align-items:center; justify-content:space-between; padding:0.65rem 0.5rem; border:1px solid rgba(239,68,68,0.2); background:rgba(239,68,68,0.05); border-radius:8px;">
            <div style="display:flex; flex-direction:column; gap:0.15rem; flex:1; min-width:0;">
              <span style="font-size:0.8rem; font-weight:600; color:var(--dash-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">\${t.name}</span>
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span style="font-size:0.65rem; color:var(--dash-text-muted); font-weight:600;">\${t.project}</span>
                <span style="font-size:0.65rem; color:var(--dash-danger); font-weight:700;">\${daysText} late</span>
              </div>
            </div>
            <div class="dash-avatar" style="width:24px; height:24px; font-size:0.6rem; flex-shrink:0;">\${t.assignee}</div>
          </div>
        `;
      });
      
      html += `</div>`;
      container.innerHTML = html;
    },
    settings() { return null; }
  });
})();
