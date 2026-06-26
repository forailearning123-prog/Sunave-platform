(function() {
  'use strict';
  if (!window.DashboardRegistry) return;

  window.DashboardRegistry.registerWidget({
    id: 'my-tasks',
    title: 'My Tasks',
    description: 'Tasks assigned to you.',
    icon: '✓',
    category: window.WIDGET_CATEGORY ? window.WIDGET_CATEGORY.EXECUTIVE : 'Executive',
    size: window.WIDGET_SIZE ? window.WIDGET_SIZE.MEDIUM : 'col-span-4',
    priority: 13,
    enabled: true,
    refreshInterval: 300,
    async load() {
      return {
        openCount: 6,
        dueToday: 2,
        overdue: 1,
        tasks: [
          { name: 'Implement JWT validation middleware', project: 'API Gateway v2', due: 'Apr 10', isOverdue: true, priority: 'critical' },
          { name: 'Define rate limiting rules', project: 'API Gateway v2', due: 'Apr 15', isOverdue: false, priority: 'high' },
          { name: 'Architecture review', project: 'API Gateway v2', due: 'Mar 15', isOverdue: false, priority: 'medium' },
          { name: 'User interview synthesis', project: 'Customer Portal', due: 'Today', isOverdue: false, priority: 'high' },
          { name: 'Draft tech spec', project: 'Mobile App V2', due: 'Tomorrow', isOverdue: false, priority: 'medium' },
          { name: 'Interview candidate', project: 'Engineering Hiring', due: 'Apr 12', isOverdue: false, priority: 'high' }
        ]
      };
    },
    render(container, data) {
      let html = `
        <div style="display:flex; gap:0.5rem; margin-bottom:1rem;">
          <span class="dash-tag dash-tag-info">\${data.openCount} Open</span>
          <span class="dash-tag dash-tag-warning">\${data.dueToday} Due Today</span>
          <span class="dash-tag dash-tag-danger">\${data.overdue} Overdue</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:0.5rem;">
      `;
      
      data.tasks.forEach(t => {
        let priClass = 'priority-' + t.priority;
        let dueColor = t.isOverdue ? 'color:var(--dash-danger); font-weight:700;' : 'color:var(--dash-text-faint);';
        
        html += `
          <div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid var(--dash-border);">
            <div style="display:flex; align-items:center; gap:0.5rem; flex:1; min-width:0;">
              <div class="priority-dot \${priClass}"></div>
              <div style="display:flex; flex-direction:column; gap:0.15rem; min-width:0;">
                <span style="font-size:0.8rem; font-weight:600; color:var(--dash-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">\${t.name}</span>
                <span style="font-size:0.65rem; color:var(--dash-text-muted); font-weight:600;">\${t.project}</span>
              </div>
            </div>
            <div style="font-size:0.7rem; \${dueColor} flex-shrink:0;">\${t.due}</div>
          </div>
        `;
      });
      
      html += `</div><a href="/tasks" style="display:block; text-align:center; margin-top:1rem; font-size:0.75rem; font-weight:600; color:var(--dash-accent); text-decoration:none;">View All Tasks &rarr;</a>`;
      container.innerHTML = html;
    },
    settings() { return null; }
  });
})();
