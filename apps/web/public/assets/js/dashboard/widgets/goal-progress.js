(function() {
  'use strict';
  
  if (!window.DashboardRegistry) return;

  window.DashboardRegistry.registerWidget({
    id: 'goal-progress',
    title: 'Goal Progress',
    description: 'Overview of organizational goals.',
    icon: '🎯',
    category: window.WIDGET_CATEGORY ? window.WIDGET_CATEGORY.GOALS : 'Goals',
    size: window.WIDGET_SIZE ? window.WIDGET_SIZE.MEDIUM : 'col-span-4',
    priority: 11,
    enabled: true,
    refreshInterval: 300,
    async load() {
      return {
        total: 5,
        onTrack: 3,
        atRisk: 1,
        behind: 1,
        goals: [
          { name: 'Increase Annual Revenue 30%', progress: 74, status: 'active', health: 'on_track' },
          { name: 'Launch Product V2', progress: 45, status: 'active', health: 'at_risk' },
          { name: 'Improve Customer Retention', progress: 12, status: 'planning', health: 'unknown' }
        ]
      };
    },
    render(container, data) {
      let html = `
        <div style="display:flex; gap:1rem; margin-bottom:1rem; text-align:center;">
          <div style="flex:1; background:var(--dash-surface-2); padding:0.5rem; border-radius:8px;">
            <div style="font-size:1.2rem; font-weight:800; color:var(--dash-text);">\${data.total}</div>
            <div style="font-size:0.65rem; color:var(--dash-text-muted); font-weight:700; text-transform:uppercase;">Goals</div>
          </div>
          <div style="flex:1; background:var(--dash-surface-2); padding:0.5rem; border-radius:8px;">
            <div style="font-size:1.2rem; font-weight:800; color:var(--dash-success);">\${data.onTrack}</div>
            <div style="font-size:0.65rem; color:var(--dash-text-muted); font-weight:700; text-transform:uppercase;">On Track</div>
          </div>
          <div style="flex:1; background:var(--dash-surface-2); padding:0.5rem; border-radius:8px;">
             <div style="font-size:1.2rem; font-weight:800; color:var(--dash-warning);">\${data.atRisk}</div>
             <div style="font-size:0.65rem; color:var(--dash-text-muted); font-weight:700; text-transform:uppercase;">At Risk</div>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:0.75rem;">
      `;
      
      data.goals.forEach(g => {
        let fillClass = 'success';
        let borderColor = 'var(--dash-success)';
        if(g.health === 'at_risk') { fillClass = 'warning'; borderColor = 'var(--dash-warning)'; }
        if(g.health === 'off_track') { fillClass = 'danger'; borderColor = 'var(--dash-danger)'; }
        if(g.health === 'unknown') { fillClass = 'accent'; borderColor = 'var(--dash-accent)'; }
        
        html += `
          <div style="border-left:3px solid \${borderColor}; padding-left:0.75rem; display:flex; flex-direction:column; gap:0.25rem;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.8rem; font-weight:600; color:var(--dash-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">\${g.name}</span>
              <span class="status-badge status-\${g.status}">\${g.status}</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <div class="dash-progress-bar" style="flex:1; height:4px;">
                <div class="dash-progress-fill \${fillClass}" style="width:\${g.progress}%;"></div>
              </div>
              <span style="font-size:0.7rem; font-weight:700; color:var(--dash-text-muted);">\${g.progress}%</span>
            </div>
          </div>
        `;
      });
      
      html += `</div><a href="/goals" style="display:block; text-align:center; margin-top:1rem; font-size:0.75rem; font-weight:600; color:var(--dash-accent); text-decoration:none;">View All Goals &rarr;</a>`;
      container.innerHTML = html;
    },
    settings() { return null; }
  });
})();
